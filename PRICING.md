# Pricing & Cost Guide

A comprehensive guide to understanding costs, pricing models, and monetization strategies for your vibesdk platform.

---

## Table of Contents

- [Current Pricing Model](#current-pricing-model)
- [AI Provider Costs](#ai-provider-costs)
- [Cost Breakdown by App Type](#cost-breakdown-by-app-type)
- [Infrastructure Costs](#infrastructure-costs)
- [Who Pays What](#who-pays-what)
- [Monetization Strategies](#monetization-strategies)
- [Rate Limits Configuration](#rate-limits-configuration)
- [Cost Scenarios](#cost-scenarios)
- [Cost Optimization](#cost-optimization)
- [Recommendations](#recommendations)

---

## Current Pricing Model

### Free Tier (Default Configuration)

The platform currently operates on a **rate-limited free tier** with NO billing system.

**Default User Limits:**

| Resource | Limit | Period |
|----------|-------|--------|
| App Creation | 10 apps | Every 4 hours |
| Daily App Limit | 10 apps | 24 hours |
| AI Calls | 800 calls | Per hour |
| Daily AI Calls | 2,000 calls | 24 hours |

**AI Call Credits by Model:**
- Gemini Flash Lite (free tier): 0 credits per call
- Gemini Flash (standard): 1 credit per call
- Gemini Pro (premium): 4 credits per call

**Note:** There is NO payment gateway, subscription system, or billing integration built-in.

---

## AI Provider Costs

### Google Gemini (Default Provider)

**2025 Current Pricing:**

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| Gemini 2.0 Flash | $0.10 | $0.40 | Fastest, cheapest |
| Gemini 2.5 Flash | $0.30 | $2.50 | Balanced performance |
| Gemini 2.5 Pro | $1.25 | $10.00 | Complex reasoning |

**Free Tier:** Available for all models with rate limits

**Batch API:** 50% discount for async requests

---

### OpenAI

**2025 Current Pricing:**

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| GPT-4o mini | $0.15 | $0.60 |
| GPT-4o | $3.00 | $10.00 |

**Batch API:** 50% discount available

---

### Anthropic Claude

**2025 Current Pricing:**

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude Opus 4 | $15.00 | $75.00 |

**Note:** Pricing varies for prompts > 200K tokens

---

## Cost Breakdown by App Type

All costs calculated using **Gemini 2.5 Flash** (default configuration).

### Simple App: Todo List / Calculator

**Token Usage:**
- Input: ~30k tokens (template + instructions)
- Output: ~20k tokens (generated code)

**Cost:**
```
Input:  30k ÷ 1M × $0.30 = $0.009
Output: 20k ÷ 1M × $2.50 = $0.050
TOTAL: $0.06 per app
```

**Files Generated:** 5-10 files
- Components (3-5 files)
- Hooks (1-2 files)
- Utils & types
- Styling configuration

---

### Medium App: Dashboard with Charts

**Token Usage:**
- Input: ~80k tokens (complex template + requirements)
- Output: ~60k tokens (extensive code)

**Cost:**
```
Input:  80k ÷ 1M × $0.30 = $0.024
Output: 60k ÷ 1M × $2.50 = $0.150
TOTAL: $0.17 per app
```

**Files Generated:** 20-30 files
- Multiple pages (5+ files)
- Components (15+ files)
- API routes (backend)
- Data visualization
- Custom hooks & services

---

### Complex App: Social Network / Multi-page

**Token Usage:**
- Input: ~150k tokens (detailed specifications)
- Output: ~120k tokens (large codebase)

**Cost:**
```
Input:  150k ÷ 1M × $0.30 = $0.045
Output: 120k ÷ 1M × $2.50 = $0.300
TOTAL: $0.35 per app
```

**Files Generated:** 50+ files
- Multiple pages (10+ files)
- Extensive components (30+ files)
- Full backend system
- Authentication system
- Durable Objects
- API endpoints (15+ routes)
- WebSocket integration

---

### AI-Powered App: ChatGPT Clone

**Initial Generation Cost:**
```
Input:  100k tokens ÷ 1M × $0.30 = $0.030
Output: 80k tokens ÷ 1M × $2.50 = $0.200
TOTAL: $0.23 to create the app
```

**ONGOING COSTS (Critical):**

Once deployed, every chat interaction costs money:

```
Single conversation:
- User input: ~20 tokens
- AI response: ~150 tokens
- Cost per message: ~$0.0015 (using GPT-4o mini)

100 users × 10 messages/day = 1,000 messages
1,000 messages × $0.0015 = $1.50/day
Monthly: $45/month

1,000 users × 100 messages/day = 100,000 messages
Monthly: $4,500/month in AI costs
```

**WARNING:** AI-powered apps create ONGOING costs. Always require BYOK (Bring Your Own Key) for these apps.

---

## Infrastructure Costs

### Cloudflare Services

**Workers Paid Plan: $5/month**
- 10M requests included
- Durable Objects included
- Additional: $0.50 per 1M requests

**Containers (Sandboxes):**
- Standard-3 instance type
- Currently: 10 max instances
- Pay-as-you-go based on usage
- Estimated: $10-100/month depending on usage

**D1 Database:**
- Free tier: 5M rows read, 100k writes/day
- Paid: $0.001 per 1M reads
- Typical usage: $0-20/month

**R2 Storage:**
- Free tier: 10GB storage, 1M reads/month
- Templates storage
- Typical usage: $0-5/month

**Total Infrastructure Estimate:**
- Light usage (10-50 users): $10-30/month
- Medium usage (100-500 users): $50-200/month
- Heavy usage (1000+ users): $200-500/month

---

## Who Pays What

### Two Payment Models

#### 1. Platform Provider Pays (Default)

**YOU pay for:**
- All AI API calls (Google, OpenAI, Anthropic)
- Cloudflare infrastructure
- Database storage
- Container instances

**User pays:**
- Nothing (free platform)

**Your Costs:**
```
100 users creating 5 apps/month = 500 apps
500 apps × $0.10 average = $50/month AI costs
Infrastructure: $50/month
TOTAL: $100/month
```

---

#### 2. BYOK (Bring Your Own Key)

**Users add their own API keys via Settings → API Keys**

**Platform uses THEIR keys instead of yours**

**BYOK Users Get:**
- Unlimited AI calls (no rate limits)
- They pay their own API provider
- Better privacy (their keys, their data)

**You pay:**
- Only infrastructure costs
- Zero AI costs for BYOK users

**Configuration:**
```typescript
// worker/services/rate-limit/config.ts
llmCalls: {
    enabled: true,
    excludeBYOKUsers: true, // BYOK users bypass rate limits
    ...
}
```

---

## Monetization Strategies

Since there's NO billing system built-in, you need to choose a strategy:

### Strategy 1: Freemium with Rate Limits (Current State)

**Free Tier:**
- 10 apps/day
- 2,000 AI calls/day
- Encourage BYOK when limits hit

**Revenue:** $0/month

**Costs:** You pay all AI + infrastructure

**Best For:** Testing, building audience, MVP

---

### Strategy 2: BYOK Required (Recommended)

**All users must provide their own API keys**

**You charge for platform access only:**
- $10-20/month subscription fee
- $5/month for hobbyists
- $50/month for businesses

**Revenue (100 users at $15/month):** $1,500/month

**Costs:** Only infrastructure ($50-100/month)

**Profit:** $1,400/month

**Best For:** Sustainable business without AI cost risk

---

### Strategy 3: Tiered Subscriptions (Requires Development)

**You need to build:**
- Stripe integration
- Subscription management
- Add `subscription_tier` to database

**Pricing Example:**
```
Free:     $0/month
  - 5 apps/day
  - Must use BYOK
  - Community support

Starter:  $15/month
  - 20 apps/day
  - Platform API keys included
  - Email support

Pro:      $49/month
  - 100 apps/day
  - Priority AI models
  - Priority support
  - Custom branding

Business: $199/month
  - Unlimited apps
  - Dedicated support
  - White-label options
  - SLA guarantee
```

**Revenue (100 users, 60% paid at avg $30/month):** $1,800/month

**Costs:** AI ($300) + Infrastructure ($100) = $400/month

**Profit:** $1,400/month

---

### Strategy 4: Pay-Per-Use Credits (Requires Development)

**Users buy credits:**
```
$10 = 100 credits
$25 = 300 credits (20% bonus)
$100 = 1,500 credits (50% bonus)
```

**Credit Usage:**
```
Simple app: 5 credits
Medium app: 15 credits
Complex app: 30 credits
AI-powered app: 50 credits + BYOK required
```

**Revenue (100 users, avg $20/month):** $2,000/month

**Costs:** $400/month

**Profit:** $1,600/month

**Pros:** Users only pay for what they use

**Cons:** Complex to implement and manage

---

### Strategy 5: Enterprise/White-Label

**High-touch B2B sales:**
- Custom deployments for companies
- Dedicated instances
- Full white-labeling
- Custom AI models
- SLA guarantees

**Pricing:**
```
Small business: $500/month (10 seats)
Mid-market:    $2,000/month (50 seats)
Enterprise:    $5,000+/month (unlimited)
```

**Best For:** Established platforms with sales team

---

## Rate Limits Configuration

### Current Configuration

File: `worker/services/rate-limit/config.ts`

```typescript
export const DEFAULT_RATE_LIMIT_SETTINGS: RateLimitSettings = {
    appCreation: {
        enabled: true,
        store: RateLimitStore.DURABLE_OBJECT,
        limit: 10,              // Apps per period
        dailyLimit: 10,         // Daily cap
        period: 4 * 60 * 60,   // 4 hours
    },
    llmCalls: {
        enabled: true,
        store: RateLimitStore.DURABLE_OBJECT,
        limit: 800,             // Hourly AI calls
        period: 60 * 60,        // 1 hour
        dailyLimit: 2000,       // Daily AI calls
        excludeBYOKUsers: true, // BYOK users unlimited
    },
};
```

### How to Adjust Limits

**1. Edit the configuration:**

```typescript
// Increase app creation limit
appCreation: {
    limit: 20,        // Changed from 10
    dailyLimit: 50,   // Changed from 10
    period: 4 * 60 * 60,
}

// Decrease AI call limits
llmCalls: {
    limit: 500,       // Changed from 800
    dailyLimit: 1500, // Changed from 2000
    period: 60 * 60,
}
```

**2. Redeploy:**

```bash
bun run build
bunx wrangler deploy
```

**3. Changes take effect immediately**

### Recommended Limits by Tier

**Free Tier:**
```typescript
appCreation: { limit: 5, dailyLimit: 10 }
llmCalls: { limit: 400, dailyLimit: 1000 }
```

**Paid Tier:**
```typescript
appCreation: { limit: 20, dailyLimit: 100 }
llmCalls: { limit: 2000, dailyLimit: 10000 }
```

**Business Tier:**
```typescript
appCreation: { limit: 100, dailyLimit: 500 }
llmCalls: { limit: 10000, dailyLimit: 50000 }
```

---

## Cost Scenarios

### Scenario 1: 100 Users, Simple Apps Only

**User Behavior:**
- 100 users
- 5 simple apps/month each
- No BYOK

**Costs:**
```
AI Costs:
500 apps × $0.06 = $30/month

Infrastructure:
Cloudflare Workers: $5/month
Containers: $15/month
D1 Database: $5/month
R2 Storage: $0/month
Total: $25/month

TOTAL COSTS: $55/month
```

**Revenue Options:**
- Free: $0/month (you lose $55/month)
- $10/month subscription × 40 paying users: $400/month profit
- BYOK required: $0 AI costs, $25/month infrastructure only

---

### Scenario 2: 500 Users, Mixed Complexity

**User Behavior:**
- 500 users
- 3 apps/month average
- 60% simple, 30% medium, 10% complex
- 20% use BYOK

**Costs:**
```
AI Costs:
400 non-BYOK users × 3 apps = 1,200 apps
- 720 simple × $0.06 = $43
- 360 medium × $0.17 = $61
- 120 complex × $0.35 = $42
Total AI: $146/month

Infrastructure:
Cloudflare: $50/month
Containers: $80/month
D1: $15/month
R2: $5/month
Total: $150/month

TOTAL COSTS: $296/month
```

**Revenue Options:**
- $15/month × 200 paid users: $3,000/month → $2,704 profit
- $10/month × 300 paid users: $3,000/month → $2,704 profit

---

### Scenario 3: Users Create AI-Powered Apps (DANGER)

**User Behavior:**
- 10 users create ChatGPT clones
- Each app gets 1,000 conversations/month
- NO BYOK required

**Costs:**
```
Initial Creation:
10 apps × $0.23 = $2.30

ONGOING USAGE:
10 apps × 1,000 conversations × $0.0015 = $15/day
Monthly: $450/month

If apps get popular (10,000 chats each):
10 apps × 10,000 chats × $0.0015 = $150/day
Monthly: $4,500/month in AI costs

TOTAL: $4,502-4,502/month
```

**CRITICAL:** This scenario is catastrophic without BYOK.

**Solution:**
```typescript
// Detect AI-powered app requests
if (userPrompt.includes('chatbot') ||
    userPrompt.includes('AI chat') ||
    userPrompt.includes('ChatGPT')) {
    return {
        requireBYOK: true,
        message: "This app requires AI. Please add your API key."
    };
}
```

---

### Scenario 4: Sustainable Business Model

**User Behavior:**
- 300 active users
- BYOK required for all users
- Platform charges $15/month

**Costs:**
```
AI Costs: $0 (users use their keys)

Infrastructure:
Cloudflare: $30/month
Containers: $50/month
D1: $10/month
R2: $5/month
Total: $95/month

TOTAL COSTS: $95/month
```

**Revenue:**
```
300 users × $15/month = $4,500/month
```

**Profit:** $4,405/month ($52,860/year)

---

## Cost Optimization

### 1. Switch to Cheaper AI Models

**Current default: Gemini 2.5 Flash**
- Input: $0.30/1M tokens
- Output: $2.50/1M tokens

**Switch to: Gemini 2.0 Flash**
- Input: $0.10/1M tokens (67% cheaper!)
- Output: $0.40/1M tokens (84% cheaper!)
- Still fast and good quality

**Impact:**
- Simple app: $0.06 → $0.02 (67% savings)
- Medium app: $0.17 → $0.06 (65% savings)
- Complex app: $0.35 → $0.11 (69% savings)

**How to change:**

Edit `worker/agents/inferutils/config.ts`:

```typescript
// Change default model
export const DEFAULT_MODEL = AIModels.GEMINI_2_0_FLASH;
```

---

### 2. Enable Prompt Caching

Google Gemini automatically caches repeated prompts (like templates).

**Savings:** 50-80% on repeated requests

**Already enabled by default** - no changes needed!

---

### 3. Use Batch API

For non-time-sensitive requests, use batch processing.

**Savings:** 50% discount on all providers

**Trade-off:** Slower response (minutes instead of seconds)

---

### 4. Enforce BYOK for AI-Powered Apps

**Automatically detect and require BYOK:**

```typescript
// In app creation flow
const isAIPowered = detectAIFeatures(userPrompt);

if (isAIPowered && !user.hasBYOKKey) {
    throw new Error(
        "AI-powered apps require your own API key. " +
        "Add your key in Settings → API Keys"
    );
}
```

---

### 5. Implement Usage Analytics

**Track costs per user:**

```typescript
interface UserUsageMetrics {
    userId: string;
    appsCreated: number;
    tokensUsed: number;
    estimatedCost: number;
    period: string;
}
```

**Alert when users exceed thresholds**

**Encourage BYOK for heavy users**

---

### 6. Optimize Rate Limits

**Balance user experience vs costs:**

```typescript
// Conservative (lower costs)
appCreation: { limit: 5, dailyLimit: 10 }

// Generous (better UX, higher costs)
appCreation: { limit: 20, dailyLimit: 50 }
```

**Monitor and adjust based on actual usage**

---

## Recommendations

### Phase 1: Launch (Month 1-3)

**Goal:** Validate product, gather users, minimize costs

**Strategy:**
- Keep current free tier with rate limits
- Encourage BYOK for power users
- Monitor costs closely
- Gather feedback

**Expected Costs:** $50-200/month

**Revenue:** $0

**Focus:** Product-market fit, not revenue

---

### Phase 2: Monetize (Month 4-6)

**Goal:** Generate revenue, cover costs

**Recommended Strategy:**
```
Tier 1 - Free:
  - 5 apps/day
  - Must use BYOK for AI-powered apps
  - Community support
  - $0/month

Tier 2 - Pro:
  - 20 apps/day
  - Platform API keys included
  - Email support
  - $15/month

Tier 3 - Business:
  - 100 apps/day
  - Priority models
  - Priority support
  - $49/month
```

**Expected Revenue (100 users, 40% paid):**
- 40 paid users × $25 average = $1,000/month

**Expected Costs:** $200/month

**Profit:** $800/month

---

### Phase 3: Scale (Month 6+)

**Goal:** Sustainable growth, profitability

**Strategy:**
- Optimize AI costs (use Gemini 2.0 Flash)
- Implement usage-based pricing
- Add enterprise tier
- Build sales funnel

**Target Metrics:**
- 500 paying users
- $20,000/month revenue
- $2,000/month costs
- $18,000/month profit

---

### Critical Rules

1. **ALWAYS require BYOK for AI-powered apps**
   - ChatGPT clones
   - Image generators
   - AI assistants
   - Anything with ongoing AI costs

2. **Monitor costs daily**
   - Set up alerts for spending spikes
   - Track cost per user
   - Identify expensive users

3. **Default to cheaper models**
   - Gemini 2.0 Flash for most operations
   - Reserve Pro models for complex tasks

4. **Implement rate limits**
   - Protect against abuse
   - Prevent runaway costs
   - Encourage BYOK adoption

5. **Start with BYOK-only if unsure**
   - Zero AI cost risk
   - Sustainable from day 1
   - Can add paid tiers later

---

## Quick Reference

### Cost per App by Type (Gemini 2.5 Flash)

| App Type | Token Usage | Cost |
|----------|-------------|------|
| Simple (Todo, Calculator) | 50k tokens | $0.06 |
| Medium (Dashboard, CRUD) | 140k tokens | $0.17 |
| Complex (Social Network) | 270k tokens | $0.35 |
| AI-Powered (ChatGPT) | 180k + ongoing | $0.23 + $100s/month |

### Cost per App by Type (Gemini 2.0 Flash - Recommended)

| App Type | Token Usage | Cost |
|----------|-------------|------|
| Simple | 50k tokens | $0.02 |
| Medium | 140k tokens | $0.06 |
| Complex | 270k tokens | $0.11 |
| AI-Powered | 180k + ongoing | $0.07 + $100s/month |

### Monthly Cost Estimates

| Users | Apps/Month | AI Cost (2.5 Flash) | AI Cost (2.0 Flash) | Infrastructure |
|-------|------------|---------------------|---------------------|----------------|
| 50 | 250 | $25 | $8 | $20 |
| 100 | 500 | $50 | $17 | $30 |
| 500 | 1,500 | $150 | $50 | $100 |
| 1,000 | 3,000 | $300 | $100 | $200 |

**All estimates assume:**
- Mix of simple (60%), medium (30%), complex (10%) apps
- No AI-powered apps (require BYOK)
- Average 3 apps per user per month

---

## Support

For questions about pricing or cost optimization:
- Review `worker/services/rate-limit/config.ts` for current limits
- Review `worker/agents/inferutils/config.ts` for AI model configuration
- Review `CLAUDE.md` for architecture details

**Remember:** The most sustainable model is BYOK + platform subscription fee. This eliminates AI cost risk while providing value to users.
