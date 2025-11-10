import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Copy, Eye, EyeOff, RefreshCw, Send, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WebhookConfig, WorkflowEventType } from '@/types/workflow-types';

interface WebhookSettingsProps {
	config: WebhookConfig;
	onUpdateConfig: (updates: Partial<WebhookConfig>) => Promise<void>;
	onRegenerateSecret: () => Promise<string>;
	onTestWebhook: () => Promise<void>;
	loading?: boolean;
	className?: string;
}

const eventTypes: Array<{ value: WorkflowEventType; label: string }> = [
	{ value: 'lead_capture', label: 'Lead Capture' },
	{ value: 'payment_success', label: 'Payment Success' },
	{ value: 'error_alert', label: 'Error Alert' },
	{ value: 'new_app', label: 'New App' },
	{ value: 'deployment', label: 'Deployment' },
	{ value: 'custom', label: 'Custom Event' },
];

export const WebhookSettings: React.FC<WebhookSettingsProps> = ({
	config,
	onUpdateConfig,
	onRegenerateSecret,
	onTestWebhook,
	loading = false,
	className,
}) => {
	const [showSecret, setShowSecret] = React.useState(false);
	const [showRegenerateDialog, setShowRegenerateDialog] = React.useState(false);
	const [selectedEvents, setSelectedEvents] = React.useState<Set<WorkflowEventType>>(
		new Set(config.events)
	);
	const [isActive, setIsActive] = React.useState(config.active);

	const copyToClipboard = (text: string, label: string) => {
		navigator.clipboard.writeText(text);
		toast.success(`${label} copied to clipboard`);
	};

	const handleRegenerateSecret = async () => {
		try {
			const newSecret = await onRegenerateSecret();
			toast.success('Secret regenerated successfully');
			setShowRegenerateDialog(false);
		} catch (error) {
			toast.error('Failed to regenerate secret');
		}
	};

	const handleEventToggle = (event: WorkflowEventType, checked: boolean) => {
		const newEvents = new Set(selectedEvents);
		if (checked) {
			newEvents.add(event);
		} else {
			newEvents.delete(event);
		}
		setSelectedEvents(newEvents);
		onUpdateConfig({ events: Array.from(newEvents) });
	};

	const handleActiveToggle = (checked: boolean) => {
		setIsActive(checked);
		onUpdateConfig({ active: checked });
	};

	const handleTestWebhook = async () => {
		try {
			await onTestWebhook();
			toast.success('Test webhook sent successfully');
		} catch (error) {
			toast.error('Failed to send test webhook');
		}
	};

	return (
		<>
			<Card className={cn('p-6 space-y-6', className)}>
				{/* Webhook URL */}
				<div className="space-y-2">
					<Label>Webhook URL</Label>
					<div className="flex gap-2">
						<Input
							value={config.url}
							readOnly
							className="font-mono text-sm"
						/>
						<Button
							variant="outline"
							size="icon"
							onClick={() => copyToClipboard(config.url, 'Webhook URL')}
						>
							<Copy className="h-4 w-4" />
						</Button>
					</div>
					<p className="text-xs text-text-tertiary">
						Use this URL to receive webhook events from your workflows
					</p>
				</div>

				{/* Secret */}
				<div className="space-y-2">
					<Label>Webhook Secret</Label>
					<div className="flex gap-2">
						<div className="relative flex-1">
							<Input
								type={showSecret ? 'text' : 'password'}
								value={config.secret}
								readOnly
								className="font-mono text-sm pr-10"
							/>
							<Button
								variant="ghost"
								size="sm"
								className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
								onClick={() => setShowSecret(!showSecret)}
							>
								{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</Button>
						</div>
						<Button
							variant="outline"
							size="icon"
							onClick={() => copyToClipboard(config.secret, 'Secret')}
						>
							<Copy className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setShowRegenerateDialog(true)}
							disabled={loading}
						>
							<RefreshCw className="h-4 w-4" />
						</Button>
					</div>
					<div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
						<AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
						<div className="text-xs text-yellow-800 dark:text-yellow-300">
							<p className="font-medium mb-1">Security Warning</p>
							<p>Keep this secret secure and never share it publicly. Use it to verify webhook signatures.</p>
						</div>
					</div>
				</div>

				{/* Active Toggle */}
				<div className="flex items-center justify-between">
					<div>
						<Label>Webhook Active</Label>
						<p className="text-xs text-text-tertiary mt-1">
							Enable or disable webhook deliveries
						</p>
					</div>
					<Switch
						checked={isActive}
						onCheckedChange={handleActiveToggle}
						disabled={loading}
					/>
				</div>

				{/* Event Subscriptions */}
				<div className="space-y-3">
					<Label>Subscribed Events</Label>
					<p className="text-xs text-text-tertiary">
						Select which events should trigger webhook deliveries
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{eventTypes.map((event) => (
							<div key={event.value} className="flex items-center space-x-2">
								<Checkbox
									id={event.value}
									checked={selectedEvents.has(event.value)}
									onCheckedChange={(checked) => handleEventToggle(event.value, checked as boolean)}
									disabled={loading}
								/>
								<Label
									htmlFor={event.value}
									className="text-sm font-normal cursor-pointer"
								>
									{event.label}
								</Label>
							</div>
						))}
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 pt-4 border-t border-border-primary">
					<Button
						variant="outline"
						onClick={handleTestWebhook}
						disabled={loading || !isActive}
					>
						<Send className="h-4 w-4 mr-2" />
						Test Webhook
					</Button>
					<Button
						variant="outline"
						onClick={() => window.open('/docs/webhooks', '_blank')}
					>
						<ExternalLink className="h-4 w-4 mr-2" />
						Documentation
					</Button>
				</div>
			</Card>

			{/* Regenerate Secret Confirmation */}
			<AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Regenerate Webhook Secret?</AlertDialogTitle>
						<AlertDialogDescription>
							This will invalidate the current secret. Any webhooks using the old secret will stop working.
							Make sure to update your webhook consumers with the new secret.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleRegenerateSecret}>
							Regenerate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
