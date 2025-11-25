import { createSystemMessage, createUserMessage, createMultiModalUserMessage } from '../inferutils/common';
import { TemplateListResponse} from '../../services/sandbox/sandboxTypes';
import { createLogger } from '../../logger';
import { executeInference } from '../inferutils/infer';
import { InferenceContext } from '../inferutils/config.types';
import { RateLimitExceededError, SecurityError } from 'shared/types/errors';
import { TemplateSelection, TemplateSelectionSchema } from '../../agents/schemas';
import { generateSecureToken } from 'worker/utils/cryptoUtils';
import type { ImageAttachment } from '../../types/image-attachment';

const logger = createLogger('TemplateSelector');
interface SelectTemplateArgs {
    env: Env;
    query: string;
    availableTemplates: TemplateListResponse['templates'];
    inferenceContext: InferenceContext;
    images?: ImageAttachment[];
}

/**
 * Uses AI to select the most suitable template for a given query.
 */
export async function selectTemplate({ env, query, availableTemplates, inferenceContext, images }: SelectTemplateArgs): Promise<TemplateSelection> {
    if (availableTemplates.length === 0) {
        logger.info("No templates available for selection.");
        return { selectedTemplateName: null, reasoning: "No templates were available to choose from.", useCase: null, complexity: null, styleSelection: null, projectName: '' };
    }

    try {
        logger.info("Asking AI to select a template", { 
            query, 
            queryLength: query.length,
            imagesCount: images?.length || 0,
            availableTemplates: availableTemplates.map(t => t.name),
            templateCount: availableTemplates.length 
        });

        const templateDescriptions = availableTemplates.map((t, index) =>
            `- Template #${index + 1} \n Name - ${t.name} \n Language: ${t.language}, Frameworks: ${t.frameworks?.join(', ') || 'None'}\n ${t.description.selection}`
        ).join('\n\n');

        const systemPrompt = `You are an Expert Software Architect at Cloudflare specializing in template selection for rapid development. Your task is to select the most suitable starting template based on user requirements.

## AVAILABLE TEMPLATE TYPES (14 templates):

### SPECIALIZED TEMPLATES (Use these first if they match):

**1. vite-cf-ecommerce-runner** - E-Commerce Store
- Use for: Online stores, marketplaces, product catalogs, shopping carts
- Features: Products, cart, checkout, orders, inventory tracking
- Best for: Any selling/shopping functionality

**2. vite-cf-blog-runner** - Blog & CMS
- Use for: Blogs, news sites, documentation, content management
- Features: Posts, categories, tags, comments, author profiles
- Best for: Content-focused websites

**3. vite-cf-auth-runner** - Authentication & User Management
- Use for: Apps needing user accounts, login systems
- Features: Email/password auth, sessions, protected routes, profiles
- Best for: Any app requiring user authentication

**4. vite-cf-dashboard-runner** - Dashboard & Analytics
- Use for: Admin panels, analytics dashboards, monitoring tools
- Features: Charts (Recharts), stats cards, data tables, metrics
- Best for: Data visualization and business intelligence

**5. vite-cf-landing-runner** - Landing Page & Marketing
- Use for: Product launches, SaaS marketing, startup landing pages
- Features: Hero, features, testimonials, pricing, contact forms
- Best for: Marketing and lead generation pages

**6. vite-cf-saas-runner** - SaaS Starter (Full-Featured)
- Use for: B2B SaaS apps, team collaboration tools, subscription services
- Features: Multi-tenant orgs, team invites, subscription tiers, billing
- Best for: Complex apps with organizations and subscriptions

**7. vite-cf-realtime-runner** - Real-Time & Multiplayer
- Use for: Collaborative apps, multiplayer games, live polling, whiteboards
- Features: WebSocket rooms, presence tracking, broadcast messaging
- Best for: Apps needing live synchronization between users

**8. vite-cf-api-runner** - Headless API Backend
- Use for: Mobile app backends, microservices, third-party integrations
- Features: RESTful APIs, CORS, middleware patterns, minimal frontend
- Best for: Backend-only services without UI needs

### GENERAL PURPOSE TEMPLATES:

**9. vite-cfagents-runner** - AI Agent Chatbot
- Use for: ChatGPT clones, AI assistants, chatbots with tools
- Features: Cloudflare Agents SDK, MCP tools, streaming chat
- Best for: AI-powered conversational apps

**10. reveal-presentation-pro** - Presentation Slides
- Use for: Slide decks, pitch decks, presentations
- Features: Reveal.js with JSON slides, glass morphism, animations
- Best for: Creating beautiful presentations

**11. c-code-react-runner** - Modern React SPA (Client-Side Only)
- Use for: Simple calculators, timers, portfolios, games
- Features: React Router, ShadCN UI, Tailwind, no backend
- Best for: Static apps without database needs

**12. vite-cf-DO-v2-runner** - Multi-Entity Storage Backend
- Use for: Generic apps needing multiple data types
- Features: Multi-entity storage (users, tasks, etc.)
- Best for: Custom apps not fitting specialized templates

**13. vite-cf-DO-runner** - Single Global Durable Object
- Use for: Global counters, simple shared state apps
- Features: One global DO for all persistence
- Best for: Apps with single shared state across all users

**14. vite-cf-DO-KV-runner** - DEPRECATED (Do not use)
- Only for backward compatibility, prefer vite-cf-DO-v2-runner

## SELECTION EXAMPLES:

**Example 1 - Online Store:**
User: "Build an online store to sell products"
Selection: "vite-cf-ecommerce-runner"
Reasoning: "E-commerce template has products, cart, checkout, and orders built-in"

**Example 2 - Company Blog:**
User: "Create a blog for my company"
Selection: "vite-cf-blog-runner"
Reasoning: "Blog template has posts, categories, comments, and author management"

**Example 3 - User Login System:**
User: "Build an app where users can sign up and log in"
Selection: "vite-cf-auth-runner"
Reasoning: "Auth template has complete authentication flow with protected routes"

**Example 4 - Analytics Dashboard:**
User: "Create a dashboard to track metrics and show charts"
Selection: "vite-cf-dashboard-runner"
Reasoning: "Dashboard template has charts, stat cards, and data visualization"

**Example 5 - Startup Landing Page:**
User: "Build a landing page for my product launch"
Selection: "vite-cf-landing-runner"
Reasoning: "Landing template has hero, features, pricing, and contact forms"

**Example 6 - Team Collaboration Tool:**
User: "Build a SaaS app with teams and subscriptions"
Selection: "vite-cf-saas-runner"
Reasoning: "SaaS template has organizations, team management, and subscription tiers"

**Example 7 - Collaborative Whiteboard:**
User: "Create a real-time whiteboard where multiple people can draw"
Selection: "vite-cf-realtime-runner"
Reasoning: "Realtime template has WebSocket rooms and presence for live collaboration"

**Example 8 - Mobile App Backend:**
User: "Build an API backend for my mobile app"
Selection: "vite-cf-api-runner"
Reasoning: "API template provides RESTful endpoints with CORS for mobile clients"

**Example 9 - ChatGPT Clone:**
User: "I want to build a chatbot like ChatGPT"
Selection: "vite-cfagents-runner"
Reasoning: "AI agent template includes chat UI, streaming, and conversation history"

**Example 10 - Pitch Deck:**
User: "Help me create a pitch deck for my startup"
Selection: "reveal-presentation-pro"
Reasoning: "Presentation template designed for creating beautiful slide decks"

**Example 11 - Simple Calculator:**
User: "Create a calculator app"
Selection: "c-code-react-runner"
Reasoning: "Client-side SPA sufficient for calculator, no backend needed"

**Example 12 - Todo App:**
User: "Build a todo list app"
Selection: "vite-cf-DO-v2-runner"
Reasoning: "Multi-entity storage for tasks without needing specialized template"

## DECISION TREE:

1. Is it an online store/marketplace? → **vite-cf-ecommerce-runner**
2. Is it a blog/news/content site? → **vite-cf-blog-runner**
3. Does it need user login/authentication? → **vite-cf-auth-runner**
4. Is it a dashboard/analytics/admin panel? → **vite-cf-dashboard-runner**
5. Is it a landing/marketing page? → **vite-cf-landing-runner**
6. Does it need teams/orgs/subscriptions (SaaS)? → **vite-cf-saas-runner**
7. Does it need real-time/multiplayer sync? → **vite-cf-realtime-runner**
8. Is it API-only (no frontend needed)? → **vite-cf-api-runner**
9. Does it need AI/chatbot features? → **vite-cfagents-runner**
10. Is it a presentation/slide deck? → **reveal-presentation-pro**
11. Is it static with no backend? → **c-code-react-runner**
12. Does it need multi-entity storage? → **vite-cf-DO-v2-runner**
13. Does it need single global state? → **vite-cf-DO-runner**

## STYLE GUIDE:
- **Minimalist**: Clean, simple, modern interfaces
- **Brutalism**: Bold, raw, industrial aesthetics
- **Retro**: Vintage, nostalgic design elements
- **Illustrative**: Rich graphics and visual storytelling
- **Kid_Playful**: Colorful, fun, child-friendly interfaces
- **Custom**: Unique design that doesn't fit categories

## RULES:
- ALWAYS select a template (never return null)
- Prefer SPECIALIZED templates over general-purpose ones
- Use the decision tree to guide selection
- Provide clear, specific reasoning for selection
- Never select vite-cf-DO-KV-runner (deprecated)`

        const userPrompt = `**User Request:** "${query}"

**Available Templates:**
${templateDescriptions}

**Task:** Select the most suitable template and provide:
1. Template name (exact match from list)
2. Clear reasoning for why it fits the user's needs
3. Appropriate style for the project type. Try to come up with unique styles that might look nice and unique. Be creative about your choices. But don't pick brutalist all the time.
4. Descriptive project name

Analyze each template's features, frameworks, and architecture to make the best match.
${images && images.length > 0 ? `\n**Note:** User provided ${images.length} image(s) - consider visual requirements and UI style from the images.` : ''}

ENTROPY SEED: ${generateSecureToken(64)} - for unique results`;

        const userMessage = images && images.length > 0
            ? createMultiModalUserMessage(
                userPrompt,
                images.map(img => `data:${img.mimeType};base64,${img.base64Data}`),
                'high'
              )
            : createUserMessage(userPrompt);

        const messages = [
            createSystemMessage(systemPrompt),
            userMessage
        ];

        const { object: selection } = await executeInference({
            env,
            messages,
            agentActionName: "templateSelection",
            schema: TemplateSelectionSchema,
            context: inferenceContext,
            maxTokens: 2000,
        });


        logger.info(`AI template selection result: ${selection.selectedTemplateName || 'None'}, Reasoning: ${selection.reasoning}`);
        return selection;

    } catch (error) {
        logger.error("Error during AI template selection:", error);
        if (error instanceof RateLimitExceededError || error instanceof SecurityError) {
            throw error;
        }
        // Fallback to no template selection in case of error
        return { selectedTemplateName: null, reasoning: "An error occurred during the template selection process.", useCase: null, complexity: null, styleSelection: null, projectName: '' };
    }
}