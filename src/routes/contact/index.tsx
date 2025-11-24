import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Phone, MapPin, Send, Check, AlertCircle } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

type InquiryType = 'general' | 'enterprise' | 'support' | 'billing' | 'partnership';

export default function Contact() {
	const { user } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const [formData, setFormData] = useState({
		name: user?.displayName || '',
		email: user?.email || '',
		company: '',
		inquiryType: 'general' as InquiryType,
		subject: '',
		message: '',
	});

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name || !formData.email || !formData.message) {
			toast.error('Please fill in all required fields');
			return;
		}

		setIsSubmitting(true);

		try {
			// TODO: Implement actual contact form submission to backend
			// For now, simulate API call
			await new Promise(resolve => setTimeout(resolve, 1500));

			console.log('Contact form submission:', formData);

			setIsSubmitted(true);
			toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');

			// Reset form after 3 seconds
			setTimeout(() => {
				setIsSubmitted(false);
				setFormData({
					name: user?.displayName || '',
					email: user?.email || '',
					company: '',
					inquiryType: 'general',
					subject: '',
					message: '',
				});
			}, 3000);

		} catch (error) {
			console.error('Contact form error:', error);
			toast.error('Failed to send message. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const inquiryTypes: { value: InquiryType; label: string; description: string }[] = [
		{ value: 'general', label: 'General Inquiry', description: 'Questions about the platform' },
		{ value: 'enterprise', label: 'Enterprise Sales', description: 'Custom plans for teams' },
		{ value: 'support', label: 'Technical Support', description: 'Help with your account' },
		{ value: 'billing', label: 'Billing Question', description: 'Payment and subscription' },
		{ value: 'partnership', label: 'Partnership', description: 'Business collaboration' },
	];

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
					<div className="text-center mb-12">
						<h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cosmic-blue via-cosmic-purple to-cosmic-pink bg-clip-text text-transparent">
							Get in Touch
						</h1>
						<p className="text-xl text-gray-100 dark:text-gray-300 max-w-2xl mx-auto">
							Have questions? We're here to help. Send us a message and we'll respond as soon as possible.
						</p>
					</div>

					<div className="grid lg:grid-cols-3 gap-8">
						{/* Contact Information */}
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.1 }}
							className="space-y-6"
						>
							<div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-6">
								<h2 className="text-xl font-bold text-white mb-4">Contact Information</h2>

								<div className="space-y-4">
									<div className="flex items-start gap-3">
										<div className="p-2 rounded-lg bg-cosmic-blue/20">
											<Mail className="w-5 h-5 text-cosmic-blue" />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-300">Email</p>
											<a href="mailto:info@synchroverse.io" className="text-white hover:text-cosmic-blue transition-colors">
												info@synchroverse.io
											</a>
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="p-2 rounded-lg bg-cosmic-purple/20">
											<MessageSquare className="w-5 h-5 text-cosmic-purple" />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-300">Support</p>
											<p className="text-white">24/7 Chat Support</p>
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="p-2 rounded-lg bg-cosmic-pink/20">
											<Phone className="w-5 h-5 text-cosmic-pink" />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-300">Phone</p>
											<p className="text-white">Coming Soon</p>
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="p-2 rounded-lg bg-cosmic-orange/20">
											<MapPin className="w-5 h-5 text-cosmic-orange" />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-300">Location</p>
											<p className="text-white">Global Remote Team</p>
										</div>
									</div>
								</div>
							</div>

							<div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-6">
								<h3 className="text-lg font-bold text-white mb-3">Response Time</h3>
								<div className="space-y-2 text-sm text-gray-100">
									<div className="flex justify-between">
										<span>General Inquiries:</span>
										<span className="font-medium text-white">24-48 hours</span>
									</div>
									<div className="flex justify-between">
										<span>Enterprise Sales:</span>
										<span className="font-medium text-white">12-24 hours</span>
									</div>
									<div className="flex justify-between">
										<span>Support Issues:</span>
										<span className="font-medium text-white">4-8 hours</span>
									</div>
								</div>
							</div>

							<div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-6">
								<h3 className="text-lg font-bold text-white mb-3">Need Help?</h3>
								<p className="text-sm text-gray-100 mb-4">
									Check out our documentation and FAQ for quick answers to common questions.
								</p>
								<Link
									to="/help"
									className="inline-block w-full text-center py-2 px-4 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
								>
									Visit Help Center
								</Link>
							</div>
						</motion.div>

						{/* Contact Form */}
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.2 }}
							className="lg:col-span-2"
						>
							<div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-8">
								{isSubmitted ? (
									<motion.div
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										className="text-center py-12"
									>
										<div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
											<Check className="w-8 h-8 text-green-400" />
										</div>
										<h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
										<p className="text-gray-100 mb-6">
											Thank you for reaching out. We'll get back to you within 24 hours.
										</p>
										<Link
											to="/"
											className="inline-block py-3 px-6 rounded-xl bg-cosmic-gradient text-white hover:shadow-lg hover:shadow-cosmic-purple/50 transition-all"
										>
											Back to Home
										</Link>
									</motion.div>
								) : (
									<form onSubmit={handleSubmit} className="space-y-6">
										<div>
											<h2 className="text-2xl font-bold text-white mb-2">Send us a Message</h2>
											<p className="text-gray-100 text-sm">Fill out the form below and we'll respond as soon as possible.</p>
										</div>

										{!user && (
											<div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
												<div className="flex items-start gap-3">
													<AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
													<div className="text-sm text-gray-100">
														<p className="font-medium mb-1">Not signed in</p>
														<p className="text-gray-300">Sign in to auto-fill your details and track your inquiries.</p>
													</div>
												</div>
											</div>
										)}

										<div className="grid md:grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium text-gray-100 mb-2">
													Name <span className="text-red-400">*</span>
												</label>
												<input
													type="text"
													name="name"
													value={formData.name}
													onChange={handleInputChange}
													required
													placeholder="John Doe"
													className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
												/>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-100 mb-2">
													Email <span className="text-red-400">*</span>
												</label>
												<input
													type="email"
													name="email"
													value={formData.email}
													onChange={handleInputChange}
													required
													placeholder="john@example.com"
													className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
												/>
											</div>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-100 mb-2">
												Company / Organization
											</label>
											<input
												type="text"
												name="company"
												value={formData.company}
												onChange={handleInputChange}
												placeholder="Acme Inc."
												className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-100 mb-2">
												Inquiry Type <span className="text-red-400">*</span>
											</label>
											<select
												name="inquiryType"
												value={formData.inquiryType}
												onChange={handleInputChange}
												required
												className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
											>
												{inquiryTypes.map(type => (
													<option key={type.value} value={type.value}>
														{type.label} - {type.description}
													</option>
												))}
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-100 mb-2">
												Subject <span className="text-red-400">*</span>
											</label>
											<input
												type="text"
												name="subject"
												value={formData.subject}
												onChange={handleInputChange}
												required
												placeholder="How can we help you?"
												className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue"
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-100 mb-2">
												Message <span className="text-red-400">*</span>
											</label>
											<textarea
												name="message"
												value={formData.message}
												onChange={handleInputChange}
												required
												rows={6}
												placeholder="Tell us more about your inquiry..."
												className="w-full px-4 py-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue resize-none"
											/>
											<p className="text-xs text-gray-300 mt-1">{formData.message.length} / 2000 characters</p>
										</div>

										<button
											type="submit"
											disabled={isSubmitting}
											className="w-full py-4 px-6 rounded-xl font-medium bg-cosmic-gradient text-white hover:shadow-lg hover:shadow-cosmic-purple/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
										>
											{isSubmitting ? (
												<>
													<div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
													Sending...
												</>
											) : (
												<>
													<Send className="w-5 h-5" />
													Send Message
												</>
											)}
										</button>

										<p className="text-xs text-gray-300 text-center">
											By submitting this form, you agree to our Privacy Policy and Terms of Service.
										</p>
									</form>
								)}
							</div>
						</motion.div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
