/**
 * Feature Gate Service
 * Controls access to features based on subscription tier
 */

import { createLogger } from '../../logger';
import { SubscriptionService } from '../../database/services/SubscriptionService';
import {
  hasFeature as tierHasFeature,
  getAvailableFeatures as tierAvailableFeatures
} from './TierConfig';
import { SubscriptionTier } from '../../../src/api-types';

const logger = createLogger('FeatureGate');

export class FeatureGate {
  private subscriptionService: SubscriptionService;

  constructor(env: Env) {
    this.subscriptionService = new SubscriptionService(env);
  }

  /**
   * Check if user has access to a specific feature
   */
  async hasFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const subscription = await this.subscriptionService.getCurrentSubscription(userId);

      if (!subscription) {
        // No subscription = free tier
        return tierHasFeature('free', feature);
      }

      return tierHasFeature(subscription.tier, feature);
    } catch (error) {
      logger.error('Failed to check feature access', { userId, feature, error });
      // Fail closed: deny access on error
      return false;
    }
  }

  /**
   * Require a feature or throw an error
   */
  async requireFeature(userId: string, feature: string): Promise<void> {
    const hasAccess = await this.hasFeature(userId, feature);

    if (!hasAccess) {
      const subscription = await this.subscriptionService.getCurrentSubscription(userId);
      const currentTier = subscription?.tier || 'free';

      throw new FeatureNotAvailableError(
        `Feature '${feature}' is not available on ${currentTier} tier`,
        feature,
        currentTier
      );
    }
  }

  /**
   * Get all available features for a user
   */
  async getAvailableFeatures(userId: string): Promise<string[]> {
    try {
      const subscription = await this.subscriptionService.getCurrentSubscription(userId);

      if (!subscription) {
        return tierAvailableFeatures('free');
      }

      return tierAvailableFeatures(subscription.tier);
    } catch (error) {
      logger.error('Failed to get available features', { userId, error });
      return tierAvailableFeatures('free');
    }
  }

  /**
   * Get user's current tier
   */
  async getUserTier(userId: string): Promise<SubscriptionTier> {
    try {
      const subscription = await this.subscriptionService.getCurrentSubscription(userId);
      return subscription?.tier || 'free';
    } catch (error) {
      logger.error('Failed to get user tier', { userId, error });
      return 'free';
    }
  }

  /**
   * Check multiple features at once
   */
  async hasFeatures(userId: string, features: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const feature of features) {
      results[feature] = await this.hasFeature(userId, feature);
    }

    return results;
  }

  /**
   * Check if user can access a feature without throwing
   */
  async canAccessFeature(userId: string, feature: string): Promise<{
    allowed: boolean;
    tier: SubscriptionTier;
    reason?: string;
  }> {
    try {
      const subscription = await this.subscriptionService.getCurrentSubscription(userId);
      const tier = subscription?.tier || 'free';
      const allowed = tierHasFeature(tier, feature);

      return {
        allowed,
        tier,
        reason: allowed ? undefined : `Feature requires upgrade from ${tier} tier`
      };
    } catch (error) {
      logger.error('Failed to check feature access', { userId, feature, error });
      return {
        allowed: false,
        tier: 'free',
        reason: 'Error checking feature access'
      };
    }
  }
}

/**
 * Custom error for feature access denial
 */
export class FeatureNotAvailableError extends Error {
  public readonly feature: string;
  public readonly currentTier: SubscriptionTier;
  public readonly statusCode = 403;

  constructor(message: string, feature: string, currentTier: SubscriptionTier) {
    super(message);
    this.name = 'FeatureNotAvailableError';
    this.feature = feature;
    this.currentTier = currentTier;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      feature: this.feature,
      currentTier: this.currentTier,
      statusCode: this.statusCode
    };
  }
}

/**
 * Factory function to create FeatureGate instance
 */
export function createFeatureGate(env: Env): FeatureGate {
  return new FeatureGate(env);
}
