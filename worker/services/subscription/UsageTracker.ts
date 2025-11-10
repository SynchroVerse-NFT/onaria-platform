/**
 * Usage Tracking Service
 * Tracks user usage metrics for subscription tier enforcement
 */

import { createDatabaseService } from '../../database/database';
import { createLogger } from '../../logger';
import * as schema from '../../database/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { generateId } from '../../utils/idGenerator';
import { UsageMetrics } from '../../../src/api-types';

const logger = createLogger('UsageTracker');

export class UsageTracker {
  private db;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.db = createDatabaseService(env);
  }

  /**
   * Get or create today's usage metrics record
   */
  private async getOrCreateTodayMetrics(
    userId: string,
    subscriptionId?: string
  ): Promise<schema.UsageMetric> {
    const today = this.getTodayDateString();

    try {
      // Try to get existing record for today
      const existing = await this.db.db
        .select()
        .from(schema.usageMetrics)
        .where(
          and(
            eq(schema.usageMetrics.userId, userId),
            eq(schema.usageMetrics.date, today)
          )
        )
        .get();

      if (existing) {
        return existing;
      }

      // Create new record for today
      const newMetrics: schema.NewUsageMetric = {
        id: generateId(),
        userId,
        subscriptionId: subscriptionId || undefined,
        date: today,
        aiGenerations: 0,
        tokensUsed: 0,
        appsCreated: 0,
        workflowExecutions: 0,
        estimatedCost: 0.0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [created] = await this.db.db
        .insert(schema.usageMetrics)
        .values(newMetrics)
        .returning();

      return created;
    } catch (error) {
      logger.error('Failed to get or create today metrics', { userId, error });
      throw error;
    }
  }

  /**
   * Increment AI generation count
   */
  async incrementAIGenerations(userId: string, count: number = 1): Promise<void> {
    try {
      const metrics = await this.getOrCreateTodayMetrics(userId);

      await this.db.db
        .update(schema.usageMetrics)
        .set({
          aiGenerations: (metrics.aiGenerations || 0) + count,
          updatedAt: new Date()
        })
        .where(eq(schema.usageMetrics.id, metrics.id));

      logger.info('AI generations incremented', { userId, count });
    } catch (error) {
      logger.error('Failed to increment AI generations', { userId, error });
      throw error;
    }
  }

  /**
   * Increment app creation count
   */
  async incrementAppCreations(userId: string): Promise<void> {
    try {
      const metrics = await this.getOrCreateTodayMetrics(userId);

      await this.db.db
        .update(schema.usageMetrics)
        .set({
          appsCreated: (metrics.appsCreated || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(schema.usageMetrics.id, metrics.id));

      logger.info('App creation incremented', { userId });
    } catch (error) {
      logger.error('Failed to increment app creations', { userId, error });
      throw error;
    }
  }

  /**
   * Increment workflow execution count
   */
  async incrementWorkflowExecutions(userId: string, count: number = 1): Promise<void> {
    try {
      const metrics = await this.getOrCreateTodayMetrics(userId);

      await this.db.db
        .update(schema.usageMetrics)
        .set({
          workflowExecutions: (metrics.workflowExecutions || 0) + count,
          updatedAt: new Date()
        })
        .where(eq(schema.usageMetrics.id, metrics.id));

      logger.info('Workflow executions incremented', { userId, count });
    } catch (error) {
      logger.error('Failed to increment workflow executions', { userId, error });
      throw error;
    }
  }

  /**
   * Track token usage and estimated cost
   */
  async trackTokenUsage(userId: string, tokens: number, estimatedCost: number): Promise<void> {
    try {
      const metrics = await this.getOrCreateTodayMetrics(userId);

      await this.db.db
        .update(schema.usageMetrics)
        .set({
          tokensUsed: (metrics.tokensUsed || 0) + tokens,
          estimatedCost: (metrics.estimatedCost || 0) + estimatedCost,
          updatedAt: new Date()
        })
        .where(eq(schema.usageMetrics.id, metrics.id));

      logger.info('Token usage tracked', { userId, tokens, estimatedCost });
    } catch (error) {
      logger.error('Failed to track token usage', { userId, error });
      throw error;
    }
  }

  /**
   * Get current day usage
   */
  async getCurrentUsage(userId: string): Promise<UsageMetrics> {
    try {
      const metrics = await this.getOrCreateTodayMetrics(userId);

      return {
        aiGenerations: metrics.aiGenerations || 0,
        appsCreated: metrics.appsCreated || 0,
        workflowExecutions: metrics.workflowExecutions || 0,
        estimatedCost: metrics.estimatedCost || 0
      };
    } catch (error) {
      logger.error('Failed to get current usage', { userId, error });
      return {
        aiGenerations: 0,
        appsCreated: 0,
        workflowExecutions: 0,
        estimatedCost: 0
      };
    }
  }

  /**
   * Get monthly usage (rolling 30 days)
   */
  async getMonthlyUsage(userId: string): Promise<UsageMetrics> {
    try {
      const startDate = this.getMonthStartDateString();

      const result = await this.db.db
        .select({
          aiGenerations: sql<number>`COALESCE(SUM(${schema.usageMetrics.aiGenerations}), 0)`,
          appsCreated: sql<number>`COALESCE(SUM(${schema.usageMetrics.appsCreated}), 0)`,
          workflowExecutions: sql<number>`COALESCE(SUM(${schema.usageMetrics.workflowExecutions}), 0)`,
          estimatedCost: sql<number>`COALESCE(SUM(${schema.usageMetrics.estimatedCost}), 0)`
        })
        .from(schema.usageMetrics)
        .where(
          and(
            eq(schema.usageMetrics.userId, userId),
            gte(schema.usageMetrics.date, startDate)
          )
        )
        .get();

      return {
        aiGenerations: Number(result?.aiGenerations) || 0,
        appsCreated: Number(result?.appsCreated) || 0,
        workflowExecutions: Number(result?.workflowExecutions) || 0,
        estimatedCost: Number(result?.estimatedCost) || 0
      };
    } catch (error) {
      logger.error('Failed to get monthly usage', { userId, error });
      return {
        aiGenerations: 0,
        appsCreated: 0,
        workflowExecutions: 0,
        estimatedCost: 0
      };
    }
  }

  /**
   * Get usage for a specific date range
   */
  async getUsageForDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<UsageMetrics> {
    try {
      const result = await this.db.db
        .select({
          aiGenerations: sql<number>`COALESCE(SUM(${schema.usageMetrics.aiGenerations}), 0)`,
          appsCreated: sql<number>`COALESCE(SUM(${schema.usageMetrics.appsCreated}), 0)`,
          workflowExecutions: sql<number>`COALESCE(SUM(${schema.usageMetrics.workflowExecutions}), 0)`,
          estimatedCost: sql<number>`COALESCE(SUM(${schema.usageMetrics.estimatedCost}), 0)`
        })
        .from(schema.usageMetrics)
        .where(
          and(
            eq(schema.usageMetrics.userId, userId),
            gte(schema.usageMetrics.date, startDate),
            sql`${schema.usageMetrics.date} <= ${endDate}`
          )
        )
        .get();

      return {
        aiGenerations: Number(result?.aiGenerations) || 0,
        appsCreated: Number(result?.appsCreated) || 0,
        workflowExecutions: Number(result?.workflowExecutions) || 0,
        estimatedCost: Number(result?.estimatedCost) || 0
      };
    } catch (error) {
      logger.error('Failed to get usage for date range', { userId, startDate, endDate, error });
      return {
        aiGenerations: 0,
        appsCreated: 0,
        workflowExecutions: 0,
        estimatedCost: 0
      };
    }
  }

  /**
   * Reset monthly usage (called at billing cycle)
   * Note: We don't actually delete records, just query from current period
   */
  async resetMonthlyUsage(userId: string): Promise<void> {
    // No-op: Usage is automatically scoped by date range queries
    logger.info('Monthly usage reset (no-op - using date-based queries)', { userId });
  }

  /**
   * Get usage history for analytics
   */
  async getUsageHistory(
    userId: string,
    days: number = 30
  ): Promise<Array<UsageMetrics & { date: string }>> {
    try {
      const startDate = this.getDaysAgoDateString(days);

      const records = await this.db.db
        .select()
        .from(schema.usageMetrics)
        .where(
          and(
            eq(schema.usageMetrics.userId, userId),
            gte(schema.usageMetrics.date, startDate)
          )
        )
        .orderBy(schema.usageMetrics.date)
        .all();

      return records.map(record => ({
        date: record.date,
        aiGenerations: record.aiGenerations || 0,
        appsCreated: record.appsCreated || 0,
        workflowExecutions: record.workflowExecutions || 0,
        estimatedCost: record.estimatedCost || 0
      }));
    } catch (error) {
      logger.error('Failed to get usage history', { userId, days, error });
      return [];
    }
  }

  /**
   * Get total app count for user (across all time)
   */
  async getTotalAppCount(userId: string): Promise<number> {
    try {
      const result = await this.db.db
        .select({
          count: sql<number>`COUNT(*)`
        })
        .from(schema.apps)
        .where(eq(schema.apps.userId, userId))
        .get();

      return Number(result?.count) || 0;
    } catch (error) {
      logger.error('Failed to get total app count', { userId, error });
      return 0;
    }
  }

  /**
   * Helper: Get today's date as YYYY-MM-DD string
   */
  private getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Helper: Get date string for 30 days ago (start of month)
   */
  private getMonthStartDateString(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper: Get date string for N days ago
   */
  private getDaysAgoDateString(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}

/**
 * Factory function to create UsageTracker instance
 */
export function createUsageTracker(env: Env): UsageTracker {
  return new UsageTracker(env);
}
