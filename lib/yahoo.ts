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

/**
 * Synonyms for matching user queries to a single Nifty 50 label (keys lowercase).
 * Order: longer / more specific phrases first so "bajaj finance" wins over "bajaj" where applicable.
 * Covers all 50 constituents: ticker symbols, abbreviations, and common name variants.
 */
const QUERY_SYNONYMS: Record<string, string> = {
  // Adani
  "adani enterprises": "Adani Enterprises",
  adanient: "Adani Enterprises",
  "adani ent": "Adani Enterprises",
  "adani ports": "Adani Ports",
  adaniports: "Adani Ports",
  // Apollo, Asian Paints, Axis
  "apollo hospitals": "Apollo Hospitals",
  apollohosp: "Apollo Hospitals",
  "apollo hosp": "Apollo Hospitals",
  "asian paints": "Asian Paints",
  asianpaint: "Asian Paints",
  "axis bank": "Axis Bank",
  axisbank: "Axis Bank",
  // Bajaj (specific first to avoid ambiguity)
  "bajaj finance": "Bajaj Finance",
  bajfinance: "Bajaj Finance",
  "bajaj finserv": "Bajaj Finserv",
  bajajfinsv: "Bajaj Finserv",
  "bajaj auto": "Bajaj Auto",
  "bajaj-auto": "Bajaj Auto",
  // BPCL, Bharti, Britannia
  "bharat petroleum": "Bharat Petroleum",
  bpcl: "Bharat Petroleum",
  "bharti airtel": "Bharti Airtel",
  bhartiartl: "Bharti Airtel",
  bharti: "Bharti Airtel",
  airtel: "Bharti Airtel",
  britannia: "Britannia",
  // Cipla, Coal India, Divi's, Dr. Reddy's
  cipla: "Cipla",
  "coal india": "Coal India",
  coalindia: "Coal India",
  "divi's laboratories": "Divi's Laboratories",
  "divis laboratories": "Divi's Laboratories",
  divislab: "Divi's Laboratories",
  "divi's labs": "Divi's Laboratories",
  "dr. reddy's": "Dr. Reddy's",
  "dr reddy": "Dr. Reddy's",
  "dr reddys": "Dr. Reddy's",
  drreddy: "Dr. Reddy's",
  "reddy's": "Dr. Reddy's",
  // Eicher, Grasim
  "eicher motors": "Eicher Motors",
  eichermot: "Eicher Motors",
  eicher: "Eicher Motors",
  grasim: "Grasim",
  // HCL, HDFC
  "hcl technologies": "HCL Technologies",
  "hcl tech": "HCL Technologies",
  hcltech: "HCL Technologies",
  "hdfc bank": "HDFC Bank",
  hdfcbank: "HDFC Bank",
  "hdfc life": "HDFC Life",
  hdfclife: "HDFC Life",
  // Hero, Hindalco, HUL
  "hero motocorp": "Hero MotoCorp",
  "hero moto": "Hero MotoCorp",
  heromotoco: "Hero MotoCorp",
  hero: "Hero MotoCorp",
  hindalco: "Hindalco",
  "hindustan unilever": "Hindustan Unilever",
  hindunilvr: "Hindustan Unilever",
  hul: "Hindustan Unilever",
  // ICICI, IndusInd, Infosys
  "icici bank": "ICICI Bank",
  icicibank: "ICICI Bank",
  icici: "ICICI Bank",
  "indusind bank": "IndusInd Bank",
  indusindbk: "IndusInd Bank",
  indusind: "IndusInd Bank",
  infosys: "Infosys",
  infy: "Infosys",
  // ITC, JSW
  itc: "ITC",
  "jsw steel": "JSW Steel",
  jswsteel: "JSW Steel",
  jsw: "JSW Steel",
  // Kotak, L&T, LTI
  "kotak mahindra bank": "Kotak Mahindra Bank",
  "kotak bank": "Kotak Mahindra Bank",
  kotakbank: "Kotak Mahindra Bank",
  kotak: "Kotak Mahindra Bank",
  "larsen & toubro": "Larsen & Toubro",
  "larsen and toubro": "Larsen & Toubro",
  "l&t": "Larsen & Toubro",
  "l and t": "Larsen & Toubro",
  larsen: "Larsen & Toubro",
  toubro: "Larsen & Toubro",
  "ltimindtree": "LTIMindtree",
  "lti mindtree": "LTIMindtree",
  ltim: "LTIMindtree",
  mindtree: "LTIMindtree",
  // Mahindra, Maruti, Nestle, NTPC
  "mahindra & mahindra": "Mahindra & Mahindra",
  "mahindra and mahindra": "Mahindra & Mahindra",
  "m&m": "Mahindra & Mahindra",
  "m and m": "Mahindra & Mahindra",
  mahindra: "Mahindra & Mahindra",
  "maruti suzuki": "Maruti Suzuki",
  maruti: "Maruti Suzuki",
  "nestle india": "Nestle India",
  nestleind: "Nestle India",
  nestle: "Nestle India",
  ntpc: "NTPC",
  // ONGC, Power Grid, Reliance
  "oil and natural gas": "Oil and Natural Gas",
  ongc: "Oil and Natural Gas",
  "power grid": "Power Grid",
  powergrid: "Power Grid",
  "reliance industries": "Reliance Industries",
  "reliance ind": "Reliance Industries",
  reliance: "Reliance Industries",
  ril: "Reliance Industries",
  // SBI, Sun Pharma
  "state bank of india": "State Bank of India",
  sbin: "State Bank of India",
  sbi: "State Bank of India",
  "sbi life": "SBI Life",
  sbilife: "SBI Life",
  "sun pharma": "Sun Pharma",
  "sun pharmaceutical": "Sun Pharma",
  sunpharma: "Sun Pharma",
  // Tata group
  "tata consumer": "Tata Consumer",
  "tata consumer products": "Tata Consumer",
  tataconsum: "Tata Consumer",
  "tata motors": "Tata Motors",
  tatamotors: "Tata Motors",
  "tata steel": "Tata Steel",
  tatasteel: "Tata Steel",
  tcs: "TCS",
  "tata consultancy": "TCS",
  "tata consultancy services": "TCS",
  "tech mahindra": "Tech Mahindra",
  techm: "Tech Mahindra",
  titan: "Titan",
  "ultratech cement": "UltraTech Cement",
  "ultra tech cement": "UltraTech Cement",
  ultracemco: "UltraTech Cement",
  ultratech: "UltraTech Cement",
  wipro: "Wipro",
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

/** Return NSE symbol (.NS) for any Nifty 50 stock by name, synonym, or symbol. Used for live quote/history tools. */
export function getNiftySymbolForQuery(query: string): string | null {
  const label = getStockLabelFromQuery(query);
  if (label) {
    const e = NIFTY_50_STOCKS.find((x) => x.label === label);
    return e?.sym ?? null;
  }
  if (query.includes(".NS")) return query;
  const upper = query.toUpperCase().replace(/\s+/g, "").replace(/&/g, "");
  const bySym = NIFTY_50_STOCKS.find((x) => x.sym === `${upper}.NS` || x.sym.startsWith(`${upper}.`));
  if (bySym) return bySym.sym;
  if (upper.length >= 2) return `${upper}.NS`;
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

  // Nifty 50 constituent stocks: current quote + optional 1-year performance summary for "1Y performance" queries
  const end = new Date();
  const start1Y = new Date(end);
  start1Y.setFullYear(start1Y.getFullYear() - 1);
  const period1Y = start1Y.toISOString().slice(0, 10);
  const period2 = end.toISOString().slice(0, 10);

  for (const { sym, label } of NIFTY_50_STOCKS) {
    try {
      const quote = (await yahooFinance.quote(sym)) as Record<string, unknown>;
      if (!quote || typeof quote !== "object") continue;
      const text = quoteToText(label, quote);
      if (text.length >= 5) {
        docs.push({
          title: `${label} (${sym})`,
          text: `${text}. Date ${d}.`,
          source: SOURCE,
          symbol: label,
        });
      }
      // One-year performance summary so RAG can answer "1 year ago to date performance"
      if (yahooFinance.historical) {
        try {
          const history = (await yahooFinance.historical(sym, { period1: period1Y, period2 })) as Array<{ date: Date | string; close?: number }>;
          if (Array.isArray(history) && history.length >= 2) {
            const sorted = [...history].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            const closeFirst = first?.close;
            const closeLast = last?.close ?? (quote?.regularMarketPrice as number | undefined);
            const dateFirst = first?.date != null ? String(first.date).slice(0, 10) : period1Y;
            const dateLast = last?.date != null ? String(last.date).slice(0, 10) : d;
            let oneYText = `${label} one-year performance: from ${dateFirst} close ${closeFirst ?? "N/A"} to ${dateLast} close ${closeLast ?? "N/A"}.`;
            if (typeof closeFirst === "number" && typeof closeLast === "number" && closeFirst > 0) {
              const pct = (((closeLast - closeFirst) / closeFirst) * 100).toFixed(2);
              oneYText += ` Return ${pct}% over the period.`;
            }
            oneYText += ` Date ${d}.`;
            docs.push({
              title: `${label} 1Y performance`,
              text: oneYText,
              source: SOURCE,
              symbol: label,
            });
          }
        } catch {
          // skip 1Y for this symbol
        }
      }
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
