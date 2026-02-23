# NiftyRAG – Test suite (step-by-step)

Run in this order to validate the RAG pipeline before integrating in the app.

## Prerequisites

- Copy `.env.example` to `.env.local` and set at least:
  - **Step 1:** `OPENAI_API_KEY` (OpenAI for embeddings)
  - **Step 2:** `OPENAI_API_KEY` (same key for chat + embeddings)
  - **Step 3:** `ASTRA_DB_API_ENDPOINT`, `ASTRA_DB_APPLICATION_TOKEN` (for RAG retrieval)

## Order

| Step | What it checks | Command |
|------|----------------|--------|
| **1. Embeddings** | OpenAI `text-embedding-3-small` returns 1536-d vectors | `npm run test:embeddings` |
| **2. Model** | OpenAI chat model (gpt-4o etc.) responds | `npm run test:model` |
| **3. RAG** | Prompt builder + (optional) Astra similarity search | `npm run test` (runs all, or run `rag.integration.test.ts`) |

## Commands

- `npm run test` – run all tests once
- `npm run test:watch` – run tests in watch mode
- `npm run test:embeddings` – only embeddings
- `npm run test:model` – only model

## If a step fails

- **Embeddings:** Check `OPENAI_API_KEY` and network. Ensure the key can call the Embeddings API.
- **Model:** Check `OPENAI_API_KEY`. Use `OPENAI_CHAT_MODEL` to switch model (e.g. gpt-4.1-mini, gpt-5-mini). Quota/rate limits depend on your OpenAI (or provider) plan.
- **RAG:** Step 3’s Astra test is skipped if Astra env vars are missing. Run ingest once (`npm run ingest`) so the collection has data, then re-run tests.
