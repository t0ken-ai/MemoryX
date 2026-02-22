# MemoryX - VS Code Extension

Persistent memory for your VS Code conversations. Auto-capture and recall context with `@memoryx`.

## Features

- **Auto Capture**: Automatically saves conversation history when you use `@memoryx`
- **Auto Recall**: Searches and displays relevant memories based on your query
- **Zero Config**: Works out of the box with auto-registration
- **Powered by SDK**: Built on `@t0ken.ai/memoryx-sdk`

## Usage

Just type `@memoryx` in VS Code's Chat view (Ctrl/Cmd + Shift + I):

```
@memoryx Help me write a login function
```

MemoryX will:
1. Search for relevant memories (e.g., "User prefers JWT auth", "Project uses TypeScript")
2. Display them in the chat
3. Automatically capture the conversation

### Commands

| Command | Description |
|---------|-------------|
| `@memoryx` | Auto capture + recall (default) |
| `@memoryx /search <query>` | Search memories |
| `@memoryx /list` | List recent memories |
| `@memoryx /remember` | Manually save current conversation |
| `@memoryx /clear` | Clear all memories |

## Configuration

Go to VS Code Settings and search for "MemoryX":

| Setting | Description | Default |
|---------|-------------|---------|
| `memoryx.apiUrl` | MemoryX API URL | `https://t0ken.ai/api` |
| `memoryx.apiKey` | API Key (leave empty for auto-registration) | `""` |
| `memoryx.autoCapture` | Auto capture conversations | `true` |
| `memoryx.autoRecall` | Auto search and display memories | `true` |

## How It Works

```
User: @memoryx 帮我写一个登录函数

@memoryx:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💡 Relevant Memories:
  • [preference] User prefers JWT authentication
  • [fact] Project uses TypeScript
  
  ✅ Conversation captured (5 messages in queue)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Installation

### From VS Code Marketplace

1. Open Extensions (Ctrl/Cmd + Shift + X)
2. Search for "MemoryX"
3. Click Install

### From Source

```bash
cd plugins/memoryx-vscode-extension
npm install
npm run build
# Then use "Extensions: Install from VSIX" command
```

## Requirements

- VS Code 1.90.0 or higher
- Node.js 18.0.0 or higher

## License

MIT