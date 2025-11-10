import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Info, Sparkles, Zap, Building, Rocket, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

type BillingPeriod = 'monthly' | 'yearly';

interface PricingTier {
	id: string;
	name: string;
	price: number;
	yearlyPrice: number;
	description: string;
	icon: React.ReactNode;
	popular?: boolean;
	features: string[];
	cta: string;
	variant: 'default' | 'highlight' | 'enterprise';
}

const tiers: PricingTier[] = [
	{
		id: 'free',
		name: 'Free',
		price: 0,
		yearlyPrice: 0,
		description: 'Perfect for trying out the platform',
		icon: <Sparkles className="h-5 w-5" />,
		features: [
			'5 apps',
			'100 AI generations/month',
			'Community support',
			'Public deployments',
			'Basic templates',
		],
		cta: 'Start Free',
		variant: 'default',
	},
	{
		id: 'pro',
		name: 'Pro',
		price: 20,
		yearlyPrice: 16,
		description: 'For professionals building multiple apps',
		icon: <Zap className="h-5 w-5" />,
		popular: true,
		features: [
			'50 apps',
			'2,000 AI generations/month',
			'Email support',
			'Custom domains',
			'All templates',
			'GitHub sync',
			'Priority generation',
			'Usage analytics',
		],
		cta: 'Start Pro Trial',
		variant: 'highlight',
	},
	{
		id: 'business',
		name: 'Business',
		price: 99,
		yearlyPrice: 79,
		description: 'For teams and growing businesses',
		icon: <Building className="h-5 w-5" />,
		features: [
			'Unlimited apps',
			'10,000 AI generations/month',
			'Priority support',
			'White-label options',
			'Team collaboration',
			'Advanced analytics',
			'n8n workflows (500 executions/month)',
			'Private deployments',
			'SLA guarantee',
		],
		cta: 'Start Business Trial',
		variant: 'default',
	},
	{
		id: 'enterprise',
		name: 'Enterprise',
		price: 0,
		yearlyPrice: 0,
		description: 'Custom solutions for large organizations',
		icon: <Rocket className="h-5 w-5" />,
		features: [
			'Everything in Business',
			'Custom AI models',
			'Dedicated support',
			'Volume discounts',
			'Custom integrations',
			'SSO & SAML',
			'Advanced security',
			'Unlimited workflows',
			'Custom SLA',
		],
		cta: 'Contact Sales',
		variant: 'enterprise',
	},
	{
		id: 'byok',
		name: 'BYOK',
		price: 15,
		yearlyPrice: 12,
		description: 'Bring your own API keys',
		icon: <Key className="h-5 w-5" />,
		features: [
			'Use your own OpenAI/Anthropic/Google API keys',
			'No generation limits',
			'20 apps',
			'All templates',
			'Custom domains',
			'GitHub sync',
			'Full platform access at reduced cost',
		],
		cta: 'Start BYOK',
		variant: 'default',
	},
];

interface FeatureComparison {
	category: string;
	features: {
		name: string;
		free: string | boolean;
		pro: string | boolean;
		business: string | boolean;
		enterprise: string | boolean;
		byok: string | boolean;
	}[];
}

const featureComparison: FeatureComparison[] = [
	{
		category: 'Core Features',
		features: [
			{
				name: 'Number of apps',
				free: '5',
				pro: '50',
				business: 'Unlimited',
				enterprise: 'Unlimited',
				byok: '20',
			},
			{
				name: 'AI generations per month',
				free: '100',
				pro: '2,000',
				business: '10,000',
				enterprise: 'Custom',
				byok: 'Unlimited',
			},
			{
				name: 'Custom domains',
				free: false,
				pro: true,
				business: true,
				enterprise: true,
				byok: true,
			},
			{
				name: 'All templates',
				free: false,
				pro: true,
				business: true,
				enterprise: true,
				byok: true,
			},
		],
	},
	{
		category: 'Advanced Features',
		features: [
			{
				name: 'GitHub integration',
				free: false,
				pro: true,
				business: true,
				enterprise: true,
				byok: true,
			},
			{
				name: 'n8n workflows',
				free: false,
				pro: false,
				business: '500 executions/month',
				enterprise: 'Unlimited',
				byok: false,
			},
			{
				name: 'Team collaboration',
				free: false,
				pro: false,
				business: true,
				enterprise: true,
				byok: false,
			},
			{
				name: 'White-label options',
				free: false,
				pro: false,
				business: true,
				enterprise: true,
				byok: false,
			},
		],
	},
	{
		category: 'Support & Analytics',
		features: [
			{
				name: 'Support level',
				free: 'Community',
				pro: 'Email',
				business: 'Priority',
				enterprise: 'Dedicated',
				byok: 'Email',
			},
			{
				name: 'Analytics',
				free: false,
				pro: 'Basic',
				business: 'Advanced',
				enterprise: 'Custom',
				byok: 'Basic',
			},
			{
				name: 'SLA guarantee',
				free: false,
				pro: false,
				business: true,
				enterprise: 'Custom',
				byok: false,
			},
		],
	},
];

const faqs = [
	{
		question: 'Can I change plans anytime?',
		answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged a prorated amount for the remainder of your billing period. When downgrading, the change will take effect at the end of your current billing period.',
	},
	{
		question: 'What payment methods do you accept?',
		answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and cryptocurrency payments including Solana (SOL), Ethereum (ETH), Polygon (MATIC), and Base (ETH on Base). Crypto payments are processed securely through our payment partners.',
	},
	{
		question: 'Is there a free trial?',
		answer: 'The Free tier is available forever with no credit card required. Pro and Business plans come with a 14-day free trial. You can cancel anytime during the trial period without being charged.',
	},
	{
		question: 'What happens if I exceed my limits?',
		answer: 'If you reach your monthly AI generation limit, you\'ll receive notifications at 80% and 100% usage. You can either upgrade your plan or wait until the next billing cycle. Your apps will continue to work, but new AI generations will be paused until you upgrade or your limit resets.',
	},
	{
		question: 'Do you offer refunds?',
		answer: 'We offer a 30-day money-back guarantee for annual plans and a 7-day refund window for monthly plans. If you\'re not satisfied, contact our support team and we\'ll process your refund promptly.',
	},
	{
		question: 'Can I pay with cryptocurrency?',
		answer: 'Yes! We accept Solana (SOL), Ethereum (ETH), Polygon (MATIC), and Base (ETH on Base). Crypto payments offer instant processing and often lower transaction fees. Select "Pay with Crypto" during checkout to see available options.',
	},
];

const cryptoLogos = [
	{ name: 'Solana', symbol: 'SOL', color: 'text-purple-500' },
	{ name: 'Ethereum', symbol: 'ETH', color: 'text-blue-400' },
	{ name: 'Polygon', symbol: 'MATIC', color: 'text-purple-600' },
	{ name: 'Base', symbol: 'ETH', color: 'text-blue-500' },
];

export default function PricingPage() {
	const { user } = useAuth();
	const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

	const userTier = 'free'; // TODO: Get from user context

	const handleCTA = (tierId: string) => {
		if (tierId === 'enterprise') {
			// TODO: Open contact sales modal
			console.log('Contact sales');
		} else {
			// TODO: Navigate to checkout or subscription management
			console.log('Subscribe to', tierId);
		}
	};

	const getPrice = (tier: PricingTier) => {
		if (tier.price === 0) return tier.name === 'Enterprise' ? 'Custom' : 'Free';
		return billingPeriod === 'yearly' ? `$${tier.yearlyPrice}` : `$${tier.price}`;
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-bg-1 to-bg-2">
			<div className="container mx-auto px-4 py-12">
				{/* Hero Section */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center mb-12"
				>
					<h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent/80">
						Simple, Transparent Pricing
					</h1>
					<p className="text-lg md:text-xl text-text-tertiary max-w-2xl mx-auto mb-8">
						Choose the plan that fits your needs. Upgrade or downgrade anytime.
					</p>

					{/* Billing Toggle */}
					<div className="flex items-center justify-center gap-4 mb-4">
						<Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as BillingPeriod)} className="mx-auto">
							<TabsList>
								<TabsTrigger value="monthly">Monthly</TabsTrigger>
								<TabsTrigger value="yearly">
									Yearly
									<Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
										Save 20%
									</Badge>
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					{/* Crypto Payment Info */}
					<div className="flex items-center justify-center gap-2 text-sm text-text-tertiary">
						<Info className="h-4 w-4" />
						<span>Crypto payments accepted:</span>
						{cryptoLogos.map((crypto) => (
							<Badge key={crypto.symbol} variant="outline" className={cn('border-current', crypto.color)}>
								{crypto.symbol}
							</Badge>
						))}
					</div>
				</motion.div>

				{/* Pricing Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
					{tiers.map((tier, idx) => {
						const isCurrentPlan = !!(user && userTier === tier.id);
						const isPopular = tier.popular;

						return (
							<motion.div
								key={tier.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: idx * 0.1 }}
								className={cn(
									'relative',
									isPopular && 'lg:scale-105 z-10'
								)}
							>
								<Card
									className={cn(
										'h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
										isPopular && 'border-accent shadow-xl shadow-accent/20',
										tier.variant === 'highlight' && 'bg-gradient-to-b from-accent/5 to-transparent'
									)}
								>
									{isPopular && (
										<div className="absolute -top-4 left-0 right-0 flex justify-center">
											<Badge className="bg-accent text-white border-accent shadow-lg">
												Most Popular
											</Badge>
										</div>
									)}

									<CardHeader className="pb-4">
										<div className="flex items-center justify-between mb-2">
											<div className={cn(
												'p-2 rounded-lg',
												isPopular ? 'bg-accent/10 text-accent' : 'bg-bg-3 text-text-secondary'
											)}>
												{tier.icon}
											</div>
											{isCurrentPlan && (
												<Badge variant="secondary" className="text-xs">
													Current Plan
												</Badge>
											)}
										</div>
										<CardTitle className="text-2xl">{tier.name}</CardTitle>
										<CardDescription className="text-sm">
											{tier.description}
										</CardDescription>
									</CardHeader>

									<CardContent className="flex-1 pb-4">
										<div className="mb-6">
											<div className="flex items-baseline gap-1">
												<span className="text-4xl font-bold text-text-primary">
													{getPrice(tier)}
												</span>
												{tier.price > 0 && (
													<span className="text-text-tertiary">
														/{billingPeriod === 'yearly' ? 'year' : 'month'}
													</span>
												)}
											</div>
											{billingPeriod === 'yearly' && tier.price > 0 && (
												<p className="text-xs text-text-tertiary mt-1">
													Billed ${tier.yearlyPrice * 12}/year
												</p>
											)}
										</div>

										<ul className="space-y-3">
											{tier.features.map((feature, featureIdx) => (
												<li key={featureIdx} className="flex items-start gap-2 text-sm">
													<Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
													<span className="text-text-secondary">{feature}</span>
												</li>
											))}
										</ul>
									</CardContent>

									<CardFooter>
										<Button
											className={cn(
												'w-full',
												isPopular && 'bg-accent hover:bg-accent/90 text-white',
												tier.variant === 'enterprise' && 'bg-bg-3 hover:bg-bg-3/80'
											)}
											variant={isPopular ? 'default' : 'outline'}
											onClick={() => handleCTA(tier.id)}
											disabled={isCurrentPlan}
										>
											{isCurrentPlan ? 'Current Plan' : tier.cta}
										</Button>
									</CardFooter>
								</Card>
							</motion.div>
						);
					})}
				</div>

				{/* Feature Comparison Table */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.6 }}
					className="mb-16"
				>
					<h2 className="text-3xl font-bold text-center mb-8 text-text-primary">
						Feature Comparison
					</h2>

					<div className="overflow-x-auto">
						<div className="inline-block min-w-full align-middle">
							<div className="overflow-hidden border border-border rounded-lg">
								<table className="min-w-full divide-y divide-border">
									<thead className="bg-bg-3">
										<tr>
											<th className="px-6 py-4 text-left text-sm font-semibold text-text-primary">
												Feature
											</th>
											<th className="px-6 py-4 text-center text-sm font-semibold text-text-primary">
												Free
											</th>
											<th className="px-6 py-4 text-center text-sm font-semibold text-text-primary">
												<div className="flex items-center justify-center gap-2">
													Pro
													<Badge className="bg-accent text-white">Popular</Badge>
												</div>
											</th>
											<th className="px-6 py-4 text-center text-sm font-semibold text-text-primary">
												Business
											</th>
											<th className="px-6 py-4 text-center text-sm font-semibold text-text-primary">
												Enterprise
											</th>
											<th className="px-6 py-4 text-center text-sm font-semibold text-text-primary">
												BYOK
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border bg-bg-4 dark:bg-bg-2">
										{featureComparison.map((category) => (
											<>
												<tr key={category.category} className="bg-bg-3/50">
													<td colSpan={6} className="px-6 py-3 text-sm font-semibold text-text-primary">
														{category.category}
													</td>
												</tr>
												{category.features.map((feature) => (
													<tr key={feature.name} className="hover:bg-bg-3/30 transition-colors">
														<td className="px-6 py-4 text-sm text-text-secondary">
															{feature.name}
														</td>
														{(['free', 'pro', 'business', 'enterprise', 'byok'] as const).map((tier) => (
															<td key={tier} className="px-6 py-4 text-center text-sm">
																{typeof feature[tier] === 'boolean' ? (
																	feature[tier] ? (
																		<Check className="h-5 w-5 text-green-500 mx-auto" />
																	) : (
																		<X className="h-5 w-5 text-text-tertiary/40 mx-auto" />
																	)
																) : (
																	<span className="text-text-secondary font-medium">
																		{feature[tier]}
																	</span>
																)}
															</td>
														))}
													</tr>
												))}
											</>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</motion.div>

				{/* FAQ Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.8 }}
					className="max-w-3xl mx-auto"
				>
					<h2 className="text-3xl font-bold text-center mb-8 text-text-primary">
						Frequently Asked Questions
					</h2>

					<Accordion type="single" collapsible className="space-y-2">
						{faqs.map((faq, idx) => (
							<AccordionItem key={idx} value={`faq-${idx}`} className="border border-border rounded-lg px-6 bg-bg-4 dark:bg-bg-2">
								<AccordionTrigger className="text-left font-semibold text-text-primary hover:no-underline">
									{faq.question}
								</AccordionTrigger>
								<AccordionContent className="text-text-secondary">
									{faq.answer}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</motion.div>

				{/* Final CTA */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 1 }}
					className="text-center mt-16"
				>
					<Card className="max-w-2xl mx-auto bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
						<CardHeader>
							<CardTitle className="text-2xl">Ready to get started?</CardTitle>
							<CardDescription>
								Start building amazing apps with AI today. No credit card required for the free tier.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex gap-4 justify-center">
							<Button size="lg" className="bg-accent hover:bg-accent/90 text-white">
								Start Free Trial
							</Button>
							<Button size="lg" variant="outline">
								Contact Sales
							</Button>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
