/**
 * Subscription Checker Service
 * Handles subscription status validation, expiration checks, and automated actions
 */

import { createLogger } from '../../logger';
import { SubscriptionService } from '../../database/services/SubscriptionService';
import { GRACE_PERIOD_MS } from './TierConfig';
import { Subscription, SubscriptionStatus } from '../../../src/api-types';

const logger = createLogger('SubscriptionChecker');

export class SubscriptionChecker {
  private subscriptionService: SubscriptionService;

  constructor(env: Env) {
    this.subscriptionService = new SubscriptionService(env);
  }

  /**
   * Check and process expired subscriptions
   * Should be called periodically (e.g., via cron or scheduled worker)
   */
  async checkExpiredSubscriptions(): Promise<void> {
    try {
      const expiredSubs = await this.subscriptionService.findExpiredSubscriptions();

      logger.info(`Found ${expiredSubs.length} expired subscriptions to process`);

      for (const subscription of expiredSubs) {
        await this.handleExpiredSubscription(subscription);
      }
    } catch (error) {
      logger.error('Failed to check expired subscriptions', error);
      throw error;
    }
  }

  /**
   * Process scheduled tier changes
   * Should be called periodically to apply scheduled downgrades
   */
  async processScheduledTierChanges(): Promise<void> {
    try {
      const scheduled = await this.subscriptionService.findScheduledTierChanges();

      logger.info(`Found ${scheduled.length} scheduled tier changes to process`);

      for (const subscription of scheduled) {
        if (subscription.scheduledTier) {
          await this.applyScheduledTierChange(subscription);
        }
      }
    } catch (error) {
      logger.error('Failed to process scheduled tier changes', error);
      throw error;
    }
  }

  /**
   * Handle a single expired subscription
   */
  private async handleExpiredSubscription(subscription: Subscription): Promise<void> {
    try {
      const now = Date.now();
      const endDate = subscription.endDate;

      if (!endDate) {
        logger.warn('Subscription has no end date', { subscriptionId: subscription.id });
        return;
      }

      const gracePeriodEnd = endDate + GRACE_PERIOD_MS;

      // Check if still in grace period
      if (now < gracePeriodEnd) {
        logger.info('Subscription still in grace period', {
          subscriptionId: subscription.id,
          gracePeriodEndsAt: new Date(gracePeriodEnd)
        });
        return;
      }

      // Grace period ended - downgrade to free
      await this.subscriptionService.expireSubscription(subscription.id);

      logger.info('Subscription expired and downgraded to free', {
        subscriptionId: subscription.id,
        userId: subscription.userId
      });

      // TODO: Send expiration email
      await this.sendExpirationNotification(subscription.userId);
    } catch (error) {
      logger.error('Failed to handle expired subscription', {
        subscriptionId: subscription.id,
        error
      });
    }
  }

  /**
   * Apply a scheduled tier change
   */
  private async applyScheduledTierChange(subscription: Subscription): Promise<void> {
    try {
      if (!subscription.scheduledTier) {
        return;
      }

      // Renew subscription with new tier
      await this.subscriptionService.renewSubscription(subscription.id);

      logger.info('Applied scheduled tier change', {
        subscriptionId: subscription.id,
        oldTier: subscription.tier,
        newTier: subscription.scheduledTier
      });

      // TODO: Send tier change confirmation email
      await this.sendTierChangeNotification(
        subscription.userId,
        subscription.tier,
        subscription.scheduledTier
      );
    } catch (error) {
      logger.error('Failed to apply scheduled tier change', {
        subscriptionId: subscription.id,
        error
      });
    }
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);

      if (!subscription) {
        logger.error('Subscription not found for failed payment', { subscriptionId });
        return;
      }

      // Update subscription status to past_due
      // Note: This would require adding a status field update method
      logger.warn('Payment failed for subscription', {
        subscriptionId,
        userId: subscription.userId
      });

      // TODO: Implement retry logic
      // TODO: Send payment failed email
      await this.sendPaymentFailedNotification(subscription.userId, subscriptionId);
    } catch (error) {
      logger.error('Failed to handle payment failure', { subscriptionId, error });
    }
  }

  /**
   * Send expiration warning to user
   */
  async sendExpirationWarning(userId: string, daysLeft: number): Promise<void> {
    try {
      logger.info('Sending expiration warning', { userId, daysLeft });

      // TODO: Integrate with email service
      // For now, just log the warning
      logger.warn(`Subscription expires in ${daysLeft} days`, { userId });
    } catch (error) {
      logger.error('Failed to send expiration warning', { userId, error });
    }
  }

  /**
   * Check if subscription should send warning
   */
  async checkExpirationWarnings(): Promise<void> {
    try {
      // TODO: Implement query for subscriptions expiring soon
      // Send warnings at 7 days, 3 days, 1 day before expiration
      logger.info('Checking for subscriptions needing expiration warnings');
    } catch (error) {
      logger.error('Failed to check expiration warnings', error);
    }
  }

  /**
   * Validate subscription status for user
   */
  async validateSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      return await this.subscriptionService.getSubscriptionStatus(userId);
    } catch (error) {
      logger.error('Failed to validate subscription status', { userId, error });
      return 'expired';
    }
  }

  /**
   * Check if subscription is in good standing
   */
  async isSubscriptionActive(userId: string): Promise<boolean> {
    try {
      const status = await this.validateSubscriptionStatus(userId);
      return status === 'active';
    } catch (error) {
      logger.error('Failed to check subscription active status', { userId, error });
      return false;
    }
  }

  /**
   * Get days until subscription expires
   */
  async getDaysUntilExpiration(userId: string): Promise<number | null> {
    try {
      const subscription = await this.subscriptionService.getCurrentSubscription(userId);

      if (!subscription || !subscription.endDate) {
        return null;
      }

      const now = Date.now();
      const daysLeft = Math.ceil((subscription.endDate - now) / (24 * 60 * 60 * 1000));

      return Math.max(0, daysLeft);
    } catch (error) {
      logger.error('Failed to get days until expiration', { userId, error });
      return null;
    }
  }

  /**
   * Private notification methods (placeholders for email integration)
   */
  private async sendExpirationNotification(userId: string): Promise<void> {
    logger.info('TODO: Send expiration notification email', { userId });
    // TODO: Integrate with email service
  }

  private async sendTierChangeNotification(
    userId: string,
    oldTier: string,
    newTier: string
  ): Promise<void> {
    logger.info('TODO: Send tier change notification email', { userId, oldTier, newTier });
    // TODO: Integrate with email service
  }

  private async sendPaymentFailedNotification(
    userId: string,
    subscriptionId: string
  ): Promise<void> {
    logger.info('TODO: Send payment failed notification email', { userId, subscriptionId });
    // TODO: Integrate with email service
  }
}

/**
 * Factory function to create SubscriptionChecker instance
 */
export function createSubscriptionChecker(env: Env): SubscriptionChecker {
  return new SubscriptionChecker(env);
}

/**
 * Scheduled handler for checking subscriptions
 * Can be called from a Cloudflare Cron Trigger
 */
export async function scheduledSubscriptionCheck(env: Env): Promise<void> {
  const checker = new SubscriptionChecker(env);

  try {
    logger.info('Running scheduled subscription check');

    // Check and process expired subscriptions
    await checker.checkExpiredSubscriptions();

    // Process scheduled tier changes
    await checker.processScheduledTierChanges();

    // Check for expiration warnings
    await checker.checkExpirationWarnings();

    logger.info('Scheduled subscription check completed');
  } catch (error) {
    logger.error('Scheduled subscription check failed', error);
    throw error;
  }
}
