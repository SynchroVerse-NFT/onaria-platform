import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Code } from 'lucide-react';

export function ViewModeSwitch({
	view,
	onChange,
	previewAvailable = false,
	showTooltip = false,
}: {
	view: 'preview' | 'editor' | 'blueprint'
	onChange: (mode: 'preview' | 'editor' | 'blueprint') => void;
	previewAvailable: boolean;
	showTooltip: boolean;
}) {
	// Always show the view mode switch - preview will show deployment status
	// if (!previewAvailable) {
	// 	return null;
	// }

	return (
		<div className="flex items-center gap-1 bg-bg-1/95 backdrop-blur-sm rounded-lg p-0.5 relative border border-cosmic-blue/10">
			<AnimatePresence>
				{showTooltip && (
					<motion.div
						initial={{ opacity: 0, scale: 0.4 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0 }}
						className="absolute z-50 top-10 left-0 bg-bg-2/95 backdrop-blur-md text-text-primary text-xs px-3 py-2 rounded-lg shadow-lg border border-cosmic-blue/20 animate-fade-in"
					>
						You can view code anytime from here
					</motion.div>
				)}
			</AnimatePresence>

			<button
				onClick={() => onChange('preview')}
				className={clsx(
					'p-1.5 flex items-center justify-between h-full rounded-md transition-all relative overflow-hidden group',
					view === 'preview'
						? 'bg-gradient-to-r from-cosmic-blue/10 via-cosmic-purple/10 to-cosmic-pink/10 text-cosmic-purple border border-cosmic-purple/30 shadow-sm'
						: 'text-text-50/70 hover:text-text-primary hover:bg-gradient-to-r hover:from-cosmic-blue/5 hover:via-cosmic-purple/5 hover:to-cosmic-pink/5',
				)}
			>
				{view === 'preview' && (
					<div className="absolute inset-0 bg-gradient-to-r from-cosmic-blue/20 via-cosmic-purple/20 to-cosmic-pink/20 blur animate-pulse" />
				)}
				<Eye className="size-4 relative z-10" />
			</button>
			<button
				onClick={() => onChange('editor')}
				className={clsx(
					'p-1.5 flex items-center justify-between h-full rounded-md transition-all relative overflow-hidden group',
					view === 'editor'
						? 'bg-gradient-to-r from-cosmic-blue/10 via-cosmic-purple/10 to-cosmic-pink/10 text-cosmic-purple border border-cosmic-purple/30 shadow-sm'
						: 'text-text-50/70 hover:text-text-primary hover:bg-gradient-to-r hover:from-cosmic-blue/5 hover:via-cosmic-purple/5 hover:to-cosmic-pink/5',
				)}
			>
				{view === 'editor' && (
					<div className="absolute inset-0 bg-gradient-to-r from-cosmic-blue/20 via-cosmic-purple/20 to-cosmic-pink/20 blur animate-pulse" />
				)}
				<Code className="size-4 relative z-10" />
			</button>
			{/* {terminalAvailable && (
				<button
					onClick={() => onChange('terminal')}
					className={clsx(
						'p-1 flex items-center justify-between h-full rounded-md transition-colors',
						view === 'terminal'
							? 'bg-bg-4 text-text-primary'
							: 'text-text-50/70 hover:text-text-primary hover:bg-accent',
					)}
					title="Terminal"
				>
					<Terminal className="size-4" />
				</button>
			)} */}
		</div>
	);
}
