import { createObjectLogger } from '../../logger';
import { SubscriptionTier } from '../rate-limit/config';

export type UsageOperation = 'ai_generation' | 'app_creation' | 'workflow_execution' | 'api_call';

export interface UsageRecord {
	userId: string;
	operation: UsageOperation;
	amount: number;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

export class UsageTracker {
	private static logger = createObjectLogger(this, 'UsageTracker');

	static async track(
		env: Env,
		userId: string,
		operation: UsageOperation,
		amount: number = 1,
		metadata?: Record<string, unknown>
	): Promise<void> {
		try {
			const record: UsageRecord = {
				userId,
				operation,
				amount,
				timestamp: Date.now(),
				metadata
			};

			// Store in Analytics Engine for tracking and reporting
			if (env.ANALYTICS_ENGINE) {
				env.ANALYTICS_ENGINE.writeDataPoint({
					blobs: [userId, operation],
					doubles: [amount],
					indexes: [operation]
				});
			}

			this.logger.debug('Tracked usage', { userId, operation, amount });
		} catch (error) {
			this.logger.error('Failed to track usage', {
				userId,
				operation,
				amount,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	static async incrementAIGenerations(
		env: Env,
		userId: string,
		tier: SubscriptionTier,
		amount: number = 1
	): Promise<void> {
		try {
			const key = `monthly:ai:user:${userId}`;
			const stub = env.DORateLimitStore.getByName(key);

			// Use 30 days as monthly period
			const monthlyPeriod = 30 * 24 * 60 * 60;

			await stub.increment(key, {
				limit: 999999, // High limit, actual enforcement in MonthlyUsageEnforcer
				period: monthlyPeriod,
			}, amount);

			await this.track(env, userId, 'ai_generation', amount, { tier });
		} catch (error) {
			this.logger.error('Failed to increment AI generations', {
				userId,
				amount,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	static async incrementAppCreations(
		env: Env,
		userId: string,
		tier: SubscriptionTier
	): Promise<void> {
		try {
			// App creation is tracked via database, just record analytics
			await this.track(env, userId, 'app_creation', 1, { tier });
		} catch (error) {
			this.logger.error('Failed to increment app creations', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	static async incrementWorkflowExecutions(
		env: Env,
		userId: string,
		tier: SubscriptionTier,
		amount: number = 1
	): Promise<void> {
		try {
			const key = `monthly:workflow:user:${userId}`;
			const stub = env.DORateLimitStore.getByName(key);

			// Use 30 days as monthly period
			const monthlyPeriod = 30 * 24 * 60 * 60;

			await stub.increment(key, {
				limit: 999999, // High limit, actual enforcement in MonthlyUsageEnforcer
				period: monthlyPeriod,
			}, amount);

			await this.track(env, userId, 'workflow_execution', amount, { tier });
		} catch (error) {
			this.logger.error('Failed to increment workflow executions', {
				userId,
				amount,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	static async incrementApiCalls(
		env: Env,
		userId: string,
		tier: SubscriptionTier
	): Promise<void> {
		try {
			await this.track(env, userId, 'api_call', 1, { tier });
		} catch (error) {
			this.logger.error('Failed to increment API calls', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
}
