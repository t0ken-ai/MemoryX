# @t0ken.ai/memoryx-sdk

MemoryX Node.js SDK - Enable AI Agents with persistent memory

## Installation

```bash
npm install @t0ken.ai/memoryx-sdk
```

## Quick Start

```typescript
import { MemoryXSDK, PRESET } from '@t0ken.ai/memoryx-sdk';

// Use preset mode
const sdk = new MemoryXSDK({ preset: 'batch' });

// Add memory
await sdk.addMemory("User prefers Python for data analysis");

// Search memories
const results = await sdk.search("data analysis");
console.log(results.data);
```

## Send Strategies

SDK supports flexible send strategy configuration:

### Preset Modes

```typescript
// Realtime mode - send immediately
const sdk = new MemoryXSDK({ preset: 'realtime' });

// Batch mode - 50 items or 5 seconds
const sdk = new MemoryXSDK({ preset: 'batch' });

// Conversation mode - 2 rounds or 30 minutes
const sdk = new MemoryXSDK({ preset: 'conversation' });
```

### Custom Strategy

```typescript
const sdk = new MemoryXSDK({
  strategy: {
    rounds: 3,        // Send after 3 conversation rounds
    batchSize: 100,   // Or 100 messages
    intervalMs: 60000 // Or 1 minute
  }
});
```

### Fully Custom

```typescript
const sdk = new MemoryXSDK({
  strategy: {
    customTrigger: (stats) => {
      // Custom logic
      return stats.rounds >= 2 || stats.totalTokens >= 4000;
    }
  }
});
```

## API

### Memory Operations

```typescript
// Add memory
await sdk.addMemory(content, metadata?);

// Search memories
const results = await sdk.search(query, limit?);

// List memories
const memories = await sdk.list(limit?, offset?);

// Delete memory
await sdk.delete(memoryId);

// Get quota
const quota = await sdk.getQuota();
```

### Conversation Operations

```typescript
// Add conversation message
await sdk.addMessage('user', 'Hello');
await sdk.addMessage('assistant', 'Hi! How can I help you?');

// Start new conversation
sdk.startNewConversation();
```

### Queue Operations

```typescript
// Manual flush queue
await sdk.flush();

// Get queue stats
const stats = await sdk.getQueueStats();
```

## Strategy Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `rounds` | number | Send after N conversation rounds |
| `batchSize` | number | Send after N messages |
| `intervalMs` | number | Send after N milliseconds |
| `maxTokens` | number | Send after N tokens |
| `customTrigger` | function | Custom trigger function |

## Queue Stats

```typescript
interface QueueStats {
  messageCount: number;      // Current message count
  rounds: number;            // Current rounds
  totalTokens: number;       // Total tokens
  oldestMessageAge: number;  // Age of oldest message
  conversationId: string;    // Conversation ID
}
```

## License

MIT