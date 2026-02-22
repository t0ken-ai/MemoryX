# @t0ken.ai/memoryx-sdk

MemoryX Node.js SDK - 让 AI Agents 轻松拥有持久记忆

## 安装

```bash
npm install @t0ken.ai/memoryx-sdk
```

## 快速开始

```typescript
import { MemoryXSDK, PRESET } from '@t0ken/memoryx-sdk';

// 使用预设模式
const sdk = new MemoryXSDK({ preset: 'batch' });

// 添加记忆
await sdk.addMemory("用户喜欢用Python做数据分析");

// 搜索记忆
const results = await sdk.search("数据分析");
console.log(results.data);
```

## 发送策略

SDK 支持灵活的发送策略配置：

### 预设模式

```typescript
// 实时模式 - 立即发送
const sdk = new MemoryXSDK({ preset: 'realtime' });

// 批量模式 - 50条或5秒
const sdk = new MemoryXSDK({ preset: 'batch' });

// 会话模式 - 2轮或30分钟
const sdk = new MemoryXSDK({ preset: 'conversation' });
```

### 自定义策略

```typescript
const sdk = new MemoryXSDK({
  strategy: {
    rounds: 3,        // 3轮对话后发送
    batchSize: 100,   // 或100条消息
    intervalMs: 60000 // 或1分钟
  }
});
```

### 完全自定义

```typescript
const sdk = new MemoryXSDK({
  strategy: {
    customTrigger: (stats) => {
      // 自定义逻辑
      return stats.rounds >= 2 || stats.totalTokens >= 4000;
    }
  }
});
```

## API

### 记忆操作

```typescript
// 添加记忆
await sdk.addMemory(content, metadata?);

// 搜索记忆
const results = await sdk.search(query, limit?);

// 列出记忆
const memories = await sdk.list(limit?, offset?);

// 删除记忆
await sdk.delete(memoryId);

// 获取配额
const quota = await sdk.getQuota();
```

### 会话操作

```typescript
// 添加对话消息
await sdk.addMessage('user', '你好');
await sdk.addMessage('assistant', '你好！有什么可以帮助你的？');

// 开始新会话
sdk.startNewConversation();
```

### 队列操作

```typescript
// 手动刷新队列
await sdk.flush();

// 获取队列状态
const stats = await sdk.getQueueStats();
```

## 策略参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `rounds` | number | N轮对话后发送 |
| `batchSize` | number | N条消息后发送 |
| `intervalMs` | number | N毫秒后发送 |
| `maxTokens` | number | N tokens后发送 |
| `customTrigger` | function | 自定义触发函数 |

## 队列状态

```typescript
interface QueueStats {
  messageCount: number;      // 当前消息数
  rounds: number;            // 当前轮数
  totalTokens: number;       // 总tokens
  oldestMessageAge: number;  // 最早消息年龄
  conversationId: string;    // 会话ID
}
```

## License

MIT
