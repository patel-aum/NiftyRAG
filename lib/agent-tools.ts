/**
 * Agentic tools for NiftyRAG: RAG search, Nifty live, stock quote, historical data.
 * The LLM chooses which tools to call (Scenario A: RAG only, B: real-time only, C: both).
 */
import { tool } from "ai";
import { z } from "zod";
import { embedText } from "@/lib/embed";
import {
  similaritySearch,
  similaritySearchBySymbol,
  isAstraConfigured,
  type NiftyHit,
} from "@/lib/astra";
import { runIngest } from "@/lib/ingest";
import { getStockLabelFromQuery, getNiftySymbolForQuery } from "@/lib/yahoo";
import { getNiftyLive } from "@/lib/get-nifty-live";
import { getStockQuote, getHistoricalData, type HistoricalInterval } from "@/lib/stock-quote";

function formatHits(hits: NiftyHit[]): string {
  return hits
    .map((h, i) => `[${i + 1}] (${h.source}, ${h.date}) ${h.text}`)
    .join("\n\n");
}

let hasAutoIngestedThisProcess = false;

export function buildAgentTools() {
  return {
    /** Search the RAG knowledge base (Astra DB) for Nifty 50 documents, forecasts, and analyst content. Use for historical questions, key levels, or sentiment. */
    search_rag: tool({
      description:
        "Search the Nifty 50 knowledge base for historical data, forecasts, support/resistance levels, and analyst views. Use when the user asks about past performance, key levels, outlook, or document-based context.",
      parameters: z.object({
        query: z.string().describe("The search query (e.g. 'Nifty 50 resistance levels', 'TCS earnings outlook')"),
        limit: z.number().min(1).max(15).optional().describe("Max number of chunks to return (default 8)"),
      }),
      execute: async ({ query, limit = 8 }) => {
        if (!isAstraConfigured()) {
          return { context: "(Vector DB not configured. Add ASTRA_DB_* env vars.)", hits: 0 };
        }
        try {
          let vector = await embedText(query);
          let hits: NiftyHit[] = await similaritySearch(vector, limit);
          if (hits.length === 0 && !hasAutoIngestedThisProcess) {
            hasAutoIngestedThisProcess = true;
            try {
              await runIngest();
              vector = await embedText(query);
              hits = await similaritySearch(vector, limit);
            } catch {
              // ignore
            }
          }
          const stockLabel = getStockLabelFromQuery(query);
          if (stockLabel && hits.length < limit) {
            const bySymbol = await similaritySearchBySymbol(vector, stockLabel, Math.min(5, limit));
            const seen = new Set(hits.map((h) => h.text));
            for (const h of bySymbol) {
              if (!seen.has(h.text)) {
                seen.add(h.text);
                hits.push(h);
              }
            }
          }
          return { context: formatHits(hits), hits: hits.length };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { context: `(Retrieval failed: ${msg})`, hits: 0 };
        }
      },
    }),

    /** Get the current live NIFTY 50 index price and day change. Use when the user asks for "current", "live", or "right now" Nifty level. */
    get_nifty_live: tool({
      description:
        "Get the current live NIFTY 50 (^NSEI) index price, day change, and session high/low. Use when the user asks for current or real-time Nifty level.",
      parameters: z.object({}),
      execute: async () => {
        const data = await getNiftyLive();
        if (!data)
          return { error: "Could not fetch Nifty 50 live data. Try again or use search_rag for stored context." };
        return data;
      },
    }),

    /** Get the current live quote for an Indian stock (NSE). Use for "what is TCS trading at", "Reliance price now", etc. Symbol can be like TCS.NS or RELIANCE.NS or just TCS. */
    get_stock_quote: tool({
      description:
        "Get the current live stock quote for an Indian (NSE) stock. Use when the user asks for current price, today's change, or real-time quote for a specific stock (e.g. TCS, Reliance, Infosys).",
      parameters: z.object({
        symbol: z
          .string()
          .describe("Stock symbol: e.g. TCS, RELIANCE, INFY, or TCS.NS, RELIANCE.NS for NSE"),
      }),
      execute: async ({ symbol }) => {
        const data = await getStockQuote(symbol);
        if (!data)
          return { error: `Could not fetch quote for ${symbol}. Check symbol (e.g. TCS.NS, RELIANCE.NS).` };
        return data;
      },
    }),

    /** Get historical price series for an Indian stock (NSE). Use for "1 year performance", "historical chart", etc. */
    get_historical_data: tool({
      description:
        "Get historical daily/weekly/monthly price data for an Indian (NSE) stock. Use when the user asks for past performance, history, or chart data.",
      parameters: z.object({
        symbol: z.string().describe("Stock symbol (e.g. TCS, RELIANCE.NS)"),
        interval: z
          .enum(["1d", "1wk", "1mo"])
          .optional()
          .describe("Interval: 1d (daily, ~1Y), 1wk (weekly), 1mo (monthly). Default 1d."),
      }),
      execute: async ({ symbol, interval = "1d" }) => {
        const data = await getHistoricalData(symbol, interval as HistoricalInterval);
        if (!data || data.length === 0)
          return { error: `No historical data for ${symbol}. Check symbol.` };
        return { symbol, interval, dataPoints: data.length, series: data.slice(-30) };
      },
    }),

    /** One call for both live quote and recent history for any Nifty 50 stock. Use when user wants full details or "everything" about a stock. */
    get_nifty_stock_details: tool({
      description:
        "Get both live quote and recent history for any Nifty 50 stock in one call. Use when the user asks for 'details', 'everything', or full info about a specific Nifty stock (e.g. TCS, Reliance, Infosys). Accepts stock name or symbol.",
      parameters: z.object({
        symbolOrName: z
          .string()
          .describe("Nifty 50 stock by name or symbol (e.g. TCS, Reliance, RELIANCE.NS, Infosys)"),
      }),
      execute: async ({ symbolOrName }) => {
        const symbol = getNiftySymbolForQuery(symbolOrName) ?? symbolOrName;
        const [quote, history] = await Promise.all([
          getStockQuote(symbol),
          getHistoricalData(symbol, "1d"),
        ]);
        if (!quote && (!history || history.length === 0))
          return { error: `No data for ${symbolOrName}. Ensure it is a Nifty 50 stock.` };
        return { quote: quote ?? null, history: history ? history.slice(-30) : null };
      },
    }),
  };
}

export type AgentTools = ReturnType<typeof buildAgentTools>;
