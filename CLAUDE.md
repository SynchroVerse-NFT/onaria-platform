# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Communication Style
- Be professional, concise, and direct
- Do NOT use emojis in code reviews, changelogs, or any generated content
- Focus on substance over style
- Use clear technical language

## Project Overview
vibesdk is an AI-powered full-stack application generation platform built on Cloudflare infrastructure.

**Tech Stack:**
- Frontend: React 19, TypeScript, Vite, TailwindCSS v4, React Router v7
- Backend: Cloudflare Workers, Durable Objects, D1 (SQLite)
- AI/LLM: OpenAI, Anthropic, Google AI Studio (Gemini)
- WebSocket: PartySocket for real-time communication
- Sandbox: Custom container service with CLI tools
- Git: isomorphic-git with SQLite filesystem
- Animations: Framer Motion for cosmic effects

**Design System:**
- Cosmic theme with blue/purple/pink gradients
- Glassmorphism UI patterns with backdrop blur
- Space-inspired animations (nebula, stars, parallax)
- Responsive dark/light mode support

**Project Structure:**
- `/src` - React frontend (80+ components, `api-types.ts` for types, `lib/api-client.ts` for API calls)
- `/worker` - Backend (Durable Objects, agents, database, services, API)
- `/shared` - Shared types between frontend/backend
- `/migrations` - D1 database migrations
- `/container` - Sandbox container tooling
- `/templates` - Project scaffolding templates

**Core Architecture:**
- Each chat session = Durable Object instance (SimpleCodeGeneratorAgent)
- State machine: IDLE → PHASE_GENERATING → PHASE_IMPLEMENTING → REVIEWING
- Git history in SQLite, full clone protocol support
- WebSocket for real-time streaming and state synchronization

## Key Architectural Patterns

**Durable Objects Pattern:**
- Each chat session = Durable Object instance
- Persistent state in SQLite (blueprint, files, history)
- Ephemeral state in memory (abort controllers, active promises)
- Single-threaded per instance

**CodeGenState (Agent State):**
- Project Identity: blueprint, projectName, templateName
- File Management: generatedFilesMap (tracks all files)
- Phase Tracking: generatedPhases, currentPhase
- State Machine: currentDevState, shouldBeGenerating
- Sandbox: sandboxInstanceId, commandsHistory
- Conversation: conversationMessages, pendingUserInputs

**WebSocket Communication:**
- Real-time streaming via PartySocket
- State restoration on reconnect (agent_connected message)
- Message deduplication (tool execution causes duplicates)

**Git System:**
- isomorphic-git with SQLite filesystem adapter
- Full commit history in Durable Object storage
- FileManager auto-syncs from git via callbacks
- SQLite filesystem adapter: `/worker/agents/git/fs-adapter.ts`

## Cosmic Design System

**Color Palette:**
- Cosmic Blue: `#64b5f6` - Primary
- Cosmic Purple: `#a855f7` - Secondary
- Cosmic Pink: `#ec4899` - Accent
- Cosmic Orange: `#ff5722` - Highlight

**Glassmorphism Pattern:**
```tsx
className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20"
```

**Animation Guidelines:**
- Respect user preferences via AnimationWrapper context
- Three intensity levels: low, medium, high
- Automatic reduction for `prefers-reduced-motion`
- Lazy load heavy animation components

## Common Development Tasks

**Change LLM Model:**
Edit `/worker/agents/inferutils/config.ts` → `AGENT_CONFIG` object

**Modify Conversation Agent:**
Edit `/worker/agents/operations/UserConversationProcessor.ts` (system prompt line 50)

**Add New WebSocket Message:**
1. Add type to `worker/api/websocketTypes.ts`
2. Handle in `worker/agents/core/websocket.ts`
3. Handle in `src/routes/chat/utils/handle-websocket-message.ts`

**Add New LLM Tool:**
1. Create `/worker/agents/tools/toolkit/my-tool.ts`
2. Export `createMyTool(agent, logger)` function
3. Import in `/worker/agents/tools/customTools.ts`
4. Add to `buildTools()` (conversation) or `buildDebugTools()` (debugger)

**Add API Endpoint:**
1. Define types in `src/api-types.ts`
2. Add to `src/lib/api-client.ts`
3. Create service in `worker/database/services/`
4. Create controller in `worker/api/controllers/`
5. Add route in `worker/api/routes/`
6. Register in `worker/api/routes/index.ts`

**Troubleshoot AI Gateway:**
1. Check Gateway: `curl https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/models`
2. Verify secrets: `wrangler secret list` (should show `AI_GATEWAY_AUTH_TOKEN`)
3. Check logs: `wrangler tail --format=pretty`
4. Verify auth header: `cf-aig-authorization: Bearer {token}` in requests
5. Deploy to rotate stale Durable Object code if needed

## Important Context

**Deep Debugger:**
- Location: `/worker/agents/assistants/codeDebugger.ts`
- Model: Gemini 2.5 Pro (reasoning_effort: high, 32k tokens)
- Diagnostic priority: run_analysis → get_runtime_errors → get_logs
- Can fix multiple files in parallel (regenerate_file)
- Cannot run during code generation

**Abort Controller Pattern:**
- `getOrCreateAbortController()` reuses controller for nested operations
- Cleared after top-level operations complete
- User abort cancels entire operation tree

**Message Deduplication:**
- Tool execution causes duplicate AI messages
- Backend skips redundant LLM calls (empty tool results)
- Frontend utilities deduplicate live and restored messages

**AI Gateway & Infrastructure:**
- Location: `/worker/agents/inferutils/core.ts` (getConfigurationForModel)
- Gateway URL: `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/compat`
- Secrets: `AI_GATEWAY_AUTH_TOKEN` or `CLOUDFLARE_AI_GATEWAY_TOKEN`
- Fallback to direct provider URLs if token unavailable
- Secret binding: Must be bound to exact Worker script name (`onaria-platform`)
- Container secrets: Must forward explicitly via `envVars` parameter

## Core Rules (Non-Negotiable)

**1. Strict Type Safety**
- NEVER use `any` type
- Frontend imports types from `@/api-types` (single source of truth)
- Search codebase for existing types before creating new ones

**2. DRY Principle**
- Search for similar functionality before implementing
- Extract reusable utilities, hooks, and components
- Never copy-paste code - refactor into shared functions

**3. Follow Existing Patterns**
- Frontend APIs: All in `/src/lib/api-client.ts`
- Backend Routes: Controllers in `worker/api/controllers/`, routes in `worker/api/routes/`
- Database Services: In `worker/database/services/`
- Types: Shared in `shared/types/`, API in `src/api-types.ts`

**4. Code Quality**
- Production-ready code only - no TODOs or placeholders
- No hacky workarounds
- Comments explain purpose, not narration
- No overly verbose AI-like comments

**5. File Naming**
- React Components: PascalCase.tsx
- Utilities/Hooks: kebab-case.ts
- Backend Services: PascalCase.ts

## Common Pitfalls

**Don't:**
- Use `any` type (find or create proper types)
- Copy-paste code (extract to utilities)
- Use Vite env variables in Worker code
- Forget to update types when changing APIs
- Create new implementations without searching
- Use emojis in code or comments
- Write verbose AI-like comments

**Do:**
- Search codebase thoroughly before creating new code
- Follow existing patterns consistently
- Write production-ready code
- Update version before every deployment
- Verify live page at onaria.xyz after deployments
- Use Chrome DevTools MCP to test frontend (not Playwright)
- Test credentials: info@synchroverse.io / Synchro2025$$
- After deploying, debug live frontend with Chrome DevTools MCP
- ALWAYS fix errors - don't skip them
- Work autonomously until final goal achieved
- After every deployment, commit to GitHub with same version number
- Git integration DISCONNECTED in Cloudflare Workers settings - all deployments manual via `npm run deploy`
- Keep working until ultimate goal achieved - simulate non-proficient user flow
- After every deployment, update this CLAUDE.md file

## Ultimate Goal
Simulate a non-proficient user's flow through the platform. Ensure:
- Code generation works properly
- Previews are user-friendly for non-tech users
- Deployments are successful
- Visual journey geared for non-tech users
DO NOT stop until this goal is achieved.

## Recent Critical Deployments

### v2.2.4 (2025-11-24)
**Modal Centering Fix**
- Fixed dialogs appearing at bottom instead of centered in viewport
- Root cause: `relative` class overriding `fixed` positioning in dialog.tsx:61
- Removed trailing `relative` class from DialogContent
- All modals now properly centered using `fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]`
- Deployment: 49eab67b-d4e1-40f7-88f0-a9fc8dc54a03
- Commit: 548ccf5

### v2.1.49 (2025-11-20)
**AI Model Optimization: Free Models for Infinite Scalability**
- CRITICAL: Eliminated all AI inference costs to prevent rate limiting
- Rate limit was 800 credits/hour, 2000/day - platform would hit limit with 100+ users
- Switched ALL operations to GEMINI_2_0_FLASH (0 credits):
  - templateSelection, projectSetup, conversationalResponse
  - Already using free: blueprint, phaseGeneration, phaseImplementation, deepDebugger, codeReview, fileRegeneration, screenshotAnalysis
- Impact: 0 credits per app (was 50-200), infinitely scalable within rate limits
- Location: `worker/agents/inferutils/config.ts`
- Deployment: b21cb2b4, Commit: e0fa02a

### v2.1.48 (2025-11-20)
**Template Pre-Fill Fix**
- "Use Template" buttons were broken - queries never pre-filled
- Root cause: Home page never read URL query parameters
- Added useSearchParams hook and useEffect to populate query from URL
- Location: `src/routes/home.tsx:3, 36, 137-145`
- Deployment: f122a9b7, Commit: 69cf32a

### v2.1.42 (2025-11-19)
**App Status Update Retry Logic**
- 92% of apps stuck in "generating" status despite completion
- Added retry logic with exponential backoff (3 attempts, 1s/2s/3s delays)
- Always sends GENERATION_COMPLETE WebSocket message
- Location: `worker/agents/core/simpleGeneratorAgent.ts:1095-1130`
- Deployment: 2ecf0db9, Commit: 07bd3f8

### v2.1.41 (2025-11-18)
**App Detail Page Auto-Refresh**
- Auto-refresh only worked on /chat/:id, not /app/:id
- Removed `!app.previewUrl` check (previewUrl not in D1, only in DO state)
- Auto-refresh triggers for completed apps without cloudflareUrl
- Location: `src/routes/app/index.tsx:148-162`
- Deployment: cf4c4cc8, Commit: a8e1d21

### v2.1.30 (2025-11-17)
**Security & Performance Audit Fixes**
- Bundle reduction: 1.2 MB → 214 KB gzipped (84% reduction)
- Lazy load Monaco Editor (-834 KB), route code splitting (-193 KB)
- Removed 41 unused dependencies (156→115 packages)
- Security fixes: Analytics access control, JWT validation, SQL injection
- Type safety: Replaced 16 `any` types with proper interfaces
- Test coverage: 3.3% → 5.4%
- Deployment: b517ffe

### v2.1.28 (2025-11-16)
**Revert Auto-Deployment (Workers for Platforms Not Enabled)**
- v2.1.27 auto-deployment created Workers that returned "not available" error
- Workers for Platforms (dispatch namespaces) not enabled for account
- Removed automatic deployToCloudflare() call
- Platform uses sandbox previews exclusively (working perfectly)
- Manual deploy button available for when WfP enabled
- Location: `worker/agents/core/simpleGeneratorAgent.ts:1011-1018` (removed)
- Deployment: b7092ab5, Commit: 6d2c57b

### v2.1.16 (2025-11-15)
**Preview Auto-Display Fix**
- Preview panel only checked cloudflareDeploymentUrl, ignored previewUrl
- Changed to prioritize sandbox: `previewUrl || cloudflareDeploymentUrl`
- Backend deploys to sandbox automatically during phases
- Frontend receives previewUrl via deployment_completed WebSocket
- Location: `src/routes/chat/chat.tsx:974-976`
- Deployment: d78433fd

## Deployment Notes
- Use wrangler to deploy, not npm
- After deployment, set 15-minute timeout to debug live site
- When waiting for builds, set foreground timer (not background)
- Test login: info@synchroverse.io / Synchro2025$$
- Whitelabeled VibeSDK from Cloudflare - check official repo for reference
