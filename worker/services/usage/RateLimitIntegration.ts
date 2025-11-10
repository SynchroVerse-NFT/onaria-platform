import { TierRateLimiter } from '../rate-limit/TierRateLimiter';
import { MonthlyUsageEnforcer } from './MonthlyUsageEnforcer';
import { UsageTracker } from './UsageTracker';
import { UsageWarningService } from './UsageWarningService';
import { RealtimeUsageService } from './RealtimeUsageService';
import { BYOKHandler } from './BYOKHandler';
import { SubscriptionTier } from '../rate-limit/config';
import { RateLimitExceededError } from 'shared/types/errors';
import { RateLimitType } from '../rate-limit/config';
import { createObjectLogger } from '../../logger';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../database/schema';

const logger = createObjectLogger('RateLimitIntegration', 'RateLimitIntegration');

export interface AIGenerationCheckResult {
	allowed: boolean;
	useBYOK: boolean;
	error?: RateLimitExceededError;
}

/**
 * Integration helper for checking AI generation limits before making LLM calls
 *
 * Usage in SimpleCodeGeneratorAgent or any AI generation handler:
 *
 * ```typescript
 * const check = await RateLimitIntegration.checkAIGenerationAllowed(
 *   this.env,
 *   this.db,
 *   this.userId,
 *   this.subscription.tier
 * );
 *
 * if (!check.allowed) {
 *   throw check.error;
 * }
 *
 * // Proceed with AI generation
 * if (check.useBYOK) {
 *   // Use user's API keys
 *   const keys = await BYOKHandler.getUserAPIKeys(this.db, this.userId);
 *   // Configure LLM client with user keys
 * } else {
 *   // Use platform API keys
 * }
 *
 * // After successful generation
 * await RateLimitIntegration.trackAIGeneration(
 *   this.env,
 *   this.db,
 *   this.userId,
 *   this.subscription.tier
 * );
 * ```
 */
export class RateLimitIntegration {
	/**
	 * Check if AI generation is allowed for the user
	 */
	static async checkAIGenerationAllowed(
		env: Env,
		db: DrizzleD1Database<typeof schema>,
		userId: string,
		tier: SubscriptionTier
	): Promise<AIGenerationCheckResult> {
		try {
			// Check if user has BYOK and should use their own keys
			const useBYOK = await BYOKHandler.shouldUseUserKeys(db, userId);

			// BYOK users bypass rate limits (they use their own API keys)
			if (useBYOK) {
				return { allowed: true, useBYOK: true };
			}

			// Check tier-based hourly rate limit
			const hourlyCheck = await TierRateLimiter.checkLimit(
				env,
				userId,
				tier,
				'aiGeneration'
			);

			if (!hourlyCheck.allowed) {
				const error = new RateLimitExceededError(
					`AI generation rate limit exceeded. You can generate ${hourlyCheck.limit} times per hour. Please try again in ${Math.ceil((hourlyCheck.resetAt - Date.now() / 1000) / 60)} minutes.`,
					RateLimitType.LLM_CALLS,
					hourlyCheck.limit,
					3600, // 1 hour
					[
						'Consider upgrading your plan for higher limits',
						'Wait for the rate limit to reset',
						'Use BYOK (Bring Your Own Keys) plan to use your own API keys'
					]
				);

				return { allowed: false, useBYOK: false, error };
			}

			// Check monthly limit
			const monthlyCheck = await MonthlyUsageEnforcer.canGenerateAI(env, userId, tier);

			if (!monthlyCheck.allowed) {
				const error = new RateLimitExceededError(
					`Monthly AI generation limit exceeded. Your plan allows ${monthlyCheck.limit} generations per month. Upgrade to continue.`,
					RateLimitType.LLM_CALLS,
					monthlyCheck.limit,
					30 * 24 * 3600, // 30 days
					[
						'Upgrade your subscription for more monthly generations',
						'Wait until next billing cycle',
						'Consider BYOK plan to use your own API keys'
					]
				);

				return { allowed: false, useBYOK: false, error };
			}

			return { allowed: true, useBYOK: false };
		} catch (error) {
			logger.error('Failed to check AI generation allowed', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});

			// Fail open on error
			return { allowed: true, useBYOK: false };
		}
	}

	/**
	 * Track AI generation after successful completion
	 */
	static async trackAIGeneration(
		env: Env,
		db: DrizzleD1Database<typeof schema>,
		userId: string,
		tier: SubscriptionTier
	): Promise<void> {
		try {
			// Don't track BYOK users' usage for rate limiting (they use their own keys)
			const useBYOK = await BYOKHandler.shouldUseUserKeys(db, userId);
			if (useBYOK) {
				// Still track for analytics
				await UsageTracker.track(env, userId, 'ai_generation', 1, { tier, byok: true });
				return;
			}

			// Consume quota from tier rate limit
			await TierRateLimiter.consumeQuota(env, userId, tier, 'aiGeneration', 1);

			// Increment monthly counter
			await UsageTracker.incrementAIGenerations(env, userId, tier, 1);

			// Check and send warnings if approaching limits
			await UsageWarningService.checkAndWarnUser(db, env, userId, tier, 'aiGenerations');

			// Broadcast updated usage to user
			await RealtimeUsageService.broadcastUsageUpdate(db, env, userId, tier);
		} catch (error) {
			logger.error('Failed to track AI generation', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	/**
	 * Check if app creation is allowed for the user
	 */
	static async checkAppCreationAllowed(
		db: DrizzleD1Database<typeof schema>,
		userId: string,
		tier: SubscriptionTier
	): Promise<{ allowed: boolean; error?: RateLimitExceededError }> {
		try {
			const monthlyCheck = await MonthlyUsageEnforcer.canCreateApp(db, userId, tier);

			if (!monthlyCheck.allowed) {
				const error = new RateLimitExceededError(
					`Monthly app creation limit exceeded. Your plan allows ${monthlyCheck.limit} apps per month. Upgrade to create more.`,
					RateLimitType.APP_CREATION,
					monthlyCheck.limit,
					30 * 24 * 3600,
					[
						'Upgrade your subscription for more apps',
						'Delete unused apps to free up quota',
						'Wait until next billing cycle'
					]
				);

				return { allowed: false, error };
			}

			return { allowed: true };
		} catch (error) {
			logger.error('Failed to check app creation allowed', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});

			// Fail open on error
			return { allowed: true };
		}
	}

	/**
	 * Track app creation after successful completion
	 */
	static async trackAppCreation(
		env: Env,
		db: DrizzleD1Database<typeof schema>,
		userId: string,
		tier: SubscriptionTier
	): Promise<void> {
		try {
			// Track in analytics
			await UsageTracker.incrementAppCreations(env, userId, tier);

			// Check and send warnings if approaching limits
			await UsageWarningService.checkAndWarnUser(db, env, userId, tier, 'apps');

			// Broadcast updated usage to user
			await RealtimeUsageService.broadcastUsageUpdate(db, env, userId, tier);
		} catch (error) {
			logger.error('Failed to track app creation', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	/**
	 * Check if workflow execution is allowed for the user
	 */
	static async checkWorkflowExecutionAllowed(
		env: Env,
		userId: string,
		tier: SubscriptionTier
	): Promise<{ allowed: boolean; error?: RateLimitExceededError }> {
		try {
			const monthlyCheck = await MonthlyUsageEnforcer.canExecuteWorkflow(env, userId, tier);

			if (!monthlyCheck.allowed) {
				const error = new RateLimitExceededError(
					monthlyCheck.limit === 0
						? 'Workflow execution is not available in your plan. Upgrade to access workflows.'
						: `Monthly workflow execution limit exceeded. Your plan allows ${monthlyCheck.limit} executions per month. Upgrade for more.`,
					RateLimitType.LLM_CALLS,
					monthlyCheck.limit,
					30 * 24 * 3600,
					[
						'Upgrade your subscription to access workflows',
						'Wait until next billing cycle'
					]
				);

				return { allowed: false, error };
			}

			return { allowed: true };
		} catch (error) {
			logger.error('Failed to check workflow execution allowed', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});

			// Fail open on error (but respect tier restrictions)
			return { allowed: true };
		}
	}

	/**
	 * Track workflow execution after successful completion
	 */
	static async trackWorkflowExecution(
		env: Env,
		db: DrizzleD1Database<typeof schema>,
		userId: string,
		tier: SubscriptionTier
	): Promise<void> {
		try {
			// Increment workflow counter
			await UsageTracker.incrementWorkflowExecutions(env, userId, tier, 1);

			// Check and send warnings if approaching limits
			await UsageWarningService.checkAndWarnUser(db, env, userId, tier, 'workflows');

			// Broadcast updated usage to user
			await RealtimeUsageService.broadcastUsageUpdate(db, env, userId, tier);
		} catch (error) {
			logger.error('Failed to track workflow execution', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
}
