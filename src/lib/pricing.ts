export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface TierLimits {
	dailyCredits: number;
	hourlyCredits: number;
	primaryModel: string;
	fallbackModel?: string;
	maxApps: number;
	maxFileSize: number;
	priority: number;
}

export interface TierPricing {
	monthlyPrice: number;
	yearlyPrice: number;
	displayName: string;
	features: string[];
	popular?: boolean;
	recommended?: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
	free: {
		dailyCredits: 100,
		hourlyCredits: 20,
		primaryModel: 'Gemini 2.0 Flash',
		fallbackModel: undefined,
		maxApps: 3,
		maxFileSize: 1024 * 1024 * 10,
		priority: 1,
	},
	basic: {
		dailyCredits: 500,
		hourlyCredits: 100,
		primaryModel: 'Gemini 2.5 Flash',
		fallbackModel: 'Gemini 2.0 Flash',
		maxApps: 10,
		maxFileSize: 1024 * 1024 * 50,
		priority: 2,
	},
	pro: {
		dailyCredits: 2000,
		hourlyCredits: 400,
		primaryModel: 'Gemini 2.5 Pro',
		fallbackModel: 'Gemini 2.5 Flash',
		maxApps: 50,
		maxFileSize: 1024 * 1024 * 100,
		priority: 3,
	},
	enterprise: {
		dailyCredits: -1,
		hourlyCredits: -1,
		primaryModel: 'Claude Sonnet 4',
		fallbackModel: 'Gemini 2.5 Pro',
		maxApps: -1,
		maxFileSize: 1024 * 1024 * 500,
		priority: 4,
	},
};

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
			'10 MB file uploads',
		],
	},
	basic: {
		monthlyPrice: 19,
		yearlyPrice: 190,
		displayName: 'Basic',
		popular: true,
		features: [
			'500 credits per day',
			'Up to 10 apps',
			'Advanced model (Gemini 2.5 Flash)',
			'Auto-fallback to free model',
			'Email support',
			'50 MB file uploads',
		],
	},
	pro: {
		monthlyPrice: 49,
		yearlyPrice: 490,
		displayName: 'Pro',
		recommended: true,
		features: [
			'2,000 credits per day',
			'Up to 50 apps',
			'Pro models (Gemini 2.5 Pro)',
			'Smart fallback system',
			'Priority support',
			'Advanced analytics',
			'100 MB file uploads',
		],
	},
	enterprise: {
		monthlyPrice: 299,
		yearlyPrice: 2990,
		displayName: 'Enterprise',
		features: [
			'Unlimited credits',
			'Unlimited apps',
			'Premium models (Claude Sonnet 4)',
			'Dedicated support',
			'Custom integrations',
			'SLA guarantee',
			'500 MB file uploads',
			'Custom branding',
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

export function formatFileSize(bytes: number): string {
	if (bytes >= 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`;
	}
	if (bytes >= 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
	}
	if (bytes >= 1024) {
		return `${(bytes / 1024).toFixed(0)} KB`;
	}
	return `${bytes} bytes`;
}
