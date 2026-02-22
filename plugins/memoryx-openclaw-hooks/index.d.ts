/**
 * MemoryX OpenClaw Hook
 * JavaScript/TypeScript version for OpenClaw Gateway
 */
interface HookContext {
    [key: string]: any;
}
/**
 * Handle incoming message
 */
export declare function onMessage(message: string, context: HookContext): Promise<{
    context: HookContext;
}>;
/**
 * Handle AI response
 */
export declare function onResponse(response: string, context: HookContext): string;
export {};
//# sourceMappingURL=index.d.ts.map