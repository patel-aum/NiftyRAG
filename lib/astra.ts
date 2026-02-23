import { DataAPIClient } from "@datastax/astra-db-ts";
import { EMBEDDING_DIMENSION } from "./embed";

const COLLECTION_NAME = "niftyrag_chunks";
const KEYSPACE = "default_keyspace";

export interface NiftyChunk {
  _id?: string;
  text: string;
  source: string;
  date: string;
  symbol?: string;
  $vector: number[];
}

function getDb() {
  const endpoint = process.env.ASTRA_DB_API_ENDPOINT;
  const token = process.env.ASTRA_DB_APPLICATION_TOKEN;
  if (!endpoint || !token) throw new Error("ASTRA_DB_API_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN must be set");
  const client = new DataAPIClient();
  return client.db(endpoint, { token });
}

export async function ensureCollection(): Promise<void> {
  const db = getDb();
  const collections = await db.listCollections();
  if (collections.some((c) => c.name === COLLECTION_NAME)) return;
  await db.createCollection(COLLECTION_NAME, {
    vector: { dimension: EMBEDDING_DIMENSION, metric: "cosine" },
  });
}

export async function upsertChunks(chunks: NiftyChunk[]): Promise<void> {
  if (chunks.length === 0) return;
  const db = getDb();
  const coll = db.collection<NiftyChunk>(COLLECTION_NAME);
  await coll.insertMany(chunks);
}

export async function similaritySearch(
  vector: number[],
  limit: number = 5
): Promise<Array<{ text: string; source: string; date: string; symbol?: string; similarity?: number }>> {
  const db = getDb();
  const coll = db.collection<NiftyChunk>(COLLECTION_NAME);
  const cursor = coll
    .find({})
    .sort({ $vector: vector })
    .limit(limit)
    .includeSimilarity();
  const out: Array<{ text: string; source: string; date: string; symbol?: string; similarity?: number }> = [];
  for await (const doc of cursor) {
    out.push({
      text: doc.text,
      source: doc.source,
      date: doc.date,
      symbol: doc.symbol,
      similarity: (doc as { $similarity?: number }).$similarity,
    });
  }
  return out;
}

export function isAstraConfigured(): boolean {
  return Boolean(process.env.ASTRA_DB_API_ENDPOINT && process.env.ASTRA_DB_APPLICATION_TOKEN);
}
