# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a collection of Cloudflare Worker templates designed for AI code generation use cases. The repository contains multiple template projects that can be deployed to Cloudflare's edge infrastructure and serve as basis for AI code generation.

## Template Architecture

The repository contains 4 main template types:

1. **c-code-next-runner** - Next.js application with OpenNext for Cloudflare deployment
2. **c-code-react-runner** - React/Vite application with Cloudflare Workers integration  
3. **next-llm-chat-runner** - Next.js LLM chat application with OpenAI integration
4. **vite-cfagents-runner** - Vite/React application with Cloudflare Agents SDK and MCP support

All templates share common patterns:
- Cloudflare Workers runtime configuration via `wrangler.jsonc`
- TypeScript/React frontend with Tailwind CSS and shadcn/ui components
- Radix UI component library for consistent design system
- Error boundary implementation for robust error handling
- AI Gateway integration for cost control and analytics

## Common Development Commands

### Next.js Templates (c-code-next-runner, next-llm-chat-runner)
```bash
npm run dev        # Start development server
npm run build      # Build for production  
npm run lint       # Run ESLint with JSON output
npm run deploy     # Build and deploy to Cloudflare
npm run preview    # Build and preview locally
npm run cf-typegen # Generate Cloudflare types
```

### Vite Templates (c-code-react-runner, vite-cfagents-runner)  
```bash
npm run dev        # Start development server on port 3000
npm run build      # TypeScript build + Vite build
npm run lint       # Run ESLint with cache and JSON output
npm run preview    # Build and preview on port 4173
npm run deploy     # Build and deploy with Wrangler
npm run cf-typegen # Generate Cloudflare Worker types
```

### Template Catalog Management
```bash
python3 generate_template_catalog.py           # Generate template catalog
python3 generate_template_catalog.py --pretty  # Generate with pretty formatting
```

## Key Configuration Files

- **wrangler.jsonc** - Cloudflare Worker configuration and environment variables
- **components.json** - shadcn/ui component configuration  
- **tailwind.config.js** - Tailwind CSS configuration with design tokens
- **tsconfig.json** - TypeScript configuration with Cloudflare Worker types
- **open-next.config.ts** (Next.js) - OpenNext Cloudflare deployment configuration
- **vite.config.ts** (Vite) - Vite build configuration with Cloudflare plugin

## Template Validation Requirements

For a directory to be considered a valid template, it must contain:
- `wrangler.jsonc` or `wrangler.toml` (Cloudflare configuration)
- `package.json` (Node.js dependencies)
- `prompts/selection.md` (Template selection description)
- `prompts/usage.md` (Template usage instructions)

## AI Integration Patterns

Templates integrate with AI services through:
- **Cloudflare AI Gateway** - Centralized API gateway for cost control and analytics
- **OpenAI SDK** - LLM interactions with proper error handling
- **Cloudflare Agents SDK** - Stateful AI agents with persistent conversations (vite-cfagents-runner)
- **MCP (Model Context Protocol)** - Tool integration for AI agents (vite-cfagents-runner)

## Deployment Infrastructure

The repository includes automated deployment via GitHub Actions:
- Templates are packaged as optimized ZIP files
- Uploaded to Cloudflare R2 for distribution
- Template catalog JSON is generated and published
- See `DEPLOYMENT_SETUP.md` for complete setup instructions

## Shared Component Library

All templates use a consistent component library built on:
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Pre-built component implementations
- **Tailwind CSS** - Utility-first styling with consistent design tokens
- **Framer Motion** - Animation library for smooth interactions
- **Lucide React** - Icon library

Components are located in `src/components/ui/` and include form controls, navigation, data display, and layout components.

## Error Handling Strategy

Templates implement comprehensive error handling:
- React Error Boundaries for component-level errors
- Route-specific error boundaries (Vite templates)
- Client-side error reporting via `/api/client-errors`
- Proper error logging and user feedback mechanisms

### Runtime Error Logging System (vite-cfagents-runner)

The vite-cfagents-runner template includes a transparent JSON-based runtime error logging system:

**Error Schema**: All errors logged as JSON with timestamp, message, stack, source, filePath, lineNumber, columnNumber, severity ('warning'|'error'|'fatal'), and rawOutput fields.

**Automatic Detection**: 
- `console.error()` → JSON error logs
- `console.warn()` → JSON warning logs  
- `console.log()` with error keywords → JSON error logs
- Unhandled JavaScript errors → JSON error logs
- Unhandled promise rejections → JSON error logs

**Implementation**: Core logic in `worker/core-utils.ts` (hidden from AI), client initialization in `src/lib/clientErrorLogger.ts`, auto-imported in `src/main.tsx`. Completely transparent - no application code changes required.

## Important Notes
- Always **strictly** follow DRY principles
- Keep code quality high and maintainability in mind
- Always research and understand the codebase before making changes
- Never use 'any' type. If you see 'any', Find the proper appropriate type in the project and then replace it. If nothing is found, then write a type for it. 
- Never use dynamic imports. If you see dynamic imports, Correct it!
- Implement everything the 'right' and 'correct' way instead of 'fast' and 'quick'.
- Don't add comments for explaining your changes to me. Comments should be professional, to the point and should be there to explain the code, not your changes
