import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, CreditCard, Lock, AlertCircle } from 'lucide-react';
import { TIER_PRICING, type SubscriptionTier } from '@/lib/pricing';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

export default function Checkout() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [isProcessing, setIsProcessing] = useState(false);
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

	const tier = (searchParams.get('tier') || 'basic') as SubscriptionTier;
	const pricing = TIER_PRICING[tier];

	// Form state
	const [formData, setFormData] = useState({
		cardNumber: '',
		cardExpiry: '',
		cardCvc: '',
		billingName: '',
		billingEmail: user?.email || '',
		billingAddress: '',
		billingCity: '',
		billingZip: '',
		billingCountry: 'US',
	});

	useEffect(() => {
		if (user?.email) {
			setFormData(prev => ({ ...prev, billingEmail: user.email || '' }));
		}
	}, [user]);

	useEffect(() => {
		// If tier is free or invalid, redirect to pricing
		if (!pricing || tier === 'free' || pricing.monthlyPrice === 0) {
			navigate('/pricing');
		}
	}, [tier, pricing, navigate]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const formatCardNumber = (value: string) => {
		const cleaned = value.replace(/\s/g, '');
		const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
		return formatted;
	};

	const formatCardExpiry = (value: string) => {
		const cleaned = value.replace(/\D/g, '');
		if (cleaned.length >= 2) {
			return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
		}
		return cleaned;
	};

	const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16));
		setFormData(prev => ({ ...prev, cardNumber: formatted }));
	};

	const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatCardExpiry(e.target.value);
		setFormData(prev => ({ ...prev, cardExpiry: formatted }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!user) {
			toast.error('Please sign in to continue');
			navigate('/');
			return;
		}

		setIsProcessing(true);

		try {
			// TODO: Implement actual Stripe payment integration
			// For now, show a message that this is coming soon
			await new Promise(resolve => setTimeout(resolve, 2000));

			toast.info('Payment processing is coming soon! Your account has been noted for early access.', {
				duration: 5000,
			});

			// Redirect to profile or success page
			setTimeout(() => {
				navigate('/profile');
			}, 2000);

		} catch (error) {
			console.error('Checkout error:', error);
			toast.error('Failed to process payment. Please try again.');
		} finally {
			setIsProcessing(false);
		}
	};

	if (!pricing || tier === 'free') {
		return null;
	}

	const price = billingCycle === 'monthly' ? pricing.monthlyPrice : Math.floor(pricing.yearlyPrice / 12);
	const totalPrice = billingCycle === 'monthly' ? pricing.monthlyPrice : pricing.yearlyPrice;
	const savings = billingCycle === 'yearly' ? (pricing.monthlyPrice * 12 - pricing.yearlyPrice) : 0;

	return (
		<div className="min-h-screen bg-cosmic-gradient-full relative overflow-hidden">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(100,181,246,0.1),transparent_50%)]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]" />

			<div className="container mx-auto px-4 py-16 relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="max-w-6xl mx-auto"
				>
					<Link
						to="/pricing"
						className="inline-flex items-center gap-2 text-gray-100 hover:text-white mb-8 transition-colors"
					>
						<ArrowLeft className="w-4 h-4" />
						Back to Pricing
					</Link>

					<div className="grid lg:grid-cols-2 gap-8">
						{/* Order Summary */}
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.1 }}
							className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-8"
						>
							<h2 className="text-2xl font-bold text-white mb-6">Order Summary</h2>

							<div className="space-y-6">
								<div>
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-xl font-semibold text-white">{pricing.displayName}</h3>
										<span className="text-sm font-medium text-gray-300 uppercase bg-cosmic-purple/20 px-3 py-1 rounded-full">
											{tier}
										</span>
									</div>

									<ul className="space-y-2 mb-6">
										{pricing.features.slice(0, 5).map((feature, i) => (
											<li key={i} className="flex items-start gap-2 text-gray-100 text-sm">
												<Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
												<span>{feature}</span>
											</li>
										))}
										{pricing.features.length > 5 && (
											<li className="text-gray-300 text-sm ml-6">
												+{pricing.features.length - 5} more features
											</li>
										)}
									</ul>
								</div>

								<div className="border-t border-white/10 pt-6">
									<div className="flex justify-center mb-4">
										<div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-full p-1 inline-flex">
											<button
												type="button"
												onClick={() => setBillingCycle('monthly')}
												className={`px-6 py-2 rounded-full transition-all duration-300 text-sm ${
													billingCycle === 'monthly'
														? 'bg-cosmic-gradient text-white'
														: 'text-gray-100 hover:text-white'
												}`}
											>
												Monthly
											</button>
											<button
												type="button"
												onClick={() => setBillingCycle('yearly')}
												className={`px-6 py-2 rounded-full transition-all duration-300 text-sm ${
													billingCycle === 'yearly'
														? 'bg-cosmic-gradient text-white'
														: 'text-gray-100 hover:text-white'
												}`}
											>
												Yearly
												<span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
													Save 20%
												</span>
											</button>
										</div>
									</div>

									<div className="space-y-3 text-gray-100">
										<div className="flex justify-between">
											<span>Plan ({billingCycle})</span>
											<span>${price}/month</span>
										</div>
										{billingCycle === 'yearly' && (
											<div className="flex justify-between text-green-400">
												<span>Yearly discount</span>
												<span>-${savings}</span>
											</div>
										)}
										<div className="border-t border-white/10 pt-3 flex justify-between text-white font-bold text-lg">
											<span>Total {billingCycle === 'yearly' ? 'per year' : 'per month'}</span>
											<span>${totalPrice}</span>
										</div>
									</div>
								</div>

								<div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
										<div className="text-sm text-gray-100">
											<p className="font-medium mb-1">Secure Payment</p>
											<p className="text-gray-300">Your payment information is encrypted and secure. We never store your card details.</p>
										</div>
									</div>
								</div>
							</div>
						</motion.div>

						{/* Payment Form */}
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.2 }}
							className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-8"
						>
							<h2 className="text-2xl font-bold text-white mb-6">Payment Details</h2>

							{/* Coming Soon Notice */}
							<div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
								<div className="flex items-start gap-3">
									<AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
									<div className="text-sm text-gray-100">
										<p className="font-medium mb-1">Payment Processing Coming Soon</p>
										<p className="text-gray-300">We're finalizing our payment integration. Submit your details to be notified when payments go live and receive early access benefits!</p>
									</div>
								</div>
							</div>

							<form onSubmit={handleSubmit} className="space-y-6">
								<div>
									<label className="block text-sm font-medium text-gray-100 mb-2">
										Card Number
									</label>
									<div className="relative">
										<input
											type="text"
											name="cardNumber"
											value={formData.cardNumber}
											onChange={handleCardNumberChange}
											placeholder="1234 5678 9012 3456"
											maxLength={19}
											required
											className="w-full px-4 py-3 pl-12 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
										/>
										<CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-100 mb-2">
											Expiry Date
										</label>
										<input
											type="text"
											name="cardExpiry"
											value={formData.cardExpiry}
											onChange={handleCardExpiryChange}
											placeholder="MM/YY"
											maxLength={5}
											required
											className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-100 mb-2">
											CVC
										</label>
										<input
											type="text"
											name="cardCvc"
											value={formData.cardCvc}
											onChange={handleInputChange}
											placeholder="123"
											maxLength={4}
											required
											className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-100 mb-2">
										Billing Name
									</label>
									<input
										type="text"
										name="billingName"
										value={formData.billingName}
										onChange={handleInputChange}
										placeholder="John Doe"
										required
										className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-100 mb-2">
										Email
									</label>
									<input
										type="email"
										name="billingEmail"
										value={formData.billingEmail}
										onChange={handleInputChange}
										placeholder="john@example.com"
										required
										className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-100 mb-2">
										Billing Address
									</label>
									<input
										type="text"
										name="billingAddress"
										value={formData.billingAddress}
										onChange={handleInputChange}
										placeholder="123 Main St"
										required
										className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-100 mb-2">
											City
										</label>
										<input
											type="text"
											name="billingCity"
											value={formData.billingCity}
											onChange={handleInputChange}
											placeholder="San Francisco"
											required
											className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-100 mb-2">
											ZIP Code
										</label>
										<input
											type="text"
											name="billingZip"
											value={formData.billingZip}
											onChange={handleInputChange}
											placeholder="94102"
											required
											className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-100 mb-2">
										Country
									</label>
									<select
										name="billingCountry"
										value={formData.billingCountry}
										onChange={handleInputChange}
										required
										className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
									>
										<option value="US">United States</option>
										<option value="CA">Canada</option>
										<option value="GB">United Kingdom</option>
										<option value="AU">Australia</option>
										<option value="DE">Germany</option>
										<option value="FR">France</option>
										<option value="JP">Japan</option>
										<option value="Other">Other</option>
									</select>
								</div>

								<button
									type="submit"
									disabled={isProcessing}
									className="w-full py-4 px-6 rounded-xl font-medium bg-cosmic-gradient text-white hover:shadow-lg hover:shadow-cosmic-purple/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
								>
									{isProcessing ? (
										<>
											<div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
											Processing...
										</>
									) : (
										<>
											<Lock className="w-5 h-5" />
											Subscribe to {pricing.displayName} - ${totalPrice}/{billingCycle === 'yearly' ? 'year' : 'month'}
										</>
									)}
								</button>

								<p className="text-xs text-gray-300 text-center">
									By subscribing, you agree to our Terms of Service and Privacy Policy. You can cancel anytime.
								</p>
							</form>
						</motion.div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
