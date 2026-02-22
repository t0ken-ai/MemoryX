# MemoryX MCP Server

MemoryX MCP Server 用于 Cursor、VS Code、Claude Desktop 等 MCP 客户端。

## 功能

- **save_memory**: 保存重要信息到记忆系统
- **search_memory**: 搜索历史记忆
- **get_account_info**: 获取账户信息

## 特点

- 本地 SQLite 队列存储
- 按 conversation 分组批量发送
- 自动重试机制
- 离线支持

## 安装

### 方式一：NPM 安装

```bash
npm install -g @t0ken/memoryx-mcp-server
```

### 方式二：从源码安装

```bash
cd plugins/memoryx-mcp-server
npm install
npm run build
npm link
```

## 配置

### Cursor / VS Code

在 `~/.cursor/mcp.json` 或 VS Code 的 MCP 配置中添加：

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

在 Claude Desktop 配置文件中添加：

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

## 使用

### 自动注册

如果没有提供 API Key，MCP Server 会自动注册并生成一个。

### 手动绑定

1. 访问 https://t0ken.ai/portal
2. 登录后复制 API Key
3. 配置到环境变量 `MEMORYX_API_KEY`

## 本地存储

数据存储在 `~/.memoryx/mcp-server/` 目录：

- `memoryx.db` - SQLite 数据库（消息队列）
- `mcp-server.log` - 日志文件

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server 架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  save_memory ──→ SQLite 本地队列 ──→ 定时批量发送 ──→ API   │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ MCP Tools   │───→│ send_queue   │───→│ /conversations│  │
│  │             │    │ 表           │    │ /flush        │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│                                                             │
│  特点：                                                     │
│  • 每条消息先存本地 SQLite                                   │
│  • 按 conversation_id 分组                                  │
│  • 2 轮对话后触发发送                                        │
│  • 定时器每 5 秒检查队列                                     │
│  • 失败重试最多 5 次                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## License

MIT
