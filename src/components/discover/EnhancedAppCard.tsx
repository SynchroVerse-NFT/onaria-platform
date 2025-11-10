import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
	Star,
	Eye,
	Code2,
	User,
	Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { AppWithUserAndStats } from '@/api-types';

interface EnhancedAppCardProps {
	app: AppWithUserAndStats;
	onClick: (appId: string) => void;
	className?: string;
}

const TECH_STACK_COLORS: Record<string, string> = {
	react: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
	vue: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
	svelte: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
	nextjs: 'bg-black/10 text-gray-900 dark:text-gray-100 border-gray-500/20',
	angular: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

export const EnhancedAppCard: React.FC<EnhancedAppCardProps> = ({ app, onClick, className }) => {
	const itemVariants = {
		hidden: { y: 10, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: {
				type: 'spring' as const,
				stiffness: 200,
				damping: 20,
			},
		},
	};

	const framework = app.framework?.toLowerCase() || '';
	const techBadgeColor = TECH_STACK_COLORS[framework] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';

	return (
		<motion.div
			variants={itemVariants}
			initial="hidden"
			animate="visible"
			whileHover={{ y: -8, transition: { duration: 0.2 } }}
			className={className}
		>
			<a
				href={`/app/${app.id}`}
				onClick={(e) => {
					e.preventDefault();
					onClick(app.id);
				}}
				className="block h-full no-underline"
			>
				<Card
					className={cn(
						'h-full transition-all duration-300 ease-out cursor-pointer group relative overflow-hidden rounded-xl',
						'bg-bg-2 hover:bg-bg-3',
						'border border-border-primary hover:border-accent/50',
						'hover:shadow-2xl hover:shadow-accent/10',
					)}
				>
					<div className="relative aspect-[16/9] rounded-t-xl overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-orange-900/20">
						{app.screenshotUrl ? (
							<img
								src={app.screenshotUrl}
								alt={`${app.title} preview`}
								className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
								loading="lazy"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 via-red-100/80 to-red-200/60 dark:from-red-950/30 dark:via-red-900/20 dark:to-red-800/10">
								<Code2 className="h-16 w-16 text-red-400/50 dark:text-red-500/30" />
							</div>
						)}

						<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

						<div className="absolute top-3 right-3">
							<Badge className="bg-accent/90 text-white border-0 backdrop-blur-sm font-semibold shadow-lg">
								<Sparkles className="h-3 w-3 mr-1" />
								Made with Onaria
							</Badge>
						</div>

						{app.framework && (
							<div className="absolute bottom-3 left-3">
								<Badge className={cn('border backdrop-blur-sm', techBadgeColor)}>
									{app.framework}
								</Badge>
							</div>
						)}
					</div>

					<div className="p-5">
						<div className="flex items-center gap-3 mb-4">
							<Avatar className="h-10 w-10 border-2 border-border-primary group-hover:border-accent/50 transition-colors">
								<AvatarImage src={app.userAvatar || undefined} />
								<AvatarFallback className="bg-gradient-to-br from-blue-200 to-blue-300 font-semibold">
									{app.userName?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 min-w-0">
								<h3 className="font-bold text-text-primary group-hover:text-accent transition-colors truncate text-lg">
									{app.title}
								</h3>
								<p className="text-sm text-text-tertiary truncate">
									by {app.userName || 'Anonymous User'}
								</p>
							</div>
						</div>

						{app.description && (
							<p className="text-sm text-text-secondary line-clamp-2 mb-4 min-h-[2.5rem]">
								{app.description}
							</p>
						)}

						<div className="flex items-center justify-between pt-4 border-t border-border-primary">
							<div className="flex items-center gap-4 text-sm">
								<div className="flex items-center gap-1.5 group-hover:scale-110 transition-transform">
									<Star
										className={cn(
											'h-4 w-4 transition-all',
											app.userStarred
												? 'fill-yellow-500 text-yellow-500'
												: 'text-text-tertiary group-hover:text-accent'
										)}
									/>
									<span className="font-medium text-text-secondary group-hover:text-text-primary">
										{app.starCount || 0}
									</span>
								</div>
								<div className="flex items-center gap-1.5 group-hover:scale-110 transition-transform">
									<Eye className="h-4 w-4 text-text-tertiary group-hover:text-accent" />
									<span className="font-medium text-text-secondary group-hover:text-text-primary">
										{app.viewCount || 0}
									</span>
								</div>
							</div>

							{app.updatedAtFormatted && (
								<span className="text-xs text-text-tertiary">
									{formatDistanceToNow(new Date(app.updatedAtFormatted), { addSuffix: true })}
								</span>
							)}
						</div>
					</div>

					<div className="absolute inset-0 rounded-xl ring-2 ring-accent/0 group-hover:ring-accent/20 transition-all duration-300 pointer-events-none" />
				</Card>
			</a>
		</motion.div>
	);
};
