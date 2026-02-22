import { MemoryXSDKOptions, FlushStrategy, QueueStats, Memory, Message, SearchResponse, AccountInfo, PRESETS, PresetMode } from "./types";
import { APIClient } from "./client";
import { QueueManager, countTokens, setDebug as setQueueDebug } from "./queue";
import { SQLiteStorage, setStorageDir } from "./storage";

export { countTokens, setQueueDebug as setDebug };
export type { FlushStrategy, QueueStats, Memory, Message, SearchResponse, AccountInfo, MemoryXSDKOptions, PresetMode };

export class MemoryXSDK {
  private client: APIClient;
  private queue: QueueManager;
  private initialized: boolean = false;
  private options: MemoryXSDKOptions;
  
  constructor(options: MemoryXSDKOptions = {}) {
    this.options = options;
    
    if (options.storageDir) {
      setStorageDir(options.storageDir);
    }
    
    this.client = new APIClient({
      apiKey: options.apiKey || null,
      apiBaseUrl: options.apiUrl,
      projectId: options.projectId
    });
    
    const strategy = options.preset 
      ? PRESETS[options.preset] 
      : options.strategy || {};
    
    this.queue = new QueueManager(this.client, strategy);
  }
  
  async init(): Promise<void> {
    if (this.initialized) return;
    
    const stored = await SQLiteStorage.loadConfig();
    if (stored) {
      if (!this.options.apiKey && stored.apiKey) {
        this.client.setApiKey(stored.apiKey);
      }
      if (!this.options.projectId && stored.projectId) {
        this.client.setProjectId(stored.projectId);
      }
      if (stored.userId) {
        this.client.setUserId(stored.userId);
      }
    }
    
    if (!this.client.getApiKey() && this.options.autoRegister !== false) {
      await this.autoRegister();
    }
    
    this.queue.startTimers();
    this.initialized = true;
  }
  
  private async saveConfig(): Promise<void> {
    await SQLiteStorage.saveConfig(this.client.getConfig());
  }
  
  async autoRegister(agentType?: string, agentName?: string): Promise<AccountInfo> {
    const info = await this.client.autoRegister(
      agentType || this.options.agentType || "nodejs_sdk",
      agentName
    );
    await this.saveConfig();
    return info;
  }
  
  // Memory operations
  async addMemory(content: string, metadata: Record<string, any> = {}): Promise<number> {
    await this.init();
    return this.queue.addMemory(content, metadata);
  }
  
  async search(query: string, limit: number = 10): Promise<SearchResponse> {
    await this.init();
    return this.client.search(query, limit);
  }
  
  async list(limit: number = 50, offset: number = 0): Promise<{ success: boolean; data: any[]; total: number }> {
    await this.init();
    return this.client.list(limit, offset);
  }
  
  async delete(memoryId: string): Promise<{ success: boolean }> {
    await this.init();
    return this.client.delete(memoryId);
  }
  
  async getQuota(): Promise<Record<string, any>> {
    await this.init();
    return this.client.getQuota();
  }
  
  // Conversation operations
  async addMessage(role: 'user' | 'assistant', content: string): Promise<number> {
    await this.init();
    return this.queue.addMessage(role, content);
  }
  
  startNewConversation(): void {
    this.queue.startNewConversation();
  }
  
  // Queue operations
  async flush(): Promise<void> {
    await this.init();
    return this.queue.flush();
  }
  
  async getQueueStats(): Promise<QueueStats> {
    return this.queue.getQueueStats();
  }
  
  async getMemoryQueueLength(): Promise<number> {
    return this.queue.getMemoryQueueLength();
  }
  
  async getConversationQueueLength(): Promise<number> {
    return this.queue.getConversationQueueLength();
  }
  
  setStrategy(strategy: FlushStrategy): void {
    this.queue.setStrategy(strategy);
  }
  
  // Cleanup
  destroy(): void {
    this.queue.stopTimers();
  }
  
  // Getters
  getApiKey(): string | null {
    return this.client.getApiKey();
  }
  
  getProjectId(): string {
    return this.client.getProjectId();
  }
  
  getUserId(): string | null {
    return this.client.getUserId();
  }
}

export function connectMemory(options: MemoryXSDKOptions = {}): MemoryXSDK {
  return new MemoryXSDK(options);
}

export const PRESET = PRESETS;
