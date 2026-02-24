/**
 * One-off test: fetch HCLTECH.NS quote via yahoo-finance2 to see why it fails.
 * Run: npx tsx scripts/test-yahoo-quote.ts
 */
async function main() {
  const sym = "HCLTECH.NS";
  console.log("Fetching quote for", sym, "...");
  try {
    const mod = await import("yahoo-finance2");
    const YahooFinance = mod.default ?? mod;
    const yahoo = new YahooFinance();
    if (typeof yahoo.quote !== "function") {
      console.error("yahoo.quote is not a function:", typeof yahoo.quote);
      return;
    }
    const q = await yahoo.quote(sym);
    console.log("Raw quote result:", q === null ? "null" : typeof q);
    if (q && typeof q === "object") {
      console.log("regularMarketPrice:", (q as Record<string, unknown>).regularMarketPrice);
      console.log("Keys (first 15):", Object.keys(q).slice(0, 15));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
