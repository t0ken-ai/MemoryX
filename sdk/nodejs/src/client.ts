import * as crypto from "crypto";
import * as os from "os";
import { StoredConfig, AccountInfo, AddResponse, SearchResponse, SearchResult, Memory, Message } from "./types";

const DEFAULT_API_BASE = "https://t0ken.ai/api";

export class APIClient {
  private apiKey: string | null = null;
  private apiBaseUrl: string;
  private projectId: string = "default";
  private userId: string | null = null;
  
  constructor(config?: Partial<StoredConfig>) {
    this.apiKey = config?.apiKey || null;
    this.apiBaseUrl = config?.apiBaseUrl || DEFAULT_API_BASE;
    this.projectId = config?.projectId || "default";
    this.userId = config?.userId || null;
  }
  
  getApiKey(): string | null {
    return this.apiKey;
  }
  
  getProjectId(): string {
    return this.projectId;
  }
  
  getUserId(): string | null {
    return this.userId;
  }
  
  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }
  
  getConfig(): StoredConfig {
    return {
      apiKey: this.apiKey,
      projectId: this.projectId,
      userId: this.userId,
      apiBaseUrl: this.apiBaseUrl
    };
  }
  
  setApiKey(key: string): void {
    this.apiKey = key;
  }
  
  setProjectId(id: string): void {
    this.projectId = id;
  }
  
  setUserId(id: string): void {
    this.userId = id;
  }
  
  getMachineFingerprint(): string {
    const components = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0]?.model || "unknown",
      os.totalmem()
    ];
    const raw = components.join("|");
    return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
  }
  
  async autoRegister(agentType: string = "nodejs_sdk", agentName?: string): Promise<AccountInfo> {
    const fingerprint = this.getMachineFingerprint();
    
    const response = await fetch(`${this.apiBaseUrl}/agents/auto-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machine_fingerprint: fingerprint,
        agent_type: agentType,
        agent_name: agentName || os.hostname(),
        platform: os.platform(),
        platform_version: os.release()
      })
    });
    
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Auto-register failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data: any = await response.json();
    this.apiKey = data.api_key;
    this.projectId = String(data.project_id);
    this.userId = data.agent_id;
    
    return {
      agent_id: data.agent_id,
      api_key: data.api_key,
      project_id: String(data.project_id)
    };
  }
  
  async sendMemories(memories: Memory[]): Promise<AddResponse> {
    if (!this.apiKey) {
      throw new Error("Not authenticated. Call autoRegister() first.");
    }
    
    if (memories.length === 0) {
      return { success: true };
    }
    
    const endpoint = memories.length === 1 
      ? `${this.apiBaseUrl}/v1/memories`
      : `${this.apiBaseUrl}/v1/memories/batch`;
    
    const body = memories.length === 1
      ? { content: memories[0].content, project_id: this.projectId, metadata: memories[0].metadata || {} }
      : { memories, project_id: this.projectId };
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Send memories failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data: any = await response.json();
    return {
      success: true,
      task_id: data.task_id,
      status: data.status
    };
  }
  
  async sendConversation(conversationId: string, messages: Message[]): Promise<AddResponse> {
    if (!this.apiKey) {
      throw new Error("Not authenticated. Call autoRegister() first.");
    }
    
    if (messages.length === 0) {
      return { success: true };
    }
    
    const response = await fetch(`${this.apiBaseUrl}/conversations/flush`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp || Date.now(),
          tokens: m.tokens || 0
        }))
      })
    });
    
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Send conversation failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data: any = await response.json();
    return {
      success: true,
      task_id: data.task_id,
      status: data.status
    };
  }
  
  async search(query: string, limit: number = 10): Promise<SearchResponse> {
    if (!this.apiKey) {
      throw new Error("Not authenticated. Call autoRegister() first.");
    }
    
    const response = await fetch(`${this.apiBaseUrl}/v1/memories/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey
      },
      body: JSON.stringify({
        query,
        project_id: this.projectId,
        limit
      })
    });
    
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Search failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data: any = await response.json();
    
    return {
      success: true,
      data: (data.data || []).map((m: any) => ({
        id: m.id,
        content: m.memory || m.content,
        category: m.category || "other",
        score: m.score || 0.5
      })),
      related_memories: (data.related_memories || []).map((m: any) => ({
        id: m.id,
        content: m.memory || m.content,
        category: m.category || "other",
        score: m.score || 0
      })),
      remaining_quota: data.remaining_quota
    };
  }
  
  async list(limit: number = 50, offset: number = 0): Promise<{ success: boolean; data: SearchResult[]; total: number }> {
    if (!this.apiKey) {
      throw new Error("Not authenticated. Call autoRegister() first.");
    }
    
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      project_id: this.projectId
    });
    
    const response = await fetch(`${this.apiBaseUrl}/v1/memories/list?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey
      }
    });
    
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`List failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data: any = await response.json();
    
    return {
      success: true,
      data: (data.data || []).map((m: any) => ({
        id: m.id,
        content: m.memory || m.content,
        category: m.category || "other",
        score: 0
      })),
      total: data.total || 0
    };
  }
  
  async delete(memoryId: string): Promise<{ success: boolean }> {
    if (!this.apiKey) {
      throw new Error("Not authenticated. Call autoRegister() first.");
    }
    
    const response = await fetch(`${this.apiBaseUrl}/v1/memories/${memoryId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey
      }
    });
    
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Delete failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    return { success: true };
  }
  
  async getQuota(): Promise<Record<string, any>> {
    if (!this.apiKey) {
      throw new Error("Not authenticated. Call autoRegister() first.");
    }
    
    const response = await fetch(`${this.apiBaseUrl}/v1/quota`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey
      }
    });
    
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      throw new Error(`Get quota failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    return response.json() as Promise<Record<string, any>>;
  }
}
