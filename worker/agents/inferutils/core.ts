import { OpenAI } from 'openai';
import { Stream } from 'openai/streaming';
import { z } from 'zod';
import {
    type SchemaFormat,
    type FormatterOptions,
    generateTemplateForSchema,
    parseContentForSchema,
} from './schemaFormatters';
import { zodResponseFormat } from 'openai/helpers/zod.mjs';
import {
    ChatCompletionMessageFunctionToolCall,
    type ReasoningEffort,
    type ChatCompletionChunk,
} from 'openai/resources.mjs';
import { Message, MessageContent, MessageRole } from './common';
import { ToolCallResult, ToolDefinition, AnyToolDefinition } from '../tools/types';
import { AgentActionKey, AIModels, InferenceMetadata } from './config.types';
// import { SecretsService } from '../../database';
import { RateLimitService } from '../../services/rate-limit/rateLimits';
import { SecurityError, RateLimitExceededError } from 'shared/types/errors';
import { executeToolWithDefinition } from '../tools/customTools';
import { RateLimitType } from 'worker/services/rate-limit/config';
import { getMaxToolCallingDepth, MAX_LLM_MESSAGES } from '../constants';
import { LLMUsageService } from '../../database/services/LLMUsageService';

/**
 * Helper function to record LLM usage asynchronously
 */
async function recordLLMUsage(
    env: Env,
    params: {
        userId: string;
        appId: string;
        agentActionName: string;
        modelName: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        metadata?: Record<string, unknown>;
    }
): Promise<void> {
    try {
        const usageService = new LLMUsageService(env);
        await usageService.recordUsage(params);
    } catch (error) {
        // Log but don't throw - usage tracking should not break inference
        console.error('Error recording LLM usage:', error);
    }
}

function optimizeInputs(messages: Message[]): Message[] {
    return messages.map((message) => ({
        ...message,
        content: optimizeMessageContent(message.content),
    }));
}

// Streaming tool-call accumulation helpers 
type ToolCallsArray = NonNullable<NonNullable<ChatCompletionChunk['choices'][number]['delta']>['tool_calls']>;
type ToolCallDelta = ToolCallsArray[number];
type ToolAccumulatorEntry = ChatCompletionMessageFunctionToolCall & { index?: number; __order: number };

function synthIdForIndex(i: number): string {
    return `tool_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`;
}

function accumulateToolCallDelta(
    byIndex: Map<number, ToolAccumulatorEntry>,
    byId: Map<string, ToolAccumulatorEntry>,
    deltaToolCall: ToolCallDelta,
    orderCounterRef: { value: number }
): void {
    const idx = deltaToolCall.index;
    const idFromDelta = deltaToolCall.id;

    let entry: ToolAccumulatorEntry | undefined;

    // Look up existing entry by id or index
    if (idFromDelta && byId.has(idFromDelta)) {
        entry = byId.get(idFromDelta)!;
    } else if (idx !== undefined && byIndex.has(idx)) {
        entry = byIndex.get(idx)!;
    } else {
        // Create new entry
        const provisionalId = idFromDelta || synthIdForIndex(idx ?? byId.size);
        entry = {
            id: provisionalId,
            type: 'function',
            function: {
                name: '',
                arguments: '',
            },
            __order: orderCounterRef.value++,
            ...(idx !== undefined ? { index: idx } : {}),
        };
        if (idx !== undefined) byIndex.set(idx, entry);
        byId.set(provisionalId, entry);
    }

    // Update id if provided and different
    if (idFromDelta && entry.id !== idFromDelta) {
        byId.delete(entry.id);
        entry.id = idFromDelta;
        byId.set(entry.id, entry);
    }

    // Register index if provided and not yet registered
    if (idx !== undefined && entry.index === undefined) {
        entry.index = idx;
        byIndex.set(idx, entry);
    }

    // Update function name - replace if provided
    if (deltaToolCall.function?.name) {
        entry.function.name = deltaToolCall.function.name;
    }

    // Append arguments - accumulate string chunks
    if (deltaToolCall.function?.arguments !== undefined) {
        const before = entry.function.arguments;
        const chunk = deltaToolCall.function.arguments;

        // Check if we already have complete JSON and this is extra data
        let isComplete = false;
        if (before.length > 0) {
            try {
                JSON.parse(before);
                isComplete = true;
                console.warn(`[TOOL_CALL_WARNING] Already have complete JSON, ignoring additional chunk for ${entry.function.name}:`, {
                    existing_json: before,
                    ignored_chunk: chunk
                });
            } catch {
                // Not complete yet, continue accumulating
            }
        }

        if (!isComplete) {
            entry.function.arguments += chunk;
        }
    }
}

function assembleToolCalls(
    byIndex: Map<number, ToolAccumulatorEntry>,
    byId: Map<string, ToolAccumulatorEntry>
): ChatCompletionMessageFunctionToolCall[] {
    if (byIndex.size > 0) {
        return Array.from(byIndex.values())
            .sort((a, b) => (a.index! - b.index!))
            .map((e) => ({ id: e.id, type: 'function' as const, function: { name: e.function.name, arguments: e.function.arguments } }));
    }
    return Array.from(byId.values())
        .sort((a, b) => a.__order - b.__order)
        .map((e) => ({ id: e.id, type: 'function' as const, function: { name: e.function.name, arguments: e.function.arguments } }));
}

function optimizeMessageContent(content: MessageContent): MessageContent {
    if (!content) return content;
    // If content is an array (TextContent | ImageContent), only optimize text content
    if (Array.isArray(content)) {
        return content.map((item) =>
            item.type === 'text'
                ? { ...item, text: optimizeTextContent(item.text) }
                : item,
        );
    }

    // If content is a string, optimize it directly
    return optimizeTextContent(content);
}

function optimizeTextContent(content: string): string {
    // CONSERVATIVE OPTIMIZATION - Only safe changes that preserve readability

    // 1. Remove trailing whitespace from lines (always safe)
    content = content.replace(/[ \t]+$/gm, '');

    // 2. Reduce excessive empty lines (more than 3 consecutive) to 2 max
    // This preserves intentional spacing while removing truly excessive gaps
    content = content.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n\n');

    // // Convert 4-space indentation to 2-space for non-Python/YAML content
    // content = content.replace(/^( {4})+/gm, (match) =>
    // 	'  '.repeat(match.length / 4),
    // );

    // // Convert 8-space indentation to 2-space
    // content = content.replace(/^( {8})+/gm, (match) =>
    // 	'  '.repeat(match.length / 8),
    // );
    // 4. Remove leading/trailing whitespace from the entire content
    // (but preserve internal structure)
    content = content.trim();

    return content;
}

export async function buildGatewayUrl(env: Env, providerOverride?: AIGatewayProviders): Promise<string> {
    if (env.CLOUDFLARE_AI_GATEWAY_URL &&
        env.CLOUDFLARE_AI_GATEWAY_URL !== 'none' &&
        env.CLOUDFLARE_AI_GATEWAY_URL.trim() !== '') {

        try {
            const url = new URL(env.CLOUDFLARE_AI_GATEWAY_URL);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
                const cleanPathname = url.pathname.replace(/\/$/, '');
                url.pathname = providerOverride ? `${cleanPathname}/${providerOverride}` : `${cleanPathname}/compat`;
                return url.toString();
            }
        } catch {
            // Invalid URL, fall through to use bindings
        }
    }

    const gateway = env.AI.gateway(env.CLOUDFLARE_AI_GATEWAY);
    const baseUrl = providerOverride ? await gateway.getUrl(providerOverride) : `${await gateway.getUrl()}compat`;
    return baseUrl;
}

function isValidApiKey(apiKey: string): boolean {
    if (!apiKey || apiKey.trim() === '') {
        return false;
    }
    // Check if value is not 'default' or 'none' and is more than 10 characters long
    if (apiKey.trim().toLowerCase() === 'default' || apiKey.trim().toLowerCase() === 'none' || apiKey.trim().length < 10) {
        return false;
    }
    return true;
}

async function getApiKey(provider: string, env: Env, _userId: string): Promise<string> {
    const providerKeyString = provider.toUpperCase().replaceAll('-', '_');
    const envKey = `${providerKeyString}_API_KEY` as keyof Env;
    let apiKey: string = env[envKey] as string;

    if (!isValidApiKey(apiKey)) {
        apiKey = env.CLOUDFLARE_AI_GATEWAY_TOKEN || '';
    }
    return apiKey;
}

export async function getConfigurationForModel(
    model: AIModels | string,
    env: Env,
    userId: string,
    configProviderOverride?: 'cloudflare' | 'direct',
): Promise<{
    baseURL: string,
    apiKey: string,
    defaultHeaders?: Record<string, string>,
}> {
    let providerForcedOverride: AIGatewayProviders | undefined;
    // Check if provider forceful-override is set
    const match = model.match(/\[(.*?)\]/);
    if (match) {
        const provider = match[1];
        if (provider === 'openrouter') {
            return {
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: env.OPENROUTER_API_KEY || '',
            };
        } else if (provider === 'gemini') {
            return {
                baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
                apiKey: env.GOOGLE_AI_STUDIO_API_KEY,
            };
        } else if (provider === 'claude') {
            return {
                baseURL: 'https://api.anthropic.com/v1/',
                apiKey: env.ANTHROPIC_API_KEY || '',
            };
        }
        providerForcedOverride = provider as AIGatewayProviders;
    }

    // Extract the provider name from model name. Model name is of type `provider/model_name`
    const provider = providerForcedOverride || model.split('/')[0];

    // Check for Gateway token - try new name first, then legacy name
    const gatewayToken = env.AI_GATEWAY_AUTH_TOKEN || env.CLOUDFLARE_AI_GATEWAY_TOKEN || "";

    if (configProviderOverride === 'direct') {
        if (provider === 'google-ai-studio') {
            return {
                baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
                apiKey: env.GOOGLE_AI_STUDIO_API_KEY,
            };
        } else if (provider === 'anthropic') {
            return {
                baseURL: 'https://api.anthropic.com/v1/',
                apiKey: env.ANTHROPIC_API_KEY || '',
            };
        } else if (provider === 'openai') {
            return {
                baseURL: 'https://api.openai.com/v1',
                apiKey: env.OPENAI_API_KEY || '',
            };
        } else if (provider === 'cerebras') {
            return {
                baseURL: 'https://api.cerebras.ai/v1',
                apiKey: env.CEREBRAS_API_KEY || '',
            };
        }
    }

    // Fallback: If Gateway token doesn't exist, use direct provider URLs
    if (!gatewayToken) {
        console.warn(`[Gateway] No authentication token found, using direct provider URL for: ${provider}`);
        if (provider === 'google-ai-studio') {
            return {
                baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
                apiKey: env.GOOGLE_AI_STUDIO_API_KEY,
            };
        } else if (provider === 'anthropic') {
            return {
                baseURL: 'https://api.anthropic.com/v1/',
                apiKey: env.ANTHROPIC_API_KEY || '',
            };
        } else if (provider === 'openai') {
            return {
                baseURL: 'https://api.openai.com/v1',
                apiKey: env.OPENAI_API_KEY || '',
            };
        }
    }

    const baseURL = await buildGatewayUrl(env, providerForcedOverride);

    // Try to find API key of type <PROVIDER>_API_KEY else default to Gateway token
    const apiKey = await getApiKey(provider, env, userId);

    // AI Gateway Authenticated requests - set cf-aig-authorization header if token exists
    const defaultHeaders = gatewayToken ? {
        'cf-aig-authorization': `Bearer ${gatewayToken}`,
    } : undefined;
    return {
        baseURL,
        apiKey,
        defaultHeaders
    };
}

type InferArgsBase = {
    env: Env;
    metadata: InferenceMetadata;
    actionKey: AgentActionKey  | 'testModelConfig';
    messages: Message[];
    maxTokens?: number;
    modelName: AIModels | string;
    reasoning_effort?: ReasoningEffort;
    temperature?: number;
    stream?: {
        chunk_size: number;
        onChunk: (chunk: string) => void;
    };
    tools?: AnyToolDefinition[];
    providerOverride?: 'cloudflare' | 'direct';
    userApiKeys?: Record<string, string>;
    abortSignal?: AbortSignal;
};

type InferArgsStructured = InferArgsBase & {
    schema: z.AnyZodObject;
    schemaName: string;
};

type InferWithCustomFormatArgs = InferArgsStructured & {
    format?: SchemaFormat;
    formatOptions?: FormatterOptions;
};

export interface ToolCallContext {
    messages: Message[];
    depth: number;
}

export function serializeCallChain(context: ToolCallContext, finalResponse: string): string {
    // Build a transcript of the tool call messages, and append the final response
    let transcript = '**Request terminated by user, partial response transcript (last 5 messages):**\n\n<call_chain_transcript>';
    for (const message of context.messages.slice(-5)) {
        let content = message.content;
        
        // Truncate tool messages to 100 chars
        if (message.role === 'tool' || message.role === 'function') {
            content = (content || '').slice(0, 100);
        }
        
        transcript += `<message role="${message.role}">${content}</message>`;
    }
    transcript += `<final_response>${finalResponse || '**cancelled**'}</final_response>`;
    transcript += '</call_chain_transcript>';
    return transcript;
}

export class InferError extends Error {
    constructor(
        message: string,
        public response: string,
        public toolCallContext?: ToolCallContext
    ) {
        super(message);
        this.name = 'InferError';
    }

    partialResponseTranscript(): string {
        if (!this.toolCallContext) {
            return this.response;
        }
        return serializeCallChain(this.toolCallContext, this.response);
    }

    partialResponse(): InferResponseString {
        return {
            string: this.response,
            toolCallContext: this.toolCallContext
        };
    }
}

export class AbortError extends InferError {
    constructor(response: string, toolCallContext?: ToolCallContext) {
        super(response, response, toolCallContext);
        this.name = 'AbortError';
    }
}

const claude_thinking_budget_tokens = {
    medium: 8000,
    high: 16000,
    low: 4000,
    minimal: 1000,
};

export type InferResponseObject<OutputSchema extends z.AnyZodObject> = {
    object: z.infer<OutputSchema>;
    toolCallContext?: ToolCallContext;
};

export type InferResponseString = {
    string: string;
    toolCallContext?: ToolCallContext;
};

/**
 * Execute all tool calls from OpenAI response
 */
async function executeToolCalls(openAiToolCalls: ChatCompletionMessageFunctionToolCall[], originalDefinitions: ToolDefinition[]): Promise<ToolCallResult[]> {
    const toolDefinitions = new Map(originalDefinitions.map(td => [td.function.name, td]));
    return Promise.all(
        openAiToolCalls.map(async (tc) => {
            try {
                const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
                const td = toolDefinitions.get(tc.function.name);
                if (!td) {
                    throw new Error(`Tool ${tc.function.name} not found`);
                }
                const result = await executeToolWithDefinition(td, args);
                return {
                    id: tc.id,
                    name: tc.function.name,
                    arguments: args,
                    result
                };
            } catch (error) {
                console.error(`Tool execution failed for ${tc.function.name}:`, error);
                return {
                    id: tc.id,
                    name: tc.function.name,
                    arguments: {},
                    result: { error: `Failed to execute ${tc.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}` }
            };
            }
        })
    );
}

export function infer<OutputSchema extends z.AnyZodObject>(
    args: InferArgsStructured,
    toolCallContext?: ToolCallContext,
): Promise<InferResponseObject<OutputSchema>>;

export function infer(args: InferArgsBase, toolCallContext?: ToolCallContext): Promise<InferResponseString>;

export function infer<OutputSchema extends z.AnyZodObject>(
    args: InferWithCustomFormatArgs,
    toolCallContext?: ToolCallContext,
): Promise<InferResponseObject<OutputSchema>>;

/**
 * Perform an inference using OpenAI's structured output with JSON schema
 * This uses the response_format.schema parameter to ensure the model returns
 * a response that matches the provided schema.
 */
export async function infer<OutputSchema extends z.AnyZodObject>({
    env,
    metadata,
    messages,
    schema,
    schemaName,
    actionKey,
    format,
    formatOptions,
    maxTokens,
    modelName,
    stream,
    tools,
    reasoning_effort,
    temperature,
    abortSignal,
    providerOverride,
}: InferArgsBase & {
    schema?: OutputSchema;
    schemaName?: string;
    format?: SchemaFormat;
    formatOptions?: FormatterOptions;
}, toolCallContext?: ToolCallContext): Promise<InferResponseObject<OutputSchema> | InferResponseString> {
    if (messages.length > MAX_LLM_MESSAGES) {
        throw new RateLimitExceededError(`Message limit exceeded: ${messages.length} messages (max: ${MAX_LLM_MESSAGES}). Please use context compactification.`, RateLimitType.LLM_CALLS);
    }
    
    // Check tool calling depth to prevent infinite recursion
    const currentDepth = toolCallContext?.depth ?? 0;
    if (currentDepth >= getMaxToolCallingDepth(actionKey)) {
        console.warn(`Tool calling depth limit reached (${currentDepth}/${getMaxToolCallingDepth(actionKey)}). Stopping recursion.`);
        // Return a response indicating max depth reached
        if (schema) {
            throw new AbortError(`Maximum tool calling depth (${getMaxToolCallingDepth(actionKey)}) exceeded. Tools may be calling each other recursively.`, toolCallContext);
        }
        return { 
            string: `[System: Maximum tool calling depth reached.]`,
            toolCallContext 
        };
    }
    
    try {
        // Tier-based rate limiting with smart fallback
        const rateLimitResult = await RateLimitService.enforceTierBasedLLMLimit(env, metadata.userId, modelName as AIModels);

        // Use the returned model (might be fallback if rate limited)
        if (rateLimitResult.model !== modelName) {
            console.info('Using fallback model due to tier rate limit', {
                userId: metadata.userId,
                requestedModel: modelName,
                fallbackModel: rateLimitResult.model,
                message: rateLimitResult.message
            });
        }

        // Override modelName with tier-approved model (either requested or fallback)
        modelName = rateLimitResult.model;

        const { apiKey, baseURL, defaultHeaders } = await getConfigurationForModel(modelName, env, metadata.userId, providerOverride);

        // Remove [*.] from model name
        modelName = modelName.replace(/\[.*?\]/, '');

        // Strip provider prefix (e.g., "google-ai-studio/gemini-2.5-flash" -> "gemini-2.5-flash")
        const modelParts = modelName.split('/');
        if (modelParts.length > 1) {
            modelName = modelParts.slice(1).join('/');
        }

        const client = new OpenAI({ apiKey, baseURL: baseURL, defaultHeaders });
        const schemaObj =
            schema && schemaName && !format
                ? { response_format: zodResponseFormat(schema, schemaName) }
                : {};
        const extraBody = modelName.includes('claude')? {
                    extra_body: {
                        thinking: {
                            type: 'enabled',
                            budget_tokens: claude_thinking_budget_tokens[reasoning_effort ?? 'medium'],
                        },
                    },
                }
            : {};

        const optimizedMessages = optimizeInputs(messages);

        let messagesToPass = [...optimizedMessages];
        if (toolCallContext && toolCallContext.messages) {
            // Minimal core fix with logging: exclude prior tool messages that have empty name
            const ctxMessages = toolCallContext.messages;
            const droppedToolMsgs = ctxMessages.filter(m => m.role === 'tool' && (!m.name || m.name.trim() === ''));
            if (droppedToolMsgs.length) {
                console.warn(`[TOOL_CALL_WARNING] Dropping ${droppedToolMsgs.length} prior tool message(s) with empty name to avoid provider error`, droppedToolMsgs);
            }
            const filteredCtx = ctxMessages.filter(m => m.role !== 'tool' || (m.name && m.name.trim() !== ''));
            messagesToPass.push(...filteredCtx);
        }

        if (format) {
            if (!schema || !schemaName) {
                throw new Error('Schema and schemaName are required when using a custom format');
            }
            const formatInstructions = generateTemplateForSchema(
                schema,
                format,
                formatOptions,
            );
            const lastMessage = messagesToPass[messagesToPass.length - 1];

            // Handle multi-modal content properly
            if (typeof lastMessage.content === 'string') {
                // Simple string content - append format instructions
                messagesToPass = [
                    ...messagesToPass.slice(0, -1),
                    {
                        role: lastMessage.role,
                        content: `${lastMessage.content}\n\n${formatInstructions}`,
                    },
                ];
            } else if (Array.isArray(lastMessage.content)) {
                // Multi-modal content - append format instructions to the text part
                const updatedContent = lastMessage.content.map((item) => {
                    if (item.type === 'text') {
                        return {
                            ...item,
                            text: `${item.text}\n\n${formatInstructions}`,
                        };
                    }
                    return item;
                });
                messagesToPass = [
                    ...messagesToPass.slice(0, -1),
                    {
                        role: lastMessage.role,
                        content: updatedContent,
                    },
                ];
            }
        }

        const toolsOpts = tools ? { tools, tool_choice: 'auto' as const } : {};
        let response: OpenAI.ChatCompletion | OpenAI.ChatCompletionChunk | Stream<OpenAI.ChatCompletionChunk>;

        // Only include reasoning_effort for OpenAI reasoning models (o1, o3, o5)
        // Gemini and other providers don't support this parameter and will return 400 errors
        const isOpenAIReasoningModel = modelName.startsWith('o1') || modelName.startsWith('o3') || modelName.startsWith('o5');
        const reasoningEffortOpts = isOpenAIReasoningModel && reasoning_effort ? { reasoning_effort } : {};

        try {
            // Call OpenAI API with proper structured output format
            response = await client.chat.completions.create({
                ...schemaObj,
                ...extraBody,
                ...toolsOpts,
                ...reasoningEffortOpts,
                model: modelName,
                messages: messagesToPass as OpenAI.ChatCompletionMessageParam[],
                max_completion_tokens: maxTokens || 150000,
                stream: stream ? true : false,
                temperature,
            }, {
                signal: abortSignal,
                headers: {
                    "cf-aig-metadata": JSON.stringify({
                        chatId: metadata.agentId,
                        userId: metadata.userId,
                        schemaName,
                        actionKey,
                    })
                }
            });
        } catch (error) {
            if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('abort'))) {
                throw new AbortError('**User cancelled inference**', toolCallContext);
            }
            
            console.error(`Failed to get inference response from OpenAI: ${error}`);
            if ((error instanceof Error && error.message.includes('429')) || (typeof error === 'string' && error.includes('429'))) {
                throw new RateLimitExceededError('Rate limit exceeded in LLM calls, Please try again later', RateLimitType.LLM_CALLS);
            }
            throw error;
        }
        let toolCalls: ChatCompletionMessageFunctionToolCall[] = [];

        let content = '';
        if (stream) {
            // If streaming is enabled, handle the stream response
            if (response instanceof Stream) {
                let streamIndex = 0;
                // Accumulators for tool calls: by index (preferred) and by id (fallback when index is missing)
                const byIndex = new Map<number, ToolAccumulatorEntry>();
                const byId = new Map<string, ToolAccumulatorEntry>();
                const orderCounterRef = { value: 0 };
                
                for await (const event of response) {
                    const delta = (event as ChatCompletionChunk).choices[0]?.delta;
                    
                    if (delta?.tool_calls) {
                        try {
                            for (const deltaToolCall of delta.tool_calls as ToolCallsArray) {
                                accumulateToolCallDelta(byIndex, byId, deltaToolCall, orderCounterRef);
                            }
                        } catch (error) {
                            console.error('Error processing tool calls in streaming:', error);
                        }
                    }
                    
                    // Process content
                    content += delta?.content || '';
                    const slice = content.slice(streamIndex);
                    const finishReason = (event as ChatCompletionChunk).choices[0]?.finish_reason;
                    if (slice.length >= stream.chunk_size || finishReason != null) {
                        stream.onChunk(slice);
                        streamIndex += slice.length;
                    }
                }
                
                // Assemble toolCalls with preference for index ordering, else first-seen order
                const assembled = assembleToolCalls(byIndex, byId);
                const dropped = assembled.filter(tc => !tc.function.name || tc.function.name.trim() === '');
                if (dropped.length) {
                    console.warn(`[TOOL_CALL_WARNING] Dropping ${dropped.length} streamed tool_call(s) without function name`, dropped);
                }
                toolCalls = assembled.filter(tc => tc.function.name && tc.function.name.trim() !== '');
                
                // Validate accumulated tool calls (do not mutate arguments)
                for (const toolCall of toolCalls) {
                    if (!toolCall.function.name) {
                        console.warn('Tool call missing function name:', toolCall);
                    }
                    if (toolCall.function.arguments) {
                        try {
                            JSON.parse(toolCall.function.arguments);
                        } catch (error) {
                            console.error(`[TOOL_CALL_VALIDATION] Invalid JSON in tool call arguments for ${toolCall.function.name}:`, {
                                error: error instanceof Error ? error.message : String(error),
                                arguments_length: toolCall.function.arguments.length,
                                arguments_content: toolCall.function.arguments,
                                arguments_hex: Buffer.from(toolCall.function.arguments).toString('hex')
                            });
                        }
                    }
                }
                // Do not drop tool calls without id; we used a synthetic id and will update if a real id arrives in later deltas
            } else {
                // Handle the case where stream was requested but a non-stream response was received
                console.error('Expected a stream response but received a ChatCompletion object.');
                // Properly extract both content and tool calls from non-stream response
                const completion = response as OpenAI.ChatCompletion;
                const message = completion.choices[0]?.message;
                if (message) {
                    content = message.content || '';
                    toolCalls = (message.tool_calls as ChatCompletionMessageFunctionToolCall[]) || [];
                }
            }
        } else {
            // If not streaming, get the full response content (response is ChatCompletion)
            content = (response as OpenAI.ChatCompletion).choices[0]?.message?.content || '';
            const allToolCalls = ((response as OpenAI.ChatCompletion).choices[0]?.message?.tool_calls as ChatCompletionMessageFunctionToolCall[] || []);
            const droppedNonStream = allToolCalls.filter(tc => !tc.function.name || tc.function.name.trim() === '');
            if (droppedNonStream.length) {
                console.warn(`[TOOL_CALL_WARNING] Dropping ${droppedNonStream.length} non-stream tool_call(s) without function name`, droppedNonStream);
            }
            toolCalls = allToolCalls.filter(tc => tc.function.name && tc.function.name.trim() !== '');
        }

        // Extract usage data from response for cost tracking
        const usage = (response as OpenAI.ChatCompletion).usage;
        if (usage) {
            // Record usage asynchronously (don't block on it)
            recordLLMUsage(env, {
                userId: metadata.userId,
                appId: metadata.agentId, // Using agentId as appId for now
                agentActionName: actionKey,
                modelName,
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0,
                totalTokens: usage.total_tokens || 0,
                metadata: {
                    schemaName,
                    hasTools: Boolean(tools && tools.length > 0),
                    streaming: Boolean(stream),
                    reasoningEffort: reasoning_effort,
                },
            }).catch(error => {
                console.error('Failed to record LLM usage:', error);
            });
        }

        if (!content && !stream && !toolCalls.length) {
            console.warn('No content received from OpenAI', JSON.stringify(response, null, 2));
            return { string: "", toolCallContext };
        }
        let executedToolCalls: ToolCallResult[] = [];
        if (tools) {
            executedToolCalls = await executeToolCalls(toolCalls, tools);
        }

        if (executedToolCalls.length) {
            // Generate a new response with the tool calls executed
            const newMessages = [
                ...(toolCallContext?.messages || []),
                { role: "assistant" as MessageRole, content, tool_calls: toolCalls },
                ...executedToolCalls
                    .filter(result => result.name && result.name.trim() !== '')
                    .map((result, _) => ({
                        role: "tool" as MessageRole,
                        content: result.result ? JSON.stringify(result.result) : 'done',
                        name: result.name,
                        tool_call_id: result.id,
                    })),
            ];

            const newDepth = (toolCallContext?.depth ?? 0) + 1;
            const newToolCallContext = {
                messages: newMessages,
                depth: newDepth
            };
            
            const executedCallsWithResults = executedToolCalls.filter(result => result.result);

            if (executedCallsWithResults.length) {
                if (schema && schemaName) {
                    const output = await infer<OutputSchema>({
                        env,
                        metadata,
                        messages,
                        schema,
                        schemaName,
                        format,
                        formatOptions,
                        actionKey,
                        modelName,
                        maxTokens,
                        stream,
                        tools,
                        reasoning_effort,
                        temperature,
                        abortSignal,
                    }, newToolCallContext);
                    return output;
                } else {
                    const output = await infer({
                        env,
                        metadata,
                        messages,
                        modelName,
                        maxTokens,
                        actionKey,
                        stream,
                        tools,
                        reasoning_effort,
                        temperature,
                        abortSignal,
                    }, newToolCallContext);
                    return output;
                }
            } else {
                console.log('No tool calls with results');
                return { string: content, toolCallContext: newToolCallContext };
            }
        }

        if (!schema) {
            return { string: content, toolCallContext };
        }

        try {
            // Parse the response
            const parsedContent = format
                ? parseContentForSchema(content, format, schema, formatOptions)
                : JSON.parse(content);

            // Use Zod's safeParse for proper error handling
            const result = schema.safeParse(parsedContent);

            if (!result.success) {
                console.error('Schema validation errors:', result.error.format());
                throw new Error(`Failed to validate AI response against schema: ${result.error.message}`);
            }

            return { object: result.data, toolCallContext };
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            throw new InferError('Failed to parse response', content, toolCallContext);
        }
    } catch (error) {
        if (error instanceof RateLimitExceededError || error instanceof SecurityError) {
            throw error;
        }
        console.error('Error in inferWithSchemaOutput:', error);
        throw error;
    }
}
