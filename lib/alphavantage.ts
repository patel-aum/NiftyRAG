/**
 * Alpha Vantage API for on-demand stock data (GLOBAL_QUOTE, TIME_SERIES_DAILY).
 * Used when ALPHA_VANTAGE_API_KEY is set to enrich context for stock-specific queries.
 * MCP server: https://mcp.alphavantage.co/ (use in Cursor/IDE via mcp.json).
 */

const BASE = "https://www.alphavantage.co/query";
const SOURCE = "Alpha Vantage";

/** Map Nifty 50 label (same as RAG symbol) to Alpha Vantage symbol (BSE). */
export const LABEL_TO_AV_SYMBOL: Record<string, string> = {
  "Adani Enterprises": "ADANIENT.BSE",
  "Adani Ports": "ADANIPORTS.BSE",
  "Apollo Hospitals": "APOLLOHOSP.BSE",
  "Asian Paints": "ASIANPAINT.BSE",
  "Axis Bank": "AXISBANK.BSE",
  "Bajaj Auto": "BAJAJ-AUTO.BSE",
  "Bajaj Finserv": "BAJAJFINSV.BSE",
  "Bajaj Finance": "BAJFINANCE.BSE",
  "Bharat Petroleum": "BPCL.BSE",
  "Bharti Airtel": "BHARTIARTL.BSE",
  "Britannia": "BRITANNIA.BSE",
  "Cipla": "CIPLA.BSE",
  "Coal India": "COALINDIA.BSE",
  "Divi's Laboratories": "DIVISLAB.BSE",
  "Dr. Reddy's": "DRREDDY.BSE",
  "Eicher Motors": "EICHERMOT.BSE",
  "Grasim": "GRASIM.BSE",
  "HCL Technologies": "HCLTECH.BSE",
  "HDFC Bank": "HDFCBANK.BSE",
  "HDFC Life": "HDFCLIFE.BSE",
  "Hero MotoCorp": "HEROMOTOCO.BSE",
  "Hindalco": "HINDALCO.BSE",
  "Hindustan Unilever": "HINDUNILVR.BSE",
  "ICICI Bank": "ICICIBANK.BSE",
  "IndusInd Bank": "INDUSINDBK.BSE",
  "Infosys": "INFY.BSE",
  "ITC": "ITC.BSE",
  "JSW Steel": "JSWSTEEL.BSE",
  "Kotak Mahindra Bank": "KOTAKBANK.BSE",
  "Larsen & Toubro": "LT.BSE",
  "LTIMindtree": "LTIM.BSE",
  "Mahindra & Mahindra": "M&M.BSE",
  "Maruti Suzuki": "MARUTI.BSE",
  "Nestle India": "NESTLEIND.BSE",
  "NTPC": "NTPC.BSE",
  "Oil and Natural Gas": "ONGC.BSE",
  "Power Grid": "POWERGRID.BSE",
  "Reliance Industries": "RELIANCE.BSE",
  "State Bank of India": "SBIN.BSE",
  "SBI Life": "SBILIFE.BSE",
  "Sun Pharma": "SUNPHARMA.BSE",
  "Tata Consumer": "TATACONSUM.BSE",
  "Tata Motors": "TATAMOTORS.BSE",
  "Tata Steel": "TATASTEEL.BSE",
  "TCS": "TCS.BSE",
  "Tech Mahindra": "TECHM.BSE",
  "Titan": "TITAN.BSE",
  "UltraTech Cement": "ULTRACEMCO.BSE",
  "Wipro": "WIPRO.BSE",
};

export function getAlphaVantageSymbol(label: string): string | null {
  return LABEL_TO_AV_SYMBOL[label] ?? null;
}

/** Fetch GLOBAL_QUOTE for one symbol. Returns a short text summary or null. */
export async function fetchGlobalQuote(
  apiKey: string,
  symbol: string
): Promise<{ title: string; text: string; source: string; symbol: string } | null> {
  const url = `${BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { "Global Quote"?: Record<string, string> };
    const q = data["Global Quote"];
    if (!q || typeof q !== "object") return null;
    const price = q["05. price"] ?? q["08. previous close"] ?? "";
    const change = q["09. change"] ?? "";
    const changePct = q["10. change percent"] ?? "";
    const high = q["03. high"] ?? "";
    const low = q["04. low"] ?? "";
    const open = q["02. open"] ?? "";
    const volume = q["06. volume"] ?? "";
    if (!price) return null;
    const parts = [
      `last price ${price}`,
      change ? `change ${change}` : "",
      changePct ? `(${changePct})` : "",
      open ? `open ${open}` : "",
      high ? `high ${high}` : "",
      low ? `low ${low}` : "",
      volume ? `volume ${volume}` : "",
    ].filter(Boolean);
    const label = Object.keys(LABEL_TO_AV_SYMBOL).find((k) => LABEL_TO_AV_SYMBOL[k] === symbol) ?? symbol;
    return {
      title: `${label} (${symbol})`,
      text: parts.join(", ") + ".",
      source: SOURCE,
      symbol: label,
    };
  } catch {
    return null;
  }
}

/** Fetch TIME_SERIES_DAILY (compact = last 100 points) and return 1Y-style summary. */
export async function fetchTimeSeriesDailySummary(
  apiKey: string,
  symbol: string,
  label: string
): Promise<{ title: string; text: string; source: string; symbol: string } | null> {
  const url = `${BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${apiKey}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { "Time Series (Daily)"?: Record<string, Record<string, string>> };
    const series = data["Time Series (Daily)"];
    if (!series || typeof series !== "object") return null;
    const dates = Object.keys(series).sort();
    if (dates.length < 2) return null;
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const firstClose = parseFloat(series[firstDate]?.["4. close"] ?? "0");
    const lastClose = parseFloat(series[lastDate]?.["4. close"] ?? "0");
    if (firstClose <= 0) return null;
    const pct = (((lastClose - firstClose) / firstClose) * 100).toFixed(2);
    const text = `${label} daily series: from ${firstDate} close ${firstClose} to ${lastDate} close ${lastClose}. Return ${pct}% over ${dates.length} trading days.`;
    return {
      title: `${label} daily series`,
      text,
      source: SOURCE,
      symbol: label,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch live quote + recent daily series for one stock (for on-demand context).
 * Use when user asks about a specific Nifty 50 stock and ALPHA_VANTAGE_API_KEY is set.
 */
export async function fetchStockContext(
  apiKey: string,
  label: string
): Promise<Array<{ title: string; text: string; source: string; symbol: string }>> {
  const symbol = getAlphaVantageSymbol(label);
  if (!symbol) return [];
  const out: Array<{ title: string; text: string; source: string; symbol: string }> = [];
  const [quote, series] = await Promise.all([
    fetchGlobalQuote(apiKey, symbol),
    fetchTimeSeriesDailySummary(apiKey, symbol, label),
  ]);
  if (quote) out.push(quote);
  if (series) out.push(series);
  return out;
}
