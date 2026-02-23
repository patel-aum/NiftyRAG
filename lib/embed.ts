import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 1536;

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8191),
  });
  const v = res.data[0]?.embedding;
  if (!v || v.length !== EMBEDDING_DIMENSION) throw new Error("Invalid embedding");
  return v;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const batch = texts.map((t) => t.slice(0, 8191));
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: batch,
  });
  const sorted = res.data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return sorted.map((d) => d.embedding);
}
