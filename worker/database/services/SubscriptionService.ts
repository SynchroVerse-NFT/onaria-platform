/**
 * Subscription Service
 * Handles subscription management, upgrades, downgrades, and status tracking
 */

import { BaseService } from './BaseService';
import * as schema from '../schema';
import { eq, and, lt, gte } from 'drizzle-orm';
import { generateId } from '../../utils/idGenerator';
import {
  Subscription,
  SubscriptionTier,
  SubscriptionStatus
} from '../../../src/api-types';
import {
  getTierLimits,
  isUpgrade,
  isDowngrade,
  BILLING_CYCLE_MS,
  GRACE_PERIOD_MS
} from '../../services/subscription/TierConfig';

export class SubscriptionService extends BaseService {

  /**
   * Get current active subscription for a user
   */
  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    try {
      const subscription = await this.database
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, userId))
        .orderBy(schema.subscriptions.createdAt)
        .limit(1)
        .get();

      if (!subscription) {
        return null;
      }

      return this.mapToSubscription(subscription);
    } catch (error) {
      return this.handleDatabaseError(error, 'getCurrentSubscription', { userId });
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    try {
      const subscription = await this.database
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, subscriptionId))
        .get();

      if (!subscription) {
        return null;
      }

      return this.mapToSubscription(subscription);
    } catch (error) {
      return this.handleDatabaseError(error, 'getSubscriptionById', { subscriptionId });
    }
  }

  /**
   * Create a new subscription for a user
   */
  async createSubscription(
    userId: string,
    tier: SubscriptionTier = 'free',
    paymentMethodId?: string
  ): Promise<Subscription> {
    try {
      const now = Date.now();
      const endDate = tier === 'free' ? undefined : now + BILLING_CYCLE_MS;

      const newSubscription: schema.NewSubscription = {
        id: generateId(),
        userId,
        planType: tier,
        status: 'active',
        billingCycle: tier === 'free' ? 'monthly' : 'monthly',
        currentPeriodStart: new Date(now),
        currentPeriodEnd: endDate ? new Date(endDate) : undefined,
        amountPaid: getTierLimits(tier).price || 0,
        currency: 'USD',
        autoRenew: tier !== 'free',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [created] = await this.database
        .insert(schema.subscriptions)
        .values(newSubscription)
        .returning();

      this.logger.info('Subscription created', { userId, tier, subscriptionId: created.id });

      return this.mapToSubscription(created);
    } catch (error) {
      return this.handleDatabaseError(error, 'createSubscription', { userId, tier });
    }
  }

  /**
   * Upgrade subscription to a higher tier
   */
  async upgradeSubscription(
    userId: string,
    newTier: SubscriptionTier,
    paymentMethodId?: string
  ): Promise<Subscription> {
    try {
      const currentSub = await this.getCurrentSubscription(userId);

      if (!currentSub) {
        throw new Error('No active subscription found');
      }

      const currentTier = currentSub.tier;

      if (!isUpgrade(currentTier, newTier)) {
        throw new Error(`Cannot upgrade from ${currentTier} to ${newTier}`);
      }

      const now = Date.now();
      const endDate = now + BILLING_CYCLE_MS;
      const newPrice = getTierLimits(newTier).price || 0;

      // Calculate pro-rated credit if upgrading mid-cycle
      let proratedAmount = newPrice;
      if (currentSub.endDate && currentTier !== 'free') {
        const remainingTime = currentSub.endDate - now;
        const totalTime = BILLING_CYCLE_MS;
        const remainingPercent = Math.max(0, remainingTime / totalTime);
        const oldPrice = getTierLimits(currentTier).price || 0;
        const credit = oldPrice * remainingPercent;
        proratedAmount = Math.max(0, newPrice - credit);
      }

      const [updated] = await this.database
        .update(schema.subscriptions)
        .set({
          planType: newTier,
          status: 'active',
          currentPeriodStart: new Date(now),
          currentPeriodEnd: new Date(endDate),
          amountPaid: proratedAmount,
          autoRenew: true,
          scheduledTier: undefined,
          scheduledChangeDate: undefined,
          updatedAt: new Date()
        })
        .where(eq(schema.subscriptions.id, currentSub.id))
        .returning();

      this.logger.info('Subscription upgraded', {
        userId,
        fromTier: currentTier,
        toTier: newTier,
        proratedAmount
      });

      return this.mapToSubscription(updated);
    } catch (error) {
      return this.handleDatabaseError(error, 'upgradeSubscription', { userId, newTier });
    }
  }

  /**
   * Downgrade subscription to a lower tier
   * Scheduled to take effect at end of current billing period
   */
  async downgradeSubscription(
    userId: string,
    newTier: SubscriptionTier
  ): Promise<Subscription> {
    try {
      const currentSub = await this.getCurrentSubscription(userId);

      if (!currentSub) {
        throw new Error('No active subscription found');
      }

      const currentTier = currentSub.tier;

      if (!isDowngrade(currentTier, newTier)) {
        throw new Error(`Cannot downgrade from ${currentTier} to ${newTier}`);
      }

      // Schedule downgrade at end of billing period (no refunds)
      const changeDate = currentSub.endDate || Date.now() + BILLING_CYCLE_MS;

      const [updated] = await this.database
        .update(schema.subscriptions)
        .set({
          scheduledTier: newTier,
          scheduledChangeDate: new Date(changeDate),
          updatedAt: new Date()
        })
        .where(eq(schema.subscriptions.id, currentSub.id))
        .returning();

      this.logger.info('Subscription downgrade scheduled', {
        userId,
        fromTier: currentTier,
        toTier: newTier,
        effectiveDate: changeDate
      });

      return this.mapToSubscription(updated);
    } catch (error) {
      return this.handleDatabaseError(error, 'downgradeSubscription', { userId, newTier });
    }
  }

  /**
   * Cancel subscription (mark for cancellation at end of period)
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const currentSub = await this.getCurrentSubscription(userId);

      if (!currentSub) {
        throw new Error('No active subscription found');
      }

      const now = new Date();

      await this.database
        .update(schema.subscriptions)
        .set({
          status: 'cancelled',
          autoRenew: false,
          cancelledAt: now,
          updatedAt: now
        })
        .where(eq(schema.subscriptions.id, currentSub.id));

      this.logger.info('Subscription cancelled', {
        userId,
        subscriptionId: currentSub.id
      });
    } catch (error) {
      return this.handleDatabaseError(error, 'cancelSubscription', { userId });
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(userId: string): Promise<Subscription> {
    try {
      const currentSub = await this.getCurrentSubscription(userId);

      if (!currentSub) {
        throw new Error('No subscription found');
      }

      if (currentSub.status !== 'cancelled') {
        throw new Error('Subscription is not cancelled');
      }

      const [updated] = await this.database
        .update(schema.subscriptions)
        .set({
          status: 'active',
          autoRenew: true,
          cancelledAt: undefined,
          cancellationReason: undefined,
          updatedAt: new Date()
        })
        .where(eq(schema.subscriptions.id, currentSub.id))
        .returning();

      this.logger.info('Subscription reactivated', {
        userId,
        subscriptionId: currentSub.id
      });

      return this.mapToSubscription(updated);
    } catch (error) {
      return this.handleDatabaseError(error, 'reactivateSubscription', { userId });
    }
  }

  /**
   * Renew subscription for next billing cycle
   */
  async renewSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const now = Date.now();
      const newEndDate = now + BILLING_CYCLE_MS;

      // Apply scheduled tier change if exists
      const newTier = subscription.scheduledTier || subscription.tier;
      const price = getTierLimits(newTier).price || 0;

      const [updated] = await this.database
        .update(schema.subscriptions)
        .set({
          planType: newTier,
          status: 'active',
          currentPeriodStart: new Date(now),
          currentPeriodEnd: new Date(newEndDate),
          amountPaid: price,
          scheduledTier: undefined,
          scheduledChangeDate: undefined,
          updatedAt: new Date()
        })
        .where(eq(schema.subscriptions.id, subscriptionId))
        .returning();

      this.logger.info('Subscription renewed', {
        subscriptionId,
        tier: newTier,
        newEndDate
      });

      return this.mapToSubscription(updated);
    } catch (error) {
      return this.handleDatabaseError(error, 'renewSubscription', { subscriptionId });
    }
  }

  /**
   * Get subscription status with grace period handling
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const subscription = await this.getCurrentSubscription(userId);

      if (!subscription) {
        return 'expired';
      }

      // Check if subscription is expired
      if (subscription.endDate) {
        const now = Date.now();
        const expired = now > subscription.endDate;
        const inGracePeriod = expired && (now - subscription.endDate) <= GRACE_PERIOD_MS;

        if (expired && !inGracePeriod) {
          return 'expired';
        }

        if (inGracePeriod) {
          return 'past_due';
        }
      }

      return subscription.status;
    } catch (error) {
      this.logger.error('Failed to get subscription status', error);
      return 'expired';
    }
  }

  /**
   * Find expired subscriptions that need to be downgraded
   */
  async findExpiredSubscriptions(): Promise<Subscription[]> {
    try {
      const now = new Date();
      const gracePeriodEnd = new Date(Date.now() - GRACE_PERIOD_MS);

      const expired = await this.database
        .select()
        .from(schema.subscriptions)
        .where(
          and(
            eq(schema.subscriptions.status, 'active'),
            lt(schema.subscriptions.currentPeriodEnd, gracePeriodEnd)
          )
        )
        .all();

      return expired.map(sub => this.mapToSubscription(sub));
    } catch (error) {
      this.logger.error('Failed to find expired subscriptions', error);
      return [];
    }
  }

  /**
   * Find subscriptions that need scheduled tier changes applied
   */
  async findScheduledTierChanges(): Promise<Subscription[]> {
    try {
      const now = new Date();

      const scheduled = await this.database
        .select()
        .from(schema.subscriptions)
        .where(
          and(
            lt(schema.subscriptions.scheduledChangeDate, now)
          )
        )
        .all();

      return scheduled
        .filter(sub => sub.scheduledTier !== null)
        .map(sub => this.mapToSubscription(sub));
    } catch (error) {
      this.logger.error('Failed to find scheduled tier changes', error);
      return [];
    }
  }

  /**
   * Expire subscription and downgrade to free tier
   */
  async expireSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.database
        .update(schema.subscriptions)
        .set({
          planType: 'free',
          status: 'expired',
          autoRenew: false,
          updatedAt: new Date()
        })
        .where(eq(schema.subscriptions.id, subscriptionId));

      this.logger.info('Subscription expired and downgraded to free', { subscriptionId });
    } catch (error) {
      return this.handleDatabaseError(error, 'expireSubscription', { subscriptionId });
    }
  }

  /**
   * Map database schema to API type
   */
  private mapToSubscription(sub: schema.Subscription): Subscription {
    return {
      id: sub.id,
      userId: sub.userId,
      tier: sub.planType as SubscriptionTier,
      status: sub.status as SubscriptionStatus,
      startDate: sub.currentPeriodStart?.getTime() || Date.now(),
      endDate: sub.currentPeriodEnd?.getTime(),
      autoRenew: sub.autoRenew || false,
      paymentMethodId: undefined, // Not stored in current schema
      scheduledTier: sub.scheduledTier as SubscriptionTier | undefined,
      scheduledChangeDate: sub.scheduledChangeDate?.getTime(),
      createdAt: sub.createdAt?.getTime() || Date.now(),
      updatedAt: sub.updatedAt?.getTime() || Date.now()
    };
  }
}
