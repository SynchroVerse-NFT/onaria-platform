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
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
	Mail,
	FileSpreadsheet,
	MessageSquare,
	Webhook,
	Github,
	Twitter,
	CheckCircle,
	ChevronRight,
	ChevronLeft,
	Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WorkflowTemplate, ServiceConnection, ServiceType } from '@/types/workflow-types';

interface WorkflowConfigModalProps {
	open: boolean;
	onClose: () => void;
	template: WorkflowTemplate | null;
	serviceConnections: ServiceConnection[];
	onActivate: (config: {
		name: string;
		description?: string;
		settings: Record<string, unknown>;
	}) => Promise<void>;
	onConnectService: (serviceType: ServiceType) => void;
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

export const WorkflowConfigModal: React.FC<WorkflowConfigModalProps> = ({
	open,
	onClose,
	template,
	serviceConnections,
	onActivate,
	onConnectService,
}) => {
	const [currentStep, setCurrentStep] = React.useState(1);
	const [loading, setLoading] = React.useState(false);

	const [workflowName, setWorkflowName] = React.useState('');
	const [workflowDescription, setWorkflowDescription] = React.useState('');
	const [settings, setSettings] = React.useState<Record<string, unknown>>({});

	React.useEffect(() => {
		if (template && open) {
			setWorkflowName(template.name);
			setWorkflowDescription(template.description);
			setCurrentStep(1);
			setSettings({});
		}
	}, [template, open]);

	if (!template) return null;

	const totalSteps = 4;
	const progress = (currentStep / totalSteps) * 100;

	const isServiceConnected = (serviceType: ServiceType) => {
		return serviceConnections.some(
			conn => conn.type === serviceType && conn.connected
		);
	};

	const allServicesConnected = template.requiredServices.every(isServiceConnected);

	const canProceedFromStep = () => {
		switch (currentStep) {
			case 1:
				return workflowName.trim().length > 0;
			case 2:
				return allServicesConnected;
			case 3:
				return true; // Settings are optional
			case 4:
				return true; // Review step
			default:
				return false;
		}
	};

	const handleNext = () => {
		if (currentStep < totalSteps) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handleBack = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleActivate = async () => {
		setLoading(true);
		try {
			await onActivate({
				name: workflowName,
				description: workflowDescription,
				settings,
			});
			toast.success('Workflow activated successfully');
			onClose();
		} catch (error) {
			toast.error('Failed to activate workflow');
		} finally {
			setLoading(false);
		}
	};

	const renderStep = () => {
		switch (currentStep) {
			case 1:
				return (
					<div className="space-y-4">
						<div>
							<Label htmlFor="workflow-name">Workflow Name</Label>
							<Input
								id="workflow-name"
								value={workflowName}
								onChange={(e) => setWorkflowName(e.target.value)}
								placeholder="Enter workflow name"
								className="mt-2"
							/>
						</div>
						<div>
							<Label htmlFor="workflow-description">Description (Optional)</Label>
							<Textarea
								id="workflow-description"
								value={workflowDescription}
								onChange={(e) => setWorkflowDescription(e.target.value)}
								placeholder="Describe what this workflow does"
								rows={3}
								className="mt-2"
							/>
						</div>
					</div>
				);

			case 2:
				return (
					<div className="space-y-4">
						<p className="text-sm text-text-tertiary">
							Connect the required services to enable this workflow
						</p>
						<div className="space-y-3">
							{template.requiredServices.map((service) => {
								const Icon = serviceIcons[service];
								const connected = isServiceConnected(service);
								const connection = serviceConnections.find(c => c.type === service);

								return (
									<div
										key={service}
										className={cn(
											'flex items-center justify-between p-4 rounded-lg border',
											connected
												? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
												: 'border-border-primary bg-bg-2'
										)}
									>
										<div className="flex items-center gap-3">
											<Icon className="h-5 w-5 text-text-tertiary" />
											<div>
												<p className="font-medium">{serviceLabels[service]}</p>
												{connected && connection?.accountInfo?.email && (
													<p className="text-xs text-text-tertiary">
														{connection.accountInfo.email}
													</p>
												)}
											</div>
										</div>
										{connected ? (
											<div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
												<CheckCircle className="h-4 w-4" />
												<span className="text-sm font-medium">Connected</span>
											</div>
										) : (
											<Button
												size="sm"
												onClick={() => onConnectService(service)}
											>
												Connect
											</Button>
										)}
									</div>
								);
							})}
						</div>
					</div>
				);

			case 3:
				return (
					<div className="space-y-4">
						<p className="text-sm text-text-tertiary">
							Configure workflow settings (optional)
						</p>
						{/* Template-specific settings would go here */}
						{template.id === 'lead-capture-to-sheets' && (
							<>
								<div>
									<Label htmlFor="sheet-name">Spreadsheet Name</Label>
									<Input
										id="sheet-name"
										placeholder="Leads Spreadsheet"
										className="mt-2"
										value={(settings.sheetName as string) || ''}
										onChange={(e) => setSettings({ ...settings, sheetName: e.target.value })}
									/>
								</div>
								<div>
									<Label htmlFor="email-template">Email Template</Label>
									<Textarea
										id="email-template"
										placeholder="Thank you for your interest..."
										rows={4}
										className="mt-2"
										value={(settings.emailTemplate as string) || ''}
										onChange={(e) => setSettings({ ...settings, emailTemplate: e.target.value })}
									/>
								</div>
							</>
						)}
						{template.id === 'payment-success-discord' && (
							<div>
								<Label htmlFor="discord-channel">Discord Channel</Label>
								<Input
									id="discord-channel"
									placeholder="#payments"
									className="mt-2"
									value={(settings.discordChannel as string) || ''}
									onChange={(e) => setSettings({ ...settings, discordChannel: e.target.value })}
								/>
							</div>
						)}
						{template.id === 'error-alert-slack' && (
							<div>
								<Label htmlFor="slack-channel">Slack Channel</Label>
								<Input
									id="slack-channel"
									placeholder="#alerts"
									className="mt-2"
									value={(settings.slackChannel as string) || ''}
									onChange={(e) => setSettings({ ...settings, slackChannel: e.target.value })}
								/>
							</div>
						)}
					</div>
				);

			case 4:
				return (
					<div className="space-y-6">
						<div>
							<Label className="text-base">Review Configuration</Label>
							<p className="text-sm text-text-tertiary mt-1">
								Review your workflow configuration before activating
							</p>
						</div>

						<div className="space-y-4 p-4 rounded-lg bg-bg-2 border border-border-primary">
							<div>
								<p className="text-sm text-text-tertiary">Workflow Name</p>
								<p className="font-medium mt-1">{workflowName}</p>
							</div>
							{workflowDescription && (
								<div>
									<p className="text-sm text-text-tertiary">Description</p>
									<p className="text-sm mt-1">{workflowDescription}</p>
								</div>
							)}
							<div>
								<p className="text-sm text-text-tertiary">Connected Services</p>
								<div className="flex gap-2 mt-1">
									{template.requiredServices.map((service) => {
										const Icon = serviceIcons[service];
										return (
											<div
												key={service}
												className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
											>
												<Icon className="h-3 w-3" />
												<span className="text-xs font-medium">
													{serviceLabels[service]}
												</span>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Configure Workflow</DialogTitle>
					<DialogDescription>
						Step {currentStep} of {totalSteps}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Progress Bar */}
					<div className="space-y-2">
						<Progress value={progress} className="h-2" />
						<div className="flex justify-between text-xs text-text-tertiary">
							<span className={cn(currentStep === 1 && 'text-text-primary font-medium')}>
								Name
							</span>
							<span className={cn(currentStep === 2 && 'text-text-primary font-medium')}>
								Connect Services
							</span>
							<span className={cn(currentStep === 3 && 'text-text-primary font-medium')}>
								Configure
							</span>
							<span className={cn(currentStep === 4 && 'text-text-primary font-medium')}>
								Review
							</span>
						</div>
					</div>

					{/* Step Content */}
					<div className="min-h-[300px]">
						{renderStep()}
					</div>
				</div>

				{/* Actions */}
				<div className="flex justify-between pt-4 border-t border-border-primary">
					<Button
						variant="outline"
						onClick={handleBack}
						disabled={currentStep === 1 || loading}
					>
						<ChevronLeft className="h-4 w-4 mr-1" />
						Back
					</Button>

					<div className="flex gap-2">
						<Button
							variant="ghost"
							onClick={onClose}
							disabled={loading}
						>
							Cancel
						</Button>
						{currentStep < totalSteps ? (
							<Button
								onClick={handleNext}
								disabled={!canProceedFromStep() || loading}
							>
								Next
								<ChevronRight className="h-4 w-4 ml-1" />
							</Button>
						) : (
							<Button
								onClick={handleActivate}
								disabled={loading}
							>
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Activate Workflow
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
