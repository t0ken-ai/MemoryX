# MemoryX MCP Server

MemoryX MCP Server for Cursor, VS Code, Claude Desktop and other MCP clients.

Powered by **@t0ken.ai/memoryx-sdk**

## Features

- **save_memory**: Save important information to memory system
- **search_memory**: Search historical memories
- **get_account_info**: Get account information

## Characteristics

- Based on @t0ken.ai/memoryx-sdk
- MCP mode: LLM summarizes and sends single memory additions
- Server extracts entities directly without LLM summarization
- Trigger: 20k tokens or 1 minute idle
- Automatic retry mechanism
- Offline support

## Installation

### Option 1: NPM Install

```bash
npm install -g @t0ken.ai/memoryx-mcp-server
```

### Option 2: Install from Source

```bash
cd plugins/memoryx-mcp-server
npm install
npm run build
npm link
```

## Configuration

### Cursor / VS Code

Add to `~/.cursor/mcp.json` or VS Code MCP config:

```json
{
  "mcpServers": {
    "memoryx": {
      "command": "memoryx-mcp-server",
      "env": {
        "MEMORYX_API_KEY": "your_api_key_here",
        "MEMORYX_URL": "https://t0ken.ai/api"
      }
    }
  }
}
```

### Claude Desktop

Add to Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "memoryx": {
      "command": "memoryx-mcp-server",
      "env": {
        "MEMORYX_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Usage

### Auto Registration

If no API Key is provided, MCP Server will auto-register and generate one.

### Manual Binding

1. Visit https://t0ken.ai/portal
2. Login and copy API Key
3. Configure environment variable `MEMORYX_API_KEY`

## Local Storage

Data is stored in `~/.memoryx/mcp-server/` directory.

## MCP Mode vs OpenClaw Conversation Mode

| Feature | MCP Server | OpenClaw Plugin |
|---------|------------|-----------------|
| Data Source | LLM summarized single additions | Bidirectional conversation flow |
| Server Processing | Direct entity extraction | LLM summarization then extraction |
| Trigger Mechanism | 20k tokens / 1 min idle | 30k tokens / 5 min idle |
| Use Case | Cursor/Claude Desktop | OpenClaw Gateway |

## License

MIT