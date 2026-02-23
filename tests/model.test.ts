/**
 * Step 2: Model (OpenAI chat)
 * Verifies the chat model responds (gpt-4o, gpt-4.1-mini, etc.).
 * Run: npm run test:model
 * Requires: OPENAI_API_KEY in .env.local
 */
import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const MODEL_ID = process.env.OPENAI_CHAT_MODEL || "gpt-4o";

describe("Model (OpenAI chat)", () => {
  it("should have OPENAI_API_KEY set", () => {
    expect(process.env.OPENAI_API_KEY).toBeDefined();
    expect(process.env.OPENAI_API_KEY!.length).toBeGreaterThan(0);
  });

  it("Chat model returns non-empty text for a simple prompt", async () => {
    const { text, finishReason } = await generateText({
      model: openai(MODEL_ID),
      prompt: "Reply with exactly: OK",
      maxTokens: 50,
    });
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
    expect(finishReason).toBeDefined();
  });
});
