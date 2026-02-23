/**
 * Step 1: Embeddings
 * Verifies OpenAI text-embedding-3-small works.
 * Run: npm run test:embeddings
 * Requires: OPENAI_API_KEY in .env.local
 */
import { describe, it, expect } from "vitest";
import { embedText, embedMany, EMBEDDING_DIMENSION } from "@/lib/embed";

describe("Embeddings (OpenAI text-embedding-3-small)", () => {
  it("should have OPENAI_API_KEY set", () => {
    expect(process.env.OPENAI_API_KEY).toBeDefined();
    expect(process.env.OPENAI_API_KEY!.length).toBeGreaterThan(0);
  });

  it("embedText returns a vector of correct dimension", async () => {
    const vector = await embedText("Nifty 50 index forecast");
    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBe(EMBEDDING_DIMENSION);
    expect(vector.every((x) => typeof x === "number")).toBe(true);
  });

  it("embedMany returns one vector per input", async () => {
    const texts = ["Reliance stock", "HDFC Bank"];
    const vectors = await embedMany(texts);
    expect(vectors.length).toBe(texts.length);
    vectors.forEach((v) => {
      expect(v.length).toBe(EMBEDDING_DIMENSION);
      expect(v.every((x) => typeof x === "number")).toBe(true);
    });
  });

  it("embedMany with empty array returns empty", async () => {
    const vectors = await embedMany([]);
    expect(vectors).toEqual([]);
  });
});
