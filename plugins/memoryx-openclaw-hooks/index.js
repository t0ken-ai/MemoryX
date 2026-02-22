"use strict";
/**
 * MemoryX OpenClaw Hook
 * JavaScript/TypeScript version for OpenClaw Gateway
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMessage = onMessage;
exports.onResponse = onResponse;
// Check if memoryx-realtime-plugin is installed
function isPluginInstalled() {
    try {
        const { execSync } = require('child_process');
        const result = execSync('openclaw plugins list', {
            encoding: 'utf8',
            timeout: 5000
        });
        return result.includes('memoryx-realtime') && result.includes('loaded');
    }
    catch (e) {
        return false;
    }
}
// Check if t0ken-memoryx is available
const MEMORYX_AVAILABLE = (() => {
    try {
        require('t0ken-memoryx');
        return true;
    }
    catch (e) {
        return false;
    }
})();
/**
 * Handle incoming message
 */
async function onMessage(message, context) {
    // Skip if memoryx-realtime-plugin is installed (avoid duplication)
    if (isPluginInstalled()) {
        return { context };
    }
    // Validate message
    if (!MEMORYX_AVAILABLE || !message || message.length < 5 || message.length > 500) {
        return { context };
    }
    // Submit to MemoryX cloud for processing
    try {
        const memoryx = require('t0ken-memoryx');
        const memory = memoryx.connect_memory({ verbose: false });
        // Async store (non-blocking)
        memory.add(message, 'semantic', 'default', {
            source: 'openclaw_hook_js',
            timestamp: new Date().toISOString()
        }).catch(() => {
            // Silently fail
        });
    }
    catch (e) {
        // Silently fail
    }
    return { context };
}
/**
 * Handle AI response
 */
function onResponse(response, context) {
    // Currently no-op, could capture AI responses here
    return response;
}
// CommonJS export for OpenClaw compatibility
module.exports = {
    onMessage,
    onResponse
};
