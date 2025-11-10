import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Search, FileText, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
	type: 'no-workflows' | 'no-templates' | 'no-executions' | 'no-logs';
	onAction?: () => void;
	className?: string;
}

const emptyStateConfig = {
	'no-workflows': {
		icon: Zap,
		title: 'No workflows yet',
		description: 'Get started with workflow automation to connect your apps and automate tasks',
		actionLabel: 'Browse Templates',
		iconGradient: 'from-blue-400 to-blue-600',
		iconBg: 'bg-blue-100 dark:bg-blue-950',
	},
	'no-templates': {
		icon: Search,
		title: 'No templates found',
		description: 'Try adjusting your filters or search terms to find workflow templates',
		actionLabel: 'Clear Filters',
		iconGradient: 'from-gray-400 to-gray-600',
		iconBg: 'bg-gray-100 dark:bg-gray-950',
	},
	'no-executions': {
		icon: FileText,
		title: 'No workflow executions yet',
		description: 'Workflow executions will appear here once your workflows are triggered',
		iconGradient: 'from-purple-400 to-purple-600',
		iconBg: 'bg-purple-100 dark:bg-purple-950',
	},
	'no-logs': {
		icon: Webhook,
		title: 'No webhook deliveries yet',
		description: 'Webhook delivery logs will appear here once events are sent',
		iconGradient: 'from-green-400 to-green-600',
		iconBg: 'bg-green-100 dark:bg-green-950',
	},
};

export const EmptyStates: React.FC<EmptyStateProps> = ({
	type,
	onAction,
	className,
}) => {
	const config = emptyStateConfig[type];
	const Icon = config.icon;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			className={cn(
				'flex flex-col items-center justify-center py-16 px-4',
				className
			)}
		>
			<div className={cn(
				'rounded-full p-6 mb-6',
				config.iconBg
			)}>
				<div className={cn(
					'rounded-full p-4 bg-gradient-to-br',
					config.iconGradient
				)}>
					<Icon className="h-12 w-12 text-white" />
				</div>
			</div>

			<h3 className="text-xl font-semibold text-text-primary mb-2">
				{config.title}
			</h3>
			<p className="text-text-tertiary text-center max-w-md mb-6">
				{config.description}
			</p>

			{onAction && config.actionLabel && (
				<Button
					onClick={onAction}
					className="gap-2"
				>
					<Icon className="h-4 w-4" />
					{config.actionLabel}
				</Button>
			)}
		</motion.div>
	);
};
