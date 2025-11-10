import { createObjectLogger } from '../../logger';
import { MonthlyUsageEnforcer, MonthlyUsage } from './MonthlyUsageEnforcer';
import { SubscriptionTier, MONTHLY_LIMITS } from '../rate-limit/config';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../database/schema';

export interface UsageLimits {
	aiGenerations: number;
	apps: number;
	workflows: number;
}

export interface UsagePercentages {
	ai: number;
	apps: number;
	workflows: number;
}

export interface UsageUpdateMessage {
	type: 'usage_updated';
	usage: MonthlyUsage;
	limits: UsageLimits;
	percentages: UsagePercentages;
}

export class RealtimeUsageService {
	private static logger = createObjectLogger(this, 'RealtimeUsageService');

	static async broadcastUsageUpdate(
		db: DrizzleD1Database<typeof schema>,
		env: Env,
		userId: string,
		tier: SubscriptionTier
	): Promise<void> {
		try {
			const usage = await MonthlyUsageEnforcer.getMonthlyUsage(db, env, userId, tier);
			const limits = this.getTierLimits(tier);

			const message: UsageUpdateMessage = {
				type: 'usage_updated',
				usage,
				limits,
				percentages: {
					ai: usage.aiGenerations.percentage,
					apps: usage.apps.percentage,
					workflows: usage.workflows.percentage
				}
			};

			// Send to WebSocket
			await this.sendWebSocketMessage(env, userId, message);

			this.logger.debug('Broadcasted usage update', { userId, tier });
		} catch (error) {
			this.logger.error('Failed to broadcast usage update', {
				userId,
				tier,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	private static getTierLimits(tier: SubscriptionTier): UsageLimits {
		return {
			aiGenerations: MONTHLY_LIMITS.aiGenerations[tier],
			apps: MONTHLY_LIMITS.apps[tier],
			workflows: MONTHLY_LIMITS.workflowExecutions[tier]
		};
	}

	private static async sendWebSocketMessage(
		env: Env,
		userId: string,
		message: UsageUpdateMessage
	): Promise<void> {
		try {
			// Get all active sessions for user from DurableObjectNamespace
			// This would require iterating through active sessions or maintaining a registry
			// For now, we'll log the intent
			this.logger.debug('Would send WebSocket message', {
				userId,
				messageType: message.type
			});

			// In production, this would:
			// 1. Query a session registry to find active WebSocket connections for the user
			// 2. Send the message to each active connection
			// 3. Handle any connection failures gracefully
		} catch (error) {
			this.logger.error('Failed to send WebSocket message', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
}
