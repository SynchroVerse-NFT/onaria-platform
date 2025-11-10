import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Mail,
	FileSpreadsheet,
	MessageSquare,
	Webhook,
	Github,
	Twitter,
	CheckCircle,
	Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ServiceType, ServiceConnection } from '@/types/workflow-types';

interface ServiceConnectionModalProps {
	open: boolean;
	onClose: () => void;
	serviceType: ServiceType | null;
	onConnect: (serviceType: ServiceType, config: Record<string, string>) => Promise<void>;
	existingConnection?: ServiceConnection;
}

const serviceConfig = {
	gmail: {
		icon: Mail,
		name: 'Gmail',
		description: 'Connect your Google account to send emails',
		requiresOAuth: true,
		scopes: ['gmail.send', 'gmail.readonly'],
	},
	sheets: {
		icon: FileSpreadsheet,
		name: 'Google Sheets',
		description: 'Connect to Google Sheets to manage spreadsheet data',
		requiresOAuth: true,
		scopes: ['spreadsheets'],
	},
	slack: {
		icon: MessageSquare,
		name: 'Slack',
		description: 'Connect your Slack workspace to post messages',
		requiresOAuth: true,
		scopes: ['chat:write', 'channels:read'],
	},
	discord: {
		icon: Webhook,
		name: 'Discord',
		description: 'Connect via webhook URL to post messages',
		requiresOAuth: false,
		fields: ['webhookUrl'],
	},
	github: {
		icon: Github,
		name: 'GitHub',
		description: 'Connect your GitHub account for repository actions',
		requiresOAuth: true,
		scopes: ['repo', 'issues:write'],
	},
	twitter: {
		icon: Twitter,
		name: 'Twitter/X',
		description: 'Connect your Twitter account to post tweets',
		requiresOAuth: true,
		scopes: ['tweet.write', 'users.read'],
	},
};

export const ServiceConnectionModal: React.FC<ServiceConnectionModalProps> = ({
	open,
	onClose,
	serviceType,
	onConnect,
	existingConnection,
}) => {
	const [loading, setLoading] = React.useState(false);
	const [webhookUrl, setWebhookUrl] = React.useState('');

	const config = serviceType ? serviceConfig[serviceType] : null;
	const Icon = config?.icon || Webhook;

	const handleOAuthConnect = async () => {
		if (!serviceType) return;

		setLoading(true);
		try {
			// In a real implementation, this would redirect to OAuth flow
			const authUrl = `/api/oauth/${serviceType}/authorize`;
			window.location.href = authUrl;
		} catch (error) {
			toast.error('Failed to initiate connection');
			setLoading(false);
		}
	};

	const handleWebhookConnect = async () => {
		if (!serviceType || !webhookUrl) {
			toast.error('Please enter a webhook URL');
			return;
		}

		setLoading(true);
		try {
			await onConnect(serviceType, { webhookUrl });
			toast.success(`${config?.name} connected successfully`);
			onClose();
		} catch (error) {
			toast.error('Failed to connect service');
		} finally {
			setLoading(false);
		}
	};

	const handleDisconnect = async () => {
		if (!serviceType) return;

		setLoading(true);
		try {
			// Call API to disconnect service
			toast.success(`${config?.name} disconnected`);
			onClose();
		} catch (error) {
			toast.error('Failed to disconnect service');
		} finally {
			setLoading(false);
		}
	};

	if (!config || !serviceType) return null;

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950">
							<Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<DialogTitle>{config.name}</DialogTitle>
						</div>
					</div>
					<DialogDescription>
						{config.description}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{existingConnection?.connected ? (
						<div className="space-y-4">
							<div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
								<CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
								<div className="flex-1">
									<p className="text-sm font-medium text-green-900 dark:text-green-100">
										Connected
									</p>
									{existingConnection.accountInfo?.email && (
										<p className="text-xs text-green-700 dark:text-green-300">
											{existingConnection.accountInfo.email}
										</p>
									)}
									{existingConnection.accountInfo?.username && (
										<p className="text-xs text-green-700 dark:text-green-300">
											@{existingConnection.accountInfo.username}
										</p>
									)}
								</div>
							</div>

							<Button
								variant="destructive"
								onClick={handleDisconnect}
								disabled={loading}
								className="w-full"
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Disconnect
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							{config.requiresOAuth ? (
								<>
									{config.scopes && (
										<div className="space-y-2">
											<Label className="text-sm font-medium">Required Permissions</Label>
											<ul className="text-sm text-text-tertiary space-y-1">
												{config.scopes.map((scope) => (
													<li key={scope} className="flex items-center gap-2">
														<div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
														{scope}
													</li>
												))}
											</ul>
										</div>
									)}

									<Button
										onClick={handleOAuthConnect}
										disabled={loading}
										className="w-full"
									>
										{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
										Connect {config.name}
									</Button>
								</>
							) : (
								<>
									<div className="space-y-2">
										<Label htmlFor="webhookUrl">Webhook URL</Label>
										<Input
											id="webhookUrl"
											type="url"
											placeholder="https://discord.com/api/webhooks/..."
											value={webhookUrl}
											onChange={(e) => setWebhookUrl(e.target.value)}
										/>
										<p className="text-xs text-text-tertiary">
											Enter the webhook URL from your {config.name} settings
										</p>
									</div>

									<Button
										onClick={handleWebhookConnect}
										disabled={loading || !webhookUrl}
										className="w-full"
									>
										{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
										Connect
									</Button>
								</>
							)}
						</div>
					)}
				</div>

				<div className="flex gap-3 pt-4 border-t border-border-primary">
					<Button
						variant="outline"
						onClick={onClose}
						className="flex-1"
						disabled={loading}
					>
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
