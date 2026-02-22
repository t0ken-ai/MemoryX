#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

const DEFAULT_API_BASE = "https://t0ken.ai/api";
const PLUGIN_DIR = path.join(os.homedir(), ".memoryx", "mcp-server");

function ensureDir(): void {
  if (!fs.existsSync(PLUGIN_DIR)) {
    fs.mkdirSync(PLUGIN_DIR, { recursive: true });
  }
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(path.join(PLUGIN_DIR, "mcp-server.log"), logMessage);
}

interface MemoryXConfig {
  apiKey: string | null;
  projectId: string;
  userId: string | null;
  apiBaseUrl: string;
}

interface QueueItem {
  id: number;
  content: string;
  metadata: string;
  timestamp: number;
  retry_count: number;
}

let db: any = null;
let config: MemoryXConfig = {
  apiKey: null,
  projectId: "default",
  userId: null,
  apiBaseUrl: DEFAULT_API_BASE,
};

let flushTimer: NodeJS.Timeout | null = null;
let isFlushing: boolean = false;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 50;
const MAX_RETRY_COUNT = 5;

async function getDb(): Promise<any> {
  if (db) return db;
  
  ensureDir();
  const Database = (await import("better-sqlite3")).default;
  const dbPath = path.join(PLUGIN_DIR, "memoryx.db");
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    
    CREATE TABLE IF NOT EXISTS memory_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      timestamp INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0
    );
  `);
  
  return db;
}

class SQLiteStorage {
  static async loadConfig(): Promise<MemoryXConfig | null> {
    try {
      const database = await getDb();
      const row = database.prepare("SELECT value FROM config WHERE key = 'config'").get();
      if (row) {
        return JSON.parse(row.value);
      }
    } catch (e) {
      log(`Failed to load config: ${e}`);
    }
    return null;
  }
  
  static async saveConfig(cfg: MemoryXConfig): Promise<void> {
    try {
      const database = await getDb();
      database.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('config', ?)").run(JSON.stringify(cfg));
    } catch (e) {
      log(`Failed to save config: ${e}`);
    }
  }
  
  static async addToQueue(content: string, metadata: Record<string, any> = {}): Promise<void> {
    const database = await getDb();
    database.prepare(`
      INSERT INTO memory_queue (content, metadata, timestamp)
      VALUES (?, ?, ?)
    `).run(content, JSON.stringify(metadata), Date.now());
  }
  
  static async getQueueItems(limit: number = MAX_BATCH_SIZE): Promise<QueueItem[]> {
    const database = await getDb();
    return database.prepare(`
      SELECT id, content, metadata, timestamp, retry_count
      FROM memory_queue
      ORDER BY id ASC
      LIMIT ?
    `).all(limit) as QueueItem[];
  }
  
  static async deleteItems(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const database = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    database.prepare(`DELETE FROM memory_queue WHERE id IN (${placeholders})`).run(...ids);
  }
  
  static async incrementRetry(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const database = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    database.prepare(`UPDATE memory_queue SET retry_count = retry_count + 1 WHERE id IN (${placeholders})`).run(...ids);
  }
  
  static async deleteOldRetries(): Promise<void> {
    const database = await getDb();
    database.prepare("DELETE FROM memory_queue WHERE retry_count >= ?").run(MAX_RETRY_COUNT);
  }
  
  static async getQueueLength(): Promise<number> {
    const database = await getDb();
    const row = database.prepare("SELECT COUNT(*) as count FROM memory_queue").get() as any;
    return row?.count || 0;
  }
}

async function initialize(): Promise<void> {
  ensureDir();
  await getDb();
  
  const stored = await SQLiteStorage.loadConfig();
  if (stored) {
    config = { ...config, ...stored };
  }
  
  const envApiKey = process.env.MEMORYX_API_KEY || process.env.OPENMEMORYX_API_KEY;
  const envApiUrl = process.env.MEMORYX_URL || process.env.OPENMEMORYX_URL;
  
  if (envApiKey) {
    config.apiKey = envApiKey;
  }
  if (envApiUrl) {
    config.apiBaseUrl = envApiUrl;
  }
  
  if (!config.apiKey) {
    log("No API key found, attempting auto-register");
    await autoRegister();
  }
  
  startFlushTimer();
}

function getMachineFingerprint(): string {
  const components = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || "unknown",
    os.totalmem()
  ];
  return crypto.createHash("sha256").update(components.join("|")).digest("hex").slice(0, 32);
}

async function autoRegister(): Promise<void> {
  try {
    const fingerprint = getMachineFingerprint();
    
    const response = await fetch(`${config.apiBaseUrl}/agents/auto-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machine_fingerprint: fingerprint,
        agent_type: "mcp",
        agent_name: os.hostname(),
        platform: os.platform(),
        platform_version: os.release()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Auto-register failed: ${response.status}`);
    }
    
    const data: any = await response.json();
    config.apiKey = data.api_key;
    config.projectId = String(data.project_id);
    config.userId = data.agent_id;
    await SQLiteStorage.saveConfig(config);
    log("Auto-registered successfully");
  } catch (e) {
    log(`Auto-register failed: ${e}`);
  }
}

function startFlushTimer(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
  }
  flushTimer = setInterval(() => {
    flushQueue();
  }, FLUSH_INTERVAL_MS);
}

async function flushQueue(): Promise<void> {
  if (isFlushing || !config.apiKey) return;
  
  isFlushing = true;
  
  try {
    await SQLiteStorage.deleteOldRetries();
    
    const items = await SQLiteStorage.getQueueItems();
    if (items.length === 0) {
      isFlushing = false;
      return;
    }
    
    log(`Flushing ${items.length} memories to API`);
    
    const memories = items.map(item => ({
      content: item.content,
      metadata: JSON.parse(item.metadata)
    }));
    
    const ids = items.map(item => item.id);
    
    const endpoint = memories.length === 1 
      ? `${config.apiBaseUrl}/v1/memories`
      : `${config.apiBaseUrl}/v1/memories/batch`;
    
    const body = memories.length === 1
      ? { content: memories[0].content, project_id: config.projectId, metadata: memories[0].metadata }
      : { memories, project_id: config.projectId };
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey
      },
      body: JSON.stringify(body)
    });
    
    if (response.ok) {
      await SQLiteStorage.deleteItems(ids);
      const result: any = await response.json();
      log(`Successfully sent ${items.length} memories, task_id: ${result.task_id}`);
    } else {
      await SQLiteStorage.incrementRetry(ids);
      const errorData: any = await response.json().catch(() => ({}));
      log(`Failed to send memories: ${response.status} ${JSON.stringify(errorData)}`);
    }
  } catch (e) {
    log(`Flush queue error: ${e}`);
  }
  
  isFlushing = false;
}

async function saveMemory(content: string, metadata: Record<string, any> = {}): Promise<{ success: boolean; message: string; queued: number }> {
  if (!content || content.trim().length < 2) {
    return { success: false, message: "Content too short", queued: 0 };
  }
  
  const skipPatterns = [
    /^[好的ok谢谢嗯啊哈哈你好hihello拜拜再见]{1,5}$/i,
    /^[？?！!。,，\s]{1,10}$/
  ];
  
  for (const pattern of skipPatterns) {
    if (pattern.test(content.trim())) {
      return { success: false, message: "Skipped: trivial content", queued: 0 };
    }
  }
  
  await SQLiteStorage.addToQueue(content.trim(), metadata);
  const queueLength = await SQLiteStorage.getQueueLength();
  
  if (queueLength >= MAX_BATCH_SIZE) {
    flushQueue().catch(() => {});
  }
  
  return { 
    success: true, 
    message: "Memory queued for processing", 
    queued: queueLength 
  };
}

async function searchMemory(query: string, limit: number = 5): Promise<{
  memories: any[];
  isLimited: boolean;
  remainingQuota: number;
  upgradeHint?: string;
}> {
  if (!config.apiKey || !query || query.length < 2) {
    return { memories: [], isLimited: false, remainingQuota: 0 };
  }
  
  try {
    const response = await fetch(`${config.apiBaseUrl}/v1/memories/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey
      },
      body: JSON.stringify({
        query,
        project_id: config.projectId,
        limit
      })
    });
    
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      
      if (response.status === 402 || response.status === 429) {
        return {
          memories: [],
          isLimited: true,
          remainingQuota: 0,
          upgradeHint: errorData.detail || "云端查询配额已用尽，请升级到付费版"
        };
      }
      
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const data: any = await response.json();
    
    return {
      memories: (data.data || []).map((m: any) => ({
        id: m.id,
        content: m.memory || m.content,
        category: m.category || "other",
        score: m.score || 0.5
      })),
      isLimited: false,
      remainingQuota: data.remaining_quota ?? -1
    };
  } catch (e) {
    log(`Search failed: ${e}`);
    return { memories: [], isLimited: false, remainingQuota: 0 };
  }
}

async function getAccountInfo(): Promise<{
  apiKey: string | null;
  projectId: string;
  userId: string | null;
  queueLength: number;
}> {
  const queueLength = await SQLiteStorage.getQueueLength();
  return {
    apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}...` : null,
    projectId: config.projectId,
    userId: config.userId,
    queueLength
  };
}

const server = new Server(
  {
    name: "memoryx-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "save_memory",
        description: "保存重要信息到记忆系统。当用户提到偏好、习惯、项目信息、重要决定等值得记住的内容时调用。",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "要记住的内容"
            },
            metadata: {
              type: "object",
              description: "可选的元数据，如分类、标签等"
            }
          },
          required: ["content"]
        }
      },
      {
        name: "search_memory",
        description: "搜索历史记忆。在回答用户问题前调用，获取相关的记忆上下文。",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "搜索关键词或问题"
            },
            limit: {
              type: "number",
              description: "返回结果数量，默认5",
              default: 5
            }
          },
          required: ["query"]
        }
      },
      {
        name: "get_account_info",
        description: "获取当前 MemoryX 账户信息，包括 API Key、Project ID 和队列状态。",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "save_memory": {
      const content = args?.content as string;
      const metadata = args?.metadata as Record<string, any> || {};
      const result = await saveMemory(content, metadata);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
    
    case "search_memory": {
      const query = args?.query as string;
      const limit = (args?.limit as number) || 5;
      const result = await searchMemory(query, limit);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
    
    case "get_account_info": {
      const result = await getAccountInfo();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "memoryx://status",
        name: "MemoryX Status",
        description: "当前 MemoryX 连接状态和队列信息",
        mimeType: "application/json"
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri === "memoryx://status") {
    const status = await getAccountInfo();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(status, null, 2)
        }
      ]
    };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

async function main() {
  await initialize();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log("MemoryX MCP Server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
