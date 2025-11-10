import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
	Mail,
	FileSpreadsheet,
	MessageSquare,
	Webhook,
	Github,
	Twitter,
	ArrowRight,
	CheckCircle,
	XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowTemplate, ServiceConnection } from '@/types/workflow-types';

interface TemplatePreviewModalProps {
	template: WorkflowTemplate | null;
	open: boolean;
	onClose: () => void;
	onUseTemplate: (templateId: string) => void;
	serviceConnections?: ServiceConnection[];
}

const serviceIcons = {
	gmail: Mail,
	sheets: FileSpreadsheet,
	slack: MessageSquare,
	discord: Webhook,
	github: Github,
	twitter: Twitter,
};

const serviceLabels = {
	gmail: 'Gmail',
	sheets: 'Google Sheets',
	slack: 'Slack',
	discord: 'Discord',
	github: 'GitHub',
	twitter: 'Twitter/X',
};

const actionLabels = {
	send_email: 'Send Email',
	create_sheet_row: 'Add Row to Sheet',
	post_message: 'Post Message',
	create_issue: 'Create Issue',
	post_tweet: 'Post Tweet',
};

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
	template,
	open,
	onClose,
	onUseTemplate,
	serviceConnections = [],
}) => {
	if (!template) return null;

	const isServiceConnected = (serviceType: string) => {
		return serviceConnections.some(
			conn => conn.type === serviceType && conn.connected
		);
	};

	const allServicesConnected = template.requiredServices.every(isServiceConnected);

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="text-4xl">{template.icon}</div>
						<div>
							<DialogTitle className="text-2xl">{template.name}</DialogTitle>
							<Badge variant="outline" className="mt-1">
								{template.category}
							</Badge>
						</div>
					</div>
					<DialogDescription className="text-base">
						{template.description}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Event Trigger */}
					<div>
						<h4 className="font-semibold text-text-primary mb-3">Event Trigger</h4>
						<div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
							<p className="text-sm font-medium">
								{template.eventTrigger.split('_').map(word =>
									word.charAt(0).toUpperCase() + word.slice(1)
								).join(' ')}
							</p>
						</div>
					</div>

					<Separator />

					{/* Workflow Steps */}
					<div>
						<h4 className="font-semibold text-text-primary mb-3">Workflow Steps</h4>
						<div className="space-y-3">
							{template.actions.map((action, index) => {
								const Icon = serviceIcons[action.service];
								return (
									<div key={action.id} className="flex items-center gap-3">
										<div className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-3 dark:bg-bg-4 text-sm font-medium">
											{index + 1}
										</div>
										<ArrowRight className="h-4 w-4 text-text-tertiary" />
										<div className="flex-1 p-3 rounded-lg border border-border-primary bg-bg-2">
											<div className="flex items-center gap-2">
												<Icon className="h-4 w-4 text-text-tertiary" />
												<span className="text-sm font-medium">
													{actionLabels[action.type] || action.type}
												</span>
												<span className="text-xs text-text-tertiary">
													via {serviceLabels[action.service]}
												</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					<Separator />

					{/* Required Services */}
					<div>
						<h4 className="font-semibold text-text-primary mb-3">Required Services</h4>
						<div className="space-y-2">
							{template.requiredServices.map((service) => {
								const Icon = serviceIcons[service];
								const connected = isServiceConnected(service);
								return (
									<div
										key={service}
										className={cn(
											'flex items-center justify-between p-3 rounded-lg border',
											connected
												? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
												: 'border-border-primary bg-bg-2'
										)}
									>
										<div className="flex items-center gap-2">
											<Icon className="h-4 w-4 text-text-tertiary" />
											<span className="text-sm font-medium">
												{serviceLabels[service]}
											</span>
										</div>
										{connected ? (
											<div className="flex items-center gap-1 text-green-600 dark:text-green-400">
												<CheckCircle className="h-4 w-4" />
												<span className="text-xs font-medium">Connected</span>
											</div>
										) : (
											<div className="flex items-center gap-1 text-text-tertiary">
												<XCircle className="h-4 w-4" />
												<span className="text-xs">Not connected</span>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{/* Usage Stats */}
					<div className="p-4 rounded-lg bg-bg-2 border border-border-primary">
						<div className="flex items-center justify-between text-sm">
							<span className="text-text-tertiary">Used by</span>
							<span className="font-semibold text-text-primary">
								{template.usageCount.toLocaleString()} teams
							</span>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 pt-4 border-t border-border-primary">
					<Button
						variant="outline"
						onClick={onClose}
						className="flex-1"
					>
						Close
					</Button>
					<Button
						onClick={() => {
							onUseTemplate(template.id);
							onClose();
						}}
						className="flex-1"
					>
						{allServicesConnected ? 'Enable This Workflow' : 'Continue Setup'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
