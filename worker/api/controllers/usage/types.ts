/**
 * Usage Controller API Types
 * Types for LLM usage and cost tracking endpoints
 */

import { UsageStats } from '../../../database/services/LLMUsageService';

export interface LLMUsageRecord {
    id: string;
    userId: string | null;
    appId: string | null;
    agentActionName: string;
    modelName: string;
    provider: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    metadata?: Record<string, unknown>;
    requestedAt: Date;
}

export interface UsageStatsData {
    stats: UsageStats;
}

export interface TotalCostData {
    totalCost: number;
}

export interface RecentUsageData {
    records: LLMUsageRecord[];
}
