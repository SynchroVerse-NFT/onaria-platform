import type { RouteObject } from 'react-router';
import React, { lazy, Suspense } from 'react';

import App from './App';
import { ProtectedRoute } from './routes/protected-route';
import { ErrorBoundary } from './components/error-boundary';

const Home = lazy(() => import('./routes/home'));
const Chat = lazy(() => import('./routes/chat/chat'));
const Profile = lazy(() => import('./routes/profile'));
const Settings = lazy(() => import('./routes/settings/index'));
const AppsPage = lazy(() => import('./routes/apps'));
const AppView = lazy(() => import('./routes/app'));
const DiscoverPage = lazy(() => import('./routes/discover'));
const TemplatesPage = lazy(() => import('./routes/templates'));
const Pricing = lazy(() => import('./routes/pricing'));
const Checkout = lazy(() => import('./routes/checkout'));
const Contact = lazy(() => import('./routes/contact'));
const HelpPage = lazy(() => import('./routes/help/index'));
const RequestPasswordReset = lazy(() => import('./routes/reset-password/request'));
const ConfirmPasswordReset = lazy(() => import('./routes/reset-password/confirm'));

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
	<ErrorBoundary>
		<Suspense fallback={
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cosmic-blue"></div>
			</div>
		}>
			{children}
		</Suspense>
	</ErrorBoundary>
);

const routes = [
	{
		path: '/',
		Component: App,
		children: [
			{
				index: true,
				element: React.createElement(SuspenseWrapper, { children: React.createElement(Home) }),
			},
			{
				path: 'chat/:chatId',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(Chat) }),
			},
			{
				path: 'profile',
				element: React.createElement(ProtectedRoute, {
					children: React.createElement(SuspenseWrapper, { children: React.createElement(Profile) })
				}),
			},
			{
				path: 'settings',
				element: React.createElement(ProtectedRoute, {
					children: React.createElement(SuspenseWrapper, { children: React.createElement(Settings) })
				}),
			},
			{
				path: 'apps',
				element: React.createElement(ProtectedRoute, {
					children: React.createElement(SuspenseWrapper, { children: React.createElement(AppsPage) })
				}),
			},
			{
				path: 'app/:id',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(AppView) }),
			},
			{
				path: 'discover',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(DiscoverPage) }),
			},
			{
				path: 'templates',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(TemplatesPage) }),
			},
			{
				path: 'pricing',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(Pricing) }),
			},
			{
				path: 'checkout',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(Checkout) }),
			},
			{
				path: 'contact',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(Contact) }),
			},
			{
				path: 'help',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(HelpPage) }),
			},
			{
				path: 'reset-password/request',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(RequestPasswordReset) }),
			},
			{
				path: 'reset-password/confirm',
				element: React.createElement(SuspenseWrapper, { children: React.createElement(ConfirmPasswordReset) }),
			},
		],
	},
] satisfies RouteObject[];

export { routes };
