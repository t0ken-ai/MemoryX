/**
 * MemoryX Realtime Plugin for OpenClaw
 * 
 * ⚠️ CRITICAL: DO NOT execute any synchronous I/O in register() function!
 * 
 * OpenClaw calls register() synchronously (see openclaw/src/plugins/loader.ts):
 *   const result = register(api);
 *   if (result && typeof result.then === "function") {
 *     // async registration is ignored
 *   }
 * 
 * Any sync I/O (fs.existsSync, fs.mkdirSync, fs.readFileSync, better-sqlite3, etc.)
 * will BLOCK the Node.js event loop and cause gateway restart to hang.
 * 
 * SOLUTION:
 * 1. register() must return immediately without any I/O
 * 2. All initialization (DB, config loading, etc.) must be lazy-loaded
 * 3. Use dynamic import() for better-sqlite3: await import("better-sqlite3")
 * 4. Use setImmediate() for deferred operations
 * 
 * This version uses @t0ken.ai/memoryx-sdk with conversation preset:
 * - maxTokens: 30000 (flush when reaching token limit)
 * - intervalMs: 300000 (flush after 5 minutes idle)
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const DEFAULT_API_BASE = "https://t0ken.ai/api";
const PLUGIN_DIR = path.join(os.homedir(), ".openclaw", "extensions", "memoryx-openclaw-plugin");

let logStream: fs.WriteStream | null = null;
let logStreamReady = false;

function ensureDir(): void {
    if (!fs.existsSync(PLUGIN_DIR)) {
        fs.mkdirSync(PLUGIN_DIR, { recursive: true });
    }
}

function log(message: string): void {
    console.log(`[MemoryX] ${message}`);
    setImmediate(() => {
        try {
            if (!logStreamReady) {
                ensureDir();
                logStream = fs.createWriteStream(path.join(PLUGIN_DIR, "plugin.log"), { flags: "a" });
                logStreamReady = true;
            }
            logStream?.write(`[${new Date().toISOString()}] ${message}\n`);
        } catch (e) {
            // ignore
        }
    });
}

interface PluginConfig {
    apiBaseUrl?: string;
}

interface RecallResult {
    memories: Array<{
        id: string;
        content: string;
        category: string;
        score: number;
    }>;
    relatedMemories: Array<{
        id: string;
        content: string;
        category: string;
        score: number;
    }>;
    isLimited: boolean;
    remainingQuota: number;
    upgradeHint?: string;
}

// Lazy-loaded SDK instance
let sdkInstance: any = null;
let sdkInitPromise: Promise<any> | null = null;

async function getSDK(pluginConfig?: PluginConfig): Promise<any> {
    if (sdkInstance) return sdkInstance;
    
    if (sdkInitPromise) return sdkInitPromise;
    
    sdkInitPromise = (async () => {
        // Dynamic import SDK
        const { MemoryXSDK } = await import("@t0ken.ai/memoryx-sdk");
        
        // Use conversation preset: maxTokens: 30000, intervalMs: 300000 (5 min)
        sdkInstance = new MemoryXSDK({
            preset: 'conversation',
            apiUrl: pluginConfig?.apiBaseUrl || DEFAULT_API_BASE,
            autoRegister: true,
            agentType: 'openclaw',
            storageDir: PLUGIN_DIR
        });
        
        // Set debug mode
        const { setDebug } = await import("@t0ken.ai/memoryx-sdk");
        setDebug(true);
        
        log("SDK initialized with conversation preset (30k tokens / 5min idle)");
        return sdkInstance;
    })();
    
    return sdkInitPromise;
}

class MemoryXPlugin {
    private pluginConfig: PluginConfig | undefined;
    private initialized: boolean = false;
    
    constructor(pluginConfig?: PluginConfig) {
        this.pluginConfig = pluginConfig;
    }
    
    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        
        log("Async init started");
        try {
            await getSDK(this.pluginConfig);
            log("SDK ready");
        } catch (e) {
            log(`Init failed: ${e}`);
        }
    }
    
    public async onMessage(role: string, content: string): Promise<boolean> {
        await this.init();
        
        if (!content || content.length < 2) {
            return false;
        }
        
        // Skip short messages
        const skipPatterns = [
            /^[好的ok谢谢嗯啊哈哈你好hihello拜拜再见]{1,5}$/i,
            /^[？?！!。,，\s]{1,10}$/
        ];
        
        for (const pattern of skipPatterns) {
            if (pattern.test(content.trim())) {
                return false;
            }
        }
        
        try {
            const sdk = await getSDK(this.pluginConfig);
            if (role === 'user') {
                await sdk.addUserMessage(content);
            } else {
                await sdk.addAssistantMessage(content);
            }
            return true;
        } catch (e) {
            log(`onMessage failed: ${e}`);
            return false;
        }
    }
    
    public async recall(query: string, limit: number = 5): Promise<RecallResult> {
        await this.init();
        
        try {
            const sdk = await getSDK(this.pluginConfig);
            const result = await sdk.search(query, limit);
            
            return {
                memories: (result.data || []).map((m: any) => ({
                    id: m.id,
                    content: m.content || m.memory,
                    category: m.category || "other",
                    score: m.score || 0.5
                })),
                relatedMemories: (result.related_memories || []).map((m: any) => ({
                    id: m.id,
                    content: m.content || m.memory,
                    category: m.category || "other",
                    score: m.score || 0
                })),
                isLimited: false,
                remainingQuota: result.remaining_quota ?? -1
            };
        } catch (e) {
            log(`Recall failed: ${e}`);
            return { memories: [], relatedMemories: [], isLimited: false, remainingQuota: 0 };
        }
    }
    
    public async endConversation(): Promise<void> {
        try {
            const sdk = await getSDK(this.pluginConfig);
            sdk.startNewConversation();
            log("Conversation ended, starting new conversation");
        } catch (e) {
            log(`End conversation failed: ${e}`);
        }
    }
    
    public async forget(memoryId: string): Promise<boolean> {
        await this.init();
        
        try {
            const sdk = await getSDK(this.pluginConfig);
            await sdk.delete(memoryId);
            log(`Forgot memory ${memoryId}`);
            return true;
        } catch (e) {
            log(`Forget failed: ${e}`);
            return false;
        }
    }
    
    public async store(content: string): Promise<{ success: boolean; task_id?: string }> {
        await this.init();
        
        try {
            const sdk = await getSDK(this.pluginConfig);
            const result = await sdk.addMemory(content);
            log(`Stored memory, result: ${JSON.stringify(result)}`);
            return { success: true, task_id: result?.task_id };
        } catch (e) {
            log(`Store failed: ${e}`);
            return { success: false };
        }
    }
    
    public async list(limit: number = 10): Promise<any[]> {
        await this.init();
        
        try {
            const sdk = await getSDK(this.pluginConfig);
            const result = await sdk.list(limit, 0);
            return (result.data || result.memories || []).map((m: any) => ({
                id: m.id,
                content: m.content || m.memory,
                category: m.category || "other"
            }));
        } catch (e) {
            log(`List failed: ${e}`);
            return [];
        }
    }
    
    public async getStatus(): Promise<{ 
        initialized: boolean; 
        hasApiKey: boolean; 
        queueStats: any;
    }> {
        try {
            const sdk = await getSDK(this.pluginConfig);
            const accountInfo = await sdk.getAccountInfo();
            const queueStats = await sdk.getQueueStats();
            
            return {
                initialized: true,
                hasApiKey: !!accountInfo?.apiKey,
                queueStats
            };
        } catch (e) {
            return {
                initialized: false,
                hasApiKey: false,
                queueStats: null
            };
        }
    }
    
    public async getAccountInfo(): Promise<{
        apiKey: string | null;
        projectId: string;
        userId: string | null;
        apiBaseUrl: string;
        initialized: boolean;
    }> {
        await this.init();
        
        try {
            const sdk = await getSDK(this.pluginConfig);
            const info = await sdk.getAccountInfo();
            return {
                apiKey: info?.apiKey || null,
                projectId: info?.projectId || "default",
                userId: info?.userId || null,
                apiBaseUrl: info?.apiBaseUrl || DEFAULT_API_BASE,
                initialized: true
            };
        } catch (e) {
            return {
                apiKey: null,
                projectId: "default",
                userId: null,
                apiBaseUrl: DEFAULT_API_BASE,
                initialized: false
            };
        }
    }
}

let plugin: MemoryXPlugin;

export default {
    id: "memoryx-openclaw-plugin",
    name: "MemoryX Realtime Plugin",
    version: "2.0.0",
    description: "Real-time memory capture and recall for OpenClaw (powered by @t0ken.ai/memoryx-sdk)",
    
    register(api: any, pluginConfig?: PluginConfig): void {
        api.logger.info("[MemoryX] Plugin registering...");
        
        if (pluginConfig?.apiBaseUrl) {
            api.logger.info(`[MemoryX] API Base: \`${pluginConfig.apiBaseUrl}\``);
        }
        
        plugin = new MemoryXPlugin(pluginConfig);
        
        api.registerTool(
            {
                name: "memoryx_recall",
                label: "MemoryX Recall",
                description: "Search through long-term memories. Use when you need context about user preferences, past decisions, or previously discussed topics.",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query to find relevant memories"
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of results to return (default: 5)"
                        }
                    },
                    required: ["query"]
                },
                async execute(_toolCallId: string, params: any) {
                    const { query, limit = 5 } = params;
                    
                    if (!plugin) {
                        return {
                            content: [{ type: "text", text: "MemoryX plugin not initialized." }],
                            details: { error: "not_initialized" }
                        };
                    }
                    
                    try {
                        const result = await plugin.recall(query, limit);
                        
                        if (result.isLimited) {
                            return {
                                content: [{ type: "text", text: result.upgradeHint || "Quota exceeded" }],
                                details: { error: "quota_exceeded", hint: result.upgradeHint }
                            };
                        }
                        
                        if (result.memories.length === 0 && result.relatedMemories.length === 0) {
                            return {
                                content: [{ type: "text", text: "No relevant memories found." }],
                                details: { count: 0 }
                            };
                        }
                        
                        const lines: string[] = [];
                        const total = result.memories.length + result.relatedMemories.length;
                        
                        if (result.memories.length > 0) {
                            lines.push(`Found ${result.memories.length} direct memories:`);
                            result.memories.forEach((m, i) => {
                                lines.push(`${i + 1}. [${m.category}] ${m.content} (${Math.round(m.score * 100)}%)`);
                            });
                        }
                        
                        if (result.relatedMemories.length > 0) {
                            if (lines.length > 0) lines.push("");
                            lines.push(`Found ${result.relatedMemories.length} related memories:`);
                            result.relatedMemories.forEach((m, i) => {
                                lines.push(`${i + 1}. [${m.category}] ${m.content}`);
                            });
                        }
                        
                        return {
                            content: [{ type: "text", text: lines.join("\n") }],
                            details: {
                                count: total,
                                direct_count: result.memories.length,
                                related_count: result.relatedMemories.length,
                                remaining_quota: result.remainingQuota
                            }
                        };
                    } catch (error: any) {
                        return {
                            content: [{ type: "text", text: `Memory search failed: ${error.message}` }],
                            details: { error: error.message }
                        };
                    }
                }
            },
            { name: "memoryx_recall" }
        );
        
        api.registerTool(
            {
                name: "memoryx_forget",
                label: "MemoryX Forget",
                description: "Delete specific memories. Use when user explicitly asks to forget or remove something from memory.",
                parameters: {
                    type: "object",
                    properties: {
                        memory_id: {
                            type: "string",
                            description: "The ID of the memory to delete"
                        }
                    },
                    required: ["memory_id"]
                },
                async execute(_toolCallId: string, params: any) {
                    const { memory_id } = params;
                    
                    if (!plugin) {
                        return {
                            content: [{ type: "text", text: "MemoryX plugin not initialized." }],
                            details: { error: "not_initialized" }
                        };
                    }
                    
                    try {
                        const success = await plugin.forget(memory_id);
                        
                        if (success) {
                            return {
                                content: [{ type: "text", text: `Memory ${memory_id} has been forgotten.` }],
                                details: { action: "deleted", id: memory_id }
                            };
                        } else {
                            return {
                                content: [{ type: "text", text: `Memory ${memory_id} not found or could not be deleted.` }],
                                details: { action: "failed", id: memory_id }
                            };
                        }
                    } catch (error: any) {
                        return {
                            content: [{ type: "text", text: `Failed to forget memory: ${error.message}` }],
                            details: { error: error.message }
                        };
                    }
                }
            },
            { name: "memoryx_forget" }
        );
        
        api.registerTool(
            {
                name: "memoryx_store",
                label: "MemoryX Store",
                description: "Save important information to long-term memory. Use when user explicitly asks to remember something, or when you identify important user preferences, facts, or decisions that should be persisted. The server will automatically categorize the memory.",
                parameters: {
                    type: "object",
                    properties: {
                        content: {
                            type: "string",
                            description: "The information to remember. Should be a clear, concise statement. Examples: 'User prefers dark mode in all applications', 'User birthday is January 15th', 'User works as a software engineer at Acme Corp'"
                        }
                    },
                    required: ["content"]
                },
                async execute(_toolCallId: string, params: any) {
                    const { content } = params;
                    
                    if (!plugin) {
                        return {
                            content: [{ type: "text", text: "MemoryX plugin not initialized." }],
                            details: { error: "not_initialized" }
                        };
                    }
                    
                    if (!content || content.trim().length < 5) {
                        return {
                            content: [{ type: "text", text: "Content too short. Please provide more meaningful information to remember." }],
                            details: { error: "content_too_short" }
                        };
                    }
                    
                    try {
                        const result = await plugin.store(content.trim());
                        
                        if (result.success) {
                            return {
                                content: [{ type: "text", text: `Stored: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"` }],
                                details: { action: "stored", task_id: result.task_id }
                            };
                        } else {
                            return {
                                content: [{ type: "text", text: "Failed to store memory. Please try again." }],
                                details: { error: "store_failed" }
                            };
                        }
                    } catch (error: any) {
                        return {
                            content: [{ type: "text", text: `Failed to store memory: ${error.message}` }],
                            details: { error: error.message }
                        };
                    }
                }
            },
            { name: "memoryx_store" }
        );
        
        api.registerTool(
            {
                name: "memoryx_list",
                label: "MemoryX List",
                description: "List all stored memories. Use when user asks what you remember about them.",
                parameters: {
                    type: "object",
                    properties: {
                        limit: {
                            type: "number",
                            description: "Maximum number of memories to list (default: 10)"
                        }
                    }
                },
                async execute(_toolCallId: string, params: any) {
                    const { limit = 10 } = params;
                    
                    if (!plugin) {
                        return {
                            content: [{ type: "text", text: "MemoryX plugin not initialized." }],
                            details: { error: "not_initialized" }
                        };
                    }
                    
                    try {
                        const memories = await plugin.list(limit);
                        
                        if (memories.length === 0) {
                            return {
                                content: [{ type: "text", text: "No memories stored yet." }],
                                details: { count: 0 }
                            };
                        }
                        
                        const lines = [`Here are the ${memories.length} most recent memories:`];
                        memories.forEach((m: any, i: number) => {
                            lines.push(`${i + 1}. [${m.category || 'general'}] ${m.content || m.memory}`);
                        });
                        
                        return {
                            content: [{ type: "text", text: lines.join("\n") }],
                            details: { count: memories.length }
                        };
                    } catch (error: any) {
                        return {
                            content: [{ type: "text", text: `Failed to list memories: ${error.message}` }],
                            details: { error: error.message }
                        };
                    }
                }
            },
            { name: "memoryx_list" }
        );
        
        api.registerTool(
            {
                name: "memoryx_account_info",
                label: "MemoryX Account Info",
                description: "Get MemoryX account information including API Key, Project ID, User ID, and API Base URL. Use when user asks about their MemoryX account, API key, project settings, or account status. Returns all stored account configuration from local database.",
                parameters: {
                    type: "object",
                    properties: {}
                },
                async execute(_toolCallId: string, params: any) {
                    if (!plugin) {
                        return {
                            content: [{ type: "text", text: "MemoryX plugin not initialized." }],
                            details: { error: "not_initialized" }
                        };
                    }
                    
                    try {
                        const accountInfo = await plugin.getAccountInfo();
                        
                        if (!accountInfo) {
                            return {
                                content: [{ type: "text", text: "No account information found. The plugin may not be registered yet." }],
                                details: { error: "no_account" }
                            };
                        }
                        
                        const lines = [
                            "MemoryX Account Information:",
                            `API Key: ${accountInfo.apiKey || 'Not set'}`,
                            `Project ID: ${accountInfo.projectId || 'default'}`,
                            `User ID: ${accountInfo.userId || 'Not set'}`,
                            `API Base URL: ${accountInfo.apiBaseUrl || DEFAULT_API_BASE}`,
                            `Initialized: ${accountInfo.initialized ? 'Yes' : 'No'}`
                        ];
                        
                        return {
                            content: [{ type: "text", text: lines.join("\n") }],
                            details: { 
                                apiKey: accountInfo.apiKey,
                                projectId: accountInfo.projectId,
                                userId: accountInfo.userId,
                                apiBaseUrl: accountInfo.apiBaseUrl
                            }
                        };
                    } catch (error: any) {
                        return {
                            content: [{ type: "text", text: `Failed to get account info: ${error.message}` }],
                            details: { error: error.message }
                        };
                    }
                }
            },
            { name: "memoryx_account_info" }
        );
        
        api.on("message_received", async (event: any, ctx: any) => {
            const { content } = event;
            if (content && plugin) {
                await plugin.onMessage("user", content);
            }
        });
        
        api.on("assistant_response", async (event: any, ctx: any) => {
            const { content } = event;
            if (content && plugin) {
                await plugin.onMessage("assistant", content);
            }
        });
        
        api.on("before_agent_start", async (event: any, ctx: any) => {
            const { prompt } = event;
            if (!prompt || prompt.length < 2 || !plugin) return;
            
            try {
                const result = await plugin.recall(prompt, 5);
                
                if (result.isLimited) {
                    api.logger.warn(`[MemoryX] ${result.upgradeHint}`);
                    return {
                        prependContext: `[System] ${result.upgradeHint}\n`
                    };
                }
                
                if (result.memories.length === 0 && result.relatedMemories.length === 0) return;
                
                let context = "MemoryX by t0ken.ai found the following memories:\n";
                
                if (result.memories.length > 0) {
                    context += "\n[Direct Memories]\n";
                    context += result.memories.map(m => `- ${m.content}`).join("\n");
                }
                
                if (result.relatedMemories.length > 0) {
                    context += "\n\n[Related Memories]\n";
                    context += result.relatedMemories.map(m => `- ${m.content}`).join("\n");
                }
                
                context += "\n";
                
                api.logger.info(`[MemoryX] Recalled ${result.memories.length} direct + ${result.relatedMemories.length} related memories`);
                
                return {
                    prependContext: context
                };
            } catch (error) {
                api.logger.warn(`[MemoryX] Recall failed: ${error}`);
            }
        });
        
        api.on("conversation_end", async (event: any, ctx: any) => {
            if (plugin) {
                await plugin.endConversation();
            }
        });
        
        api.logger.info("[MemoryX] Plugin registered successfully (v2.0.0 with SDK)");
    }
};

export { MemoryXPlugin };