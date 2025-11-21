import { useState } from 'react';
import {
	Book,
	Rocket,
	CreditCard,
	Code,
	Globe,
	AlertCircle,
	Search,
	ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpSection {
	id: string;
	icon: React.ReactNode;
	title: string;
	items: HelpItem[];
}

interface HelpItem {
	id: string;
	question: string;
	answer: string;
}

const helpSections: HelpSection[] = [
	{
		id: 'getting-started',
		icon: <Rocket className="w-6 h-6" />,
		title: 'Getting Started',
		items: [
			{
				id: 'first-app',
				question: 'How do I create my first app?',
				answer: `Creating your first app is simple:

1. Click "Create App" or "New Chat" button
2. Describe the app you want to build in the chat input
3. Be specific about features, design, and functionality
4. Our AI will generate a complete app blueprint and code
5. Watch your app come to life in the preview panel

Tips for better results:
- Be specific about your requirements
- Mention any design preferences
- Specify features you need
- Include any technical constraints`,
			},
			{
				id: 'platform-overview',
				question: 'What can I build with this platform?',
				answer: `You can build a wide variety of web applications:

- Landing pages and marketing sites
- Portfolio and personal websites
- Business applications and dashboards
- E-commerce storefronts
- Interactive tools and calculators
- Content management systems
- Social media applications
- API-driven applications

The platform generates full-stack applications with:
- Modern React frontend
- TypeScript for type safety
- TailwindCSS for styling
- Cloudflare Workers backend
- Database integration (when needed)
- Real-time features (when needed)`,
			},
			{
				id: 'templates',
				question: 'Should I use a template or start from scratch?',
				answer: `Both options have their advantages:

Start from Scratch:
- Maximum flexibility
- AI generates everything based on your description
- Best for unique or complex requirements
- Takes longer to generate

Use a Template:
- Faster generation time
- Pre-configured structure
- Industry-standard patterns
- Easier to customize
- Great for common use cases

Popular templates include:
- Landing Page - Marketing and promotional sites
- E-commerce - Online stores
- Blog - Content publishing
- Dashboard - Admin interfaces
- Portfolio - Showcase your work`,
			},
		],
	},
	{
		id: 'creating-apps',
		icon: <Code className="w-6 h-6" />,
		title: 'Creating Apps',
		items: [
			{
				id: 'prompt-engineering',
				question: 'How do I write effective prompts?',
				answer: `Good prompts are specific and detailed. Here's how to write them:

Structure your prompt:
1. What: Describe what you want to build
2. Features: List specific features
3. Design: Mention design preferences
4. Technical: Note any technical requirements

Example good prompt:
"Create a minimalist meditation timer app with:
- 5, 10, 15, 20 minute presets
- Ambient background sounds
- Progress visualization
- Dark mode support
- Mobile-responsive design"

Example poor prompt:
"Make me an app"

Be specific about:
- Target audience
- Color schemes
- Layout preferences
- Required functionality
- Data management needs`,
			},
			{
				id: 'generation-process',
				question: 'What happens during code generation?',
				answer: `The generation process has several phases:

1. Blueprint Phase:
   - AI analyzes your requirements
   - Creates project structure
   - Plans components and features
   - Selects appropriate technologies

2. Implementation Phases:
   - Core functionality
   - User interface
   - Styling and design
   - Backend logic (if needed)
   - Database setup (if needed)

3. Sandbox Deployment:
   - Code is deployed to preview environment
   - You can interact with your app live
   - Screenshot captured automatically

4. Review & Refinement:
   - Chat with AI to request changes
   - Regenerate specific files
   - Add new features
   - Fix issues

The entire process takes 2-5 minutes depending on complexity.`,
			},
			{
				id: 'iterating',
				question: 'How do I make changes to my app?',
				answer: `You can iterate on your app in several ways:

1. Chat-based Changes:
   - Ask for specific modifications
   - Request new features
   - Report issues that need fixing
   - The AI will update relevant files

2. Regenerate Files:
   - Click regenerate button on specific files
   - Provide context for what to change
   - File will be rewritten with improvements

3. Manual Editing:
   - View and edit code directly
   - Click on files in the file browser
   - Make manual changes (advanced)

4. Deep Debugger:
   - Automatic error detection
   - AI-powered debugging
   - Runtime error analysis
   - Comprehensive fixes

Best practices:
- Make one change at a time
- Be specific about what to change
- Test changes in preview
- Iterate gradually`,
			},
		],
	},
	{
		id: 'credits-pricing',
		icon: <CreditCard className="w-6 h-6" />,
		title: 'Credits & Pricing',
		items: [
			{
				id: 'credit-system',
				question: 'How does the credit system work?',
				answer: `Credits are consumed when using AI models:

Free Tier:
- Gemini 2.0 Flash: FREE for all operations
- 100 free credits on signup
- Rate limits apply

Credit Costs:
- Gemini 2.0 Flash: 0 credits (free)
- Gemini 2.5 Pro: 4 credits per request
- Claude Sonnet: 8 credits per request
- GPT-4: 10 credits per request

Credits are used for:
- Blueprint generation
- Code generation
- File regeneration
- Debugging operations
- Chat interactions with premium models

Tip: Use Gemini 2.0 Flash for most operations to save credits!`,
			},
			{
				id: 'subscription-tiers',
				question: 'What are the subscription tiers?',
				answer: `Choose the plan that fits your needs:

Free Tier:
- 100 credits on signup
- Unlimited Gemini 2.0 Flash usage
- 5 apps per month
- Community support

Starter ($19/month):
- 500 credits/month
- Unlimited apps
- Email support
- Higher rate limits

Pro ($49/month):
- 2000 credits/month
- Priority generation queue
- Advanced debugging
- Priority support
- Custom domains

Enterprise (Custom):
- Unlimited credits
- Dedicated resources
- White-label option
- SLA guarantees
- Custom integrations

Visit the Pricing page for full details.`,
			},
			{
				id: 'rate-limits',
				question: 'What are the rate limits?',
				answer: `Rate limits prevent abuse and ensure fair usage:

Free Tier:
- 10 requests per minute
- 100 requests per hour
- 1000 requests per day

Starter Tier:
- 30 requests per minute
- 500 requests per hour
- 5000 requests per day

Pro Tier:
- 100 requests per minute
- 2000 requests per hour
- 20000 requests per day

Enterprise:
- Custom limits based on needs

Rate limits apply to:
- API requests
- Code generation operations
- Sandbox deployments
- Screenshot captures

If you hit rate limits:
- Wait for the time window to reset
- Upgrade to higher tier
- Contact support for increases`,
			},
		],
	},
	{
		id: 'preview-deployment',
		icon: <Globe className="w-6 h-6" />,
		title: 'Preview & Deployment',
		items: [
			{
				id: 'preview-vs-deploy',
				question: 'What is the difference between Preview and Deploy?',
				answer: `Understanding Preview vs Deploy:

Preview (Sandbox):
- Temporary preview environment
- Auto-deployed during generation
- URL: preview-*.onaria.xyz
- Expires after inactivity
- Free for all users
- Perfect for testing and iteration
- Click "Refresh Preview" to restart

Deploy (Production):
- Permanent Cloudflare Workers deployment
- Custom subdomain: yourapp.onaria.xyz
- Always available
- Professional URLs
- Better performance
- Costs 1 deployment credit
- Requires Pro plan for custom domains

When to use each:
- Preview: During development and testing
- Deploy: When ready for production use

Note: Preview may show "container not available" if inactive. Click "Refresh Preview" to restart.`,
			},
			{
				id: 'deployment-process',
				question: 'How do I deploy my app to production?',
				answer: `Deploying to production is simple:

1. Complete your app:
   - Finish all features
   - Test in preview
   - Fix any issues

2. Click "Deploy" button:
   - Located in app detail page
   - Or in chat page preview panel

3. Wait for deployment:
   - Takes 30-60 seconds
   - Worker is created on Cloudflare
   - Custom URL is generated

4. Access your app:
   - URL: yourappname.onaria.xyz
   - Share with others
   - Always available

After deployment:
- App is live 24/7
- Professional URL
- Fast global CDN
- Automatic SSL
- No maintenance needed

To update deployed app:
- Make changes in chat
- Click "Deploy" again
- Deployment is updated`,
			},
			{
				id: 'custom-domains',
				question: 'Can I use my own domain?',
				answer: `Custom domains are available on Pro and Enterprise plans:

Setup process:
1. Upgrade to Pro or Enterprise plan
2. Go to your app settings
3. Add your custom domain
4. Update DNS records:
   - CNAME: yourapp.onaria.xyz
   - Or use Cloudflare for full integration
5. SSL automatically configured

Supported configurations:
- Subdomain: app.yourdomain.com
- Root domain: yourdomain.com
- Multiple domains per app

Benefits:
- Professional branding
- SEO advantages
- Full control
- Custom SSL certificates

Domain requirements:
- Must own the domain
- DNS access required
- Cloudflare recommended
- Propagation takes 5-60 minutes`,
			},
		],
	},
	{
		id: 'troubleshooting',
		icon: <AlertCircle className="w-6 h-6" />,
		title: 'Troubleshooting',
		items: [
			{
				id: 'generation-errors',
				question: 'What if code generation fails?',
				answer: `If generation fails, try these steps:

1. Check your prompt:
   - Is it clear and specific?
   - Are requirements realistic?
   - Try simplifying complex requests

2. Check credits:
   - Ensure you have enough credits
   - Switch to free Gemini 2.0 Flash model
   - Check subscription status

3. Retry generation:
   - Click "Try Again"
   - Rephrase your request
   - Break complex apps into phases

4. Use Deep Debugger:
   - Automatically detects issues
   - Suggests fixes
   - Can regenerate problematic files

5. Contact support:
   - Include app ID
   - Describe the issue
   - Share error messages

Common causes:
- Insufficient credits
- Rate limit exceeded
- API timeout
- Invalid requirements
- Infrastructure issues`,
			},
			{
				id: 'preview-errors',
				question: 'Why is my preview not working?',
				answer: `Common preview issues and solutions:

"Container not available" error:
- Sandbox expired after inactivity
- Click "Refresh Preview" button
- Waits 30 seconds for container restart

Blank preview screen:
- App may be loading
- Check browser console for errors
- Try refreshing preview
- Check if generation completed

Preview shows old version:
- Hard refresh: Ctrl+F5 (Cmd+Shift+R on Mac)
- Clear browser cache
- Click "Refresh Preview"

Network errors:
- Check internet connection
- Try different browser
- Disable browser extensions
- Check firewall settings

If issues persist:
- Use Deep Debugger to check for runtime errors
- Review console logs
- Contact support with app ID`,
			},
			{
				id: 'deployment-errors',
				question: 'What if deployment fails?',
				answer: `Deployment failures are rare but can happen:

Common issues:

"This application is not currently available":
- Workers for Platforms not enabled
- Use Preview instead for now
- Contact support for production access

Deployment timeout:
- Large apps take longer
- Wait and retry
- Check deployment status

Invalid worker name:
- Names must be URL-safe
- Only letters, numbers, hyphens
- Retry with different name

Quota exceeded:
- Cloudflare account limits
- Upgrade account
- Contact support

Solutions:
1. Check app is completed (status: completed)
2. Ensure no active errors
3. Try deployment again
4. Use preview while troubleshooting
5. Contact support with:
   - App ID
   - Error message
   - Deployment logs

Workaround:
Preview deployments always work and are suitable for most use cases.`,
			},
		],
	},
];

export default function HelpPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [openSections, setOpenSections] = useState<Set<string>>(
		new Set(['getting-started'])
	);
	const [openItems, setOpenItems] = useState<Set<string>>(new Set());

	const toggleSection = (sectionId: string) => {
		setOpenSections((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(sectionId)) {
				newSet.delete(sectionId);
			} else {
				newSet.add(sectionId);
			}
			return newSet;
		});
	};

	const toggleItem = (itemId: string) => {
		setOpenItems((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(itemId)) {
				newSet.delete(itemId);
			} else {
				newSet.add(itemId);
			}
			return newSet;
		});
	};

	// Filter sections and items based on search
	const filteredSections = helpSections
		.map((section) => ({
			...section,
			items: section.items.filter(
				(item) =>
					item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
					item.answer.toLowerCase().includes(searchQuery.toLowerCase())
			),
		}))
		.filter((section) => section.items.length > 0 || searchQuery === '');

	// Auto-expand sections with search results
	if (searchQuery && filteredSections.length > 0) {
		filteredSections.forEach((section) => {
			if (section.items.length > 0) {
				openSections.add(section.id);
				section.items.forEach((item) => openItems.add(item.id));
			}
		});
	}

	return (
		<div className="min-h-screen bg-cosmic-gradient-subtle">
			<div className="container mx-auto px-4 py-12 max-w-5xl">
				{/* Header */}
				<div className="text-center mb-12">
					<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-cosmic-blue to-cosmic-purple mb-6">
						<Book className="w-10 h-10 text-white" />
					</div>
					<h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
						Help & Documentation
					</h1>
					<p className="text-xl text-gray-300 max-w-2xl mx-auto">
						Everything you need to know about building and deploying apps with
						our platform
					</p>
				</div>

				{/* Search */}
				<div className="mb-8">
					<div className="relative max-w-2xl mx-auto">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							placeholder="Search for help..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-12 pr-4 py-4 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent"
						/>
					</div>
				</div>

				{/* Help Sections */}
				<div className="space-y-6">
					{filteredSections.map((section) => (
						<div
							key={section.id}
							className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
						>
							{/* Section Header */}
							<button
								onClick={() => toggleSection(section.id)}
								className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
							>
								<div className="flex items-center gap-4">
									<div className="p-3 rounded-lg bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 text-cosmic-blue">
										{section.icon}
									</div>
									<h2 className="text-2xl font-bold text-white">
										{section.title}
									</h2>
								</div>
								<motion.div
									animate={{ rotate: openSections.has(section.id) ? 180 : 0 }}
									transition={{ duration: 0.2 }}
								>
									<ChevronDown className="w-6 h-6 text-gray-400" />
								</motion.div>
							</button>

							{/* Section Items */}
							<AnimatePresence>
								{openSections.has(section.id) && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.3 }}
										className="overflow-hidden"
									>
										<div className="px-6 pb-6 space-y-4">
											{section.items.map((item) => (
												<div
													key={item.id}
													className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden"
												>
													<button
														onClick={() => toggleItem(item.id)}
														className="w-full p-4 text-left hover:bg-white/5 transition-colors"
													>
														<div className="flex items-start justify-between gap-4">
															<h3 className="text-lg font-semibold text-white flex-1">
																{item.question}
															</h3>
															<motion.div
																animate={{
																	rotate: openItems.has(item.id) ? 180 : 0,
																}}
																transition={{ duration: 0.2 }}
																className="flex-shrink-0"
															>
																<ChevronDown className="w-5 h-5 text-gray-400" />
															</motion.div>
														</div>
													</button>
													<AnimatePresence>
														{openItems.has(item.id) && (
															<motion.div
																initial={{ height: 0, opacity: 0 }}
																animate={{ height: 'auto', opacity: 1 }}
																exit={{ height: 0, opacity: 0 }}
																transition={{ duration: 0.2 }}
																className="overflow-hidden"
															>
																<div className="px-4 pb-4">
																	<div className="prose prose-invert prose-sm max-w-none">
																		<p className="text-gray-300 whitespace-pre-line leading-relaxed">
																			{item.answer}
																		</p>
																	</div>
																</div>
															</motion.div>
														)}
													</AnimatePresence>
												</div>
											))}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					))}
				</div>

				{/* No results */}
				{searchQuery && filteredSections.length === 0 && (
					<div className="text-center py-12">
						<AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 className="text-xl font-semibold text-white mb-2">
							No results found
						</h3>
						<p className="text-gray-400">
							Try different keywords or browse all sections
						</p>
						<button
							onClick={() => setSearchQuery('')}
							className="mt-4 px-6 py-2 rounded-lg bg-gradient-to-r from-cosmic-blue to-cosmic-purple text-white hover:opacity-90 transition-opacity"
						>
							Clear Search
						</button>
					</div>
				)}

				{/* Contact Support */}
				<div className="mt-12 text-center backdrop-blur-xl bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 border border-white/20 rounded-2xl p-8">
					<h3 className="text-2xl font-bold text-white mb-2">
						Still need help?
					</h3>
					<p className="text-gray-300 mb-6">
						Our support team is here to help you succeed
					</p>
					<a
						href="mailto:support@onaria.xyz"
						className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cosmic-blue to-cosmic-purple text-white hover:opacity-90 transition-opacity"
					>
						Contact Support
					</a>
				</div>
			</div>
		</div>
	);
}
