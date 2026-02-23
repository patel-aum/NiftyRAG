import { runIngest } from "@/lib/ingest";
import { isAstraConfigured } from "@/lib/astra";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isAstraConfigured()) {
    return Response.json({
      ok: false,
      error: "ASTRA_DB_API_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN required",
    });
  }
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ ok: false, error: "OPENAI_API_KEY required for ingest" });
  }

  try {
    const { chunksCreated, sources } = await runIngest();
    return Response.json({ ok: true, chunksCreated, sources });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ingest failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
