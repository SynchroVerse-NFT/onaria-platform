import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Mail,
	FileSpreadsheet,
	MessageSquare,
	Webhook,
	Github,
	Twitter,
	Search,
	Eye,
	Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowTemplate } from '@/types/workflow-types';

interface TemplateGalleryProps {
	onUseTemplate: (templateId: string) => void;
	onPreview: (template: WorkflowTemplate) => void;
	className?: string;
}

const serviceIcons = {
	gmail: Mail,
	sheets: FileSpreadsheet,
	slack: MessageSquare,
	discord: Webhook,
	github: Github,
	twitter: Twitter,
};

const categoryIcons = {
	automation: '🔄',
	notification: '🔔',
	integration: '🔗',
	analytics: '📊',
};

// Official templates from requirements
const officialTemplates: WorkflowTemplate[] = [
	{
		id: 'lead-capture-to-sheets',
		name: 'Lead Capture to Google Sheets',
		description: 'Automatically save lead information to Google Sheets and send a welcome email',
		category: 'automation',
		icon: '📝',
		eventTrigger: 'lead_capture',
		requiredServices: ['gmail', 'sheets'],
		actions: [
			{
				id: '1',
				type: 'create_sheet_row',
				service: 'sheets',
				config: {},
				order: 1,
			},
			{
				id: '2',
				type: 'send_email',
				service: 'gmail',
				config: {},
				order: 2,
			},
		],
		usageCount: 1243,
		tags: ['leads', 'email', 'spreadsheet'],
		configSchema: {},
	},
	{
		id: 'payment-success-discord',
		name: 'Payment Success Notification',
		description: 'Send a Discord notification when a payment is successfully processed',
		category: 'notification',
		icon: '💰',
		eventTrigger: 'payment_success',
		requiredServices: ['discord'],
		actions: [
			{
				id: '1',
				type: 'post_message',
				service: 'discord',
				config: {},
				order: 1,
			},
		],
		usageCount: 987,
		tags: ['payment', 'discord', 'notification'],
		configSchema: {},
	},
	{
		id: 'error-alert-slack',
		name: 'Error Alert to Slack',
		description: 'Get instant Slack notifications when errors occur in your application',
		category: 'notification',
		icon: '🚨',
		eventTrigger: 'error_alert',
		requiredServices: ['slack'],
		actions: [
			{
				id: '1',
				type: 'post_message',
				service: 'slack',
				config: {},
				order: 1,
			},
		],
		usageCount: 2156,
		tags: ['error', 'slack', 'monitoring'],
		configSchema: {},
	},
	{
		id: 'new-app-twitter',
		name: 'New App Tweet',
		description: 'Automatically tweet about your newly created applications',
		category: 'integration',
		icon: '🎉',
		eventTrigger: 'new_app',
		requiredServices: ['twitter'],
		actions: [
			{
				id: '1',
				type: 'post_tweet',
				service: 'twitter',
				config: {},
				order: 1,
			},
		],
		usageCount: 654,
		tags: ['social', 'twitter', 'announcement'],
		configSchema: {},
	},
	{
		id: 'deployment-github-comment',
		name: 'Deployment Status Comment',
		description: 'Post deployment status as a comment on related GitHub issues',
		category: 'integration',
		icon: '🚀',
		eventTrigger: 'deployment',
		requiredServices: ['github'],
		actions: [
			{
				id: '1',
				type: 'create_issue',
				service: 'github',
				config: {},
				order: 1,
			},
		],
		usageCount: 432,
		tags: ['deployment', 'github', 'ci/cd'],
		configSchema: {},
	},
];

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
	onUseTemplate,
	onPreview,
	className,
}) => {
	const [searchQuery, setSearchQuery] = React.useState('');
	const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

	const filteredTemplates = React.useMemo(() => {
		return officialTemplates.filter(template => {
			const matchesSearch = searchQuery === '' ||
				template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

			const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

			return matchesSearch && matchesCategory;
		});
	}, [searchQuery, selectedCategory]);

	return (
		<div className={cn('space-y-6', className)}>
			{/* Search and Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
					<Input
						placeholder="Search templates..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>

				<Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
					<TabsList>
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="automation">Automation</TabsTrigger>
						<TabsTrigger value="notification">Notification</TabsTrigger>
						<TabsTrigger value="integration">Integration</TabsTrigger>
						<TabsTrigger value="analytics">Analytics</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Results count */}
			<div className="text-sm text-text-tertiary">
				{filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} found
			</div>

			{/* Templates Grid */}
			<AnimatePresence mode="popLayout">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredTemplates.map((template) => (
						<motion.div
							key={template.id}
							layout
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ duration: 0.2 }}
						>
							<Card className="group h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-border-primary/60">
								{/* Header */}
								<div className="p-6 flex-1">
									<div className="flex items-start gap-3 mb-4">
										<div className="text-4xl">{template.icon}</div>
										<div className="flex-1 min-w-0">
											<h3 className="font-semibold text-text-primary mb-1 line-clamp-1">
												{template.name}
											</h3>
											<Badge
												variant="outline"
												className="text-xs"
											>
												{categoryIcons[template.category]} {template.category}
											</Badge>
										</div>
									</div>

									<p className="text-sm text-text-tertiary mb-4 line-clamp-2">
										{template.description}
									</p>

									{/* Required Services */}
									<div className="flex items-center gap-2 mb-4">
										<span className="text-xs text-text-tertiary">Requires:</span>
										<div className="flex gap-1.5">
											{template.requiredServices.map((service) => {
												const Icon = serviceIcons[service];
												return (
													<div
														key={service}
														className="p-1.5 rounded bg-bg-3 dark:bg-bg-4"
														title={service}
													>
														<Icon className="h-3.5 w-3.5 text-text-tertiary" />
													</div>
												);
											})}
										</div>
									</div>

									{/* Usage Stats */}
									<div className="flex items-center gap-1 text-xs text-text-tertiary">
										<Users className="h-3 w-3" />
										<span>{template.usageCount.toLocaleString()} uses</span>
									</div>
								</div>

								{/* Actions */}
								<div className="p-4 pt-0 flex gap-2">
									<Button
										variant="outline"
										size="sm"
										className="flex-1"
										onClick={() => onPreview(template)}
									>
										<Eye className="h-4 w-4 mr-1" />
										Preview
									</Button>
									<Button
										size="sm"
										className="flex-1"
										onClick={() => onUseTemplate(template.id)}
									>
										Use Template
									</Button>
								</div>
							</Card>
						</motion.div>
					))}
				</div>
			</AnimatePresence>

			{/* Empty State */}
			{filteredTemplates.length === 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-center py-12"
				>
					<Search className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-text-primary mb-2">
						No templates found
					</h3>
					<p className="text-text-tertiary mb-4">
						Try adjusting your search or filters
					</p>
					<Button
						variant="outline"
						onClick={() => {
							setSearchQuery('');
							setSelectedCategory('all');
						}}
					>
						Clear Filters
					</Button>
				</motion.div>
			)}
		</div>
	);
};
