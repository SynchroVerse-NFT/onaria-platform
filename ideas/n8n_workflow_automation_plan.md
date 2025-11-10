# Workflow Automation Integration Plan: n8n + VibeSDK

## Executive Summary

**Vision:** "Build an app, and wire it to real-world workflows—no devs, no servers."

This document outlines a comprehensive plan to integrate n8n workflow automation into the onaria-platform, creating a **differentiating feature** where every app published on OnAria can run automated workflows.

---

## Market Differentiator

### The Promise (One-Liner)
"Every app you build comes with superpowers—real workflows that connect to Gmail, Slack, Stripe, and 100+ services."

### Why This Beats "Just an AI Page"
1. **Outcomes, not demos** - Users get working funnels, automations, and revenue moments
2. **One roof** - Build, host, automate under the same URL
3. **Fast time-to-value** - Templates mean idea → live app → running automations in minutes
4. **Network effects** - More apps = more workflow templates = more value

---

## What Customers Get

### Core Features
1. **One-click publishing** to `{appname}.onaria.xyz`
2. **Workflows tab** where they pick from templates or build custom:
   - "When someone signs up → add to Google Sheet + send welcome email"
   - "When a form is submitted → post to Discord + create Airtable row"
   - "When payment succeeds → provision access + email receipt"
   - "New Twitch command → generate clip + post to X"
3. **Live logs & retries** so non-technical users can trust it
4. **Connected accounts** - one-click OAuth for popular services

### Customer Experience Flow
```
User creates app with AI
    ↓
App deploys to {appname}.onaria.xyz
    ↓
User opens "Workflows" tab
    ↓
Browses template gallery ("Lead → Sheet + Email")
    ↓
Clicks "Enable" → connects Google Sheets + Gmail
    ↓
Workflow activates automatically
    ↓
App emits events → n8n executes workflow → user sees logs
```

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────┐
│  OnAria Platform (onaria.xyz)                       │
│  - App generation & deployment                      │
│  - User authentication                               │
│  - Workflow UI management                           │
└─────────────┬───────────────────────────────────────┘
              │
              ├──── Webhooks ───┐
              │                  │
              ▼                  ▼
┌──────────────────────┐  ┌──────────────────────┐
│  n8n Instance        │  │  User Apps           │
│  - Workflow engine   │  │  {app}.onaria.xyz    │
│  - Execution queue   │  │  - Emit events       │
│  - Credential store  │  │  - Receive responses │
└──────────────────────┘  └──────────────────────┘
         │
         ├─→ Google Sheets
         ├─→ Slack / Discord
         ├─→ Stripe
         ├─→ SendGrid / Gmail
         ├─→ Airtable / Notion
         └─→ 100+ other services
```

### Data Flow

**Event Emission:**
```
User action in app (signup, form submit, payment)
    ↓
App calls OnAria webhook endpoint
    ↓
OnAria validates & enriches event
    ↓
Triggers n8n workflow via webhook
    ↓
n8n executes steps (API calls, data transforms)
    ↓
Results logged in OnAria dashboard
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic webhook infrastructure + n8n integration

#### Backend Tasks
- [ ] Create database tables:
  - `webhooks` - User webhook configurations
  - `webhook_events` - Event delivery log
  - `oauth_tokens` - Third-party service credentials
  - `workflow_templates` - Pre-built workflow definitions
  - `workflow_executions` - Execution history

- [ ] Implement webhook system:
  - WebhookService (create, update, delete, list)
  - Webhook dispatcher (HTTP caller with retries)
  - HMAC signature generation/verification
  - Rate limiting per webhook endpoint

- [ ] Set up n8n infrastructure:
  - Deploy n8n instance (Docker/Cloudflare)
  - Configure PostgreSQL database
  - Set up Redis for queue mode
  - Create initial webhook workflows

#### Database Schema
```typescript
// New tables needed
webhooks: {
  id, userId, workflowId, eventType,
  webhookUrl, secret (encrypted), isActive,
  createdAt, updatedAt
}

webhook_events: {
  id, webhookId, eventType, payload (JSON),
  status, attempts, nextRetry, response,
  createdAt, deliveredAt
}

oauth_tokens: {
  id, userId, provider, accessToken (encrypted),
  refreshToken (encrypted), expiresAt, scope,
  isActive, lastUsed, createdAt
}

workflow_templates: {
  id, name, description, category,
  icon, requiredServices (JSON),
  n8nWorkflowId, configuration (JSON),
  isActive, createdAt
}

workflow_executions: {
  id, userId, workflowTemplateId,
  triggeredBy, status, duration,
  logs (JSON), error, createdAt
}
```

**Deliverable:** Backend can receive events and call n8n webhooks

---

### Phase 2: Connected Accounts (Week 2-3)

**Goal:** Users can connect OAuth services

#### Frontend Tasks
- [ ] Create "Connected Accounts" modal (reuse BYOK pattern)
  - Tab 1: Connect new service
  - Tab 2: Manage connected services
  - Provider cards with logos (Google, Slack, GitHub, etc.)
  - OAuth flow handling

- [ ] Settings page integration
  - New "Workflows" section
  - Connected services list
  - Toggle active/inactive
  - Delete with confirmation

#### Backend Tasks
- [ ] Implement OAuth flows:
  - Google (Sheets, Gmail, Drive)
  - GitHub (webhooks, commits)
  - Slack (messages, channels)
  - Stripe (payments)
  - Discord (messages, webhooks)
  - Airtable/Notion (database)

- [ ] Token management:
  - Store encrypted OAuth tokens
  - Auto-refresh before expiration
  - Revoke tokens on disconnect
  - Audit logging

**Deliverable:** Users can connect accounts and see connection status

---

### Phase 3: Workflow Templates (Week 3-4)

**Goal:** Pre-built workflow templates users can enable

#### Template Gallery

**Starter Templates (5 initial):**

1. **Lead → Sheet + Email**
   - Trigger: User signup event
   - Actions: Add row to Google Sheet, send welcome email via Gmail
   - Required: Google Sheets + Gmail

2. **Stripe Purchase → Welcome + License**
   - Trigger: Payment succeeded webhook
   - Actions: Send receipt email, create license in database
   - Required: Stripe + SendGrid

3. **Discord AI Generator**
   - Trigger: Discord slash command
   - Actions: Generate content with AI, post to Discord
   - Required: Discord + OpenAI

4. **Airtable Intake**
   - Trigger: Form submission
   - Actions: Create Airtable record, send Slack notification
   - Required: Airtable + Slack

5. **Slack Alerts**
   - Trigger: Error event
   - Actions: Format error message, post to Slack channel
   - Required: Slack

#### Frontend Tasks
- [ ] Workflow templates gallery page
  - Grid layout with template cards
  - Filter by category, required services
  - Preview modal with description
  - "Enable" button with setup flow

- [ ] Template configuration modal
  - Show required connections
  - Configure parameters (which sheet, which channel)
  - Test workflow button
  - Enable/activate toggle

#### Backend Tasks
- [ ] Create n8n workflow templates
  - Build each template in n8n
  - Export workflow JSON
  - Store in database

- [ ] Template provisioning system
  - Clone template workflow for user
  - Substitute user's OAuth credentials
  - Activate workflow
  - Register webhook with n8n

**Deliverable:** Users can browse and enable pre-built workflows

---

### Phase 4: Event Emission (Week 4-5)

**Goal:** Generated apps emit events that trigger workflows

#### Standard Events

Every generated app includes:
```typescript
// App lifecycle events
- app.deployed
- app.updated
- app.deleted

// User events
- user.signup
- user.login
- user.profile_updated

// Form events
- form.submitted
- form.validation_error

// Payment events
- payment.initiated
- payment.succeeded
- payment.failed

// Content events
- content.created
- content.updated
- content.deleted

// Error events
- error.occurred
- error.critical
```

#### Implementation Tasks

- [ ] Add event emitter to app templates
  - Include event-emitter library in generated code
  - Emit events at key points (signup, form submit, etc.)
  - Send to OnAria webhook endpoint

- [ ] Update code generation prompts
  - Include event emission in all templates
  - Add webhook configuration to generated apps
  - Document events in generated README

- [ ] Event receiver endpoint
  - POST /api/webhooks/events/:appId
  - Validate signature
  - Enrich with user context
  - Forward to n8n workflows

**Deliverable:** Apps emit events that trigger workflows automatically

---

### Phase 5: Execution Monitoring (Week 5-6)

**Goal:** Users see workflow runs and logs

#### Frontend Tasks

- [ ] Workflow runs page
  - Table view with runs history
  - Columns: Run ID, Workflow, Status, Duration, Started
  - Status badges (success/failed/running)
  - Filter by status, date range
  - Pagination/infinite scroll

- [ ] Run details modal
  - Show execution logs
  - Step-by-step progress
  - Input/output data per step
  - Error details if failed
  - Retry button

- [ ] Real-time updates
  - WebSocket connection for live status
  - Toast notifications on completion
  - Progress indicators

#### Backend Tasks

- [ ] Execution logging system
  - Store execution results
  - Query n8n API for execution details
  - Real-time status updates via WebSocket

- [ ] Retry mechanism
  - Manual retry from UI
  - Exponential backoff for failed deliveries
  - Dead letter queue for permanent failures

**Deliverable:** Users can see workflow execution history and logs

---

### Phase 6: Custom Workflows (Week 6-8)

**Goal:** Advanced users can build custom workflows

#### Options

**Option A: Pre-built only (Simpler)**
- Users can only enable templates
- Configuration limited to parameters
- Lower complexity, faster to ship

**Option B: n8n Embed (Advanced - $50k/year license)**
- Embed n8n UI into OnAria
- Users build custom workflows
- Full workflow editor
- Higher complexity, more powerful

**Recommended:** Start with Option A, add Option B later

#### If pursuing Option B

- [ ] Integrate n8n Embed
  - White-label n8n UI
  - Inject into OnAria dashboard
  - Handle authentication
  - Credential injection

- [ ] Custom workflow builder
  - Drag-and-drop node editor
  - Visual workflow canvas
  - Live testing
  - Version control

**Deliverable:** Users can build custom workflows (if Option B chosen)

---

## Technical Implementation Details

### 1. Webhook Signing & Security

```typescript
// Generate webhook signature
async function signWebhook(
  payload: object,
  secret: string,
  timestamp: number
): Promise<string> {
  const data = JSON.stringify(payload) + timestamp;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify webhook signature
async function verifyWebhook(
  payload: object,
  signature: string,
  secret: string,
  timestamp: number
): Promise<boolean> {
  const expectedSignature = await signWebhook(payload, secret, timestamp);
  return timingSafeEqual(signature, expectedSignature);
}
```

### 2. Event Emission in Generated Apps

```typescript
// Add to all generated app templates
class WorkflowEventEmitter {
  private webhookUrl: string;
  private appId: string;
  private secret: string;

  constructor(config: { webhookUrl: string; appId: string; secret: string }) {
    this.webhookUrl = config.webhookUrl;
    this.appId = config.appId;
    this.secret = config.secret;
  }

  async emit(eventType: string, data: any): Promise<void> {
    const timestamp = Date.now();
    const payload = {
      appId: this.appId,
      eventType,
      data,
      timestamp
    };

    const signature = await signWebhook(payload, this.secret, timestamp);

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString()
      },
      body: JSON.stringify(payload)
    });
  }
}

// Usage in generated app
const events = new WorkflowEventEmitter({
  webhookUrl: 'https://onaria.xyz/api/webhooks/events/app-123',
  appId: 'app-123',
  secret: process.env.WEBHOOK_SECRET
});

// Emit events
await events.emit('user.signup', { userId, email });
await events.emit('form.submitted', { formId, data });
```

### 3. n8n Workflow Template Structure

```json
{
  "name": "Lead to Sheet + Email",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "user-signup",
        "authentication": "headerAuth"
      }
    },
    {
      "name": "Add to Google Sheet",
      "type": "n8n-nodes-base.googleSheets",
      "position": [450, 250],
      "parameters": {
        "operation": "append",
        "sheetId": "={{$node.credentials.sheetId}}",
        "range": "Sheet1!A:C",
        "values": "={{[$json.email, $json.name, $json.timestamp]}}"
      },
      "credentials": {
        "googleSheetsOAuth2Api": "{{userId}}_google"
      }
    },
    {
      "name": "Send Welcome Email",
      "type": "n8n-nodes-base.gmail",
      "position": [450, 350],
      "parameters": {
        "operation": "send",
        "to": "={{$json.email}}",
        "subject": "Welcome!",
        "message": "Thank you for signing up!"
      },
      "credentials": {
        "gmailOAuth2": "{{userId}}_gmail"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Add to Google Sheet"}, {"node": "Send Welcome Email"}]]
    }
  }
}
```

### 4. Credential Injection for n8n

```typescript
// Store user credentials in n8n
async function provisionUserWorkflow(
  userId: string,
  templateId: string,
  config: WorkflowConfig
): Promise<string> {
  // 1. Get user's OAuth tokens
  const tokens = await getOAuthTokens(userId, ['google', 'slack']);

  // 2. Create credentials in n8n
  for (const [provider, token] of Object.entries(tokens)) {
    await createN8nCredential({
      name: `${userId}_${provider}`,
      type: providerTypeMap[provider],
      data: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken
      }
    });
  }

  // 3. Clone template workflow
  const template = await getWorkflowTemplate(templateId);
  const workflow = JSON.parse(template.n8nWorkflowJson);

  // 4. Substitute credential references
  workflow.nodes = workflow.nodes.map(node => ({
    ...node,
    credentials: Object.fromEntries(
      Object.entries(node.credentials || {}).map(([key, value]) => [
        key,
        (value as string).replace('{{userId}}', userId)
      ])
    )
  }));

  // 5. Create workflow in n8n
  const n8nWorkflowId = await createN8nWorkflow(workflow);

  // 6. Activate workflow
  await activateN8nWorkflow(n8nWorkflowId);

  return n8nWorkflowId;
}
```

---

## Pricing Strategy

### Starter Tier
- **$0/month** (Free)
- Publish apps
- 200 workflow executions/month
- 5 connected services
- Pre-built templates only

### Pro Tier
- **$20/month**
- 5,000 workflow executions/month
- 20 connected services
- Pre-built templates
- Scheduled workflows
- Priority queue

### Business Tier
- **$99/month**
- 50,000 workflow executions/month
- Unlimited connected services
- All templates
- Custom workflows (if n8n Embed)
- Dedicated runner
- SSO support

### Add-ons
- **Extra Executions:** $5 per 1,000 executions
- **Premium Templates:** $10-50 one-time per template pack
- **Custom Integration:** $500 setup fee

---

## Marketing Copy

### Landing Page Section

**Headline:** Automations that ship with your app

**Subhead:** Turn signups, forms, and payments into *actions*—emails, CRM updates, Discord posts, Stripe receipts—without touching code.

**Bullets:**
- Plug-and-play templates
- Your accounts, your data
- Live logs and retries
- Scales with your plan

**CTA:** "Enable Workflows"

### Use Cases

**Lead Magnet:**
"New signup → add to Google Sheet → send welcome email → DM my Discord with the lead."

**Paid Mini-Course:**
"Stripe checkout → unlock content in app → email receipt → add to Notion CRM."

**Twitch Creator Kit:**
"!poster → generate poster with AI → upload to R2 → post link to Discord + X."

**Support Triage:**
"Feedback form → Summarize with AI → tag sentiment → create Airtable ticket."

---

## Success Metrics

### Phase 1 Success
- [ ] 10 test workflows executing successfully
- [ ] Webhook delivery rate > 99%
- [ ] Average webhook response time < 500ms

### Phase 2 Success
- [ ] 50 users connect at least 1 service
- [ ] OAuth flow completion rate > 80%
- [ ] Zero credential leaks or security issues

### Phase 3 Success
- [ ] 5 template workflows available
- [ ] 100 workflow activations
- [ ] User NPS > 40 for workflow feature

### Phase 4 Success
- [ ] 500+ events emitted daily
- [ ] Event delivery success rate > 95%
- [ ] Average event-to-execution latency < 2s

### Phase 5 Success
- [ ] Users view execution logs 2x/week average
- [ ] Retry success rate > 70%
- [ ] User understanding of workflow status > 90%

### Long-term Success
- [ ] 1,000+ active workflows
- [ ] 10,000+ executions/day
- [ ] 30% of users activate workflows
- [ ] Workflow feature drives 20%+ upgrades to Pro

---

## Risk Mitigation

### Technical Risks

**Risk: n8n instance downtime**
- Mitigation: Use queue mode with multiple workers, health checks, automatic restarts

**Risk: OAuth token expiration**
- Mitigation: Auto-refresh tokens 5 minutes before expiration, graceful degradation

**Risk: Webhook delivery failures**
- Mitigation: Exponential backoff retry (5 attempts), dead letter queue, monitoring

**Risk: Rate limiting from third-party APIs**
- Mitigation: Queue-based execution, respect rate limits, notify users

### Security Risks

**Risk: Credential leakage**
- Mitigation: XChaCha20-Poly1305 encryption, audit logging, least-privilege access

**Risk: Webhook signature bypass**
- Mitigation: HMAC-SHA256 signatures, timestamp validation, replay protection

**Risk: User workflow attacking others**
- Mitigation: Per-user credential isolation, rate limiting, execution sandboxing

### Business Risks

**Risk: Low adoption**
- Mitigation: Start with killer templates, great UX, user education, success stories

**Risk: Support burden**
- Mitigation: Self-service debugging (logs), comprehensive docs, template marketplace

**Risk: Infrastructure costs**
- Mitigation: Usage-based pricing, execution limits per tier, optimize n8n workers

---

## Next Steps

### This Week
1. **Decision:** Approve plan and allocate resources
2. **Setup:** Deploy n8n instance (staging environment)
3. **Database:** Create migrations for new tables
4. **Design:** Create mockups for Workflows UI

### Week 1-2
1. Implement webhook infrastructure (backend)
2. Deploy n8n with PostgreSQL + Redis
3. Create first test workflow in n8n
4. Test end-to-end event delivery

### Week 3-4
1. Build Connected Accounts UI (frontend)
2. Implement OAuth flows (Google, Slack)
3. Create 2 workflow templates
4. Internal testing with team

### Week 5-8
1. Build remaining templates
2. Implement execution monitoring
3. Beta test with 10 users
4. Iterate based on feedback
5. Launch publicly

---

## Appendix: Template Specifications

### Template 1: Lead → Sheet + Email

**Name:** Lead Capture to Google Sheets + Welcome Email

**Description:** Automatically add new signups to a Google Sheet and send a welcome email.

**Required Services:**
- Google Sheets (write access)
- Gmail (send email)

**Configuration Parameters:**
- Google Sheet ID (user provides)
- Sheet name (default: "Leads")
- Welcome email template (customizable)

**Event Trigger:** `user.signup`

**Workflow Steps:**
1. Receive webhook with user data (email, name, timestamp)
2. Add row to Google Sheet with user info
3. Send welcome email via Gmail
4. Log execution result

**Success Criteria:**
- Sheet row added within 5 seconds
- Email sent within 10 seconds
- 99% success rate

---

### Template 2: Stripe Purchase → Welcome + License

**Name:** Stripe Payment to License Provisioning

**Description:** When a payment succeeds, send receipt and provision access.

**Required Services:**
- Stripe (read payments)
- SendGrid (send email)
- Database (store license - optional)

**Configuration Parameters:**
- SendGrid template ID
- License duration (days)

**Event Trigger:** `payment.succeeded`

**Workflow Steps:**
1. Receive Stripe webhook
2. Generate license key
3. Send receipt email with license
4. Log transaction

**Success Criteria:**
- License generated within 2 seconds
- Email delivered within 10 seconds
- 99.9% success rate

---

### Template 3: Discord AI Generator

**Name:** Discord Command to AI Content Generator

**Description:** Respond to Discord slash commands by generating AI content.

**Required Services:**
- Discord (webhooks)
- OpenAI or Google AI

**Configuration Parameters:**
- Discord channel ID
- AI prompt template

**Event Trigger:** `discord.command`

**Workflow Steps:**
1. Receive Discord slash command
2. Call AI API with prompt
3. Format response
4. Post to Discord channel

**Success Criteria:**
- Response time < 5 seconds
- AI output quality high
- Discord rate limits respected

---

**Document Version:** 1.0
**Last Updated:** November 10, 2025
**Author:** AI Implementation Planner
**Status:** Draft - Awaiting Approval
