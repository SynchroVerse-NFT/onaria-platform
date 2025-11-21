import * as Tooltip from '@radix-ui/react-tooltip';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
	content: string;
	title?: string;
	side?: 'top' | 'right' | 'bottom' | 'left';
	className?: string;
}

export function HelpTooltip({
	content,
	title,
	side = 'top',
	className = '',
}: HelpTooltipProps) {
	return (
		<Tooltip.Provider delayDuration={200}>
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<button
						className={`inline-flex items-center justify-center transition-colors ${className}`}
						aria-label="Help"
						type="button"
					>
						<HelpCircle className="w-4 h-4 text-cosmic-blue/70 hover:text-cosmic-blue transition-colors" />
					</button>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						side={side}
						sideOffset={5}
						className="backdrop-blur-xl bg-black/90 border border-white/20 rounded-xl p-4 max-w-xs shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
					>
						{title && (
							<p className="font-semibold text-white mb-2 text-sm">{title}</p>
						)}
						<p className="text-gray-300 text-xs leading-relaxed">{content}</p>
						<Tooltip.Arrow className="fill-black/90" />
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>
	);
}
