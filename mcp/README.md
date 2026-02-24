# NiftyRAG MCP Server (Cloudflare Workers)

Remote [MCP](https://modelcontextprotocol.io/) server for NiftyRAG. Deploy to Cloudflare so your RAG app (or any MCP client) can call tools over HTTP.

Based on [Build a Remote MCP server](https://developers.cloudflare.com/agents/guides/remote-mcp-server/) and the [remote-mcp-authless](https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless) demo.

## Tools

- **mcp_health** — optional `message` → JSON with `ok`, `service`, `timestamp`. Use to verify the MCP server is reachable. Nifty 50 and stock data are provided by the Next.js app (MCP first, DB second); use the app or Cursor for search.

Add more tools in `src/index.ts` inside `init()` with `this.server.tool(...)` if needed.

## Local development

```bash
cd mcp
npm install
npm run dev
```

MCP endpoint: **http://localhost:8787/mcp** (port may differ; check terminal).

Test with [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector@latest
```

Connect to `http://localhost:8787/mcp` and list tools.

## Deploy to Cloudflare

1. Install [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (included as dev dependency).
2. Log in (once): `npx wrangler login`
3. Deploy:

```bash
cd mcp
npm run deploy
```

Your server will be at:

**https://niftyrag-mcp-server.<YOUR_SUBDOMAIN>.workers.dev/mcp**

Use this URL so your RAG can access the MCP (e.g. from a server-side client or via [mcp-remote](https://www.npmjs.com/package/mcp-remote) in Cursor/Claude).

## Letting RAG access this MCP

- **From the Next.js RAG app**: Call the deployed MCP URL with an MCP HTTP client (Streamable HTTP). You can use the `@modelcontextprotocol/sdk` client or a small fetch-based client that speaks the [MCP protocol](https://spec.modelcontextprotocol.io/).
- **From Cursor/Claude**: In MCP config use the remote URL with a proxy if needed:

```json
{
  "mcpServers": {
    "niftyrag-mcp": {
      "command": "npx",
      "args": ["mcp-remote", "https://niftyrag-mcp-server.YOUR_SUBDOMAIN.workers.dev/mcp"]
    }
  }
}
```

Replace `YOUR_SUBDOMAIN` with your Cloudflare account subdomain (e.g. `your-account.workers.dev`).

## uv (Python)

This MCP server is TypeScript/Cloudflare. For [uv](https://github.com/astral-sh/uv) (Python package manager), install it once on your machine:

- **Windows (PowerShell):**  
  `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
- **macOS/Linux:**  
  `curl -LsSf https://astral.sh/uv/install.sh | sh`

Use uv for Python-based scripts or a future Python MCP server if you add one.
