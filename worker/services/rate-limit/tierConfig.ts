import { AIModels } from '../../agents/inferutils/config.types';

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface TierLimits {
	// Credits per day (-1 = unlimited)
	dailyCredits: number;
	// Credits per hour (-1 = unlimited)
	hourlyCredits: number;
	// Primary model for this tier
	primaryModel: AIModels;
	// Fallback model when rate limited
	fallbackModel?: AIModels;
	// Maximum apps allowed
	maxApps: number;
	// Maximum file size in bytes
	maxFileSize: number;
	// Priority in queue (higher = faster)
	priority: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
	free: {
		dailyCredits: 100,
		hourlyCredits: 20,
		primaryModel: AIModels.GEMINI_2_0_FLASH,
		fallbackModel: undefined, // No fallback for free tier
		maxApps: 3,
		maxFileSize: 1024 * 1024 * 10, // 10 MB
		priority: 1,
	},
	basic: {
		dailyCredits: 500,
		hourlyCredits: 100,
		primaryModel: AIModels.GEMINI_2_5_FLASH,
		fallbackModel: AIModels.GEMINI_2_0_FLASH,
		maxApps: 10,
		maxFileSize: 1024 * 1024 * 50, // 50 MB
		priority: 2,
	},
	pro: {
		dailyCredits: 2000,
		hourlyCredits: 400,
		primaryModel: AIModels.GEMINI_2_5_PRO,
		fallbackModel: AIModels.GEMINI_2_5_FLASH,
		maxApps: 50,
		maxFileSize: 1024 * 1024 * 100, // 100 MB
		priority: 3,
	},
	enterprise: {
		dailyCredits: -1, // Unlimited
		hourlyCredits: -1, // Unlimited
		primaryModel: AIModels.CLAUDE_4_SONNET,
		fallbackModel: AIModels.GEMINI_2_5_PRO,
		maxApps: -1, // Unlimited
		maxFileSize: 1024 * 1024 * 500, // 500 MB
		priority: 4,
	},
};

export interface TierPricing {
	monthlyPrice: number; // USD
	yearlyPrice: number; // USD
	displayName: string;
	features: string[];
}

export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
	free: {
		monthlyPrice: 0,
		yearlyPrice: 0,
		displayName: 'Free',
		features: [
			'100 credits per day',
			'Up to 3 apps',
			'Basic model (Gemini 2.0 Flash)',
			'Community support',
		],
	},
	basic: {
		monthlyPrice: 19,
		yearlyPrice: 190, // ~16/month
		displayName: 'Basic',
		features: [
			'500 credits per day',
			'Up to 10 apps',
			'Advanced model (Gemini 2.5 Flash)',
			'Auto-fallback to free model',
			'Email support',
		],
	},
	pro: {
		monthlyPrice: 49,
		yearlyPrice: 490, // ~41/month
		displayName: 'Pro',
		features: [
			'2,000 credits per day',
			'Up to 50 apps',
			'Pro models (Gemini 2.5 Pro)',
			'Smart fallback system',
			'Priority support',
			'Advanced analytics',
		],
	},
	enterprise: {
		monthlyPrice: 299,
		yearlyPrice: 2990, // ~249/month
		displayName: 'Enterprise',
		features: [
			'Unlimited credits',
			'Unlimited apps',
			'Premium models (Claude Sonnet 4)',
			'Dedicated support',
			'Custom integrations',
			'SLA guarantee',
		],
	},
};

export function getTierLimits(tier: SubscriptionTier): TierLimits {
	return TIER_LIMITS[tier];
}

export function getTierPricing(tier: SubscriptionTier): TierPricing {
	return TIER_PRICING[tier];
}

export function canUpgradeTo(
	currentTier: SubscriptionTier,
	targetTier: SubscriptionTier
): boolean {
	const tierOrder: SubscriptionTier[] = ['free', 'basic', 'pro', 'enterprise'];
	const currentIndex = tierOrder.indexOf(currentTier);
	const targetIndex = tierOrder.indexOf(targetTier);
	return targetIndex > currentIndex;
}

export interface RateLimitStatus {
	isLimited: boolean;
	creditsUsed: number;
	creditsRemaining: number;
	resetTime: Date;
	fallbackModel?: AIModels;
	upgradeMessage?: string;
}

export function generateUpgradeMessage(
	currentTier: SubscriptionTier,
	creditsUsed: number,
	resetTime: Date
): string {
	const limits = TIER_LIMITS[currentTier];
	const timeUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60));
	const hours = Math.floor(timeUntilReset / 60);
	const minutes = timeUntilReset % 60;

	let message = `You've used ${creditsUsed} of ${limits.dailyCredits} daily credits.`;

	if (limits.fallbackModel) {
		message += ` Switched to Auto model until reset (${hours}h ${minutes}m).`;
	} else {
		message += ` Please wait ${hours}h ${minutes}m for reset.`;
	}

	const nextTier = getNextTier(currentTier);
	if (nextTier) {
		const nextLimits = TIER_LIMITS[nextTier];
		const nextPricing = TIER_PRICING[nextTier];
		message += ` Upgrade to ${nextPricing.displayName} for ${nextLimits.dailyCredits === -1 ? 'unlimited' : nextLimits.dailyCredits} credits/day ($${nextPricing.monthlyPrice}/mo).`;
	}

	return message;
}

function getNextTier(
	currentTier: SubscriptionTier
): SubscriptionTier | undefined {
	const tierOrder: SubscriptionTier[] = ['free', 'basic', 'pro', 'enterprise'];
	const currentIndex = tierOrder.indexOf(currentTier);
	return tierOrder[currentIndex + 1];
}
