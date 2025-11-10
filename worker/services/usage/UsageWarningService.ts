import { createObjectLogger } from '../../logger';
import { MonthlyUsageEnforcer, UsageCheck } from './MonthlyUsageEnforcer';
import { SubscriptionTier } from '../rate-limit/config';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../database/schema';

export interface LimitWarningMessage {
	type: 'limit_warning';
	operation: string;
	percentage: number;
	remaining: number;
	limit: number;
	threshold: number;
}

export interface LimitExceededMessage {
	type: 'limit_exceeded';
	operation: string;
	currentTier: SubscriptionTier;
	suggestedTier: SubscriptionTier;
	limit: number;
}

const WARNING_THRESHOLDS = [70, 90, 100] as const;

export class UsageWarningService {
	private static logger = createObjectLogger(this, 'UsageWarningService');

	static async checkAndWarnUser(
		db: DrizzleD1Database<typeof schema>,
		env: Env,
		userId: string,
		tier: SubscriptionTier,
		operation: 'aiGenerations' | 'apps' | 'workflows'
	): Promise<void> {
		try {
			let usageCheck: UsageCheck;

			switch (operation) {
				case 'aiGenerations':
					usageCheck = await MonthlyUsageEnforcer.canGenerateAI(env, userId, tier);
					break;
				case 'apps':
					usageCheck = await MonthlyUsageEnforcer.canCreateApp(db, userId, tier);
					break;
				case 'workflows':
					usageCheck = await MonthlyUsageEnforcer.canExecuteWorkflow(env, userId, tier);
					break;
			}

			const percentage = usageCheck.percentage;

			// Check each threshold
			for (const threshold of WARNING_THRESHOLDS) {
				if (percentage >= threshold && percentage < threshold + 10) {
					const hasWarned = await this.hasWarnedAtThreshold(env, userId, operation, threshold);

					if (!hasWarned) {
						if (threshold === 100) {
							await this.sendLimitReached(env, userId, tier, operation, usageCheck);
						} else {
							await this.sendWarning(env, userId, operation, usageCheck, threshold);
						}

						await this.markWarningAsSent(env, userId, operation, threshold);
					}
					break;
				}
			}
		} catch (error) {
			this.logger.error('Failed to check and warn user', {
				userId,
				tier,
				operation,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	private static async sendWarning(
		env: Env,
		userId: string,
		operation: string,
		usageCheck: UsageCheck,
		threshold: number
	): Promise<void> {
		const message: LimitWarningMessage = {
			type: 'limit_warning',
			operation,
			percentage: usageCheck.percentage,
			remaining: usageCheck.remaining,
			limit: usageCheck.limit,
			threshold
		};

		this.logger.info('Sending usage warning', {
			userId,
			operation,
			threshold,
			percentage: usageCheck.percentage
		});

		// Send WebSocket message
		await this.sendWebSocketMessage(env, userId, message);

		// Could also send email notification here
	}

	private static async sendLimitReached(
		env: Env,
		userId: string,
		tier: SubscriptionTier,
		operation: string,
		usageCheck: UsageCheck
	): Promise<void> {
		const suggestedTier = this.getSuggestedUpgradeTier(tier);

		const message: LimitExceededMessage = {
			type: 'limit_exceeded',
			operation,
			currentTier: tier,
			suggestedTier,
			limit: usageCheck.limit
		};

		this.logger.warn('User reached limit', {
			userId,
			operation,
			tier,
			limit: usageCheck.limit
		});

		// Send WebSocket message
		await this.sendWebSocketMessage(env, userId, message);

		// Could also send email notification here
	}

	private static getSuggestedUpgradeTier(currentTier: SubscriptionTier): SubscriptionTier {
		const tierOrder: SubscriptionTier[] = ['free', 'pro', 'business', 'enterprise'];
		const currentIndex = tierOrder.indexOf(currentTier);

		if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
			return 'enterprise';
		}

		return tierOrder[currentIndex + 1];
	}

	private static async hasWarnedAtThreshold(
		env: Env,
		userId: string,
		operation: string,
		threshold: number
	): Promise<boolean> {
		try {
			const key = `warning:${userId}:${operation}:${threshold}`;
			const value = await env.VibecoderStore.get(key);
			return value !== null;
		} catch (error) {
			this.logger.error('Failed to check warning status', {
				userId,
				operation,
				threshold,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			return false;
		}
	}

	private static async markWarningAsSent(
		env: Env,
		userId: string,
		operation: string,
		threshold: number
	): Promise<void> {
		try {
			const key = `warning:${userId}:${operation}:${threshold}`;
			// Store for 30 days
			await env.VibecoderStore.put(key, 'sent', { expirationTtl: 30 * 24 * 60 * 60 });
		} catch (error) {
			this.logger.error('Failed to mark warning as sent', {
				userId,
				operation,
				threshold,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	private static async sendWebSocketMessage(
		env: Env,
		userId: string,
		message: LimitWarningMessage | LimitExceededMessage
	): Promise<void> {
		try {
			this.logger.debug('Would send WebSocket message', {
				userId,
				messageType: message.type
			});

			// In production, this would send the message through the WebSocket connection
		} catch (error) {
			this.logger.error('Failed to send WebSocket message', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
}
