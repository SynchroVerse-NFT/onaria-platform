import { TIER_RATE_LIMITS, SubscriptionTier } from './config';
import { createObjectLogger } from '../../logger';

export interface RateLimitCheck {
	allowed: boolean;
	remaining: number;
	resetAt: number;
	limit: number;
}

export class TierRateLimiter {
	private static logger = createObjectLogger(this, 'TierRateLimiter');

	static async checkLimit(
		env: Env,
		userId: string,
		tier: SubscriptionTier,
		operation: 'api' | 'aiGeneration' | 'concurrent'
	): Promise<RateLimitCheck> {
		try {
			const limits = TIER_RATE_LIMITS[operation][tier];

			// Unlimited tier
			if (limits.limit === -1) {
				return {
					allowed: true,
					remaining: -1,
					resetAt: -1,
					limit: -1
				};
			}

			const window = 'window' in limits ? limits.window : 0;
			const key = `tier:${operation}:user:${userId}`;
			const stub = env.DORateLimitStore.getByName(key);

			const result = await stub.getRemainingLimit(key, {
				limit: limits.limit,
				period: window,
			});

			const now = Math.floor(Date.now() / 1000);
			const resetAt = now + window;

			return {
				allowed: result > 0,
				remaining: Math.max(0, result),
				resetAt,
				limit: limits.limit
			};
		} catch (error) {
			this.logger.error('Failed to check tier limit', {
				userId,
				tier,
				operation,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			// Fail open
			return {
				allowed: true,
				remaining: -1,
				resetAt: -1,
				limit: -1
			};
		}
	}

	static async consumeQuota(
		env: Env,
		userId: string,
		tier: SubscriptionTier,
		operation: 'api' | 'aiGeneration',
		amount: number = 1
	): Promise<boolean> {
		try {
			const limits = TIER_RATE_LIMITS[operation][tier];

			// Unlimited tier
			if (limits.limit === -1) {
				return true;
			}

			const window = limits.window;
			const key = `tier:${operation}:user:${userId}`;
			const stub = env.DORateLimitStore.getByName(key);

			const result = await stub.increment(key, {
				limit: limits.limit,
				period: window,
			}, amount);

			return result.success;
		} catch (error) {
			this.logger.error('Failed to consume quota', {
				userId,
				tier,
				operation,
				amount,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			// Fail open
			return true;
		}
	}

	static async getRemainingQuota(
		env: Env,
		userId: string,
		tier: SubscriptionTier,
		operation: 'api' | 'aiGeneration'
	): Promise<number> {
		try {
			const limits = TIER_RATE_LIMITS[operation][tier];

			// Unlimited tier
			if (limits.limit === -1) {
				return -1;
			}

			const window = limits.window;
			const key = `tier:${operation}:user:${userId}`;
			const stub = env.DORateLimitStore.getByName(key);

			const result = await stub.getRemainingLimit(key, {
				limit: limits.limit,
				period: window,
			});

			return Math.max(0, result);
		} catch (error) {
			this.logger.error('Failed to get remaining quota', {
				userId,
				tier,
				operation,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			// Fail open
			return -1;
		}
	}

	static async resetQuota(
		env: Env,
		userId: string,
		operation: 'api' | 'aiGeneration'
	): Promise<void> {
		try {
			const key = `tier:${operation}:user:${userId}`;
			const stub = env.DORateLimitStore.getByName(key);
			await stub.resetLimit(key);

			this.logger.info('Reset quota', { userId, operation });
		} catch (error) {
			this.logger.error('Failed to reset quota', {
				userId,
				operation,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
}
