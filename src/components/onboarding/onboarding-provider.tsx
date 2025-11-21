import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { OnboardingTour, type OnboardingStep } from './onboarding-tour';
import { useAuth } from '@/contexts/auth-context';

export function OnboardingProvider() {
	const { user } = useAuth();
	const location = useLocation();
	const [shouldShowTour, setShouldShowTour] = useState(false);

	// Define onboarding steps
	const steps: OnboardingStep[] = [
		{
			target: 'body',
			title: 'Welcome to Onaria Platform',
			content:
				"Welcome! This platform uses AI to build complete web applications for you. Let's take a quick tour to get you started.",
			position: 'bottom',
			offset: { x: 0, y: 100 },
		},
		{
			target: '[data-tour="create-app"]',
			title: 'Create Your First App',
			content:
				'Click "Create App" to start building your first application. You can describe what you want in plain English.',
			position: 'bottom',
		},
		{
			target: '[data-tour="chat-input"]',
			title: 'Describe Your App',
			content:
				'Type your app description here. Be specific about features, design preferences, and functionality. The more detail you provide, the better your app will be!',
			position: 'top',
		},
		{
			target: '[data-tour="preview-panel"]',
			title: 'Live Preview',
			content:
				'Your app will appear here as soon as generation completes. You can interact with it, test features, and see changes in real-time.',
			position: 'left',
		},
		{
			target: '[data-tour="file-explorer"]',
			title: 'File Explorer',
			content:
				'View and edit all generated files here. Click any file to see its code. You can request changes through the chat.',
			position: 'right',
		},
		{
			target: '[data-tour="deployment-controls"]',
			title: 'Deploy Your App',
			content:
				'When ready, deploy your app to production! Preview is temporary (expires after inactivity), Deploy creates a permanent URL.',
			position: 'bottom',
		},
		{
			target: '[data-tour="my-apps"]',
			title: 'Manage Your Apps',
			content:
				'Access all your created apps from the "My Apps" page. View, edit, and manage your projects.',
			position: 'bottom',
		},
	];

	// Show tour for new users on home page
	useEffect(() => {
		if (user && location.pathname === '/') {
			const hasSeenTour = localStorage.getItem('onboarding_completed');
			if (!hasSeenTour) {
				// Small delay to ensure DOM elements are rendered
				const timer = setTimeout(() => {
					setShouldShowTour(true);
				}, 1000);
				return () => clearTimeout(timer);
			}
		}
	}, [user, location.pathname]);

	if (!shouldShowTour) return null;

	return (
		<OnboardingTour
			steps={steps}
			onComplete={() => {
				setShouldShowTour(false);
			}}
			onSkip={() => {
				setShouldShowTour(false);
			}}
		/>
	);
}
