import { ChatCompletionFunctionTool } from 'openai/resources';
export interface MCPServerConfig {
	name: string;
	sseUrl: string;
}
export interface MCPResult {
	content: string;
}

export interface ErrorResult {
	error: string;
}

export interface ToolCallResult {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
	result?: unknown;
}

export type ToolImplementation<TArgs = Record<string, unknown>, TResult = unknown> = 
	(args: TArgs) => Promise<TResult>;

export type ToolDefinition<
    TArgs = Record<string, unknown>,
    TResult = unknown
> = ChatCompletionFunctionTool & {
    implementation: ToolImplementation<TArgs, TResult>;
    onStart?: (args: TArgs) => void;
    onComplete?: (args: TArgs, result: TResult) => void;
};

// Generic tool definition for arrays of tools with different signatures
export type AnyToolDefinition = ToolDefinition<Record<string, unknown>, unknown>;

// Utility types for extracting tool argument and result types
export type ExtractToolArgs<T> = T extends ToolImplementation<infer A, unknown> ? A : never;

export type ExtractToolResult<T> = T extends ToolImplementation<unknown, infer R> ? R : never;