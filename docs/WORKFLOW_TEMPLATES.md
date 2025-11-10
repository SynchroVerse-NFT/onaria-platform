# Workflow Templates Documentation

This document provides detailed information about the pre-built n8n workflow templates available in the Onaria Platform.

## Table of Contents

- [Overview](#overview)
- [Template Catalog](#template-catalog)
- [Configuration Guide](#configuration-guide)
- [Event Types](#event-types)
- [Service Integrations](#service-integrations)
- [Customization](#customization)
- [Best Practices](#best-practices)

## Overview

Workflow templates provide ready-to-use automation patterns for common tasks. Each template includes:

- Pre-configured nodes and connections
- Event triggers (webhooks)
- Service integrations (OAuth credentials)
- Customizable parameters
- Error handling and retry logic

### Template Architecture

```
┌─────────────┐
│   Platform  │ (App event occurs)
└──────┬──────┘
       │ HTTP POST
       ▼
┌─────────────┐
│  n8n Webhook│ (Receives event data)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Process    │ (Transform data, apply logic)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Actions    │ (Send emails, update sheets, post messages)
└─────────────┘
```

## Template Catalog

### 1. Lead Capture to Sheets & Email

**Category:** Automation
**Event Trigger:** `app.created`
**Required Services:** Gmail, Google Sheets

#### Purpose
Automatically track new app creators by logging their information to Google Sheets and sending a personalized welcome email.

#### Use Cases
- Lead generation tracking
- User onboarding automation
- Marketing funnel management
- Customer relationship management

#### Configuration

**Google Sheets:**
- `SHEET_ID`: Your Google Sheets document ID
- `GOOGLE_SHEETS_CREDENTIAL_ID`: OAuth2 credential for Google Sheets API

**Gmail:**
- `GMAIL_CREDENTIAL_ID`: OAuth2 credential for Gmail API

**Webhook:**
- `WEBHOOK_ID`: Auto-generated webhook identifier

#### Data Flow

```json
{
  "userEmail": "user@example.com",
  "appName": "My Awesome App",
  "appId": "app_123",
  "deploymentUrl": "https://my-app.pages.dev",
  "status": "completed"
}
```

**Output:**
1. New row in Google Sheets with timestamp, email, app name, URL
2. Welcome email sent to user's email address

#### Customization Options
- Email template (HTML content)
- Sheet columns and formatting
- Email subject line
- Additional data fields

---

### 2. Payment Success to Discord

**Category:** Notification
**Event Trigger:** `payment.success`
**Required Services:** Discord (Webhook)

#### Purpose
Send real-time payment notifications to your Discord server, with special handling for high-value transactions.

#### Use Cases
- Payment monitoring
- Team notifications
- Revenue tracking
- Customer success alerts

#### Configuration

**Discord:**
- `DISCORD_WEBHOOK_URL`: Discord channel webhook URL

**Webhook:**
- `WEBHOOK_ID`: Auto-generated webhook identifier

#### Data Flow

```json
{
  "amount": 99.99,
  "currency": "USD",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "subscriptionTier": "Pro",
  "paymentId": "pi_123abc",
  "timestamp": "2025-01-10T12:00:00Z"
}
```

**Output:**
1. Discord embed message with payment details
2. Optional `@here` mention for payments >= $100

#### Customization Options
- High-value threshold (default: $100)
- Discord embed colors
- Notification channels
- Alert conditions

---

### 3. Error Alert to Slack

**Category:** Monitoring
**Event Trigger:** `app.error`
**Required Services:** Slack

#### Purpose
Monitor application errors in real-time and send detailed alerts to your Slack workspace. Includes alert throttling to prevent spam.

#### Use Cases
- Production error monitoring
- Bug tracking
- DevOps alerting
- Incident management

#### Configuration

**Slack:**
- `SLACK_CHANNEL_ID`: Target Slack channel ID
- `SLACK_ADMIN_USER_ID`: Admin user for critical alerts
- `SLACK_CREDENTIAL_ID`: OAuth2 credential for Slack API

**Webhook:**
- `WEBHOOK_ID`: Auto-generated webhook identifier

#### Data Flow

```json
{
  "appName": "My App",
  "appId": "app_123",
  "errorMessage": "Cannot read property 'x' of undefined",
  "stackTrace": "Error: ...\n  at file.js:42:10",
  "timestamp": "2025-01-10T12:00:00Z",
  "userId": "user_456",
  "environment": "production",
  "errorType": "Runtime Error",
  "severity": "error"
}
```

**Output:**
1. Slack message in #alerts channel with error details
2. Direct message to admin for critical errors
3. Throttled to max 1 alert per hour per app

#### Customization Options
- Severity levels and colors
- Alert throttling intervals
- Stack trace truncation
- Admin notification rules

---

### 4. New App to Twitter/X

**Category:** Marketing
**Event Trigger:** `app.published`
**Required Services:** Twitter/X

#### Purpose
Automatically tweet about new apps created on your platform, with optional screenshot attachments.

#### Use Cases
- Social media automation
- Product promotion
- Community engagement
- User showcase

#### Configuration

**Twitter:**
- `TWITTER_CREDENTIAL_ID`: OAuth1 credential for Twitter API
- `TWITTER_USERNAME`: Your Twitter handle

**Platform:**
- `PLATFORM_API_URL`: Your platform API URL
- `PLATFORM_AUTH_CREDENTIAL_ID`: Authentication credential

**Webhook:**
- `WEBHOOK_ID`: Auto-generated webhook identifier

#### Data Flow

```json
{
  "appName": "Todo App",
  "description": "A simple todo list app",
  "deploymentUrl": "https://todo.pages.dev",
  "userName": "Jane Smith",
  "tags": ["productivity", "nocode", "ai"],
  "screenshotUrl": "https://cdn.example.com/screenshot.png",
  "appId": "app_123"
}
```

**Output:**
1. Tweet with app name, description, URL, and hashtags
2. Screenshot attached if available
3. Platform callback with tweet ID

#### Customization Options
- Tweet format and length
- Hashtag generation
- Screenshot inclusion rules
- Posting schedule

---

### 5. Deployment to GitHub Issue

**Category:** DevOps
**Event Trigger:** `deployment.complete`
**Required Services:** GitHub

#### Purpose
Post deployment status updates to linked GitHub issues and automatically close them on successful deployments.

#### Use Cases
- CI/CD integration
- Issue tracking automation
- Deployment notifications
- Release management

#### Configuration

**GitHub:**
- `GITHUB_OWNER`: Repository owner username
- `GITHUB_REPO`: Repository name
- `GITHUB_CREDENTIAL_ID`: OAuth2 credential for GitHub API
- `GITHUB_ENV_LABEL`: Environment label (e.g., "production")
- `GITHUB_ADMIN_USERNAME`: Admin username for failed deployments

**Webhook:**
- `WEBHOOK_ID`: Auto-generated webhook identifier

#### Data Flow

```json
{
  "appName": "My App",
  "appId": "app_123",
  "deploymentUrl": "https://my-app.pages.dev",
  "environment": "production",
  "commitSha": "abc123def456",
  "deployedAt": "2025-01-10T12:00:00Z",
  "deploymentId": "dep_789",
  "buildDuration": "2m 15s",
  "status": "success",
  "githubIssueNumber": "42",
  "githubRepoUrl": "https://github.com/user/repo",
  "autoCloseIssue": true
}
```

**Output:**
1. Comment on GitHub issue with deployment details
2. Labels added: "deployed", environment label
3. Issue closed if `status` is "success" and `autoCloseIssue` is true
4. Failed deployments tagged and assigned to admin

#### Customization Options
- Auto-close behavior
- Deployment status formatting
- Label management
- Comment templates

---

## Configuration Guide

### Setting Up OAuth Credentials

#### Google Sheets & Gmail

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Google Sheets API
   - Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://n8n.yourdomain.com/rest/oauth2-credential/callback`
6. Copy Client ID and Client Secret
7. In n8n:
   - Go to **Credentials** → **Create New**
   - Select **Google Sheets OAuth2 API** or **Gmail OAuth2**
   - Enter Client ID and Secret
   - Authenticate and authorize

#### Slack

1. Go to [Slack API](https://api.slack.com/apps)
2. Create new app or select existing
3. Enable OAuth & Permissions
4. Add scopes:
   - `chat:write`
   - `channels:read`
   - `users:read`
5. Install app to workspace
6. Copy OAuth Access Token
7. In n8n:
   - Go to **Credentials** → **Create New**
   - Select **Slack OAuth2 API**
   - Enter token and authenticate

#### Discord

1. Create a webhook in your Discord channel:
   - Channel Settings → Integrations → Webhooks
   - Create webhook and copy URL
2. In n8n workflow:
   - Replace `{{DISCORD_WEBHOOK_URL}}` with your webhook URL
3. No OAuth required for webhooks

#### Twitter/X

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create new app
3. Enable OAuth 1.0a
4. Copy API Key and Secret
5. Generate Access Token and Secret
6. In n8n:
   - Go to **Credentials** → **Create New**
   - Select **Twitter OAuth1 API**
   - Enter all credentials

#### GitHub

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth app
3. Set Authorization callback URL: `https://n8n.yourdomain.com/rest/oauth2-credential/callback`
4. Copy Client ID and Client Secret
5. In n8n:
   - Go to **Credentials** → **Create New**
   - Select **GitHub OAuth2 API**
   - Enter credentials and authorize

### Webhook Configuration

Each template requires a webhook trigger. The platform automatically generates webhook URLs when you activate a workflow.

**Webhook URL Format:**
```
https://n8n.yourdomain.com/webhook/{WEBHOOK_ID}
```

The platform sends HTTP POST requests to this URL with event data in JSON format.

### Environment Variables

Add these to your platform's environment (in `wrangler.jsonc` or `.env`):

```env
N8N_API_URL=https://n8n.yourdomain.com
N8N_API_KEY=your_n8n_api_key
N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com/webhook
```

## Event Types

The platform can trigger workflows for these events:

| Event Type | Description | Payload |
|------------|-------------|---------|
| `app.created` | New app created | App details, user info |
| `app.published` | App published publicly | App details, deployment URL |
| `app.error` | Runtime error occurred | Error details, stack trace |
| `payment.success` | Payment completed | Amount, user, subscription |
| `deployment.complete` | Deployment finished | Status, URL, commit info |
| `user.signup` | New user registered | User details |
| `custom.*` | Custom events | User-defined payload |

### Registering Events

To trigger workflows from your platform code:

```typescript
// Example: Trigger app.created event
await fetch(`${N8N_WEBHOOK_BASE_URL}/app-created`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    appName: 'My App',
    appId: 'app_123',
    userEmail: 'user@example.com',
    deploymentUrl: 'https://my-app.pages.dev',
    status: 'completed',
  }),
});
```

## Service Integrations

### Supported Services

- **Gmail** - Email automation
- **Google Sheets** - Spreadsheet automation
- **Slack** - Team messaging
- **Discord** - Community notifications
- **Twitter/X** - Social media posting
- **GitHub** - Repository automation

### Coming Soon

- Stripe (payments)
- Twilio (SMS)
- SendGrid (transactional email)
- Mailchimp (email marketing)
- Notion (documentation)
- Airtable (databases)

## Customization

### Modifying Templates

1. Navigate to n8n workflow editor
2. Open the workflow instance
3. Modify nodes:
   - Change email templates
   - Adjust conditions
   - Add new actions
   - Modify data transformations
4. Save and activate

### Creating Custom Templates

1. Build workflow in n8n UI
2. Export workflow as JSON
3. Add to `worker/services/n8n/templates/`
4. Update `seedWorkflowTemplates.ts`
5. Define metadata:
   ```typescript
   {
     name: 'My Custom Template',
     description: 'Does amazing things',
     category: 'custom',
     templateFile: 'my-template.json',
     iconUrl: 'https://example.com/icon.svg',
     requiredSecrets: ['service1', 'service2'],
   }
   ```
6. Run seed script

### Using the Template Customizer

The `TemplateCustomizer` service handles placeholder replacement:

```typescript
import { createTemplateCustomizer } from './worker/services/n8n/TemplateCustomizer';

const customizer = createTemplateCustomizer();

const config = {
  webhookId: 'webhook_abc123',
  credentials: {
    GOOGLE_SHEETS_CREDENTIAL_ID: 'cred_456',
    GMAIL_CREDENTIAL_ID: 'cred_789',
  },
  settings: {
    SHEET_ID: '1abc...xyz',
  },
  userId: 'user_123',
  instanceName: 'Lead Capture for Acme Corp',
};

const result = customizer.customize(templateJson, config);
// result.workflowJson - Customized workflow
// result.webhookUrls - Extracted webhook URLs
// result.requiredCredentials - List of required credentials
```

## Best Practices

### Security

1. **Credential Management**
   - Never commit credentials to version control
   - Use environment variables for secrets
   - Rotate API keys regularly
   - Use least-privilege scopes

2. **Webhook Security**
   - Validate webhook signatures
   - Use HTTPS only
   - Implement rate limiting
   - Log all webhook calls

3. **Error Handling**
   - Add try-catch nodes for critical operations
   - Set up error notifications
   - Implement retry logic with backoff
   - Monitor failed executions

### Performance

1. **Execution Optimization**
   - Use async/parallel execution where possible
   - Implement caching for repeated API calls
   - Batch operations when supported
   - Set appropriate timeouts

2. **Throttling**
   - Add throttle nodes for high-frequency events
   - Implement debouncing for rapid triggers
   - Use queue management for batch processing

3. **Monitoring**
   - Set up health checks
   - Monitor execution times
   - Track error rates
   - Set up alerts for failures

### Maintenance

1. **Regular Reviews**
   - Review execution logs weekly
   - Update credentials before expiration
   - Test workflows after n8n updates
   - Clean up old execution data

2. **Documentation**
   - Document custom workflows
   - Maintain changelog for template modifications
   - Share workflow patterns with team
   - Document credential setup steps

3. **Testing**
   - Test workflows in staging first
   - Use test webhooks for validation
   - Verify error handling scenarios
   - Monitor initial production executions

## Support

For issues or questions:

- Check the [n8n Documentation](https://docs.n8n.io)
- Review [Deployment Guide](./N8N_DEPLOYMENT.md)
- Open a GitHub issue
- Contact platform support

## Additional Resources

- [n8n Workflow Examples](https://n8n.io/workflows)
- [n8n Community Forum](https://community.n8n.io)
- [Platform API Documentation](./API.md)
- [Webhook Configuration Guide](./WEBHOOKS.md)

---

Last Updated: 2025-01-10
