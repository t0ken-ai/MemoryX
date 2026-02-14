# MemoryX OpenClaw Hook

JavaScript/TypeScript Hook for OpenClaw Gateway.

## Installation

```bash
npm install -g @memoryx/openclaw-hook
```

Or let the Python SDK install it automatically:

```python
from memoryx import connect_memory
memory = connect_memory()
memory.install_openclaw_hook()
```

## Compatibility

- OpenClaw Gateway >= 2026.2.9
- Works alongside `memoryx-realtime-plugin` (will auto-disable if plugin is present)

## Features

- Auto-captures important messages to MemoryX
- Compatible with both Hook and Plugin architectures
- Falls back to cloud processing when plugin is not available
