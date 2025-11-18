/**
 * LLM Cost Calculator
 * Calculates costs for LLM API calls based on latest 2025 pricing
 * Prices per 1 million tokens (input/output)
 */

export interface ModelPricing {
    inputPrice: number;  // Cost per 1M input tokens in USD
    outputPrice: number; // Cost per 1M output tokens in USD
    contextThreshold?: number; // Optional context size threshold for tiered pricing
    highContextInputPrice?: number; // Input price for context > threshold
    highContextOutputPrice?: number; // Output price for context > threshold
}

/**
 * Model pricing database (Updated January 2025)
 * Prices are per 1 million tokens
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
    // OpenAI Models
    'gpt-4o': {
        inputPrice: 2.50,
        outputPrice: 10.00,
    },
    'gpt-4o-mini': {
        inputPrice: 0.15,
        outputPrice: 0.60,
    },
    'gpt-4-turbo': {
        inputPrice: 10.00,
        outputPrice: 30.00,
    },
    'gpt-3.5-turbo': {
        inputPrice: 0.50,
        outputPrice: 1.50,
    },

    // Anthropic Claude Models
    'claude-haiku-3': {
        inputPrice: 0.25,
        outputPrice: 1.25,
    },
    'claude-haiku-3.5': {
        inputPrice: 0.80,
        outputPrice: 4.00,
    },
    'claude-haiku-4.5': {
        inputPrice: 1.00,
        outputPrice: 5.00,
    },
    'claude-sonnet-3.7': {
        inputPrice: 3.00,
        outputPrice: 15.00,
    },
    'claude-sonnet-4': {
        inputPrice: 3.00,
        outputPrice: 15.00,
    },
    'claude-sonnet-4.5': {
        inputPrice: 3.00,
        outputPrice: 15.00,
    },
    'claude-opus-4': {
        inputPrice: 15.00,
        outputPrice: 75.00,
    },
    'claude-opus-4.1': {
        inputPrice: 15.00,
        outputPrice: 75.00,
    },

    // Google Gemini Models
    'gemini-2.0-flash': {
        inputPrice: 0.10,
        outputPrice: 0.40,
    },
    'gemini-2.5-flash': {
        inputPrice: 0.10,
        outputPrice: 0.40,
    },
    'gemini-2.5-pro': {
        inputPrice: 1.25,
        outputPrice: 10.00,
        contextThreshold: 200000,
        highContextInputPrice: 2.50,
        highContextOutputPrice: 15.00,
    },
    'gemini-1.5-pro': {
        inputPrice: 1.25,
        outputPrice: 5.00,
    },
    'gemini-1.5-flash': {
        inputPrice: 0.075,
        outputPrice: 0.30,
    },
};

/**
 * Normalize model name to match pricing key
 * Handles provider prefixes and version variations
 */
export function normalizeModelName(modelName: string): string {
    // Remove provider prefix (e.g., "openai/" or "google-ai-studio/")
    let normalized = modelName.split('/').pop() || modelName;

    // Remove [provider] override syntax (e.g., "gpt-4o[openai]" -> "gpt-4o")
    normalized = normalized.replace(/\[.*?\]/, '');

    // Handle common variations
    const variations: Record<string, string> = {
        'gpt-4o-2024-05-13': 'gpt-4o',
        'gpt-4o-2024-08-06': 'gpt-4o',
        'gpt-4o-mini-2024-07-18': 'gpt-4o-mini',
        'claude-3-haiku-20240307': 'claude-haiku-3',
        'claude-3-5-haiku-20241022': 'claude-haiku-3.5',
        'claude-3-7-sonnet-20250219': 'claude-sonnet-3.7',
        'claude-sonnet-3-5': 'claude-sonnet-3.7',
        'claude-3-5-sonnet-20240620': 'claude-sonnet-3.7',
        'claude-3-5-sonnet-20241022': 'claude-sonnet-3.7',
    };

    return variations[normalized] || normalized;
}

/**
 * Calculate cost for a single LLM API call
 */
export function calculateLLMCost(
    modelName: string,
    promptTokens: number,
    completionTokens: number,
    totalTokens?: number
): number {
    const normalized = normalizeModelName(modelName);
    const pricing = MODEL_PRICING[normalized];

    if (!pricing) {
        console.warn(`No pricing data for model: ${modelName} (normalized: ${normalized}). Using $0 cost.`);
        return 0;
    }

    // Check if we need tiered pricing based on context size
    let inputPrice = pricing.inputPrice;
    let outputPrice = pricing.outputPrice;

    if (pricing.contextThreshold && totalTokens && totalTokens > pricing.contextThreshold) {
        inputPrice = pricing.highContextInputPrice || pricing.inputPrice;
        outputPrice = pricing.highContextOutputPrice || pricing.outputPrice;
    }

    // Calculate cost (prices are per 1M tokens, so divide by 1,000,000)
    const inputCost = (promptTokens / 1_000_000) * inputPrice;
    const outputCost = (completionTokens / 1_000_000) * outputPrice;

    return inputCost + outputCost;
}

/**
 * Extract provider from model name
 */
export function extractProvider(modelName: string): string {
    // Check for [provider] override
    const overrideMatch = modelName.match(/\[(.*?)\]/);
    if (overrideMatch) {
        return overrideMatch[1];
    }

    // Extract from provider/model format
    const parts = modelName.split('/');
    if (parts.length > 1) {
        const provider = parts[0];
        // Map provider names
        if (provider === 'google-ai-studio') return 'google';
        return provider;
    }

    // Infer from model name
    if (modelName.includes('gpt')) return 'openai';
    if (modelName.includes('claude')) return 'anthropic';
    if (modelName.includes('gemini')) return 'google';

    return 'unknown';
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
    if (cost < 0.01) {
        return `$${cost.toFixed(6)}`;
    } else if (cost < 1) {
        return `$${cost.toFixed(4)}`;
    } else {
        return `$${cost.toFixed(2)}`;
    }
}

/**
 * Get pricing info for a model
 */
export function getModelPricing(modelName: string): ModelPricing | null {
    const normalized = normalizeModelName(modelName);
    return MODEL_PRICING[normalized] || null;
}
