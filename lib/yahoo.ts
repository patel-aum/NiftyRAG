/**
 * Yahoo Finance real data for Nifty 50 index (^NSEI) and Nifty 50 constituent stocks (.NS).
 * Uses yahoo-finance2 (no API key). Docs: { title, text, source, symbol } for RAG ingest.
 */

export type YahooDoc = { title: string; text: string; source: string; symbol?: string };

const SOURCE = "Yahoo Finance";
const NIFTY_INDEX = "^NSEI";

/** Full Nifty 50 constituent stocks (Yahoo .NS) so RAG can answer any constituent (e.g. TCS, M&M). */
const NIFTY_50_STOCKS: Array<{ sym: string; label: string }> = [
  { sym: "ADANIENT.NS", label: "Adani Enterprises" },
  { sym: "ADANIPORTS.NS", label: "Adani Ports" },
  { sym: "APOLLOHOSP.NS", label: "Apollo Hospitals" },
  { sym: "ASIANPAINT.NS", label: "Asian Paints" },
  { sym: "AXISBANK.NS", label: "Axis Bank" },
  { sym: "BAJAJ-AUTO.NS", label: "Bajaj Auto" },
  { sym: "BAJAJFINSV.NS", label: "Bajaj Finserv" },
  { sym: "BAJFINANCE.NS", label: "Bajaj Finance" },
  { sym: "BPCL.NS", label: "Bharat Petroleum" },
  { sym: "BHARTIARTL.NS", label: "Bharti Airtel" },
  { sym: "BRITANNIA.NS", label: "Britannia" },
  { sym: "CIPLA.NS", label: "Cipla" },
  { sym: "COALINDIA.NS", label: "Coal India" },
  { sym: "DIVISLAB.NS", label: "Divi's Laboratories" },
  { sym: "DRREDDY.NS", label: "Dr. Reddy's" },
  { sym: "EICHERMOT.NS", label: "Eicher Motors" },
  { sym: "GRASIM.NS", label: "Grasim" },
  { sym: "HCLTECH.NS", label: "HCL Technologies" },
  { sym: "HDFCBANK.NS", label: "HDFC Bank" },
  { sym: "HDFCLIFE.NS", label: "HDFC Life" },
  { sym: "HEROMOTOCO.NS", label: "Hero MotoCorp" },
  { sym: "HINDALCO.NS", label: "Hindalco" },
  { sym: "HINDUNILVR.NS", label: "Hindustan Unilever" },
  { sym: "ICICIBANK.NS", label: "ICICI Bank" },
  { sym: "INDUSINDBK.NS", label: "IndusInd Bank" },
  { sym: "INFY.NS", label: "Infosys" },
  { sym: "ITC.NS", label: "ITC" },
  { sym: "JSWSTEEL.NS", label: "JSW Steel" },
  { sym: "KOTAKBANK.NS", label: "Kotak Mahindra Bank" },
  { sym: "LT.NS", label: "Larsen & Toubro" },
  { sym: "LTIM.NS", label: "LTIMindtree" },
  { sym: "M&M.NS", label: "Mahindra & Mahindra" },
  { sym: "MARUTI.NS", label: "Maruti Suzuki" },
  { sym: "NESTLEIND.NS", label: "Nestle India" },
  { sym: "NTPC.NS", label: "NTPC" },
  { sym: "ONGC.NS", label: "Oil and Natural Gas" },
  { sym: "POWERGRID.NS", label: "Power Grid" },
  { sym: "RELIANCE.NS", label: "Reliance Industries" },
  { sym: "SBIN.NS", label: "State Bank of India" },
  { sym: "SBILIFE.NS", label: "SBI Life" },
  { sym: "SUNPHARMA.NS", label: "Sun Pharma" },
  { sym: "TATACONSUM.NS", label: "Tata Consumer" },
  { sym: "TATAMOTORS.NS", label: "Tata Motors" },
  { sym: "TATASTEEL.NS", label: "Tata Steel" },
  { sym: "TCS.NS", label: "TCS" },
  { sym: "TECHM.NS", label: "Tech Mahindra" },
  { sym: "TITAN.NS", label: "Titan" },
  { sym: "ULTRACEMCO.NS", label: "UltraTech Cement" },
  { sym: "WIPRO.NS", label: "Wipro" },
];

/** Synonyms for matching user queries to a single Nifty 50 label (lowercase). */
const QUERY_SYNONYMS: Record<string, string> = {
  "m&m": "Mahindra & Mahindra",
  "m and m": "Mahindra & Mahindra",
  "mahindra": "Mahindra & Mahindra",
  "reliance": "Reliance Industries",
  "l&t": "Larsen & Toubro",
  "l and t": "Larsen & Toubro",
  "hul": "Hindustan Unilever",
  "sbi": "State Bank of India",
  "ongc": "Oil and Natural Gas",
  "bajaj fin": "Bajaj Finance",
  "bajaj finserv": "Bajaj Finserv",
  "ultratech": "UltraTech Cement",
  "sun pharma": "Sun Pharma",
  "dr reddy": "Dr. Reddy's",
  "tech mahindra": "Tech Mahindra",
  "kotak": "Kotak Mahindra Bank",
};

/**
 * If the query clearly refers to a Nifty 50 stock, return that stock's exact label (for symbol-filtered retrieval).
 * Enables "mahindra and mahindra forecast" / "M&M performance" to pull M&M chunks even when top-k is crowded.
 */
export function getStockLabelFromQuery(query: string): string | null {
  const q = query.toLowerCase().replace(/\s+/g, " ").trim();
  if (q.length < 2) return null;
  for (const [syn, label] of Object.entries(QUERY_SYNONYMS)) {
    if (q.includes(syn)) return label;
  }
  for (const { label } of NIFTY_50_STOCKS) {
    if (q.includes(label.toLowerCase())) return label;
  }
  return null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function quoteToText(symbol: string, q: Record<string, unknown>): string {
  const price = q.regularMarketPrice ?? q.regularMarketPreviousClose ?? "";
  const change = q.regularMarketChange != null ? `${q.regularMarketChange}` : "";
  const changePct = q.regularMarketChangePercent != null ? `${q.regularMarketChangePercent}%` : "";
  const high = q.regularMarketDayHigh ?? "";
  const low = q.regularMarketDayLow ?? "";
  const open = q.regularMarketOpen ?? "";
  const parts = [
    `${symbol} last price ${price}`,
    change !== "" ? `change ${change}` : "",
    changePct !== "" ? `(${changePct})` : "",
    open !== "" ? `open ${open}` : "",
    high !== "" ? `high ${high}` : "",
    low !== "" ? `low ${low}` : "",
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Fetches real Nifty 50 index (^NSEI) and Nifty 50 constituent stock quotes from Yahoo Finance.
 * Returns docs in RAG shape so queries like "how is TCS performing" can be answered.
 */
export async function fetchYahooNiftyData(): Promise<YahooDoc[]> {
  let YahooFinance: new () => {
    quote: (symbol: string) => Promise<Record<string, unknown>>;
    historical?: (symbol: string, opts: { period1: string; period2: string }) => Promise<Array<Record<string, unknown>>>;
  };
  try {
    const mod = await import("yahoo-finance2");
    YahooFinance = (mod.default ?? mod) as typeof YahooFinance;
  } catch {
    return [];
  }

  const yahooFinance = new YahooFinance();
  const docs: YahooDoc[] = [];
  const d = todayISO();

  // Nifty 50 index
  try {
    const quote = (await yahooFinance.quote(NIFTY_INDEX)) as Record<string, unknown>;
    if (quote && typeof quote === "object") {
      const text = quoteToText("Nifty 50", quote);
      if (text.length >= 5) {
        docs.push({
          title: `Nifty 50 (${NIFTY_INDEX})`,
          text: `${text}. Date ${d}.`,
          source: SOURCE,
          symbol: "Nifty 50",
        });
      }
    }
  } catch {
    // skip
  }

  // Nifty 50 constituent stocks (TCS, Reliance, HDFC Bank, Infosys, etc.)
  for (const { sym, label } of NIFTY_50_STOCKS) {
    try {
      const quote = (await yahooFinance.quote(sym)) as Record<string, unknown>;
      if (!quote || typeof quote !== "object") continue;
      const text = quoteToText(label, quote);
      if (text.length < 5) continue;
      docs.push({
        title: `${label} (${sym})`,
        text: `${text}. Date ${d}.`,
        source: SOURCE,
        symbol: label,
      });
    } catch {
      // skip symbol on error
    }
  }

  // Optional: last 5 trading days for Nifty 50 for context
  if (yahooFinance.historical) {
    try {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      const period1 = start.toISOString().slice(0, 10);
      const period2 = end.toISOString().slice(0, 10);
      const history = await yahooFinance.historical(NIFTY_INDEX, { period1, period2 });
      if (Array.isArray(history) && history.length > 0) {
        const last5 = history.slice(-5);
        const lines = last5.map(
          (d: Record<string, unknown>) =>
            `${d.date}: open ${d.open ?? ""} high ${d.high ?? ""} low ${d.low ?? ""} close ${d.close ?? ""}`
        );
        docs.push({
          title: "Nifty 50 recent history",
          text: `Nifty 50 (^NSEI) last 5 sessions. ${lines.join(". ")}`,
          source: SOURCE,
          symbol: "Nifty 50",
        });
      }
    } catch {
      // optional
    }
  }

  return docs;
}
