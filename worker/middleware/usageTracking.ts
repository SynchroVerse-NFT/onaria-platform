import { Context, Next } from 'hono';
import { MonthlyUsageEnforcer } from '../services/usage/MonthlyUsageEnforcer';
import { UsageTracker } from '../services/usage/UsageTracker';
import { RealtimeUsageService } from '../services/usage/RealtimeUsageService';
import { UsageWarningService } from '../services/usage/UsageWarningService';
import { SubscriptionTier } from '../services/rate-limit/config';
import { createObjectLogger } from '../logger';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

const logger = createObjectLogger('UsageTrackingMiddleware', 'UsageTrackingMiddleware');

export interface SubscriptionData {
	tier: SubscriptionTier;
	status: string;
}

async function getUserSubscription(
	db: DrizzleD1Database<typeof schema>,
	userId: string
): Promise<SubscriptionData> {
	try {
		const subscription = await db
			.select()
			.from(schema.subscriptions)
			.where(eq(schema.subscriptions.userId, userId))
			.limit(1);

		if (!subscription || subscription.length === 0) {
			return { tier: 'free', status: 'active' };
		}

		const sub = subscription[0];
		// Map plan types to tiers
		const tierMap: Record<string, SubscriptionTier> = {
			'free': 'free',
			'starter': 'pro',
			'pro': 'pro',
			'enterprise': 'enterprise',
			'byok': 'byok'
		};

		return {
			tier: tierMap[sub.planType] || 'free',
			status: sub.status
		};
	} catch (error) {
		logger.error('Failed to get user subscription', {
			userId,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		return { tier: 'free', status: 'active' };
	}
}

function getSuggestedTier(currentTier: SubscriptionTier): SubscriptionTier {
	const tierOrder: SubscriptionTier[] = ['free', 'pro', 'business', 'enterprise'];
	const currentIndex = tierOrder.indexOf(currentTier);

	if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
		return 'enterprise';
	}

	return tierOrder[currentIndex + 1];
}

export function trackUsage(operation: 'ai_generation' | 'app_creation' | 'workflow_execution') {
	return async (c: Context, next: Next) => {
		const userId = c.get('userId') as string | undefined;
		const env = c.env as Env;
		const db = c.get('db') as DrizzleD1Database<typeof schema>;

		if (!userId) {
			return c.json({ error: 'Unauthorized' }, 401);
		}

		try {
			const subscription = await getUserSubscription(db, userId);

			// Check if subscription is active
			if (subscription.status !== 'active') {
				return c.json({
					error: 'Subscription inactive',
					message: 'Your subscription is not active. Please activate or upgrade your subscription.',
					currentTier: subscription.tier,
					suggestedTier: getSuggestedTier(subscription.tier)
				}, 403);
			}

			// Check if operation is allowed based on tier and usage
			let check;
			let operationName: 'aiGenerations' | 'apps' | 'workflows';

			switch (operation) {
				case 'ai_generation':
					check = await MonthlyUsageEnforcer.canGenerateAI(env, userId, subscription.tier);
					operationName = 'aiGenerations';
					break;
				case 'app_creation':
					check = await MonthlyUsageEnforcer.canCreateApp(db, userId, subscription.tier);
					operationName = 'apps';
					break;
				case 'workflow_execution':
					check = await MonthlyUsageEnforcer.canExecuteWorkflow(env, userId, subscription.tier);
					operationName = 'workflows';
					break;
			}

			if (!check.allowed) {
				return c.json({
					error: 'Limit exceeded',
					upgrade: true,
					message: `You've reached your ${operation} limit. Upgrade to continue.`,
					currentTier: subscription.tier,
					suggestedTier: getSuggestedTier(subscription.tier),
					limit: check.limit,
					current: check.current
				}, 402);
			}

			// Store subscription data for later use
			c.set('subscription', subscription);

			// Proceed with request
			await next();

			// Track usage after successful operation
			switch (operation) {
				case 'ai_generation':
					await UsageTracker.incrementAIGenerations(env, userId, subscription.tier, 1);
					break;
				case 'app_creation':
					await UsageTracker.incrementAppCreations(env, userId, subscription.tier);
					break;
				case 'workflow_execution':
					await UsageTracker.incrementWorkflowExecutions(env, userId, subscription.tier, 1);
					break;
			}

			// Check for warnings
			await UsageWarningService.checkAndWarnUser(db, env, userId, subscription.tier, operationName);

			// Broadcast usage update
			await RealtimeUsageService.broadcastUsageUpdate(db, env, userId, subscription.tier);
		} catch (error) {
			logger.error('Usage tracking middleware error', {
				userId,
				operation,
				error: error instanceof Error ? error.message : 'Unknown error'
			});

			// If tracking fails, log but continue
			await next();
		}
	};
}

export function trackApiUsage() {
	return async (c: Context, next: Next) => {
		const userId = c.get('userId') as string | undefined;
		const env = c.env as Env;

		if (userId) {
			const db = c.get('db') as DrizzleD1Database<typeof schema>;
			const subscription = await getUserSubscription(db, userId);
			await UsageTracker.incrementApiCalls(env, userId, subscription.tier);
		}

		await next();
	};
}
