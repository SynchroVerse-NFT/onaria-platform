import { MONTHLY_LIMITS, SubscriptionTier } from '../rate-limit/config';
import { createObjectLogger } from '../../logger';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, gte, sql } from 'drizzle-orm';
import * as schema from '../../database/schema';

export interface UsageCheck {
	allowed: boolean;
	limit: number;
	current: number;
	remaining: number;
	percentage: number;
}

export interface MonthlyUsage {
	aiGenerations: UsageCheck;
	apps: UsageCheck;
	workflows: UsageCheck;
}

export class MonthlyUsageEnforcer {
	private static logger = createObjectLogger(this, 'MonthlyUsageEnforcer');

	private static getMonthStart(): number {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
	}

	static async canCreateApp(
		db: DrizzleD1Database<typeof schema>,
		userId: string,
		tier: SubscriptionTier
	): Promise<UsageCheck> {
		try {
			const limit = MONTHLY_LIMITS.apps[tier];

			// Unlimited tier
			if (limit === -1) {
				return {
					allowed: true,
					limit: -1,
					current: 0,
					remaining: -1,
					percentage: 0
				};
			}

			const monthStart = this.getMonthStart();

			// Count apps created this month
			const result = await db
				.select({ count: sql<number>`count(*)` })
				.from(schema.apps)
				.where(
					and(
						eq(schema.apps.userId, userId),
						gte(schema.apps.createdAt, new Date(monthStart))
					)
				);

			const current = result[0]?.count || 0;
			const remaining = Math.max(0, limit - current);
			const percentage = limit > 0 ? (current / limit) * 100 : 0;

			return {
				allowed: current < limit,
				limit,
				current,
				remaining,
				percentage
			};
		} catch (error) {
			this.logger.error('Failed to check app creation limit', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			// Fail open
			return {
				allowed: true,
				limit: -1,
				current: 0,
				remaining: -1,
				percentage: 0
			};
		}
	}

	static async canGenerateAI(
		env: Env,
		userId: string,
		tier: SubscriptionTier
	): Promise<UsageCheck> {
		try {
			const limit = MONTHLY_LIMITS.aiGenerations[tier];

			// Unlimited tier
			if (limit === -1) {
				return {
					allowed: true,
					limit: -1,
					current: 0,
					remaining: -1,
					percentage: 0
				};
			}

			const key = `monthly:ai:user:${userId}`;
			const stub = env.DORateLimitStore.getByName(key);

			// Use 30 days as monthly period
			const monthlyPeriod = 30 * 24 * 60 * 60;
			const remaining = await stub.getRemainingLimit(key, {
				limit,
				period: monthlyPeriod,
			});

			const current = Math.max(0, limit - remaining);
			const percentage = limit > 0 ? (current / limit) * 100 : 0;

			return {
				allowed: remaining > 0,
				limit,
				current,
				remaining: Math.max(0, remaining),
				percentage
			};
		} catch (error) {
			this.logger.error('Failed to check AI generation limit', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			// Fail open
			return {
				allowed: true,
				limit: -1,
				current: 0,
				remaining: -1,
				percentage: 0
			};
		}
	}

	static async canExecuteWorkflow(
		env: Env,
		userId: string,
		tier: SubscriptionTier
	): Promise<UsageCheck> {
		try {
			const limit = MONTHLY_LIMITS.workflowExecutions[tier];

			// Unlimited tier or no access
			if (limit === -1 || limit === 0) {
				return {
					allowed: limit !== 0,
					limit,
					current: 0,
					remaining: limit === -1 ? -1 : 0,
					percentage: 0
				};
			}

			const key = `monthly:workflow:user:${userId}`;
			const stub = env.DORateLimitStore.getByName(key);

			// Use 30 days as monthly period
			const monthlyPeriod = 30 * 24 * 60 * 60;
			const remaining = await stub.getRemainingLimit(key, {
				limit,
				period: monthlyPeriod,
			});

			const current = Math.max(0, limit - remaining);
			const percentage = limit > 0 ? (current / limit) * 100 : 0;

			return {
				allowed: remaining > 0,
				limit,
				current,
				remaining: Math.max(0, remaining),
				percentage
			};
		} catch (error) {
			this.logger.error('Failed to check workflow execution limit', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			// Fail open for error, but respect tier restrictions
			const limit = MONTHLY_LIMITS.workflowExecutions[tier];
			return {
				allowed: limit !== 0,
				limit,
				current: 0,
				remaining: limit === -1 ? -1 : 0,
				percentage: 0
			};
		}
	}

	static async getMonthlyUsage(
		db: DrizzleD1Database<typeof schema>,
		env: Env,
		userId: string,
		tier: SubscriptionTier
	): Promise<MonthlyUsage> {
		const [aiGenerations, apps, workflows] = await Promise.all([
			this.canGenerateAI(env, userId, tier),
			this.canCreateApp(db, userId, tier),
			this.canExecuteWorkflow(env, userId, tier)
		]);

		return {
			aiGenerations,
			apps,
			workflows
		};
	}
}
