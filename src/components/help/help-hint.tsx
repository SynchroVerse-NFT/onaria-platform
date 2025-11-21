import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpHintProps {
	id: string;
	message: string;
	variant?: 'info' | 'tip' | 'warning';
}

export function HelpHint({ id, message, variant = 'tip' }: HelpHintProps) {
	const [dismissed, setDismissed] = useState(
		localStorage.getItem(`hint_${id}`) === 'dismissed'
	);

	const handleDismiss = () => {
		localStorage.setItem(`hint_${id}`, 'dismissed');
		setDismissed(true);
	};

	const variantStyles = {
		info: 'from-cosmic-blue/20 to-cosmic-purple/20 border-cosmic-blue/30',
		tip: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
		warning: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
	};

	const iconColor = {
		info: 'text-cosmic-blue',
		tip: 'text-blue-400',
		warning: 'text-orange-400',
	};

	return (
		<AnimatePresence>
			{!dismissed && (
				<motion.div
					initial={{ opacity: 0, y: -10, height: 0 }}
					animate={{ opacity: 1, y: 0, height: 'auto' }}
					exit={{ opacity: 0, y: -10, height: 0 }}
					transition={{ duration: 0.2 }}
					className="overflow-hidden"
				>
					<div
						className={`backdrop-blur-xl bg-gradient-to-r ${variantStyles[variant]} border rounded-xl p-4 mb-4`}
					>
						<div className="flex items-start justify-between gap-4">
							<div className="flex items-start gap-3">
								<Lightbulb className={`w-5 h-5 ${iconColor[variant]} mt-0.5`} />
								<p className="text-white text-sm leading-relaxed">{message}</p>
							</div>
							<button
								onClick={handleDismiss}
								className="text-white/60 hover:text-white transition-colors flex-shrink-0"
								aria-label="Dismiss hint"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

// Hook to reset all hints
export function useResetHints() {
	return () => {
		const keys = Object.keys(localStorage);
		keys.forEach((key) => {
			if (key.startsWith('hint_')) {
				localStorage.removeItem(key);
			}
		});
		window.location.reload();
	};
}
