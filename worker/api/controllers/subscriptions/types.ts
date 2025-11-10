/**
 * Type definitions for Subscription Controller responses
 */

import { Subscription, UsageMetrics, TierLimits, SubscriptionTier } from '../../../../src/api-types';

/**
 * Response data for getCurrentSubscription
 */
export interface CurrentSubscriptionData {
  subscription: Subscription;
  usage: UsageMetrics;
  limits: TierLimits;
}

/**
 * Response data for upgradeSubscription
 */
export interface UpgradeSubscriptionData {
  subscription: Subscription;
  requiresPayment: boolean;
  paymentAmount?: number;
  message: string;
}

/**
 * Response data for downgradeSubscription
 */
export interface DowngradeSubscriptionData {
  subscription: Subscription;
  effectiveDate: number;
  message: string;
}

/**
 * Response data for cancelSubscription
 */
export interface CancelSubscriptionData {
  subscription: Subscription;
  expiresAt: number;
  message: string;
}

/**
 * Response data for reactivateSubscription
 */
export interface ReactivateSubscriptionData {
  subscription: Subscription;
  message: string;
}

/**
 * Request body for upgrade subscription
 */
export interface UpgradeSubscriptionRequest {
  tier: SubscriptionTier;
  paymentMethodId?: string;
}

/**
 * Request body for downgrade subscription
 */
export interface DowngradeSubscriptionRequest {
  tier: SubscriptionTier;
}
