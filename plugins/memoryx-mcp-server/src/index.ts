#!/usr/bin/env node

/**
 * MemoryX MCP Server - Model Context Protocol server for MemoryX
 * 
 * Powered by @t0ken.ai/memoryx-sdk
 * 
 * MCP mode (different from OpenClaw conversation flow):
 * - LLM summarizes and sends single memory additions
 * - Server extracts entities directly without LLM summarization
 * - Trigger: 20k tokens or 1 minute idle
 * 
 * Features:
 * - Lazy SDK initialization
 * - Automatic memory batching and retry
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import * as os from "os";

const DEFAULT_API_BASE = "https://t0ken.ai/api";
const PLUGIN_DIR = path.join(os.homedir(), ".memoryx", "mcp-server");

// Lazy-loaded SDK instance
let sdkInstance: any = null;
let sdkInitPromise: Promise<any> | null = null;

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.error(`[MemoryX MCP] ${timestamp} ${message}`);
}

async function getSDK(): Promise<any> {
  if (sdkInstance) return sdkInstance;
  
  if (sdkInitPromise) return sdkInitPromise;
  
  sdkInitPromise = (async () => {
    // Dynamic import SDK
    const { MemoryXSDK } = await import("@t0ken.ai/memoryx-sdk");
    
    // Get env config
    const envApiKey = process.env.MEMORYX_API_KEY || process.env.OPENMEMORYX_API_KEY;
    const envApiUrl = process.env.MEMORYX_URL || process.env.OPENMEMORYX_URL;
    
    // MCP Server uses LLM-summarized single additions (not conversation flow)
    // Server extracts entities directly without LLM summarization
    // Trigger: 20k tokens or 1 minute idle
    sdkInstance = new MemoryXSDK({
      strategy: {
        maxTokens: 20000,
        intervalMs: 60000  // 1 minute idle
      },
      apiKey: envApiKey || undefined,
      apiUrl: envApiUrl || DEFAULT_API_BASE,
      autoRegister: !envApiKey,
      agentType: 'mcp',
      storageDir: PLUGIN_DIR
    });
    
    log("SDK initialized (20k tokens / 1min idle - MCP mode)");
    return sdkInstance;
  })();
  
  return sdkInitPromise;
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
  
  try {
    const sdk = await getSDK();
    await sdk.addMemory(content.trim(), metadata);
    const stats = await sdk.getQueueStats();
    
    return { 
      success: true, 
      message: "Memory queued for processing", 
      queued: stats.messageCount 
    };
  } catch (e) {
    log(`saveMemory failed: ${e}`);
    return { success: false, message: String(e), queued: 0 };
  }
}

async function searchMemory(query: string, limit: number = 5): Promise<{
  memories: any[];
  isLimited: boolean;
  remainingQuota: number;
  upgradeHint?: string;
}> {
  if (!query || query.length < 2) {
    return { memories: [], isLimited: false, remainingQuota: 0 };
  }
  
  try {
    const sdk = await getSDK();
    const result = await sdk.search(query, limit);
    
    return {
      memories: (result.data || []).map((m: any) => ({
        id: m.id,
        content: m.memory || m.content,
        category: m.category || "other",
        score: m.score || 0.5
      })),
      isLimited: false,
      remainingQuota: result.remaining_quota ?? -1
    };
  } catch (e) {
    log(`searchMemory failed: ${e}`);
    return { memories: [], isLimited: false, remainingQuota: 0 };
  }
}

async function getAccountInfo(): Promise<{
  apiKey: string | null;
  projectId: string;
  userId: string | null;
  queueLength: number;
}> {
  try {
    const sdk = await getSDK();
    const info = await sdk.getAccountInfo();
    const stats = await sdk.getQueueStats();
    
    return {
      apiKey: info?.apiKey ? `${info.apiKey.slice(0, 8)}...` : null,
      projectId: info?.projectId || "default",
      userId: info?.userId || null,
      queueLength: stats.messageCount
    };
  } catch (e) {
    log(`getAccountInfo failed: ${e}`);
    return {
      apiKey: null,
      projectId: "default",
      userId: null,
      queueLength: 0
    };
  }
}

const server = new Server(
  {
    name: "memoryx-mcp-server",
    version: "2.0.0",
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log("MemoryX MCP Server v2.0.0 started (powered by SDK)");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});