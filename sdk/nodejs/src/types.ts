export interface FlushStrategy {
  rounds?: number;
  batchSize?: number;
  intervalMs?: number;
  maxTokens?: number;
  customTrigger?: (stats: QueueStats) => boolean;
}

export type PresetMode = 'realtime' | 'batch' | 'conversation';

export interface MemoryXSDKOptions {
  apiKey?: string;
  apiUrl?: string;
  projectId?: string;
  strategy?: FlushStrategy;
  preset?: PresetMode;
  storageDir?: string;
  autoRegister?: boolean;
  agentType?: string;
}

export interface QueueStats {
  messageCount: number;
  rounds: number;
  totalTokens: number;
  oldestMessageAge: number;
  conversationId: string;
}

export interface QueueItem {
  id: number;
  content: string;
  metadata: string;
  timestamp: number;
  retry_count: number;
}

export interface ConversationItem {
  id: number;
  conversation_id: string;
  conversation_created_at: number;
  role: string;
  content: string;
  timestamp: number;
  retry_count: number;
}

export interface Memory {
  content: string;
  metadata?: Record<string, any>;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  tokens?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  category: string;
  score: number;
}

export interface SearchResponse {
  success: boolean;
  data: SearchResult[];
  related_memories?: SearchResult[];
  remaining_quota?: number;
}

export interface AddResponse {
  success: boolean;
  task_id?: string;
  status?: string;
}

export interface AccountInfo {
  agent_id: string;
  api_key: string;
  project_id: string;
}

export interface StoredConfig {
  apiKey: string | null;
  projectId: string;
  userId: string | null;
  apiBaseUrl: string;
}

export const PRESETS: Record<PresetMode, FlushStrategy> = {
  realtime: { batchSize: 1, intervalMs: 0 },
  batch: { batchSize: 50, intervalMs: 5000 },
  conversation: { maxTokens: 30000, intervalMs: 5 * 60 * 1000 }
};
