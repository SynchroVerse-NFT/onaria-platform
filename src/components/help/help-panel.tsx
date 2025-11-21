import { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpSection {
	id: string;
	title: string;
	content: string;
}

interface HelpPanelProps {
	sections: HelpSection[];
	title?: string;
}

export function HelpPanel({
	sections,
	title = 'Help & Documentation',
}: HelpPanelProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [activeSection, setActiveSection] = useState<string | null>(null);

	return (
		<>
			{/* Trigger Button */}
			<button
				onClick={() => setIsOpen(true)}
				className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-cosmic-blue to-cosmic-purple text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
				aria-label="Open help panel"
			>
				<HelpCircle className="w-6 h-6" />
			</button>

			{/* Panel */}
			<AnimatePresence>
				{isOpen && (
					<>
						{/* Overlay */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 bg-black/60 z-50"
							onClick={() => setIsOpen(false)}
						/>

						{/* Panel */}
						<motion.div
							initial={{ x: '100%' }}
							animate={{ x: 0 }}
							exit={{ x: '100%' }}
							transition={{ type: 'spring', damping: 30, stiffness: 300 }}
							className="fixed right-0 top-0 bottom-0 w-full max-w-2xl z-50 backdrop-blur-xl bg-gradient-to-br from-black/90 to-cosmic-purple/20 border-l border-white/20 shadow-2xl overflow-hidden flex flex-col"
						>
							{/* Header */}
							<div className="p-6 border-b border-white/10">
								<div className="flex items-center justify-between">
									<h2 className="text-2xl font-bold text-white">{title}</h2>
									<button
										onClick={() => setIsOpen(false)}
										className="text-gray-400 hover:text-white transition-colors"
										aria-label="Close help panel"
									>
										<X className="w-6 h-6" />
									</button>
								</div>
							</div>

							{/* Content */}
							<div className="flex-1 overflow-y-auto p-6 space-y-4">
								{sections.map((section) => (
									<div
										key={section.id}
										className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-cosmic-blue/50 transition-colors"
									>
										<button
											onClick={() =>
												setActiveSection(
													activeSection === section.id ? null : section.id
												)
											}
											className="w-full p-4 text-left flex items-center justify-between text-white hover:bg-white/5 transition-colors"
										>
											<span className="font-semibold">{section.title}</span>
											<motion.span
												animate={{ rotate: activeSection === section.id ? 180 : 0 }}
												transition={{ duration: 0.2 }}
											>
												▼
											</motion.span>
										</button>
										<AnimatePresence>
											{activeSection === section.id && (
												<motion.div
													initial={{ height: 0, opacity: 0 }}
													animate={{ height: 'auto', opacity: 1 }}
													exit={{ height: 0, opacity: 0 }}
													transition={{ duration: 0.2 }}
													className="overflow-hidden"
												>
													<div className="p-4 pt-0 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
														{section.content}
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								))}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	);
}
