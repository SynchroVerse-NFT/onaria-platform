import React, { useState } from 'react';
import { Link } from 'react-router';
import { Check, Sparkles, Zap, Crown, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import {
	TIER_PRICING,
	type SubscriptionTier,
} from '@/lib/pricing';

const tierIcons: Record<SubscriptionTier, React.FC<{ className?: string }>> = {
	free: Sparkles,
	basic: Zap,
	pro: Rocket,
	enterprise: Crown,
};

const tierColors: Record<SubscriptionTier, string> = {
	free: 'from-blue-500 to-cyan-500',
	basic: 'from-purple-500 to-pink-500',
	pro: 'from-orange-500 to-red-500',
	enterprise: 'from-yellow-500 to-amber-500',
};

export default function Pricing() {
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
		'monthly'
	);

	const tiers: SubscriptionTier[] = ['free', 'basic', 'pro', 'enterprise'];

	const handleSelectPlan = (tier: SubscriptionTier) => {
		if (tier === 'free') {
			window.location.href = '/';
			return;
		}
		console.log(`Selected plan: ${tier}`);
	};

	return (
		<div className="min-h-screen bg-cosmic-gradient-full relative overflow-hidden">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(100,181,246,0.1),transparent_50%)]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]" />

			<div className="container mx-auto px-4 py-16 relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center mb-12"
				>
					<h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cosmic-blue via-cosmic-purple to-cosmic-pink bg-clip-text text-transparent">
						Choose Your Plan
					</h1>
					<p className="text-xl text-gray-300 dark:text-gray-400 max-w-2xl mx-auto">
						Start building amazing apps with AI. Upgrade anytime as your needs grow.
					</p>
				</motion.div>

				<div className="flex justify-center mb-12">
					<div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-full p-1 inline-flex">
						<button
							onClick={() => setBillingCycle('monthly')}
							className={`px-8 py-3 rounded-full transition-all duration-300 ${
								billingCycle === 'monthly'
									? 'bg-cosmic-gradient text-white'
									: 'text-gray-300 dark:text-gray-400 hover:text-white'
							}`}
						>
							Monthly
						</button>
						<button
							onClick={() => setBillingCycle('yearly')}
							className={`px-8 py-3 rounded-full transition-all duration-300 ${
								billingCycle === 'yearly'
									? 'bg-cosmic-gradient text-white'
									: 'text-gray-300 dark:text-gray-400 hover:text-white'
							}`}
						>
							Yearly
							<span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
								Save 20%
							</span>
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
					{tiers.map((tier, index) => {
						const pricing = TIER_PRICING[tier];
						const Icon = tierIcons[tier];
						const isPopular = pricing.popular;
						const isRecommended = pricing.recommended;
						const price =
							billingCycle === 'monthly'
								? pricing.monthlyPrice
								: Math.floor(pricing.yearlyPrice / 12);

						return (
							<motion.div
								key={tier}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.1 }}
								className={`relative ${
									isPopular || isRecommended ? 'lg:scale-110 lg:z-10' : ''
								}`}
							>
								{(isPopular || isRecommended) && (
									<div className="absolute -top-5 left-0 right-0 flex justify-center">
										<span className="bg-gradient-to-r from-cosmic-purple to-cosmic-pink text-white px-4 py-1 rounded-full text-sm font-medium">
											{isPopular ? 'Most Popular' : 'Recommended'}
										</span>
									</div>
								)}

								<div
									className={`backdrop-blur-xl bg-white/10 dark:bg-black/20 border ${
										isPopular || isRecommended
											? 'border-cosmic-purple/50'
											: 'border-white/20'
									} rounded-2xl p-8 h-full flex flex-col transition-all duration-300 hover:scale-105 hover:border-cosmic-blue/50`}
								>
									<div className="flex items-center justify-between mb-6">
										<div
											className={`p-3 rounded-xl bg-gradient-to-br ${tierColors[tier]}`}
										>
											<Icon className="w-6 h-6 text-white" />
										</div>
										<span className="text-sm font-medium text-gray-400">
											{tier.toUpperCase()}
										</span>
									</div>

									<h3 className="text-2xl font-bold mb-2 text-white">
										{pricing.displayName}
									</h3>

									<div className="mb-6">
										{price === 0 ? (
											<div className="flex items-baseline">
												<span className="text-4xl font-bold text-white">Free</span>
											</div>
										) : price === -1 ? (
											<div className="flex items-baseline">
												<span className="text-2xl font-bold text-white">
													Contact Us
												</span>
											</div>
										) : (
											<div className="flex items-baseline">
												<span className="text-4xl font-bold text-white">
													${price}
												</span>
												<span className="text-gray-400 ml-2">/month</span>
											</div>
										)}
										{billingCycle === 'yearly' && price > 0 && price !== -1 && (
											<p className="text-sm text-gray-400 mt-1">
												${pricing.yearlyPrice}/year (save $
												{pricing.monthlyPrice * 12 - pricing.yearlyPrice})
											</p>
										)}
									</div>

									<ul className="space-y-3 mb-8 flex-grow">
										{pricing.features.map((feature, i) => (
											<li key={i} className="flex items-start gap-3">
												<Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
												<span className="text-gray-300 text-sm">{feature}</span>
											</li>
										))}
									</ul>

									<button
										onClick={() => handleSelectPlan(tier)}
										className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
											isPopular || isRecommended
												? 'bg-cosmic-gradient text-white hover:shadow-lg hover:shadow-cosmic-purple/50'
												: tier === 'free'
													? 'border border-white/20 text-white hover:bg-white/5'
													: 'border border-white/20 text-white hover:bg-white/10'
										}`}
									>
										{tier === 'free'
											? 'Get Started'
											: tier === 'enterprise'
												? 'Contact Sales'
												: 'Upgrade'}
									</button>
								</div>
							</motion.div>
						);
					})}
				</div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
					className="mt-16 text-center"
				>
					<p className="text-gray-400 mb-4">
						Have questions about our pricing?
					</p>
					<Link
						to="/"
						className="text-cosmic-blue hover:text-cosmic-purple transition-colors"
					>
						Contact Support
					</Link>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="mt-16 backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-8 max-w-4xl mx-auto"
				>
					<h2 className="text-2xl font-bold mb-6 text-white text-center">
						Frequently Asked Questions
					</h2>
					<div className="space-y-6">
						<div>
							<h3 className="font-semibold text-white mb-2">
								What are credits?
							</h3>
							<p className="text-gray-400 text-sm">
								Credits are used for AI model calls. Different models have different
								credit costs: Gemini 2.5 Pro (4 credits), Gemini 2.5 Flash (1
								credit), Gemini 2.0 Flash (0 credits for platform use).
							</p>
						</div>
						<div>
							<h3 className="font-semibold text-white mb-2">
								Can I upgrade or downgrade anytime?
							</h3>
							<p className="text-gray-400 text-sm">
								Yes! You can change your plan at any time. Upgrades take effect
								immediately, and downgrades take effect at the end of your current
								billing cycle.
							</p>
						</div>
						<div>
							<h3 className="font-semibold text-white mb-2">
								What happens if I hit my rate limit?
							</h3>
							<p className="text-gray-400 text-sm">
								Basic and Pro plans automatically fall back to a lighter model when
								you hit limits. Free tier users will need to wait for their limits to
								reset. All limits reset hourly and daily.
							</p>
						</div>
						<div>
							<h3 className="font-semibold text-white mb-2">
								Is there a money-back guarantee?
							</h3>
							<p className="text-gray-400 text-sm">
								Yes! We offer a 7-day money-back guarantee on all paid plans. If
								you're not satisfied, contact support for a full refund.
							</p>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
