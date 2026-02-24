import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildAgentTools } from "@/lib/agent-tools";
import { AGENT_SYSTEM_PROMPT } from "@/lib/prompt";

const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const store: { count: number; resetAt: number } = { count: 0, resetAt: Date.now() + RATE_LIMIT_WINDOW_MS };

function rateLimit(): boolean {
  const now = Date.now();
  if (now >= store.resetAt) {
    store.count = 0;
    store.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  store.count++;
  return store.count <= RATE_LIMIT_REQUESTS;
}

export async function POST(req: Request) {
  if (!rateLimit()) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not set (required for chat and embeddings)" },
      { status: 503 }
    );
  }

  try {
    const { messages } = (await req.json()) as { messages: Array<{ role: string; content: string }> };
    const last = messages?.filter((m) => m.role === "user").pop();
    const question = (last?.content ?? "").trim();
    if (!question) {
      return Response.json({ error: "Empty message" }, { status: 400 });
    }

    const chatMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const modelId = process.env.OPENAI_CHAT_MODEL || "gpt-4o";
    const tools = buildAgentTools();

    const { text } = await generateText({
      model: openai(modelId),
      system: AGENT_SYSTEM_PROMPT,
      messages: chatMessages,
      tools,
      maxSteps: 5,
      maxTokens: 1024,
    });

    return Response.json({ content: text });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const message =
      err &&
      typeof err === "object" &&
      "lastError" in err &&
      err.lastError instanceof Error
        ? err.lastError.message
        : raw;
    console.error("[NiftyRAG chat error]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
