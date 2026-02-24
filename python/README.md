# Python + mcp-use (MCP without a separate client)

[mcp-use](https://pypi.org/project/mcp-use/) lets you use MCP servers **without running a traditional MCP client**. The **MCPAgent** connects to MCP servers and uses their tools via an LLM; no separate client app is needed.

## Install

```bash
# From project root
cd python
pip install -r requirements.txt
# or with uv:
uv pip install -r requirements.txt
```

Set `OPENAI_API_KEY` in `.env` (or export) for the agent LLM.

## Use NiftyRAG MCP via mcp-use

Point **MCPClient** at your NiftyRAG MCP server (local or Cloudflare). The agent will use the server’s tools (add, calculate, rag_health, echo) without a separate client:

```python
import asyncio
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from mcp_use import MCPAgent, MCPClient

load_dotenv()

async def main():
    # Local: http://localhost:8787/mcp  or  Deployed: https://niftyrag-mcp-server.<YOUR_SUBDOMAIN>.workers.dev/mcp
    config = {
        "mcpServers": {
            "niftyrag-mcp": {
                "url": os.getenv("MCP_URL", "http://localhost:8787/mcp")
            }
        }
    }
    client = MCPClient.from_dict(config)
    llm = ChatOpenAI(model="gpt-4o")
    agent = MCPAgent(llm=llm, client=client, max_steps=10)
    result = await agent.run("Use the calculator tool to add 23 and 19.")
    print(result)
    await client.close_all_sessions()

if __name__ == "__main__":
    asyncio.run(main())
```

Run the NiftyRAG MCP server first (`cd mcp && npm run dev`), then run this script. No Cursor or other MCP client required—mcp-use handles the connection and tool use.
