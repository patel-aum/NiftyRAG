/**
 * Manual ingest script: run with `npm run ingest` (or `npx tsx scripts/ingest.ts`).
 * Loads .env.local then .env from project root.
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

async function main() {
  const mod = await import("../lib/ingest");
  const astra = await import("../lib/astra");
  if (!astra.isAstraConfigured()) {
    console.error("Set ASTRA_DB_API_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("Set OPENAI_API_KEY");
    process.exit(1);
  }
  const result = await mod.runIngest();
  console.log("Ingest done:", result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
