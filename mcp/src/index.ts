import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

/**
 * NiftyRAG MCP Server — runs on Cloudflare Workers.
 * Exposes a health check so clients can verify connectivity. Nifty/stock data is provided
 * by the Next.js app (live tools first, DB second); use the app or Cursor for search.
 * @see https://developers.cloudflare.com/agents/guides/remote-mcp-server/
 */
export class NiftyRAGMcp extends McpAgent {
  server = new McpServer({
    name: "NiftyRAG MCP",
    version: "1.0.0",
  });

  async init() {
    this.server.tool(
      "mcp_health",
      { message: z.string().optional() },
      async ({ message }) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              service: "NiftyRAG MCP",
              message: message ?? "MCP reachable. For Nifty 50 and stock data, use the NiftyRAG app (live tools first, DB second).",
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      })
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/mcp") {
      return NiftyRAGMcp.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
