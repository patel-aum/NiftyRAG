/**
 * Step 3: RAG integration (run after embeddings + model tests pass)
 * Verifies: embed query → similarity search (Astra) → build prompt → (model already tested).
 * Run: npm run test (or vitest run tests/rag.integration.test.ts)
 * Requires: OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, ASTRA_DB_* in .env.local
 */
import { describe, it, expect } from "vitest";
import { embedText } from "@/lib/embed";
import { similaritySearch, isAstraConfigured } from "@/lib/astra";
import { buildRagSystemPrompt } from "@/lib/prompt";

describe("RAG integration", () => {
  it("buildRagSystemPrompt includes context and question", () => {
    const prompt = buildRagSystemPrompt("Some context.", "What is Nifty?");
    expect(prompt).toContain("Some context.");
    expect(prompt).toContain("What is Nifty?");
    expect(prompt).toContain("NiftyRAG");
  });

  it("when Astra is configured, similaritySearch returns chunks", async () => {
    if (!isAstraConfigured()) {
      console.warn("Skipping: ASTRA_DB_* not set");
      return;
    }
    const vector = await embedText("Nifty 50 forecast");
    const hits = await similaritySearch(vector, 3);
    expect(Array.isArray(hits)).toBe(true);
    hits.forEach((h) => {
      expect(typeof h.text).toBe("string");
      expect(typeof h.source).toBe("string");
      expect(typeof h.date).toBe("string");
    });
  });
});
