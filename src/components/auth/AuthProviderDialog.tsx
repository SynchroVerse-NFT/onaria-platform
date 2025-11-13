import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AuthProvider {
	name: string;
	icon: string;
	description: string;
	color: string;
}

interface AuthProviderDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConnect: (provider: string) => void;
	title?: string;
	description?: string;
}

const authProviders: AuthProvider[] = [
	{
		name: 'GitHub',
		icon: '🔱',
		description: 'Connect with GitHub OAuth',
		color: 'from-gray-500 to-gray-700',
	},
	{
		name: 'Google',
		icon: '🔍',
		description: 'Sign in with Google',
		color: 'from-blue-500 to-cyan-500',
	},
	{
		name: 'Discord',
		icon: '💬',
		description: 'Connect via Discord',
		color: 'from-indigo-500 to-purple-500',
	},
	{
		name: 'Twitter',
		icon: '🐦',
		description: 'Sign in with Twitter/X',
		color: 'from-blue-400 to-blue-600',
	},
	{
		name: 'MetaMask',
		icon: '🦊',
		description: 'Connect using MetaMask wallet',
		color: 'from-blue-500 to-purple-500',
	},
	{
		name: 'WalletConnect',
		icon: '🔗',
		description: 'Scan with WalletConnect',
		color: 'from-blue-500 to-cyan-500',
	},
];

export default function AuthProviderDialog({
	open,
	onOpenChange,
	onConnect,
	title = 'Connect Account',
	description = 'Choose your preferred authentication method',
}: AuthProviderDialogProps) {
	const handleProviderClick = (providerName: string) => {
		onConnect(providerName.toLowerCase());
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-[#0f0f1a]/95 backdrop-blur-xl border-white/10 text-white max-w-md">
				{/* Cosmic background glow */}
				<motion.div
					className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-xl -z-10"
					animate={{
						opacity: [0.3, 0.5, 0.3],
						scale: [1, 1.05, 1],
					}}
					transition={{
						duration: 3,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>

				<DialogHeader>
					<DialogTitle className="text-center">
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className="flex flex-col items-center gap-4"
						>
							{/* Animated icon */}
							<motion.div
								className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-purple-500/30 flex items-center justify-center"
								animate={{
									boxShadow: [
										'0 0 20px rgba(168, 85, 247, 0.3)',
										'0 0 40px rgba(100, 181, 246, 0.5)',
										'0 0 20px rgba(168, 85, 247, 0.3)',
									],
								}}
								transition={{
									duration: 2,
									repeat: Infinity,
									ease: 'easeInOut',
								}}
							>
								<motion.span
									className="text-3xl"
									animate={{
										rotate: [0, 10, -10, 0],
									}}
									transition={{
										duration: 3,
										repeat: Infinity,
										ease: 'easeInOut',
									}}
								>
									🔐
								</motion.span>
							</motion.div>

							<div>
								<h2 className="text-xl mb-1">{title}</h2>
								<p className="text-sm text-white/60">{description}</p>
							</div>
						</motion.div>
					</DialogTitle>
				</DialogHeader>

				<div className="grid gap-3 mt-6">
					{authProviders.map((provider, index) => (
						<motion.button
							key={provider.name}
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: index * 0.05 }}
							onClick={() => handleProviderClick(provider.name)}
							className="group relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 hover:bg-white/10 hover:border-white/20 transition-all"
							whileHover={{ scale: 1.02, x: 4 }}
							whileTap={{ scale: 0.98 }}
						>
							{/* Gradient overlay on hover */}
							<motion.div
								className={`absolute inset-0 bg-gradient-to-r ${provider.color} opacity-0 group-hover:opacity-10 transition-opacity`}
								initial={false}
							/>

							<div className="relative flex items-center gap-4">
								{/* Provider icon with animation */}
								<motion.div
									className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center"
									whileHover={{
										rotate: [0, -10, 10, -10, 0],
										transition: { duration: 0.5 },
									}}
								>
									<span className="text-2xl">{provider.icon}</span>
								</motion.div>

								<div className="flex-1 text-left">
									<h3 className="font-medium text-white">{provider.name}</h3>
									<p className="text-xs text-white/50">{provider.description}</p>
								</div>

								{/* Arrow indicator */}
								<motion.div
									className="text-white/40 group-hover:text-white/80"
									animate={{
										x: [0, 4, 0],
									}}
									transition={{
										duration: 1.5,
										repeat: Infinity,
										ease: 'easeInOut',
									}}
								>
									→
								</motion.div>
							</div>

							{/* Shimmer effect */}
							<motion.div
								className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
								animate={{
									x: ['-100%', '200%'],
								}}
								transition={{
									duration: 3,
									repeat: Infinity,
									delay: index * 0.2,
									ease: 'linear',
								}}
							/>
						</motion.button>
					))}
				</div>

				{/* Footer */}
				<motion.div
					className="mt-6 pt-6 border-t border-white/10 text-center"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
				>
					<p className="text-xs text-white/40">
						By connecting, you agree to our Terms of Service
					</p>
				</motion.div>

				{/* Orbiting particles around dialog */}
				<div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
					{[...Array(8)].map((_, i) => (
						<motion.div
							key={i}
							className="absolute w-1 h-1 rounded-full bg-purple-400/40"
							style={{
								left: '50%',
								top: '50%',
							}}
							animate={{
								x: [0, Math.cos((i / 8) * Math.PI * 2) * 150],
								y: [0, Math.sin((i / 8) * Math.PI * 2) * 150],
								opacity: [0, 0.6, 0],
								scale: [0, 1.5, 0],
							}}
							transition={{
								duration: 3,
								repeat: Infinity,
								delay: i * 0.2,
								ease: 'easeOut',
							}}
						/>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
