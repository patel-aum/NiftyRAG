/**
 * Live stock quote and historical data for Indian stocks (NSE .NS symbols).
 * Used by the agentic chat as get_stock_quote / get_historical_data tools.
 * Complements GiptiLabs mcp-stock-analysis (use that in Cursor; here we use yahoo-finance2 for server-side).
 */

export interface StockQuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume?: number;
  status: string;
}

async function fetchQuoteOnce(
  yahoo: { quote: (sym: string) => Promise<Record<string, unknown>> },
  sym: string
): Promise<StockQuoteResult | null> {
  const q = await yahoo.quote(sym);
  if (!q || typeof q !== "object") return null;
  const price = Number(q.regularMarketPrice ?? q.regularMarketPreviousClose ?? 0);
  const open = Number(q.regularMarketOpen ?? q.previousClose ?? price);
  const change = Number(q.regularMarketChange ?? price - open);
  const changePercent = Number(q.regularMarketChangePercent ?? (open ? (change / open) * 100 : 0));
  const high = Number(q.regularMarketDayHigh ?? 0);
  const low = Number(q.regularMarketDayLow ?? 0);
  const volume = typeof q.regularMarketVolume === "number" ? q.regularMarketVolume : undefined;
  if (!price) return null;
  return {
    symbol: sym,
    price,
    change,
    changePercent,
    open,
    high,
    low,
    volume,
    status: "Live from Yahoo Finance",
  };
}

export async function getStockQuote(symbol: string): Promise<StockQuoteResult | null> {
  const sym = symbol.includes(".") ? symbol : `${symbol}.NS`;
  try {
    const mod = await import("yahoo-finance2");
    const YahooFinance = (mod.default ?? mod) as new () => {
      quote: (s: string) => Promise<Record<string, unknown>>;
    };
    const yahoo = new YahooFinance();
    let result = await fetchQuoteOnce(yahoo, sym);
    if (!result) {
      await new Promise((r) => setTimeout(r, 800));
      result = await fetchQuoteOnce(yahoo, sym);
    }
    return result;
  } catch {
    return null;
  }
}

export type HistoricalInterval = "1d" | "1wk" | "1mo";

export interface HistoricalPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export async function getHistoricalData(
  symbol: string,
  interval: HistoricalInterval = "1d"
): Promise<HistoricalPoint[] | null> {
  const sym = symbol.includes(".") ? symbol : `${symbol}.NS`;
  try {
    const mod = await import("yahoo-finance2");
    const YahooFinance = (mod.default ?? mod) as new () => {
      historical?: (
        s: string,
        opts: { period1: string; period2: string }
      ) => Promise<Array<Record<string, unknown>>>;
    };
    const yahoo = new YahooFinance();
    if (!yahoo.historical) return null;
    const end = new Date();
    const start = new Date(end);
    if (interval === "1d") start.setFullYear(start.getFullYear() - 1);
    else if (interval === "1wk") start.setFullYear(start.getFullYear() - 2);
    else start.setFullYear(start.getFullYear() - 3);
    const period1 = start.toISOString().slice(0, 10);
    const period2 = end.toISOString().slice(0, 10);
    let raw = await yahoo.historical(sym, { period1, period2 });
    if ((!Array.isArray(raw) || raw.length === 0) && interval === "1d") {
      await new Promise((r) => setTimeout(r, 800));
      raw = await yahoo.historical(sym, { period1, period2 });
    }
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const sorted = [...raw].sort(
      (a, b) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime()
    );
    return sorted.map((d) => ({
      date: String(d.date).slice(0, 10),
      open: Number(d.open ?? 0),
      high: Number(d.high ?? 0),
      low: Number(d.low ?? 0),
      close: Number(d.close ?? 0),
      volume: typeof d.volume === "number" ? d.volume : undefined,
    }));
  } catch {
    return null;
  }
}
