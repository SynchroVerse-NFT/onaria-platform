/**
 * LLM Usage Service
 * Handles database operations for LLM token usage and cost tracking
 */

import { BaseService } from './BaseService';
import { eq, desc, gte, lte, sum } from 'drizzle-orm';
import { llmUsage } from '../schema';
import { nanoid } from 'nanoid';
import { calculateLLMCost, extractProvider } from '../../utils/llmCostCalculator';

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

export interface CreateLLMUsageParams {
    userId?: string | null;
    appId?: string | null;
    agentActionName: string;
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens?: number;
    metadata?: Record<string, unknown>;
}

export interface UsageStats {
    totalCost: number;
    totalTokens: number;
    totalCalls: number;
    promptTokens: number;
    completionTokens: number;
    byModel: Record<string, { cost: number; tokens: number; calls: number }>;
    byProvider: Record<string, { cost: number; tokens: number; calls: number }>;
    byAction: Record<string, { cost: number; tokens: number; calls: number }>;
}

export class LLMUsageService extends BaseService {
    /**
     * Record a new LLM usage entry
     */
    async recordUsage(params: CreateLLMUsageParams): Promise<void> {
        try {
            const totalTokens = params.totalTokens || (params.promptTokens + params.completionTokens);
            const cost = calculateLLMCost(
                params.modelName,
                params.promptTokens,
                params.completionTokens,
                totalTokens
            );
            const provider = extractProvider(params.modelName);

            await this.database.insert(llmUsage).values({
                id: nanoid(),
                userId: params.userId || null,
                appId: params.appId || null,
                agentActionName: params.agentActionName,
                modelName: params.modelName,
                provider,
                promptTokens: params.promptTokens,
                completionTokens: params.completionTokens,
                totalTokens,
                cost,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null,
                requestedAt: new Date(),
            });

            this.logger.info('Recorded LLM usage', {
                modelName: params.modelName,
                provider,
                cost: cost.toFixed(6),
                promptTokens: params.promptTokens,
                completionTokens: params.completionTokens,
                agentActionName: params.agentActionName,
            });
        } catch (error) {
            this.handleDatabaseError(error, 'recordUsage', {
                modelName: params.modelName,
                agentActionName: params.agentActionName,
            });
        }
    }

    /**
     * Get usage stats for a user within a time range
     */
    async getUserUsageStats(
        userId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<UsageStats> {
        try {
            const conditions = [eq(llmUsage.userId, userId)];
            if (startDate) {
                conditions.push(gte(llmUsage.requestedAt, startDate));
            }
            if (endDate) {
                conditions.push(lte(llmUsage.requestedAt, endDate));
            }

            const records = await this.getReadDb()
                .select()
                .from(llmUsage)
                .where(this.buildWhereConditions(conditions))
                .orderBy(desc(llmUsage.requestedAt));

            return this.aggregateUsageStats(records);
        } catch (error) {
            this.handleDatabaseError(error, 'getUserUsageStats', { userId });
        }
    }

    /**
     * Get usage stats for an app
     */
    async getAppUsageStats(appId: string): Promise<UsageStats> {
        try {
            const records = await this.getReadDb()
                .select()
                .from(llmUsage)
                .where(eq(llmUsage.appId, appId))
                .orderBy(desc(llmUsage.requestedAt));

            return this.aggregateUsageStats(records);
        } catch (error) {
            this.handleDatabaseError(error, 'getAppUsageStats', { appId });
        }
    }

    /**
     * Get total cost for a user
     */
    async getUserTotalCost(userId: string, startDate?: Date, endDate?: Date): Promise<number> {
        try {
            const conditions = [eq(llmUsage.userId, userId)];
            if (startDate) {
                conditions.push(gte(llmUsage.requestedAt, startDate));
            }
            if (endDate) {
                conditions.push(lte(llmUsage.requestedAt, endDate));
            }

            const result = await this.getReadDb()
                .select({ total: sum(llmUsage.cost) })
                .from(llmUsage)
                .where(this.buildWhereConditions(conditions));

            return Number(result[0]?.total || 0);
        } catch (error) {
            this.handleDatabaseError(error, 'getUserTotalCost', { userId });
        }
    }

    /**
     * Get recent usage records for a user
     */
    async getUserRecentUsage(
        userId: string,
        limit: number = 100
    ): Promise<LLMUsageRecord[]> {
        try {
            const records = await this.getReadDb()
                .select()
                .from(llmUsage)
                .where(eq(llmUsage.userId, userId))
                .orderBy(desc(llmUsage.requestedAt))
                .limit(limit);

            return records.map(this.mapToUsageRecord);
        } catch (error) {
            this.handleDatabaseError(error, 'getUserRecentUsage', { userId });
        }
    }

    /**
     * Get usage stats by agent action
     */
    async getUserUsageByAction(
        userId: string,
        agentActionName: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<UsageStats> {
        try {
            const conditions = [
                eq(llmUsage.userId, userId),
                eq(llmUsage.agentActionName, agentActionName),
            ];
            if (startDate) {
                conditions.push(gte(llmUsage.requestedAt, startDate));
            }
            if (endDate) {
                conditions.push(lte(llmUsage.requestedAt, endDate));
            }

            const records = await this.getReadDb()
                .select()
                .from(llmUsage)
                .where(this.buildWhereConditions(conditions))
                .orderBy(desc(llmUsage.requestedAt));

            return this.aggregateUsageStats(records);
        } catch (error) {
            this.handleDatabaseError(error, 'getUserUsageByAction', {
                userId,
                agentActionName,
            });
        }
    }

    /**
     * Delete old usage records (for data retention policies)
     */
    async deleteOldRecords(beforeDate: Date): Promise<number> {
        try {
            const result = await this.database
                .delete(llmUsage)
                .where(lte(llmUsage.requestedAt, beforeDate));

            const deletedCount = result.meta?.changes || 0;

            this.logger.info('Deleted old LLM usage records', {
                beforeDate: beforeDate.toISOString(),
                deletedCount,
            });

            return deletedCount;
        } catch (error) {
            this.handleDatabaseError(error, 'deleteOldRecords', {
                beforeDate: beforeDate.toISOString(),
            });
        }
    }

    /**
     * Helper: Aggregate usage stats from records
     */
    private aggregateUsageStats(records: typeof llmUsage.$inferSelect[]): UsageStats {
        const stats: UsageStats = {
            totalCost: 0,
            totalTokens: 0,
            totalCalls: records.length,
            promptTokens: 0,
            completionTokens: 0,
            byModel: {},
            byProvider: {},
            byAction: {},
        };

        for (const record of records) {
            stats.totalCost += record.cost;
            stats.totalTokens += record.totalTokens;
            stats.promptTokens += record.promptTokens;
            stats.completionTokens += record.completionTokens;

            // By model
            if (!stats.byModel[record.modelName]) {
                stats.byModel[record.modelName] = { cost: 0, tokens: 0, calls: 0 };
            }
            stats.byModel[record.modelName].cost += record.cost;
            stats.byModel[record.modelName].tokens += record.totalTokens;
            stats.byModel[record.modelName].calls += 1;

            // By provider
            if (!stats.byProvider[record.provider]) {
                stats.byProvider[record.provider] = { cost: 0, tokens: 0, calls: 0 };
            }
            stats.byProvider[record.provider].cost += record.cost;
            stats.byProvider[record.provider].tokens += record.totalTokens;
            stats.byProvider[record.provider].calls += 1;

            // By action
            if (!stats.byAction[record.agentActionName]) {
                stats.byAction[record.agentActionName] = { cost: 0, tokens: 0, calls: 0 };
            }
            stats.byAction[record.agentActionName].cost += record.cost;
            stats.byAction[record.agentActionName].tokens += record.totalTokens;
            stats.byAction[record.agentActionName].calls += 1;
        }

        return stats;
    }

    /**
     * Helper: Map database record to LLMUsageRecord
     */
    private mapToUsageRecord(record: typeof llmUsage.$inferSelect): LLMUsageRecord {
        return {
            id: record.id,
            userId: record.userId,
            appId: record.appId,
            agentActionName: record.agentActionName,
            modelName: record.modelName,
            provider: record.provider,
            promptTokens: record.promptTokens,
            completionTokens: record.completionTokens,
            totalTokens: record.totalTokens,
            cost: record.cost,
            metadata: record.metadata ? JSON.parse(record.metadata as string) : undefined,
            requestedAt: record.requestedAt,
        };
    }
}
