/**
 * Tier Enforcement Middleware
 * Checks subscription tier limits before allowing operations
 */

import { createLogger } from '../logger';
import { SubscriptionService } from '../database/services/SubscriptionService';
import { createUsageTracker } from '../services/subscription/UsageTracker';
import { createFeatureGate } from '../services/subscription/FeatureGate';
import { getTierLimits, isUnlimited } from '../services/subscription/TierConfig';
import { UsageMetrics, TierLimits } from '../../src/api-types';

const logger = createLogger('TierEnforcement');

/**
 * Tier enforcement error response
 */
export class TierLimitExceededError extends Error {
  public readonly statusCode = 402; // Payment Required
  public readonly limitType: string;
  public readonly currentUsage: number;
  public readonly limit: number;
  public readonly tier: string;

  constructor(
    message: string,
    limitType: string,
    currentUsage: number,
    limit: number,
    tier: string
  ) {
    super(message);
    this.name = 'TierLimitExceededError';
    this.limitType = limitType;
    this.currentUsage = currentUsage;
    this.limit = limit;
    this.tier = tier;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      limitType: this.limitType,
      currentUsage: this.currentUsage,
      limit: this.limit,
      tier: this.tier,
      statusCode: this.statusCode,
      upgradeCTA: 'Upgrade your subscription to increase limits'
    };
  }
}

/**
 * Check if user can create a new app
 */
export async function checkAppCreationLimit(userId: string, env: Env): Promise<void> {
  const subscriptionService = new SubscriptionService(env);
  const usageTracker = createUsageTracker(env);

  try {
    // Get current subscription
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    const tier = subscription?.tier || 'free';
    const limits = getTierLimits(tier);

    // Check if unlimited
    if (isUnlimited(limits.maxApps)) {
      return; // No limit
    }

    // Get total app count (all time)
    const totalApps = await usageTracker.getTotalAppCount(userId);

    if (totalApps >= limits.maxApps) {
      throw new TierLimitExceededError(
        `App creation limit reached. You can create up to ${limits.maxApps} apps on the ${tier} tier.`,
        'maxApps',
        totalApps,
        limits.maxApps,
        tier
      );
    }

    logger.info('App creation limit check passed', { userId, totalApps, limit: limits.maxApps });
  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      throw error;
    }
    logger.error('Failed to check app creation limit', { userId, error });
    throw error;
  }
}

/**
 * Check if user can perform AI generations
 */
export async function checkAIGenerationLimit(userId: string, env: Env): Promise<void> {
  const subscriptionService = new SubscriptionService(env);
  const usageTracker = createUsageTracker(env);

  try {
    // Get current subscription
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    const tier = subscription?.tier || 'free';
    const limits = getTierLimits(tier);

    // Check if unlimited (BYOK users or enterprise)
    if (isUnlimited(limits.aiGenerationsPerMonth)) {
      return; // No limit
    }

    // Get monthly usage
    const usage = await usageTracker.getMonthlyUsage(userId);

    if (usage.aiGenerations >= limits.aiGenerationsPerMonth) {
      throw new TierLimitExceededError(
        `AI generation limit reached. You can perform up to ${limits.aiGenerationsPerMonth} generations per month on the ${tier} tier.`,
        'aiGenerationsPerMonth',
        usage.aiGenerations,
        limits.aiGenerationsPerMonth,
        tier
      );
    }

    logger.info('AI generation limit check passed', {
      userId,
      usage: usage.aiGenerations,
      limit: limits.aiGenerationsPerMonth
    });
  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      throw error;
    }
    logger.error('Failed to check AI generation limit', { userId, error });
    throw error;
  }
}

/**
 * Check if user can execute workflows
 */
export async function checkWorkflowExecutionLimit(userId: string, env: Env): Promise<void> {
  const subscriptionService = new SubscriptionService(env);
  const usageTracker = createUsageTracker(env);

  try {
    // Get current subscription
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    const tier = subscription?.tier || 'free';
    const limits = getTierLimits(tier);

    // Check if unlimited
    if (isUnlimited(limits.workflowExecutionsPerMonth)) {
      return; // No limit
    }

    // Check if workflows are allowed at all
    if (limits.workflowExecutionsPerMonth === 0) {
      throw new TierLimitExceededError(
        `Workflow executions are not available on the ${tier} tier.`,
        'workflowExecutionsPerMonth',
        0,
        0,
        tier
      );
    }

    // Get monthly usage
    const usage = await usageTracker.getMonthlyUsage(userId);

    if (usage.workflowExecutions >= limits.workflowExecutionsPerMonth) {
      throw new TierLimitExceededError(
        `Workflow execution limit reached. You can execute up to ${limits.workflowExecutionsPerMonth} workflows per month on the ${tier} tier.`,
        'workflowExecutionsPerMonth',
        usage.workflowExecutions,
        limits.workflowExecutionsPerMonth,
        tier
      );
    }

    logger.info('Workflow execution limit check passed', {
      userId,
      usage: usage.workflowExecutions,
      limit: limits.workflowExecutionsPerMonth
    });
  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      throw error;
    }
    logger.error('Failed to check workflow execution limit', { userId, error });
    throw error;
  }
}

/**
 * Check if user has access to a feature
 */
export async function checkFeatureAccess(
  userId: string,
  feature: string,
  env: Env
): Promise<void> {
  const featureGate = createFeatureGate(env);

  try {
    await featureGate.requireFeature(userId, feature);
  } catch (error) {
    logger.warn('Feature access denied', { userId, feature, error });
    throw error;
  }
}

/**
 * Get current usage and limits for a user
 */
export async function getUserUsageAndLimits(
  userId: string,
  env: Env
): Promise<{ usage: UsageMetrics; limits: TierLimits; tier: string }> {
  const subscriptionService = new SubscriptionService(env);
  const usageTracker = createUsageTracker(env);

  try {
    // Get current subscription
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    const tier = subscription?.tier || 'free';
    const tierLimits = getTierLimits(tier);

    // Get monthly usage
    const monthlyUsage = await usageTracker.getMonthlyUsage(userId);

    // Get total app count
    const totalApps = await usageTracker.getTotalAppCount(userId);

    return {
      usage: {
        aiGenerations: monthlyUsage.aiGenerations,
        appsCreated: totalApps,
        workflowExecutions: monthlyUsage.workflowExecutions,
        estimatedCost: monthlyUsage.estimatedCost
      },
      limits: {
        aiGenerations: tierLimits.aiGenerationsPerMonth,
        appsCreated: tierLimits.maxApps,
        workflowExecutions: tierLimits.workflowExecutionsPerMonth,
        maxTeamMembers: tierLimits.maxTeamMembers,
        customDomains: tierLimits.customDomains
      },
      tier
    };
  } catch (error) {
    logger.error('Failed to get user usage and limits', { userId, error });
    throw error;
  }
}

/**
 * Middleware factory for route-level enforcement
 */
export function createTierEnforcementMiddleware(limitType: 'app' | 'ai' | 'workflow') {
  return async (request: Request, env: Env, userId: string): Promise<void> => {
    try {
      switch (limitType) {
        case 'app':
          await checkAppCreationLimit(userId, env);
          break;
        case 'ai':
          await checkAIGenerationLimit(userId, env);
          break;
        case 'workflow':
          await checkWorkflowExecutionLimit(userId, env);
          break;
      }
    } catch (error) {
      if (error instanceof TierLimitExceededError) {
        throw error;
      }
      logger.error('Tier enforcement middleware error', { limitType, userId, error });
      throw error;
    }
  };
}

/**
 * Helper to format error response
 */
export function formatTierLimitError(error: TierLimitExceededError): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: error.toJSON()
    }),
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}
