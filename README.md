# NiftyRAG

Production-ready **RAG chatbot** for real-time **NSE Nifty 50** stock analysis. Built with Next.js 15, Vercel AI SDK, **OpenAI** (chat + embeddings), and DataStax Astra DB (vector store).

## Features

- **Chat UI** with streaming responses (Tailwind + shadcn-style components)
- **Data source**: **Yahoo Finance** for real Nifty 50 index (^NSEI) and Nifty 50 stocks (TCS, Reliance, HDFC Bank, Infosys, etc.) — no API key
- **RAG pipeline**: user query → OpenAI embed → Astra cosine search (top-8) → augmented prompt → **OpenAI** (gpt-4o etc.) response
- **Auto-load on first prompt**: if the vector index is empty, the first chat request triggers ingest once, then answers using the new data
- **Daily ingest**: Yahoo Finance (Nifty 50 index + stocks) + NSE RSS + fallback mock → chunk → embed → upsert to Astra
- **Vercel Cron**: daily refresh at 6:00 UTC (`/api/ingest`) so the knowledge base stays up to date
- **Demo queries**: e.g. "Nifty 50 forecast Feb 2026", "Reliance recent performance?"

## Setup

### 1. Clone and install

```bash
cd RaG
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | **Required.** OpenAI API key for **chat** (gpt-4o etc.) and **embeddings** (text-embedding-3-small) |
| `OPENAI_CHAT_MODEL` | (Optional) Chat model; default `gpt-4o`. Others: gpt-4.1-mini, gpt-4.1-nano, gpt-5-mini, gpt-5-nano, o4-mini |
| `ASTRA_DB_API_ENDPOINT` | DataStax Astra DB Serverless endpoint (e.g. `https://<id>-<region>.apps.astra.datastax.com`) |
| `ASTRA_DB_APPLICATION_TOKEN` | Astra application token |
| `CRON_SECRET` | (Optional) Secret for securing cron-triggered ingest on Vercel |

Nifty 50 and stock data come from **Yahoo Finance** (no API key). NSE RSS is fetched when available; mock data is used only if Yahoo fails.

Do not commit `.env.local`.

### 3. Astra DB (free tier)

1. Create a [Serverless (vector) database](https://astra.datastax.com/).
2. Create an application token with **Database Administrator** (or sufficient permissions).
3. Copy **Data API endpoint** and **token** into `.env.local`.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set `OPENAI_API_KEY` for chat and embeddings. For **RAG** (context from Nifty data), also set Astra env vars and run ingest once.

### 5. Test the pipeline (step-by-step)

Validate each part before relying on the full RAG in the UI:

1. **Embeddings:** `npm run test:embeddings` (needs `OPENAI_API_KEY`)
2. **Model:** `npm run test:model` (needs `OPENAI_API_KEY`)
3. **RAG:** `npm run test` to run all tests (Astra tests skip if env not set)

See [tests/README.md](tests/README.md) for details.

### 6. Ingest data (for RAG)

With Astra + OpenAI configured:

- **Automatic on first prompt**: The first time you ask a question, if the index is empty, the app runs ingest once and then answers (no need to click "Load Nifty data" unless you prefer).
- **Manual**: `npm run ingest` or **Load Nifty data** in the UI
- **HTTP**: `GET /api/ingest` (optional: `Authorization: Bearer <CRON_SECRET>`)
- **Scheduled (recommended)**: Vercel Cron runs `GET /api/ingest` daily at 6:00 UTC so data stays fresh.

## How RAG works (and why a daily crawl helps)

**RAG (Retrieval Augmented Generation)** in this app:

1. **Indexing (ingest)**  
   Documents (Yahoo Finance Nifty 50 + stocks, NSE RSS, and fallback mock) are split into chunks, embedded with OpenAI, and stored in Astra DB. The vector index is a snapshot of what was ingested.

2. **At query time**  
   The user question is embedded, Astra returns the top-8 most similar chunks (cosine similarity), and those chunks are added to the LLM system prompt. The model answers using that context and cites sources.

3. **Freshness**  
   The model only “sees” what’s in the index. If you never re-run ingest, the context stays old. For Nifty levels, news, and gainers/losers, **a scheduled daily ingest** (e.g. the existing Vercel Cron at 6:00 UTC) is the normal approach: each day the cron hits `/api/ingest`, which re-fetches and re-indexes data so the next chat uses updated content. You can keep the daily schedule, add more sources in `lib/ingest.ts`, or run ingest more often if you need fresher data (respecting API rate limits).

## Deploy to Vercel (free tier)

1. Push to GitHub and import the repo in Vercel.
2. Add the same env vars in **Project → Settings → Environment Variables**.
3. Deploy. Cron will run on the free tier (see [Vercel Cron](https://vercel.com/docs/cron-jobs)).

## Project structure

- `tests/` – Step-by-step tests: embeddings → model → RAG (see [tests/README.md](tests/README.md))
- `app/page.tsx` – Chat interface (useChat, demo queries)
- `app/api/chat/route.ts` – RAG handler: embed query → Astra search → OpenAI generateText
- `app/api/ingest/route.ts` – Data loader endpoint (cron or manual)
- `lib/astra.ts` – Astra DB client (upsert, similarity search)
- `lib/embed.ts` – OpenAI text-embedding-3-small
- `lib/ingest.ts` – Fetch Yahoo Finance (Nifty 50 + stocks) + NSE RSS + fallback mock, chunk, embed, upsert
- `lib/prompt.ts` – RAG system prompt (context + question → NiftyRAG instructions)

## Rate limits and errors

- Chat: 30 requests per minute per process; 429 when exceeded.
- Ingest: use cron or manual run; avoid calling repeatedly without need.

## License

MIT.
