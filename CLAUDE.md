# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Communication Style
- Be professional, concise, and direct
- Do NOT use emojis in code reviews, changelogs, or any generated content. You may use professional visual indicators or favor markdown formatting over emojis.
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
- Animations: Framer Motion for cosmic effects and transitions

**Design System:**
- Cosmic theme with blue/purple/pink gradients
- Glassmorphism UI patterns with backdrop blur
- Space-inspired animations (nebula, stars, parallax)
- Responsive dark/light mode support

**Project Structure**

**Frontend (`/src`):**
- React application with 80+ components
- Single source of truth for types: `src/api-types.ts`
- All API calls in `src/lib/api-client.ts`
- Custom hooks in `src/hooks/`
- Route components in `src/routes/`

**Backend (`/worker`):**
- Entry point: `worker/index.ts` (7860 lines)
- Agent system: `worker/agents/` (88 files)
  - Core: SimpleCodeGeneratorAgent (Durable Object, 2800+ lines)
  - Operations: PhaseGeneration, PhaseImplementation, UserConversationProcessor
  - Tools: tools for LLM (read-files, run-analysis, regenerate-file, etc.)
  - Git: isomorphic-git with SQLite filesystem
- Database: `worker/database/` (Drizzle ORM, D1)
- Services: `worker/services/` (sandbox, code-fixer, oauth, rate-limit)
- API: `worker/api/` (routes, controllers, handlers)

**Animations (`/src/components/animations`):**
- AnimatedBackground - Cosmic nebula gradients with parallax
- CursorAurora - Mouse-following aurora effect
- FloatingParticles - Space particles system
- InterstellarRings - Animated ring effects
- WormholeEffect - Loading and transition effects
- AnimationWrapper - Performance context for animations

**Other:**
- `/shared` - Shared types between frontend/backend (not worker specific types that are also imported in frontend)
- `/migrations` - D1 database migrations
- `/container` - Sandbox container tooling
- `/templates` - Project scaffolding templates

**Core Architecture:**
- Each chat session is a Durable Object instance (SimpleCodeGeneratorAgent)
- State machine drives code generation (IDLE → PHASE_GENERATING → PHASE_IMPLEMENTING → REVIEWING)
- Git history stored in SQLite, full clone protocol support
- WebSocket for real-time streaming and state synchronization

## Key Architectural Patterns

**Durable Objects Pattern:**
- Each chat session = Durable Object instance
- Persistent state in SQLite (blueprint, files, history)
- Ephemeral state in memory (abort controllers, active promises)
- Single-threaded per instance

**State Machine:**
IDLE → PHASE_GENERATING → PHASE_IMPLEMENTING → REVIEWING → IDLE

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
- Git clone protocol support (rebase on template)
- FileManager auto-syncs from git via callbacks

## Cosmic Design System

**Color Palette:**
- Cosmic Blue: `#64b5f6` - Primary brand color
- Cosmic Purple: `#a855f7` - Secondary brand color
- Cosmic Pink: `#ec4899` - Accent color
- Cosmic Orange: `#ff5722` - Highlight color

**Gradients:**
- `bg-cosmic-gradient` - Subtle blue to purple (135deg)
- `bg-cosmic-gradient-full` - Full spectrum (blue → purple → orange)
- `bg-cosmic-gradient-subtle` - Semi-transparent multi-color
- `bg-cosmic-light` - Light mode background gradient

**Glassmorphism Pattern:**
```tsx
className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20"
```
Use `backdrop-blur-xl` (24px) or `backdrop-blur-2xl` (40px) with semi-transparent backgrounds.

**Animation Guidelines:**
- All animations respect user preferences via AnimationWrapper context
- Three intensity levels: low, medium, high
- Automatic reduction for `prefers-reduced-motion`
- Use lazy loading for heavy animation components
- CSS animations for simple effects, Framer Motion for complex interactions

**Custom Animations (CSS):**
- `chat-edge-throb` - Pulsing cosmic blue/purple border
- `cosmic-message-glow` - Subtle glow effect for messages
- `cosmic-thinking-pulse` - Thinking indicator animation
- `debug-pulse` - Red pulse for debug mode

## Common Development Tasks

**Change LLM Model for Operation:**
Edit `/worker/agents/inferutils/config.ts` → `AGENT_CONFIG` object

**Modify Conversation Agent Behavior:**
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

**Troubleshoot AI Gateway Issues:**
1. Check Gateway exists: `curl https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/models`
2. Verify secrets: `wrangler secret list` (should show `AI_GATEWAY_AUTH_TOKEN`)
3. Test secret binding: Add temporary plaintext var, check if accessible at runtime
4. Check logs: `wrangler tail --format=pretty` and look for Gateway-related errors
5. Verify authentication header: Look for `cf-aig-authorization: Bearer {token}` in requests
6. Rotate DOs if needed: Deploy after fixing secrets to clear cached code
7. Fallback verification: If Gateway fails, check if direct provider URLs work

## Important Context

**Deep Debugger:**
- Location: `/worker/agents/assistants/codeDebugger.ts`
- Model: Gemini 2.5 Pro (reasoning_effort: high, 32k tokens)
- Diagnostic priority: run_analysis → get_runtime_errors → get_logs
- Can fix multiple files in parallel (regenerate_file)
- Cannot run during code generation (checked via isCodeGenerating())

**Git System:**
- GitVersionControl class wraps isomorphic-git
- Key methods: commit(), reset(), log(), show()
- FileManager auto-syncs via callback registration
- Access control: user conversations get safe commands, debugger gets full access
- SQLite filesystem adapter (`/worker/agents/git/fs-adapter.ts`)

**Abort Controller Pattern:**
- `getOrCreateAbortController()` reuses controller for nested operations
- Cleared after top-level operations complete
- Shared by parent and nested tool calls
- User abort cancels entire operation tree

**Message Deduplication:**
- Tool execution causes duplicate AI messages
- Backend skips redundant LLM calls (empty tool results)
- Frontend utilities deduplicate live and restored messages
- System prompt teaches LLM not to repeat

**AI Gateway & Infrastructure:**
- Location: `/worker/agents/inferutils/core.ts` (getConfigurationForModel)
- Gateway URL: `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/compat`
- Authentication: `cf-aig-authorization: Bearer {token}` header
- Secrets: `AI_GATEWAY_AUTH_TOKEN` (primary) or `CLOUDFLARE_AI_GATEWAY_TOKEN` (legacy)
- Fallback: Direct provider URLs if Gateway token unavailable
- Secret binding: Must be bound to exact Worker script name (`onaria-platform`)
- Check binding: `wrangler secret list` to verify secrets exist
- Verify at runtime: Secrets accessible via `env.SECRET_NAME` (not `process.env`)
- Container secrets: Must forward explicitly via `envVars` parameter
- DO code caching: Deploy new version to rotate stale Durable Object code

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
- Create new implementations without searching for existing ones
- Use emojis in code or comments
- Write verbose AI-like comments

**Do:**
- Search codebase thoroughly before creating new code
- Follow existing patterns consistently
- Keep comments concise and purposeful
- Write production-ready code
- Test thoroughly before submitting
- update the version before every deployment
- verify live page at onaria.xyz after deployments
- You are working on a whitelabeled VibeSDK from Cloudflare, dont try to guess on how to handle issues, check the cloudflare vibesdk repo for the correct reference
- Use chrome dev tools mcp to test the frontend in the localhost or the live site if asked, do not use playwright
- test login credentials are info@synchroverse.io and Synchro2025$$
- after deploaying, set a timeout of 15 minutes and debug the live frontend with chrome dev tools mcp
- Do not keep asking if you should fix error or just skip them, ALWAYS fix the errors.
- Stop asking the user which method to take, fix it until the final goal is acheived
- Your ultimate goal is to simulate a non proficient users flow through our platform, analyze every step make sure the code generation is properly wonking, the previews are user friendly for non tech users and the deployments are successful. The visual journey should be geared for non-tech users. DO not stop fixing until this goal is acheived.
- Do not keep asking if you should proceed or what steps to take, you know best. Proceed until your ultimate goal is completed
- After every deployment to Cloudflare, you need to make a github commit with the same version number so we can always keep track of the changes
- Do not stop debugging until all issues and bugs are resolved
- Keep working until the ultimate goal is acheived. Work autonomously without asking which method to implement or which process to continue with, continue working until every issue is solved, implemeted, tested and validated in the frontend. Never wait for builds or compiles with just background processes, set a sleep timer for yourself in the foreground so you can be immediately notified of when to continue.
- After every deployment, update your claude.md file to make sure you have the latest context

## Recent Deployments

### v2.1.16 (2025-11-15)
**Preview Auto-Display Fix**

Issue: After code generation completed and sandbox deployed automatically, the preview panel was showing "Ready to Deploy" button instead of displaying the live sandbox preview.

Root Cause: Frontend preview panel (`src/routes/chat/chat.tsx:974-976`) only checked for `cloudflareDeploymentUrl` (production deployment), completely ignoring `previewUrl` (sandbox preview).

Fix Applied:
- Modified preview panel conditional rendering to prioritize sandbox preview
- Changed from `cloudflareDeploymentUrl ?` to `previewUrl || cloudflareDeploymentUrl ?`
- Changed iframe src from `{cloudflareDeploymentUrl}` to `{previewUrl || cloudflareDeploymentUrl}`

Technical Details:
- Backend DOES deploy to sandbox automatically during phases (continuous deployment pattern) at `worker/agents/core/simpleGeneratorAgent.ts:1407`
- Frontend DOES receive and store `previewUrl` correctly via `deployment_completed` WebSocket message at `src/routes/chat/utils/handle-websocket-message.ts:500`
- Only missing piece was displaying the sandbox URL in the preview panel

Deployment:
- Version: d78433fd-e589-4c92-afd3-4655f54cb42a
- Container: onaria-platform-userappsandboxservice:d78433fd
- Routes: onaria.xyz/*, *.onaria.xyz/*
- Deployed: 2025-11-15 (UTC)