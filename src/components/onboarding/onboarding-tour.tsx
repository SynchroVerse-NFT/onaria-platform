import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface OnboardingStep {
	target: string;
	title: string;
	content: string;
	position?: 'top' | 'bottom' | 'left' | 'right';
	offset?: { x: number; y: number };
}

interface OnboardingTourProps {
	steps: OnboardingStep[];
	onComplete?: () => void;
	onSkip?: () => void;
	storageKey?: string;
}

export function OnboardingTour({
	steps,
	onComplete,
	onSkip,
	storageKey = 'onboarding_completed',
}: OnboardingTourProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [isVisible, setIsVisible] = useState(false);
	const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
	const [highlightPosition, setHighlightPosition] = useState({
		top: 0,
		left: 0,
		width: 0,
		height: 0,
	});
	const tooltipRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const completed = localStorage.getItem(storageKey);
		if (!completed) {
			setIsVisible(true);
		}
	}, [storageKey]);

	useEffect(() => {
		if (!isVisible || currentStep >= steps.length) return;

		const updatePosition = () => {
			const step = steps[currentStep];
			const targetElement = document.querySelector(step.target);

			if (!targetElement || !tooltipRef.current) return;

			const targetRect = targetElement.getBoundingClientRect();
			const tooltipRect = tooltipRef.current.getBoundingClientRect();

			// Update highlight position
			setHighlightPosition({
				top: targetRect.top + window.scrollY,
				left: targetRect.left + window.scrollX,
				width: targetRect.width,
				height: targetRect.height,
			});

			// Calculate tooltip position based on preferred position
			const position = step.position || 'bottom';
			const offset = step.offset || { x: 0, y: 0 };
			let top = 0;
			let left = 0;

			switch (position) {
				case 'top':
					top = targetRect.top + window.scrollY - tooltipRect.height - 20;
					left =
						targetRect.left +
						window.scrollX +
						targetRect.width / 2 -
						tooltipRect.width / 2;
					break;
				case 'bottom':
					top = targetRect.bottom + window.scrollY + 20;
					left =
						targetRect.left +
						window.scrollX +
						targetRect.width / 2 -
						tooltipRect.width / 2;
					break;
				case 'left':
					top =
						targetRect.top +
						window.scrollY +
						targetRect.height / 2 -
						tooltipRect.height / 2;
					left = targetRect.left + window.scrollX - tooltipRect.width - 20;
					break;
				case 'right':
					top =
						targetRect.top +
						window.scrollY +
						targetRect.height / 2 -
						tooltipRect.height / 2;
					left = targetRect.right + window.scrollX + 20;
					break;
			}

			// Apply offset
			top += offset.y;
			left += offset.x;

			// Keep tooltip within viewport
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			if (left < 10) left = 10;
			if (left + tooltipRect.width > viewportWidth - 10) {
				left = viewportWidth - tooltipRect.width - 10;
			}
			if (top < 10) top = 10;
			if (top + tooltipRect.height > window.scrollY + viewportHeight - 10) {
				top = window.scrollY + viewportHeight - tooltipRect.height - 10;
			}

			setTooltipPosition({ top, left });

			// Scroll target into view
			targetElement.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
		};

		// Wait for DOM to settle
		const timer = setTimeout(updatePosition, 100);

		// Update on resize
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition);

		return () => {
			clearTimeout(timer);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition);
		};
	}, [currentStep, isVisible, steps]);

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			handleComplete();
		}
	};

	const handleBack = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleSkip = () => {
		setIsVisible(false);
		onSkip?.();
	};

	const handleComplete = () => {
		localStorage.setItem(storageKey, 'true');
		setIsVisible(false);
		onComplete?.();
	};

	if (!isVisible || currentStep >= steps.length) return null;

	const step = steps[currentStep];
	const progress = ((currentStep + 1) / steps.length) * 100;

	return (
		<>
			{/* Overlay */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 bg-black/60 z-[9998]"
				onClick={handleSkip}
			/>

			{/* Highlight */}
			<AnimatePresence mode="wait">
				<motion.div
					key={`highlight-${currentStep}`}
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.95 }}
					transition={{ duration: 0.3 }}
					className="fixed z-[9999] pointer-events-none"
					style={{
						top: highlightPosition.top - 8,
						left: highlightPosition.left - 8,
						width: highlightPosition.width + 16,
						height: highlightPosition.height + 16,
						boxShadow:
							'0 0 0 4px rgba(100, 181, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.6)',
						borderRadius: '12px',
					}}
				/>
			</AnimatePresence>

			{/* Tooltip */}
			<AnimatePresence mode="wait">
				<motion.div
					key={`tooltip-${currentStep}`}
					ref={tooltipRef}
					initial={{ opacity: 0, scale: 0.9, y: 10 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 10 }}
					transition={{ duration: 0.3 }}
					className="fixed z-[10000] max-w-md"
					style={{
						top: tooltipPosition.top,
						left: tooltipPosition.left,
					}}
				>
					<div className="backdrop-blur-xl bg-gradient-to-br from-cosmic-blue/20 to-cosmic-purple/20 border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
						{/* Progress bar */}
						<div className="h-1 bg-white/10">
							<motion.div
								className="h-full bg-gradient-to-r from-cosmic-blue to-cosmic-purple"
								initial={{ width: 0 }}
								animate={{ width: `${progress}%` }}
								transition={{ duration: 0.3 }}
							/>
						</div>

						<div className="p-6">
							{/* Header */}
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1">
									<h3 className="text-lg font-semibold text-white mb-1">
										{step.title}
									</h3>
									<p className="text-sm text-gray-400">
										Step {currentStep + 1} of {steps.length}
									</p>
								</div>
								<button
									onClick={handleSkip}
									className="text-gray-400 hover:text-white transition-colors"
									aria-label="Skip tour"
								>
									<X className="w-5 h-5" />
								</button>
							</div>

							{/* Content */}
							<p className="text-white/90 text-sm leading-relaxed mb-6">
								{step.content}
							</p>

							{/* Actions */}
							<div className="flex items-center justify-between gap-4">
								<button
									onClick={handleSkip}
									className="text-sm text-gray-400 hover:text-white transition-colors"
								>
									Skip Tour
								</button>

								<div className="flex items-center gap-2">
									{currentStep > 0 && (
										<button
											onClick={handleBack}
											className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center gap-2"
										>
											<ArrowLeft className="w-4 h-4" />
											Back
										</button>
									)}
									<button
										onClick={handleNext}
										className="px-4 py-2 rounded-lg bg-gradient-to-r from-cosmic-blue to-cosmic-purple text-white hover:opacity-90 transition-opacity flex items-center gap-2"
									>
										{currentStep === steps.length - 1 ? 'Finish' : 'Next'}
										<ArrowRight className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			</AnimatePresence>
		</>
	);
}

// Hook to restart tour
export function useRestartTour(storageKey = 'onboarding_completed') {
	return () => {
		localStorage.removeItem(storageKey);
		window.location.reload();
	};
}
