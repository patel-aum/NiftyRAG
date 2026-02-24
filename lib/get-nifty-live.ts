/**
 * Live NIFTY 50 (^NSEI) price and day change from Yahoo Finance.
 * Used by the agentic chat as the get_nifty_live tool (real-time delta).
 */

const NIFTY_INDEX = "^NSEI";

export interface NiftyLiveResult {
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  status: string;
}

export async function getNiftyLive(): Promise<NiftyLiveResult | null> {
  try {
    const mod = await import("yahoo-finance2");
    const yahoo = (mod.default ?? mod) as {
      quote: (symbol: string) => Promise<Record<string, unknown>>;
    };
    const q = await yahoo.quote(NIFTY_INDEX);
    if (!q || typeof q !== "object") return null;
    const price = Number(q.regularMarketPrice ?? q.regularMarketPreviousClose ?? 0);
    const open = Number(q.regularMarketOpen ?? q.previousClose ?? price);
    const change = Number(q.regularMarketChange ?? price - open);
    const changePercent = Number(q.regularMarketChangePercent ?? (open ? (change / open) * 100 : 0));
    const high = Number(q.regularMarketDayHigh ?? 0);
    const low = Number(q.regularMarketDayLow ?? 0);
    if (!price) return null;
    return {
      price,
      change,
      changePercent,
      open,
      high,
      low,
      status: "Live from Yahoo Finance",
    };
  } catch {
    return null;
  }
}
