/**
 * Integration Examples for Rate Limiting & Usage Tracking
 *
 * This file provides examples of how to integrate the usage tracking
 * and rate limiting services into various parts of the application.
 */

import { Context } from 'hono';
import { RateLimitIntegration } from './RateLimitIntegration';
import { SubscriptionTier } from '../rate-limit/config';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../database/schema';

/**
 * Example 1: Integrating with AI Generation in SimpleCodeGeneratorAgent
 *
 * Add this to worker/agents/core/simpleGeneratorAgent.ts
 */
export class AIGenerationIntegrationExample {
	private env: Env;
	private db: DrizzleD1Database<typeof schema>;
	private userId: string;
	private tier: SubscriptionTier;

	async generateResponse() {
		// BEFORE making any LLM call
		const check = await RateLimitIntegration.checkAIGenerationAllowed(
			this.env,
			this.db,
			this.userId,
			this.tier
		);

		if (!check.allowed) {
			// Send rate limit error via WebSocket
			await this.sendWebSocketMessage({
				type: 'rate_limit_error',
				error: check.error!
			});
			throw check.error;
		}

		// If BYOK, use user's API keys
		let apiKey: string;
		if (check.useBYOK) {
			const { BYOKHandler } = await import('./BYOKHandler');
			const userKeys = await BYOKHandler.getUserAPIKeys(this.db, this.userId);
			apiKey = userKeys.openai || userKeys.anthropic || userKeys.google || '';

			if (!apiKey) {
				throw new Error('BYOK enabled but no API keys configured');
			}
		} else {
			// Use platform keys from environment
			apiKey = this.env.OPENAI_API_KEY;
		}

		// Proceed with LLM call
		const response = await this.callLLM(apiKey);

		// AFTER successful generation
		await RateLimitIntegration.trackAIGeneration(
			this.env,
			this.db,
			this.userId,
			this.tier
		);

		return response;
	}

	private async callLLM(apiKey: string): Promise<unknown> {
		// Your LLM call implementation
		return {};
	}

	private async sendWebSocketMessage(message: unknown): Promise<void> {
		// Your WebSocket implementation
	}
}

/**
 * Example 2: Integrating with App Creation Controller
 *
 * Add this to worker/api/controllers/apps/controller.ts
 */
export async function createAppWithLimitCheck(c: Context) {
	const userId = c.get('userId') as string;
	const tier = c.get('subscription').tier as SubscriptionTier;
	const db = c.get('db') as DrizzleD1Database<typeof schema>;
	const env = c.env as Env;

	// Check if user can create app
	const check = await RateLimitIntegration.checkAppCreationAllowed(
		db,
		userId,
		tier
	);

	if (!check.allowed) {
		return c.json({
			error: 'App creation limit exceeded',
			upgrade: true,
			message: check.error!.message,
			details: check.error!.details,
			currentTier: tier,
			suggestedTier: getSuggestedUpgradeTier(tier)
		}, 402);
	}

	// Create the app
	const appData = await c.req.json();
	const app = await createApp(db, userId, appData);

	// Track the app creation
	await RateLimitIntegration.trackAppCreation(env, db, userId, tier);

	return c.json({ app }, 201);
}

function getSuggestedUpgradeTier(tier: SubscriptionTier): SubscriptionTier {
	const tiers: SubscriptionTier[] = ['free', 'pro', 'business', 'enterprise'];
	const index = tiers.indexOf(tier);
	return index < tiers.length - 1 ? tiers[index + 1] : 'enterprise';
}

async function createApp(
	db: DrizzleD1Database<typeof schema>,
	userId: string,
	appData: unknown
): Promise<unknown> {
	// Your app creation implementation
	return {};
}

/**
 * Example 3: Using the Middleware for Automatic Tracking
 *
 * Add this to your route definitions in worker/api/routes/
 */
export function setupRoutesWithUsageTracking() {
	// Example route setup with usage tracking middleware
	const { trackUsage } = require('../../middleware/usageTracking');

	// For AI generation endpoints
	// app.post('/api/generate', trackUsage('ai_generation'), generateHandler);

	// For app creation endpoints
	// app.post('/api/apps', trackUsage('app_creation'), createAppHandler);

	// For workflow execution endpoints
	// app.post('/api/workflows/:id/execute', trackUsage('workflow_execution'), executeWorkflowHandler);
}

/**
 * Example 4: Getting Usage Analytics
 *
 * Use this in your analytics dashboard
 */
export async function getUsageAnalytics(c: Context) {
	const userId = c.get('userId') as string;
	const env = c.env as Env;
	const db = c.get('db') as DrizzleD1Database<typeof schema>;

	// Import and use the usage analytics controller
	const { getCurrentUsage } = await import('../../api/controllers/analytics/usage');

	return getCurrentUsage(c);
}

/**
 * Example 5: WebSocket Integration for Real-time Updates
 *
 * Add this to your WebSocket message handler
 */
export async function handleWebSocketConnection() {
	// When user connects, send initial usage data
	const { RealtimeUsageService } = await import('./RealtimeUsageService');
	const { MonthlyUsageEnforcer } = await import('./MonthlyUsageEnforcer');

	// Example usage
	// const usage = await MonthlyUsageEnforcer.getMonthlyUsage(db, env, userId, tier);
	// await RealtimeUsageService.broadcastUsageUpdate(db, env, userId, tier);
}

/**
 * Example 6: Admin Reset Usage (for billing cycle resets)
 *
 * Add this to your admin controllers
 */
export async function resetUserUsageAtBillingCycle(
	env: Env,
	userId: string
) {
	const { TierRateLimiter } = await import('../rate-limit/TierRateLimiter');

	// Reset AI generation quota
	await TierRateLimiter.resetQuota(env, userId, 'aiGeneration');

	// App creation is tracked in database, no need to reset
	// Workflow executions
	const workflowKey = `monthly:workflow:user:${userId}`;
	const workflowStub = env.DORateLimitStore.getByName(workflowKey);
	await workflowStub.resetLimit(workflowKey);
}

/**
 * Example 7: Checking BYOK Status
 *
 * Use this when determining which API keys to use
 */
export async function checkBYOKStatus(
	db: DrizzleD1Database<typeof schema>,
	userId: string
) {
	const { BYOKHandler } = await import('./BYOKHandler');

	const shouldUseBYOK = await BYOKHandler.shouldUseUserKeys(db, userId);

	if (shouldUseBYOK) {
		const keys = await BYOKHandler.getUserAPIKeys(db, userId);

		return {
			useBYOK: true,
			hasOpenAI: !!keys.openai,
			hasAnthropic: !!keys.anthropic,
			hasGoogle: !!keys.google
		};
	}

	return { useBYOK: false };
}

/**
 * Example 8: Setting User API Keys for BYOK
 *
 * Add this to your user settings controller
 */
export async function setUserAPIKeys(c: Context) {
	const userId = c.get('userId') as string;
	const db = c.get('db') as DrizzleD1Database<typeof schema>;
	const { BYOKHandler } = await import('./BYOKHandler');

	const { openai, anthropic, google } = await c.req.json();

	await BYOKHandler.setUserAPIKeys(db, userId, {
		openai,
		anthropic,
		google
	});

	return c.json({ success: true, message: 'API keys updated successfully' });
}
