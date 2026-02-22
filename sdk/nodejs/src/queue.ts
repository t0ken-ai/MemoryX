import { FlushStrategy, QueueStats, Memory, Message, PRESETS } from "./types";
import { SQLiteStorage, getDb } from "./storage";
import { APIClient } from "./client";
import { getEncoding } from "js-tiktoken";

let tokenizer: ReturnType<typeof getEncoding> | null = null;
let DEBUG = false;

export function setDebug(enabled: boolean): void {
  DEBUG = enabled;
}

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [MemoryX:${level}]`;
  
  if (level === 'DEBUG' && !DEBUG) return;
  
  if (data !== undefined) {
    console.log(prefix, message, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, message);
  }
}

function getTokenizer(): ReturnType<typeof getEncoding> {
  if (!tokenizer) {
    tokenizer = getEncoding("cl100k_base");
  }
  return tokenizer;
}

export function countTokens(text: string): number {
  try {
    return getTokenizer().encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

export class QueueManager {
  private strategy: FlushStrategy;
  private client: APIClient;
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;
  private maxRetry: number = 5;
  private baseRetryDelayMs: number = 1000; // 1秒基础延迟
  
  // 计算指数退避延迟
  private getRetryDelay(retryCount: number): number {
    // 指数退避: 1s, 2s, 4s, 8s, 16s，最大 60s
    const delay = Math.min(this.baseRetryDelayMs * Math.pow(2, retryCount), 60000);
    // 添加随机抖动 (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }
  
  private currentConversationId: string = "";
  private conversationCreatedAt: number = 0;
  private lastActivityAt: number = 0;
  
  constructor(client: APIClient, strategy: FlushStrategy = {}) {
    this.client = client;
    this.strategy = strategy;
    this.currentConversationId = this.generateConversationId();
    this.conversationCreatedAt = Math.floor(Date.now() / 1000);
    this.lastActivityAt = Date.now();
    
    log('INFO', 'QueueManager initialized', { strategy });
  }
  
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getStrategy(): FlushStrategy {
    return this.strategy;
  }
  
  setStrategy(strategy: FlushStrategy): void {
    log('INFO', 'Strategy updated', strategy);
    this.strategy = strategy;
  }
  
  startTimers(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    const idleTimeout = this.strategy.intervalMs || 5 * 60 * 1000;
    const checkInterval = Math.min(idleTimeout / 10, 30000);
    
    log('INFO', `Starting idle check timer`, { 
      idleTimeout, 
      checkInterval,
      maxTokens: this.strategy.maxTokens 
    });
    
    this.flushTimer = setInterval(async () => {
      if (this.lastActivityAt === 0) return;
      
      const idleTime = Date.now() - this.lastActivityAt;
      
      if (idleTime >= idleTimeout) {
        const stats = await this.getQueueStats();
        if (stats.messageCount > 0) {
          log('INFO', `Idle timeout reached, triggering flush`, { 
            idleTime: Math.floor(idleTime / 1000) + 's',
            messageCount: stats.messageCount,
            totalTokens: stats.totalTokens
          });
          this.startNewConversation();
          this.flush().catch(() => {});
        }
      }
    }, checkInterval);
  }
  
  stopTimers(): void {
    if (this.flushTimer) {
      log('INFO', 'Stopping flush timer');
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
  
  async addMemory(content: string, metadata: Record<string, any> = {}): Promise<number> {
    log('DEBUG', 'Adding memory', { content: content.substring(0, 50) + '...', metadata });
    
    const id = await SQLiteStorage.addToMemoryQueue(content, metadata);
    log('INFO', `Memory added to queue`, { id, content: content.substring(0, 30) + '...' });
    
    const queueLength = await SQLiteStorage.getMemoryQueueLength();
    if (this.strategy.batchSize && queueLength >= this.strategy.batchSize) {
      log('INFO', `Batch size reached (${queueLength}/${this.strategy.batchSize}), triggering flush`);
      setImmediate(() => this.flush().catch(() => {}));
    }
    
    return id;
  }
  
  async addMessage(role: 'user' | 'assistant', content: string): Promise<number> {
    log('DEBUG', 'Adding message', { role, conversationId: this.currentConversationId, content: content.substring(0, 50) + '...' });
    
    const id = await SQLiteStorage.addToConversationQueue(
      this.currentConversationId,
      this.conversationCreatedAt,
      role,
      content
    );
    
    this.lastActivityAt = Date.now();
    
    const stats = await this.getQueueStats();
    log('INFO', `Message added`, { 
      id, 
      role, 
      conversationId: this.currentConversationId,
      messageCount: stats.messageCount,
      rounds: stats.rounds,
      totalTokens: stats.totalTokens
    });
    
    if (this.shouldFlush(stats)) {
      log('INFO', `Flush triggered by strategy`, { 
        rounds: stats.rounds,
        messageCount: stats.messageCount,
        strategy: this.strategy 
      });
      this.startNewConversation();
      setImmediate(() => this.flush().catch(() => {}));
    }
    
    return id;
  }
  
  startNewConversation(): void {
    const oldId = this.currentConversationId;
    this.currentConversationId = this.generateConversationId();
    this.conversationCreatedAt = Math.floor(Date.now() / 1000);
    this.lastActivityAt = Date.now();
    
    log('INFO', `Started new conversation`, { 
      oldConversationId: oldId,
      newConversationId: this.currentConversationId 
    });
  }
  
  async getQueueStats(): Promise<QueueStats> {
    const stats = await SQLiteStorage.getConversationStats(this.currentConversationId);
    
    const db = await getDb();
    const rows = db.prepare(`
      SELECT content FROM conversation_queue 
      WHERE conversation_id = ?
    `).all(this.currentConversationId) as any[];
    
    let totalTokens = 0;
    for (const row of rows) {
      totalTokens += countTokens(row.content);
    }
    
    const idleTime = this.lastActivityAt > 0 ? Date.now() - this.lastActivityAt : 0;
    
    return {
      messageCount: stats.count,
      rounds: stats.rounds,
      totalTokens,
      oldestMessageAge: idleTime,
      conversationId: this.currentConversationId
    };
  }
  
  shouldFlush(stats: QueueStats): boolean {
    if (this.strategy.customTrigger) {
      const result = this.strategy.customTrigger(stats);
      if (result) {
        log('DEBUG', 'Custom trigger returned true', stats);
      }
      return result;
    }
    
    if (this.strategy.rounds && stats.rounds >= this.strategy.rounds) {
      log('DEBUG', `Rounds threshold reached: ${stats.rounds}/${this.strategy.rounds}`);
      return true;
    }
    
    if (this.strategy.batchSize && stats.messageCount >= this.strategy.batchSize) {
      log('DEBUG', `Batch size reached: ${stats.messageCount}/${this.strategy.batchSize}`);
      return true;
    }
    
    if (this.strategy.maxTokens && stats.totalTokens >= this.strategy.maxTokens) {
      log('DEBUG', `Max tokens reached: ${stats.totalTokens}/${this.strategy.maxTokens}`);
      return true;
    }
    
    return false;
  }
  
  async flush(): Promise<void> {
    if (this.isFlushing) {
      log('DEBUG', 'Flush already in progress, skipping');
      return;
    }
    if (!this.client.getApiKey()) {
      log('DEBUG', 'No API key, skipping flush');
      return;
    }
    
    this.isFlushing = true;
    log('INFO', 'Starting flush');
    
    try {
      await this.flushMemoryQueue();
      await this.flushConversationQueue();
      log('INFO', 'Flush completed successfully');
    } catch (e) {
      log('ERROR', 'Flush failed', (e as Error).message);
    } finally {
      this.isFlushing = false;
    }
  }
  
  private async flushMemoryQueue(): Promise<void> {
    // 先将超重试次数的数据移到死信队列
    const itemsToMove = await SQLiteStorage.getMemoryQueueItemsExceedingRetry(this.maxRetry);
    for (const item of itemsToMove) {
      log('ERROR', `Memory item ${item.id} exceeded max retry (${item.retry_count}), moving to dead letter queue`);
      await SQLiteStorage.moveMemoryToDeadLetterQueue(item.id, 'memory');
    }
    await SQLiteStorage.deleteOldMemoryRetries(this.maxRetry);
    
    const items = await SQLiteStorage.getMemoryQueueItems(100);
    if (items.length === 0) {
      log('DEBUG', 'Memory queue is empty');
      return;
    }
    
    log('INFO', `Flushing ${items.length} memory items`);
    
    const memories: Memory[] = items.map(item => ({
      content: item.content,
      metadata: JSON.parse(item.metadata)
    }));
    
    const ids = items.map(item => item.id);
    
    try {
      await this.client.sendMemories(memories);
      await SQLiteStorage.deleteMemoryItems(ids);
      log('INFO', `Successfully sent ${memories.length} memories`);
    } catch (e) {
      await SQLiteStorage.incrementMemoryRetry(ids);
      log('WARN', `Failed to send memories, incremented retry count for ${ids.length} items`, {
        error: (e as Error).message,
        retryCounts: items.map(i => ({ id: i.id, retry: i.retry_count + 1 }))
      });
      throw e;
    }
  }
  
  private async flushConversationQueue(): Promise<void> {
    await SQLiteStorage.clearOldConversations();
    
    const nextConv = await SQLiteStorage.getNextConversation();
    if (!nextConv) {
      log('DEBUG', 'No conversations to flush');
      return;
    }
    
    const { conversationId } = nextConv;
    
    const maxRetry = await SQLiteStorage.getConversationMaxRetry(conversationId);
    if (maxRetry >= this.maxRetry) {
      log('ERROR', `Conversation ${conversationId} exceeded max retry (${maxRetry}), moving to dead letter queue`);
      await SQLiteStorage.moveToDeadLetterQueue(conversationId, 'conversation');
      await SQLiteStorage.deleteConversation(conversationId);
      return;
    }
    
    const messages = await SQLiteStorage.getConversationMessages(conversationId);
    if (messages.length === 0) {
      log('DEBUG', `Conversation ${conversationId} has no messages, deleting`);
      await SQLiteStorage.deleteConversation(conversationId);
      return;
    }
    
    log('INFO', `Flushing conversation ${conversationId}`, {
      messageCount: messages.length,
      maxRetry,
      messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 20) + '...' }))
    });
    
    const formattedMessages: Message[] = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp,
      tokens: countTokens(m.content)
    }));
    
    try {
      await this.client.sendConversation(conversationId, formattedMessages);
      await SQLiteStorage.deleteConversation(conversationId);
      log('INFO', `Successfully sent conversation ${conversationId} with ${messages.length} messages`);
    } catch (e) {
      await SQLiteStorage.incrementConversationRetry(conversationId);
      const newRetryCount = maxRetry + 1;
      const delayMs = this.getRetryDelay(newRetryCount);
      log('WARN', `Failed to send conversation ${conversationId}, retry ${newRetryCount}`, {
        error: (e as Error).message,
        nextRetryDelayMs: delayMs
      });
      // 不立即抛出异常，让下次 flush 在延迟后重试
      // throw e; // 移除立即抛出，让队列继续处理其他会话
    }
  }
  
  async getMemoryQueueLength(): Promise<number> {
    return SQLiteStorage.getMemoryQueueLength();
  }
  
  async getConversationQueueLength(): Promise<number> {
    return SQLiteStorage.getConversationQueueLength();
  }
}
