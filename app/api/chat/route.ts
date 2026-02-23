import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { embedText } from "@/lib/embed";
import { similaritySearch, similaritySearchBySymbol, isAstraConfigured } from "@/lib/astra";
import { buildRagSystemPrompt } from "@/lib/prompt";
import { runIngest } from "@/lib/ingest";
import { getStockLabelFromQuery } from "@/lib/yahoo";

const RATE_LIMIT_REQUESTS = 30;
/** Only auto-run ingest once per process when retrieval returns 0 hits (avoids re-ingesting on every unrelated query). */
let hasAutoIngestedThisProcess = false;
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

    let context = "";
    let hasNoHits = true;
    if (isAstraConfigured() && apiKey) {
      try {
        let queryVector = await embedText(question);
        let hits = await similaritySearch(queryVector, 10);
        // First prompt with empty index: auto-load Nifty data once, then re-retrieve
        if (hits.length === 0 && !hasAutoIngestedThisProcess) {
          hasAutoIngestedThisProcess = true;
          try {
            await runIngest();
            queryVector = await embedText(question);
            hits = await similaritySearch(queryVector, 10);
          } catch (ingestErr) {
            console.warn("[NiftyRAG] Auto-ingest on first prompt failed:", ingestErr);
          }
        }
        // When the user clearly asks about a stock (e.g. "mahindra and mahindra forecast"), ensure we include chunks for that symbol
        const stockLabel = getStockLabelFromQuery(question);
        if (stockLabel) {
          const bySymbol = await similaritySearchBySymbol(queryVector, stockLabel, 5);
          const seen = new Set(hits.map((h) => h.text));
          for (const h of bySymbol) {
            if (!seen.has(h.text)) {
              seen.add(h.text);
              hits.push(h);
            }
          }
        }
        hasNoHits = hits.length === 0;
        context = hits
          .map((h, i) => `[${i + 1}] (${h.source}, ${h.date}) ${h.text}`)
          .join("\n\n");
      } catch (e) {
        context = `(Retrieval failed: ${e instanceof Error ? e.message : "unknown"}. Proceed with no context.)`;
      }
    } else {
      context =
        "(Vector DB not configured. Add ASTRA_DB_* for RAG. Using general knowledge only.)";
    }

    const systemPrompt = buildRagSystemPrompt(context, question, hasNoHits);

    const chatMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // OpenAI (or compatible) chat model: gpt-4o, gpt-4.1-mini, gpt-5-mini, etc.
    const modelId = process.env.OPENAI_CHAT_MODEL || "gpt-4o";
    const { text } = await generateText({
      model: openai(modelId),
      system: systemPrompt,
      messages: chatMessages,
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
