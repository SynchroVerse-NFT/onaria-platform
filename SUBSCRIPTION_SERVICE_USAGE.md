# Subscription Service & Tier Enforcement - Usage Guide

This document provides comprehensive examples for using the subscription management and tier enforcement system.

## Table of Contents
1. [Service Imports](#service-imports)
2. [Subscription Management](#subscription-management)
3. [Usage Tracking](#usage-tracking)
4. [Feature Gating](#feature-gating)
5. [Tier Enforcement](#tier-enforcement)
6. [Controller Integration](#controller-integration)

---

## Service Imports

```typescript
import { SubscriptionService } from 'worker/database/services/SubscriptionService';
import { createUsageTracker } from 'worker/services/subscription/UsageTracker';
import { createFeatureGate } from 'worker/services/subscription/FeatureGate';
import { createSubscriptionChecker } from 'worker/services/subscription/SubscriptionChecker';
import {
  checkAppCreationLimit,
  checkAIGenerationLimit,
  checkWorkflowExecutionLimit,
  getUserUsageAndLimits,
  TierLimitExceededError
} from 'worker/middleware/tierEnforcement';
import { getTierLimits, hasFeature } from 'worker/services/subscription/TierConfig';
```

---

## Subscription Management

### Get Current Subscription

```typescript
async function getCurrentUserSubscription(userId: string, env: Env) {
  const subscriptionService = new SubscriptionService(env);

  const subscription = await subscriptionService.getCurrentSubscription(userId);

  if (!subscription) {
    // User has no subscription (shouldn't happen due to auto-creation)
    return null;
  }

  console.log('Current tier:', subscription.tier);
  console.log('Status:', subscription.status);
  console.log('Expires:', subscription.endDate ? new Date(subscription.endDate) : 'Never');

  return subscription;
}
```

### Upgrade Subscription

```typescript
async function upgradeUserSubscription(userId: string, env: Env) {
  const subscriptionService = new SubscriptionService(env);

  try {
    // Upgrade from free to pro
    const upgradedSub = await subscriptionService.upgradeSubscription(
      userId,
      'pro',
      'payment_method_123' // Optional payment method ID
    );

    console.log('Upgraded to:', upgradedSub.tier);
    console.log('Pro-rated amount charged:', upgradedSub);

    return upgradedSub;
  } catch (error) {
    console.error('Upgrade failed:', error);
    throw error;
  }
}
```

### Downgrade Subscription

```typescript
async function downgradeUserSubscription(userId: string, env: Env) {
  const subscriptionService = new SubscriptionService(env);

  try {
    // Downgrade from pro to free (scheduled at end of billing period)
    const downgradedSub = await subscriptionService.downgradeSubscription(
      userId,
      'free'
    );

    console.log('Downgrade scheduled for:', new Date(downgradedSub.scheduledChangeDate!));
    console.log('Current tier remains:', downgradedSub.tier);
    console.log('Will change to:', downgradedSub.scheduledTier);

    return downgradedSub;
  } catch (error) {
    console.error('Downgrade failed:', error);
    throw error;
  }
}
```

### Cancel Subscription

```typescript
async function cancelUserSubscription(userId: string, env: Env) {
  const subscriptionService = new SubscriptionService(env);

  try {
    await subscriptionService.cancelSubscription(userId);
    console.log('Subscription cancelled - will remain active until end of period');
  } catch (error) {
    console.error('Cancellation failed:', error);
    throw error;
  }
}
```

---

## Usage Tracking

### Track AI Generation

```typescript
async function trackAIGeneration(userId: string, env: Env) {
  const usageTracker = createUsageTracker(env);

  // Increment AI generation count
  await usageTracker.incrementAIGenerations(userId, 1);

  // Track token usage and cost
  const tokensUsed = 1500;
  const estimatedCost = 0.002; // $0.002 USD
  await usageTracker.trackTokenUsage(userId, tokensUsed, estimatedCost);

  console.log('AI generation tracked');
}
```

### Track App Creation

```typescript
async function trackAppCreation(userId: string, env: Env) {
  const usageTracker = createUsageTracker(env);

  await usageTracker.incrementAppCreations(userId);
  console.log('App creation tracked');
}
```

### Track Workflow Execution

```typescript
async function trackWorkflowExecution(userId: string, env: Env) {
  const usageTracker = createUsageTracker(env);

  await usageTracker.incrementWorkflowExecutions(userId, 1);
  console.log('Workflow execution tracked');
}
```

### Get Current Usage

```typescript
async function getUserUsage(userId: string, env: Env) {
  const usageTracker = createUsageTracker(env);

  // Get today's usage
  const currentUsage = await usageTracker.getCurrentUsage(userId);
  console.log('Today:', currentUsage);

  // Get monthly usage
  const monthlyUsage = await usageTracker.getMonthlyUsage(userId);
  console.log('This month:', monthlyUsage);

  // Get total app count
  const totalApps = await usageTracker.getTotalAppCount(userId);
  console.log('Total apps:', totalApps);

  return {
    current: currentUsage,
    monthly: monthlyUsage,
    totalApps
  };
}
```

### Get Usage History

```typescript
async function getUserUsageHistory(userId: string, env: Env) {
  const usageTracker = createUsageTracker(env);

  // Get last 30 days
  const history = await usageTracker.getUsageHistory(userId, 30);

  history.forEach(day => {
    console.log(`${day.date}: ${day.aiGenerations} generations, ${day.appsCreated} apps`);
  });

  return history;
}
```

---

## Feature Gating

### Check Feature Access

```typescript
async function checkUserFeature(userId: string, feature: string, env: Env) {
  const featureGate = createFeatureGate(env);

  // Check if user has access
  const hasAccess = await featureGate.hasFeature(userId, 'github_sync');
  console.log('Has GitHub sync:', hasAccess);

  // Get detailed access info
  const accessInfo = await featureGate.canAccessFeature(userId, 'white_label');
  console.log('White label access:', accessInfo);
  // { allowed: false, tier: 'free', reason: 'Feature requires upgrade from free tier' }

  return hasAccess;
}
```

### Require Feature (with Error)

```typescript
import { FeatureNotAvailableError } from 'worker/services/subscription/FeatureGate';

async function requireFeatureExample(userId: string, env: Env) {
  const featureGate = createFeatureGate(env);

  try {
    // Throws error if user doesn't have access
    await featureGate.requireFeature(userId, 'custom_domains');

    // Feature is available, proceed
    console.log('User has custom domain access');
  } catch (error) {
    if (error instanceof FeatureNotAvailableError) {
      console.error('Feature not available:', error.message);
      console.error('Current tier:', error.currentTier);
      return new Response(JSON.stringify(error.toJSON()), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}
```

### Get All Available Features

```typescript
async function getUserFeatures(userId: string, env: Env) {
  const featureGate = createFeatureGate(env);

  const features = await featureGate.getAvailableFeatures(userId);
  console.log('Available features:', features);
  // ['basic_templates', 'public_deployments', 'community_support', ...]

  const tier = await featureGate.getUserTier(userId);
  console.log('User tier:', tier);

  return { features, tier };
}
```

### Check Multiple Features

```typescript
async function checkMultipleFeatures(userId: string, env: Env) {
  const featureGate = createFeatureGate(env);

  const features = ['github_sync', 'custom_domains', 'white_label', 'sso'];
  const access = await featureGate.hasFeatures(userId, features);

  console.log('Feature access:', access);
  // {
  //   github_sync: false,
  //   custom_domains: false,
  //   white_label: false,
  //   sso: false
  // }

  return access;
}
```

---

## Tier Enforcement

### Check Limits Before Operation

```typescript
async function createAppWithLimitCheck(userId: string, env: Env) {
  try {
    // Check if user can create app
    await checkAppCreationLimit(userId, env);

    // Limit check passed, create app
    console.log('Creating app...');
    // ... app creation logic

    // Track the creation
    const usageTracker = createUsageTracker(env);
    await usageTracker.incrementAppCreations(userId);

  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      console.error('Limit exceeded:', error.message);
      console.error('Current usage:', error.currentUsage);
      console.error('Limit:', error.limit);
      console.error('Tier:', error.tier);

      // Return 402 Payment Required
      return new Response(JSON.stringify(error.toJSON()), {
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}
```

### Check AI Generation Limit

```typescript
async function performAIGeneration(userId: string, env: Env) {
  try {
    // Check limit before generation
    await checkAIGenerationLimit(userId, env);

    // Proceed with AI generation
    console.log('Performing AI generation...');
    // ... AI generation logic

    // Track the usage
    const usageTracker = createUsageTracker(env);
    await usageTracker.incrementAIGenerations(userId, 1);

  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      return new Response(JSON.stringify({
        error: 'AI_GENERATION_LIMIT_EXCEEDED',
        message: error.message,
        upgrade: 'Upgrade to Pro for 2,000 generations/month'
      }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}
```

### Check Workflow Execution Limit

```typescript
async function executeWorkflow(userId: string, env: Env) {
  try {
    // Check limit
    await checkWorkflowExecutionLimit(userId, env);

    // Execute workflow
    console.log('Executing workflow...');
    // ... workflow execution logic

    // Track usage
    const usageTracker = createUsageTracker(env);
    await usageTracker.incrementWorkflowExecutions(userId, 1);

  } catch (error) {
    if (error instanceof TierLimitExceededError) {
      if (error.limit === 0) {
        return new Response(JSON.stringify({
          error: 'FEATURE_NOT_AVAILABLE',
          message: 'Workflows require Pro tier or higher'
        }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(error.toJSON()), {
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}
```

### Get Usage and Limits Summary

```typescript
async function getUsageSummary(userId: string, env: Env) {
  const summary = await getUserUsageAndLimits(userId, env);

  console.log('Tier:', summary.tier);
  console.log('Usage:', summary.usage);
  console.log('Limits:', summary.limits);

  // Calculate percentage used
  const percentAI = (summary.usage.aiGenerations / summary.limits.aiGenerations) * 100;
  const percentApps = (summary.usage.appsCreated / summary.limits.appsCreated) * 100;

  console.log(`AI Generations: ${percentAI.toFixed(1)}% used`);
  console.log(`Apps: ${percentApps.toFixed(1)}% used`);

  return summary;
}
```

---

## Controller Integration

### Subscription Controller Example

```typescript
import { SubscriptionService } from 'worker/database/services/SubscriptionService';
import { getUserUsageAndLimits } from 'worker/middleware/tierEnforcement';
import { getTierLimits } from 'worker/services/subscription/TierConfig';

export async function getCurrentSubscription(request: Request, env: Env, userId: string) {
  const subscriptionService = new SubscriptionService(env);

  // Get subscription
  const subscription = await subscriptionService.getCurrentSubscription(userId);

  if (!subscription) {
    return new Response(JSON.stringify({
      success: false,
      error: 'No subscription found'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get usage and limits
  const { usage, limits } = await getUserUsageAndLimits(userId, env);

  return new Response(JSON.stringify({
    success: true,
    data: {
      subscription,
      usage,
      limits
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Usage Controller Example

```typescript
import { createUsageTracker } from 'worker/services/subscription/UsageTracker';
import { getTierLimits } from 'worker/services/subscription/TierConfig';
import { SubscriptionService } from 'worker/database/services/SubscriptionService';

export async function getCurrentUsage(request: Request, env: Env, userId: string) {
  const usageTracker = createUsageTracker(env);
  const subscriptionService = new SubscriptionService(env);

  // Get subscription tier
  const subscription = await subscriptionService.getCurrentSubscription(userId);
  const tier = subscription?.tier || 'free';
  const limits = getTierLimits(tier);

  // Get monthly usage
  const monthlyUsage = await usageTracker.getMonthlyUsage(userId);
  const totalApps = await usageTracker.getTotalAppCount(userId);

  // Calculate percentages
  const percentUsed = {
    aiGenerations: limits.aiGenerationsPerMonth === -1 ? 0 :
      (monthlyUsage.aiGenerations / limits.aiGenerationsPerMonth) * 100,
    apps: limits.maxApps === -1 ? 0 :
      (totalApps / limits.maxApps) * 100,
    workflows: limits.workflowExecutionsPerMonth === -1 ? 0 :
      (monthlyUsage.workflowExecutions / limits.workflowExecutionsPerMonth) * 100
  };

  return new Response(JSON.stringify({
    success: true,
    data: {
      usage: {
        ...monthlyUsage,
        appsCreated: totalApps
      },
      limits: {
        aiGenerations: limits.aiGenerationsPerMonth,
        appsCreated: limits.maxApps,
        workflowExecutions: limits.workflowExecutionsPerMonth
      },
      percentUsed
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Features Controller Example

```typescript
import { createFeatureGate } from 'worker/services/subscription/FeatureGate';
import { getTierLimits, FEATURE_DESCRIPTIONS } from 'worker/services/subscription/TierConfig';

export async function getAvailableFeatures(request: Request, env: Env, userId: string) {
  const featureGate = createFeatureGate(env);

  const features = await featureGate.getAvailableFeatures(userId);
  const tier = await featureGate.getUserTier(userId);
  const limits = getTierLimits(tier);

  const featureDetails = features.map(feature => ({
    name: feature,
    enabled: true,
    description: FEATURE_DESCRIPTIONS[feature] || 'No description available'
  }));

  return new Response(JSON.stringify({
    success: true,
    data: {
      features,
      tier,
      limits,
      featureDetails
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## Scheduled Tasks

### Run Subscription Checker (Cron Job)

```typescript
import { scheduledSubscriptionCheck } from 'worker/services/subscription/SubscriptionChecker';

// In your worker scheduled handler
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Run daily at midnight
    await scheduledSubscriptionCheck(env);
  }
}
```

### Manual Subscription Check

```typescript
import { createSubscriptionChecker } from 'worker/services/subscription/SubscriptionChecker';

async function manualSubscriptionCheck(env: Env) {
  const checker = createSubscriptionChecker(env);

  // Check for expired subscriptions
  await checker.checkExpiredSubscriptions();

  // Process scheduled tier changes
  await checker.processScheduledTierChanges();

  console.log('Subscription check completed');
}
```

---

## Error Handling Best Practices

```typescript
import { TierLimitExceededError } from 'worker/middleware/tierEnforcement';
import { FeatureNotAvailableError } from 'worker/services/subscription/FeatureGate';

async function handleSubscriptionErrors(userId: string, env: Env) {
  try {
    // Your operation
  } catch (error) {
    // Handle tier limit errors
    if (error instanceof TierLimitExceededError) {
      return new Response(JSON.stringify({
        error: 'TIER_LIMIT_EXCEEDED',
        ...error.toJSON(),
        upgradeUrl: '/pricing'
      }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle feature access errors
    if (error instanceof FeatureNotAvailableError) {
      return new Response(JSON.stringify({
        error: 'FEATURE_NOT_AVAILABLE',
        ...error.toJSON(),
        upgradeUrl: '/pricing'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle other errors
    throw error;
  }
}
```

---

## Configuration Examples

### Get Tier Information

```typescript
import { getTierLimits, hasFeature, TIER_LIMITS } from 'worker/services/subscription/TierConfig';

function displayTierInfo() {
  // Get limits for a specific tier
  const proLimits = getTierLimits('pro');
  console.log('Pro tier limits:', proLimits);

  // Check feature availability
  const hasGitHub = hasFeature('pro', 'github_sync');
  console.log('Pro has GitHub sync:', hasGitHub);

  // Get all tiers
  console.log('All tiers:', TIER_LIMITS);
}
```

This completes the comprehensive usage guide for the subscription service and tier enforcement system.
