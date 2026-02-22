import * as vscode from 'vscode';
import { MemoryXSDK } from '@t0ken.ai/memoryx-sdk';
import * as path from 'path';
import * as os from 'os';

let sdk: MemoryXSDK | null = null;
let participant: vscode.ChatParticipant | null = null;

const STORAGE_DIR = path.join(os.homedir(), '.memoryx', 'vscode-extension');

async function getSDK(): Promise<MemoryXSDK> {
    if (sdk) {
        return sdk;
    }
    
    const config = vscode.workspace.getConfiguration('memoryx');
    const apiUrl = config.get<string>('apiUrl') || 'https://t0ken.ai/api';
    const apiKey = config.get<string>('apiKey') || '';
    
    sdk = new MemoryXSDK({
        strategy: {
            maxTokens: 20000,
            intervalMs: 60000  // 1 minute idle
        },
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
        
        // 1. Auto capture conversation
        if (autoCapture && history.length > 0) {
            const historyContent = extractHistoryContent(history);
            if (historyContent.trim()) {
                await sdkInstance.addMemory(historyContent, {
                    source: 'vscode-chat',
                    timestamp: new Date().toISOString()
                });
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
        
        // 3. Show confirmation
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
    
    const historyContent = extractHistoryContent(history);
    
    if (!historyContent.trim()) {
        stream.markdown('❌ No conversation to save.\n');
        return;
    }
    
    await sdk.addMemory(historyContent, {
        source: 'vscode-chat-manual',
        timestamp: new Date().toISOString()
    });
    
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