# Rate Limiting & Usage Tracking System

Comprehensive integration of subscription tiers with rate limiting and usage tracking.

## Overview

This system provides:
- Tier-based rate limits (free, pro, business, enterprise, byok)
- Monthly usage enforcement
- Real-time usage updates via WebSocket
- Usage warnings at threshold levels
- BYOK (Bring Your Own Keys) support
- Comprehensive analytics

## Architecture

### Core Services

#### 1. TierRateLimiter (`TierRateLimiter.ts`)
Manages tier-based rate limiting using Durable Objects.

**Methods:**
- `checkLimit()` - Check if operation is within limits
- `consumeQuota()` - Consume quota after operation
- `getRemainingQuota()` - Get remaining quota
- `resetQuota()` - Reset quota (admin/billing cycle)

**Rate Limits:**
- **API Requests:** free: 100/min, pro: 1000/min, business: 5000/min, enterprise: 10000/min
- **AI Generations:** free: 10/hr, pro: 100/hr, business: 500/hr, enterprise: unlimited
- **Concurrent Operations:** free: 1, pro: 3, business: 10, enterprise: 20

#### 2. MonthlyUsageEnforcer (`MonthlyUsageEnforcer.ts`)
Enforces monthly limits based on subscription tier.

**Methods:**
- `canCreateApp()` - Check if user can create app
- `canGenerateAI()` - Check if user can generate AI
- `canExecuteWorkflow()` - Check if user can execute workflow
- `getMonthlyUsage()` - Get all monthly usage data

**Monthly Limits:**
- **AI Generations:** free: 100, pro: 2000, business: 10000, enterprise: unlimited
- **Apps:** free: 5, pro: 50, business: unlimited, enterprise: unlimited
- **Workflows:** free: 0, pro: 500, business: 5000, enterprise: unlimited

#### 3. UsageTracker (`UsageTracker.ts`)
Tracks usage for analytics and billing.

**Methods:**
- `track()` - Generic usage tracking
- `incrementAIGenerations()` - Track AI generations
- `incrementAppCreations()` - Track app creations
- `incrementWorkflowExecutions()` - Track workflow executions
- `incrementApiCalls()` - Track API calls

Uses Analytics Engine for time-series data.

#### 4. RealtimeUsageService (`RealtimeUsageService.ts`)
Broadcasts usage updates to users via WebSocket.

**Methods:**
- `broadcastUsageUpdate()` - Send current usage to user

**Message Format:**
```typescript
{
  type: 'usage_updated',
  usage: MonthlyUsage,
  limits: TierLimits,
  percentages: { ai, apps, workflows }
}
```

#### 5. UsageWarningService (`UsageWarningService.ts`)
Sends warnings when users approach limits.

**Thresholds:** 70%, 90%, 100%

**Methods:**
- `checkAndWarnUser()` - Check and send warnings

**Message Types:**
- `limit_warning` - Sent at 70% and 90%
- `limit_exceeded` - Sent at 100%

#### 6. BYOKHandler (`BYOKHandler.ts`)
Manages Bring Your Own Keys functionality.

**Methods:**
- `shouldUseUserKeys()` - Check if user has BYOK enabled
- `getUserAPIKeys()` - Get user's encrypted API keys
- `setUserAPIKeys()` - Store encrypted API keys
- `hasRequiredKeys()` - Check if user has specific provider key

BYOK users bypass platform rate limits as they use their own API keys.

#### 7. RateLimitIntegration (`RateLimitIntegration.ts`)
High-level integration helpers for common operations.

**Methods:**
- `checkAIGenerationAllowed()` - Complete check before AI generation
- `trackAIGeneration()` - Complete tracking after AI generation
- `checkAppCreationAllowed()` - Check before app creation
- `trackAppCreation()` - Track after app creation
- `checkWorkflowExecutionAllowed()` - Check before workflow
- `trackWorkflowExecution()` - Track after workflow

### Middleware

#### usageTracking.ts
Middleware for automatic usage tracking on routes.

**Functions:**
- `trackUsage(operation)` - Middleware for specific operations
- `trackApiUsage()` - Middleware for general API tracking

**Usage:**
```typescript
app.post('/api/generate', trackUsage('ai_generation'), handler);
app.post('/api/apps', trackUsage('app_creation'), handler);
app.post('/api/workflows/:id', trackUsage('workflow_execution'), handler);
```

### Controllers

#### analytics/usage.ts
REST API endpoints for usage analytics.

**Endpoints:**
- `GET /api/analytics/usage` - Get current usage and trends
- `POST /api/analytics/usage/reset` - Reset usage (admin)

**Response:**
```typescript
{
  currentPeriod: {
    startDate, endDate,
    usage: MonthlyUsage,
    limits: TierLimits,
    percentages: UsagePercentages
  },
  trends: {
    daily: DailyUsage[],
    weekly: DailyUsage[]
  },
  projections: {
    endOfMonth: UsageMetrics,
    overage: boolean
  }
}
```

### WebSocket Types

Added to `worker/api/websocketTypes.ts`:

```typescript
type UsageUpdatedMessage = {
  type: 'usage_updated';
  usage: MonthlyUsage;
  limits: TierLimits;
  percentages: UsagePercentages;
};

type LimitWarningMessage = {
  type: 'limit_warning';
  operation: string;
  percentage: number;
  remaining: number;
  limit: number;
  threshold: number;
};

type LimitExceededMessage = {
  type: 'limit_exceeded';
  operation: string;
  currentTier: string;
  suggestedTier: string;
  limit: number;
};
```

## Integration Guide

### 1. AI Generation Integration

**In `worker/agents/core/simpleGeneratorAgent.ts`:**

```typescript
import { RateLimitIntegration } from '../../services/usage/RateLimitIntegration';

async generateResponse() {
  // Check limits
  const check = await RateLimitIntegration.checkAIGenerationAllowed(
    this.env,
    this.db,
    this.userId,
    this.subscription.tier
  );

  if (!check.allowed) {
    await this.sendWebSocketMessage({
      type: 'rate_limit_error',
      error: check.error
    });
    throw check.error;
  }

  // Use BYOK if applicable
  if (check.useBYOK) {
    const keys = await BYOKHandler.getUserAPIKeys(this.db, this.userId);
    // Use user's keys
  }

  // Make LLM call
  const response = await this.callLLM();

  // Track usage
  await RateLimitIntegration.trackAIGeneration(
    this.env,
    this.db,
    this.userId,
    this.subscription.tier
  );

  return response;
}
```

### 2. App Creation Integration

**In `worker/api/controllers/apps/controller.ts`:**

```typescript
import { RateLimitIntegration } from '../../../services/usage/RateLimitIntegration';

export async function createApp(c: Context) {
  const userId = c.get('userId');
  const tier = c.get('subscription').tier;
  const db = c.get('db');
  const env = c.env;

  // Check limit
  const check = await RateLimitIntegration.checkAppCreationAllowed(
    db,
    userId,
    tier
  );

  if (!check.allowed) {
    return c.json({
      error: 'App creation limit exceeded',
      upgrade: true,
      message: check.error.message,
      currentTier: tier,
      suggestedTier: getSuggestedTier(tier)
    }, 402);
  }

  // Create app
  const app = await createApp(db, userId, appData);

  // Track usage
  await RateLimitIntegration.trackAppCreation(env, db, userId, tier);

  return c.json({ app }, 201);
}
```

### 3. Route-Level Integration

**Using Middleware:**

```typescript
import { trackUsage } from '../middleware/usageTracking';

// Apply to routes
app.post('/api/generate', trackUsage('ai_generation'), generateHandler);
app.post('/api/apps', trackUsage('app_creation'), createAppHandler);
app.post('/api/workflows/:id/execute', trackUsage('workflow_execution'), executeHandler);
```

### 4. BYOK Setup

**Setting User Keys:**

```typescript
import { BYOKHandler } from '../services/usage/BYOKHandler';

export async function setAPIKeys(c: Context) {
  const userId = c.get('userId');
  const db = c.get('db');
  const { openai, anthropic, google } = await c.req.json();

  await BYOKHandler.setUserAPIKeys(db, userId, {
    openai,
    anthropic,
    google
  });

  return c.json({ success: true });
}
```

**Checking BYOK Status:**

```typescript
const shouldUseBYOK = await BYOKHandler.shouldUseUserKeys(db, userId);

if (shouldUseBYOK) {
  const keys = await BYOKHandler.getUserAPIKeys(db, userId);
  // Use user keys
}
```

## Usage Flow Examples

### Successful AI Generation Flow

1. User initiates AI generation
2. `RateLimitIntegration.checkAIGenerationAllowed()` is called
3. Checks tier-based hourly limit
4. Checks monthly limit
5. Checks BYOK status
6. Returns `{ allowed: true, useBYOK: false }`
7. AI generation proceeds with platform keys
8. `RateLimitIntegration.trackAIGeneration()` is called
9. Quota is consumed from rate limiter
10. Monthly counter is incremented
11. `UsageWarningService` checks thresholds
12. `RealtimeUsageService` broadcasts update to user

### Rate Limit Exceeded Flow

1. User initiates AI generation
2. `RateLimitIntegration.checkAIGenerationAllowed()` is called
3. Hourly limit check fails
4. Returns `{ allowed: false, error: RateLimitExceededError }`
5. Error is sent to user via WebSocket
6. Frontend shows upgrade prompt with suggested tier

### BYOK Flow

1. User with BYOK subscription initiates AI generation
2. `RateLimitIntegration.checkAIGenerationAllowed()` is called
3. `BYOKHandler.shouldUseUserKeys()` returns true
4. Returns `{ allowed: true, useBYOK: true }`
5. User's API keys are retrieved
6. AI generation proceeds with user's keys
7. Usage is tracked for analytics only (no rate limiting)

### Usage Warning Flow

1. User reaches 70% of monthly limit
2. `UsageWarningService.checkAndWarnUser()` detects threshold
3. Checks if warning already sent
4. Sends `limit_warning` WebSocket message
5. Marks warning as sent in KV store
6. Frontend shows warning notification

### Monthly Limit Reset Flow

1. Billing cycle completes
2. Subscription service triggers reset
3. `TierRateLimiter.resetQuota()` clears AI quota
4. Workflow quota is reset
5. App creation count resets naturally (monthly query)
6. Warning flags expire after 30 days

## Configuration

### Tier Limits

Defined in `worker/services/rate-limit/config.ts`:

```typescript
export const TIER_RATE_LIMITS = {
  api: { free: 100/min, pro: 1000/min, ... },
  aiGeneration: { free: 10/hr, pro: 100/hr, ... },
  concurrent: { free: 1, pro: 3, ... }
};

export const MONTHLY_LIMITS = {
  aiGenerations: { free: 100, pro: 2000, ... },
  apps: { free: 5, pro: 50, ... },
  workflowExecutions: { free: 0, pro: 500, ... }
};
```

### Warning Thresholds

Defined in `UsageWarningService.ts`:

```typescript
const WARNING_THRESHOLDS = [70, 90, 100];
```

## Error Handling

All services fail open on errors to prevent blocking users:

```typescript
try {
  // Operation
} catch (error) {
  logger.error('Failed', { error });
  return { allowed: true }; // Fail open
}
```

Exception: Tier restrictions (e.g., free tier can't execute workflows) are always enforced.

## Testing

### Manual Testing

1. Create test users with different tiers
2. Use API to consume quota
3. Verify limits are enforced
4. Check WebSocket messages are sent
5. Verify usage analytics are accurate

### Key Test Cases

- [ ] Free tier user hits hourly AI limit
- [ ] Pro tier user hits monthly app limit
- [ ] BYOK user bypasses rate limits
- [ ] Warning sent at 70% usage
- [ ] Limit exceeded error at 100%
- [ ] Usage analytics show correct data
- [ ] Quota resets correctly

## Monitoring

Key metrics to monitor:

- Rate limit rejections by tier
- Usage percentages by tier
- BYOK adoption rate
- Warning message delivery rate
- API errors in usage services

## Future Enhancements

1. SMS/Email notifications for warnings
2. Usage prediction with ML
3. Automatic tier suggestions based on usage patterns
4. Custom limits for enterprise customers
5. Usage-based billing calculations
6. Team/organization-level quotas
7. Scheduled quota resets aligned with billing cycles
8. Usage export for accounting

## Files Created

### Services
- `worker/services/rate-limit/TierRateLimiter.ts`
- `worker/services/usage/MonthlyUsageEnforcer.ts`
- `worker/services/usage/UsageTracker.ts`
- `worker/services/usage/RealtimeUsageService.ts`
- `worker/services/usage/UsageWarningService.ts`
- `worker/services/usage/BYOKHandler.ts`
- `worker/services/usage/RateLimitIntegration.ts`
- `worker/services/usage/IntegrationExamples.ts`

### Middleware
- `worker/middleware/usageTracking.ts`

### Controllers
- `worker/api/controllers/analytics/usage.ts`

### Configuration
- Updated `worker/services/rate-limit/config.ts`
- Updated `worker/api/websocketTypes.ts`

## Support

For issues or questions:
1. Check integration examples in `IntegrationExamples.ts`
2. Review error logs in CloudFlare dashboard
3. Verify environment variables are set
4. Check Durable Object status
