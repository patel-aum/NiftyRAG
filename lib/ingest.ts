import { embedMany } from "./embed";
import { ensureCollection, upsertChunks, type NiftyChunk } from "./astra";
import { fetchYahooNiftyData } from "./yahoo";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 80;

function* chunkText(text: string, maxLen: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): Generator<string> {
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxLen, text.length);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    yield text.slice(start, end).trim();
    start = end - (end - start > overlap ? overlap : 0);
    if (start >= text.length) break;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Mock Nifty 50 data when no API keys – enough for demo RAG */
export function getMockNiftyData(): Array<{ title: string; text: string; source: string; symbol?: string }> {
  const d = todayISO();
  return [
    {
      title: "Nifty 50 index levels",
      text: "Nifty 50 closed near 24,200 levels. Support at 24,000 and resistance at 24,500. February 2026 outlook remains cautious amid global volatility.",
      source: "Mock NSE Summary",
      symbol: "NIFTY 50",
    },
    {
      title: "Reliance Industries",
      text: "Reliance Industries (RELIANCE) recent performance: stock has been range-bound. Key levels 1,200–1,250. News: Jio and retail segments driving growth.",
      source: "Mock Stock Digest",
      symbol: "RELIANCE",
    },
    {
      title: "Nifty 50 forecast Feb 2026",
      text: "Nifty 50 forecast for February 2026: analysts cite 24,000–24,800 range. Earnings season and budget to drive direction. FII flows improving.",
      source: "Mock Market Outlook",
      symbol: "NIFTY 50",
    },
    {
      title: "Banking and IT sectors",
      text: "Bank Nifty underperformed. IT stocks stable. HDFC Bank and Infosys among top movers in the Nifty 50 basket.",
      source: "Mock Sector Update",
    },
  ];
}

/** Fetch NSE India RSS (circuit breaker + rate limit friendly) */
export async function fetchNseRssItems(limit: number = 20): Promise<Array<{ title: string; link: string; pubDate: string; description: string }>> {
  const url = "https://www.nseindia.com/feed";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NiftyRAG/1.0 (RAG bot; contact@example.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];
    const titleMatch = xml.matchAll(/<title>([^<]+)<\/title>/g);
    const linkMatch = xml.matchAll(/<link>([^<]+)<\/link>/g);
    const descMatch = xml.matchAll(/<description>([^<]*)<\/description>/g);
    const dateMatch = xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g);
    const titles = [...titleMatch].map((m) => m[1]);
    const links = [...linkMatch].map((m) => m[1]);
    const descs = [...descMatch].map((m) => m[1]);
    const dates = [...dateMatch].map((m) => m[1]);
    for (let i = 0; i < Math.min(limit, titles.length, links.length); i++) {
      items.push({
        title: titles[i] ?? "",
        link: links[i] ?? "",
        pubDate: dates[i] ?? "",
        description: descs[i] ?? "",
      });
    }
    return items;
  } catch {
    return [];
  }
}

/** Alpha Vantage TOP_GAINERS_LOSERS or TIME_SERIES_DAILY – free tier 5/min */
export async function fetchAlphaVantageNifty(apiKey: string): Promise<Array<{ title: string; text: string; source: string }>> {
  const base = "https://www.alphavantage.co/query";
  const entries: Array<{ title: string; text: string; source: string }> = [];
  try {
    const url = `${base}?function=TOP_GAINERS_LOSERS&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return entries;
    const data = (await res.json()) as {
      metadata?: string;
      top_gainers?: Array<{ ticker: string; price: string; change_percentage: string }>;
      top_losers?: Array<{ ticker: string; price: string; change_percentage: string }>;
    };
    const d = todayISO();
    if (Array.isArray(data.top_gainers)) {
      for (const g of data.top_gainers.slice(0, 10)) {
        entries.push({
          title: `Top gainer: ${g.ticker}`,
          text: `${g.ticker} price ${g.price}, change ${g.change_percentage}.`,
          source: `Alpha Vantage Top Gainers (${d})`,
        });
      }
    }
    if (Array.isArray(data.top_losers)) {
      for (const l of data.top_losers.slice(0, 10)) {
        entries.push({
          title: `Top loser: ${l.ticker}`,
          text: `${l.ticker} price ${l.price}, change ${l.change_percentage}.`,
          source: `Alpha Vantage Top Losers (${d})`,
        });
      }
    }
  } catch {
    // ignore
  }
  return entries;
}

export async function runIngest(): Promise<{ chunksCreated: number; sources: string }> {
  const docList: Array<{ title: string; text: string; source: string; symbol?: string }> = [];

  try {
    const yahooDocs = await fetchYahooNiftyData();
    if (yahooDocs.length > 0) docList.push(...yahooDocs);
  } catch {
    // fall back to mock when Yahoo fails
  }

  if (docList.length === 0) {
    const mock = getMockNiftyData();
    docList.push(...mock);
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (apiKey) {
    const alpha = await fetchAlphaVantageNifty(apiKey);
    docList.push(...alpha.map((a) => ({ ...a, symbol: undefined })));
  }

  try {
    const rss = await fetchNseRssItems(15);
    const d = todayISO();
    for (const item of rss) {
      docList.push({
        title: item.title,
        text: [item.title, item.description].filter(Boolean).join(" "),
        source: `NSE RSS (${d})`,
      });
    }
  } catch {
    // keep mock + Alpha only
  }

  const allChunks: Array<{ text: string; source: string; date: string; symbol?: string }> = [];
  for (const doc of docList) {
    const full = [doc.title, doc.text].filter(Boolean).join("\n");
    for (const t of chunkText(full)) {
      if (t.length > 20) allChunks.push({ text: t, source: doc.source, date: todayISO(), symbol: doc.symbol });
    }
  }

  if (allChunks.length === 0) return { chunksCreated: 0, sources: "mock" };

  const texts = allChunks.map((c) => c.text);
  const vectors = await embedMany(texts);

  const withVectors: NiftyChunk[] = allChunks.map((c, i) => ({
    ...c,
    $vector: vectors[i] ?? new Array(1536).fill(0),
  }));

  await ensureCollection();
  await upsertChunks(withVectors);

  const sources = [...new Set(docList.map((d) => d.source))].join(", ");
  return { chunksCreated: withVectors.length, sources };
}
