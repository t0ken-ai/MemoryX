import * as vscode from 'vscode';
import { MemoryXSDK } from '@t0ken.ai/memoryx-sdk';
import * as path from 'path';
import * as os from 'os';

let sdk: MemoryXSDK | null = null;
let participant: vscode.ChatParticipant | null = null;
let isFirstUse: boolean = true;

const USAGE_GUIDE = `
## 📖 MemoryX 使用指南

### 基本用法
直接在聊天中使用 \`@memoryx\`：
\`\`\`
@memoryx 帮我写一个登录函数
\`\`\`

### 工作原理
1. **自动采集**: 你的对话会被自动保存到 MemoryX
2. **智能召回**: 相关的历史记忆会自动显示

### 可用命令
- \`@memoryx /search <关键词>\` - 搜索记忆
- \`@memoryx /list\` - 列出最近记忆
- \`@memoryx /remember\` - 手动保存对话

### 配置
在 VS Code 设置中搜索 "MemoryX" 可以配置：
- API URL
- API Key (留空自动注册)
- 自动采集/召回开关

---
`;

const STORAGE_DIR = path.join(os.homedir(), '.memoryx', 'vscode-extension');

async function getSDK(): Promise<MemoryXSDK> {
    if (sdk) {
        return sdk;
    }
    
    const config = vscode.workspace.getConfiguration('memoryx');
    const apiUrl = config.get<string>('apiUrl') || 'https://t0ken.ai/api';
    const apiKey = config.get<string>('apiKey') || '';
    
    // Use conversation preset - bidirectional conversation flow
    // Trigger: 30k tokens / 5 minutes idle
    sdk = new MemoryXSDK({
        preset: 'conversation',
        apiKey: apiKey || undefined,
        apiUrl: apiUrl,
        autoRegister: !apiKey,
        agentType: 'vscode-extension',
        storageDir: STORAGE_DIR
    });
    
    return sdk;
}

function extractHistoryContent(history: readonly (vscode.ChatRequestTurn | vscode.ChatResponseTurn)[]): string {
    const parts: string[] = [];
    
    for (const turn of history) {
        if (turn instanceof vscode.ChatRequestTurn) {
            parts.push(`User: ${turn.prompt}`);
        } else if (turn instanceof vscode.ChatResponseTurn) {
            // ChatResponseTurn has response property
            const response = (turn as any).response || (turn as any).markdownContent || '';
            if (response) {
                parts.push(`Assistant: ${response}`);
            }
        }
    }
    
    return parts.join('\n');
}

function extractUserRequest(history: readonly (vscode.ChatRequestTurn | vscode.ChatResponseTurn)[]): string {
    // Get the last user message
    for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i];
        if (turn instanceof vscode.ChatRequestTurn) {
            return turn.prompt;
        }
    }
    return '';
}

export function activate(context: vscode.ExtensionContext) {
    console.log('MemoryX extension is activating...');
    
    // Create chat participant
    participant = vscode.chat.createChatParticipant('memoryx', handler);
    
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.svg');
    
    context.subscriptions.push(participant);
    
    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('memoryx')) {
                sdk = null; // Reset SDK to pick up new config
            }
        })
    );
    
    // Show welcome message on activation (visible in Output and as notification)
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     🧠 MemoryX 已激活                         ║
╠══════════════════════════════════════════════════════════════╣
║  在 VS Code Chat 中使用 @memoryx 开始对话                     ║
║                                                              ║
║  示例:                                                       ║
║    @memoryx 帮我写一个登录函数                                ║
║    @memoryx /search 认证                                     ║
║    @memoryx /list                                            ║
╚══════════════════════════════════════════════════════════════╝
    `);
    
    // Show notification to user
    vscode.window.showInformationMessage(
        '🧠 MemoryX 已激活！在 Chat 中使用 @memoryx 开始。',
        '打开 Chat',
        '查看文档'
    ).then(selection => {
        if (selection === '打开 Chat') {
            vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
        } else if (selection === '查看文档') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/t0ken-ai/MemoryX#readme'));
        }
    });
    
    console.log('MemoryX extension activated successfully!');
}

async function handler(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<void> {
    const config = vscode.workspace.getConfiguration('memoryx');
    const autoCapture = config.get<boolean>('autoCapture') ?? true;
    const autoRecall = config.get<boolean>('autoRecall') ?? true;
    
    try {
        const sdkInstance = await getSDK();
        const history = context.history;
        const userPrompt = request.prompt;
        const command = request.command;
        
        // Handle specific commands
        if (command === 'search') {
            await handleSearch(sdkInstance, userPrompt, stream);
            return;
        }
        
        if (command === 'list') {
            await handleList(sdkInstance, stream);
            return;
        }
        
        if (command === 'clear') {
            await handleClear(sdkInstance, stream);
            return;
        }
        
        if (command === 'remember') {
            await handleRemember(sdkInstance, history, stream);
            return;
        }
        
        // Default behavior: auto capture + auto recall
        stream.progress('Processing...');
        
        // 1. Auto capture conversation using bidirectional flow (addMessage)
        if (autoCapture && history.length > 0) {
            for (const turn of history) {
                if (turn instanceof vscode.ChatRequestTurn) {
                    // User message
                    await sdkInstance.addMessage('user', turn.prompt);
                } else if (turn instanceof vscode.ChatResponseTurn) {
                    // Assistant message
                    const response = (turn as any).response || (turn as any).markdownContent || '';
                    if (response) {
                        await sdkInstance.addMessage('assistant', response);
                    }
                }
            }
        }
        
        // 2. Auto recall relevant memories
        if (autoRecall) {
            const searchQuery = userPrompt || extractUserRequest(history);
            if (searchQuery) {
                const results = await sdkInstance.search(searchQuery, 5);
                
                if (results.data && results.data.length > 0) {
                    stream.markdown('### 💡 Relevant Memories\n\n');
                    
                    for (const memory of results.data) {
                        const content = memory.content || '';
                        const category = memory.category || 'other';
                        stream.markdown(`- **[${category}]** ${content}\n`);
                    }
                    
                    stream.markdown('\n---\n\n');
                }
            }
        }
        
        // 3. Show usage guide on first use
        if (isFirstUse) {
            isFirstUse = false;
            stream.markdown(USAGE_GUIDE);
        }
        
        // 4. Show confirmation
        const stats = await sdkInstance.getQueueStats();
        stream.markdown(`✅ **Conversation captured** (${stats.messageCount} messages in queue)\n`);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stream.markdown(`❌ **Error**: ${errorMessage}\n`);
        
        if (errorMessage.includes('API key')) {
            stream.markdown('\n💡 Tip: Set your API key in VS Code settings (`memoryx.apiKey`) or leave empty for auto-registration.\n');
        }
    }
}

async function handleSearch(sdk: MemoryXSDK, query: string, stream: vscode.ChatResponseStream): Promise<void> {
    if (!query) {
        stream.markdown('❌ Please provide a search query.\n');
        return;
    }
    
    stream.progress(`Searching for "${query}"...`);
    
    const results = await sdk.search(query, 10);
    
    if (!results.data || results.data.length === 0) {
        stream.markdown('No memories found.\n');
        return;
    }
    
    stream.markdown(`### 🔍 Search Results (${results.data.length})\n\n`);
    
    for (const memory of results.data) {
        const content = memory.content || '';
        const category = memory.category || 'other';
        const score = memory.score ? ` (${(memory.score * 100).toFixed(0)}%)` : '';
        stream.markdown(`- **[${category}]**${score} ${content}\n`);
    }
}

async function handleList(sdk: MemoryXSDK, stream: vscode.ChatResponseStream): Promise<void> {
    stream.progress('Loading memories...');
    
    const results = await sdk.list(20, 0);
    
    if (!results.data || results.data.length === 0) {
        stream.markdown('No memories found.\n');
        return;
    }
    
    stream.markdown(`### 📋 Recent Memories (${results.data.length})\n\n`);
    
    for (const memory of results.data) {
        const content = memory.content || '';
        const category = memory.category || 'other';
        stream.markdown(`- **[${category}]** ${content}\n`);
    }
}

async function handleRemember(sdk: MemoryXSDK, history: readonly (vscode.ChatRequestTurn | vscode.ChatResponseTurn)[], stream: vscode.ChatResponseStream): Promise<void> {
    stream.progress('Saving conversation to memory...');
    
    if (history.length === 0) {
        stream.markdown('❌ No conversation to save.\n');
        return;
    }
    
    // Use bidirectional conversation flow
    for (const turn of history) {
        if (turn instanceof vscode.ChatRequestTurn) {
            await sdk.addMessage('user', turn.prompt);
        } else if (turn instanceof vscode.ChatResponseTurn) {
            const response = (turn as any).response || (turn as any).markdownContent || '';
            if (response) {
                await sdk.addMessage('assistant', response);
            }
        }
    }
    
    const stats = await sdk.getQueueStats();
    stream.markdown(`✅ **Conversation saved!** (${stats.messageCount} messages in queue)\n`);
}

async function handleClear(sdk: MemoryXSDK, stream: vscode.ChatResponseStream): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to clear all memories? This action cannot be undone.',
        'Yes, Clear All',
        'Cancel'
    );
    
    if (confirm !== 'Yes, Clear All') {
        stream.markdown('❌ Operation cancelled.\n');
        return;
    }
    
    stream.markdown('⚠️ Clear all memories is not supported via SDK. Please visit the MemoryX portal to manage your memories.\n');
}

export function deactivate() {
    console.log('MemoryX extension deactivated');
    sdk = null;
    participant = null;
}