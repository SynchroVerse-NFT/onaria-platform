import { Outlet } from 'react-router';
import { AuthProvider } from './contexts/auth-context';
import { AuthModalProvider } from './components/auth/AuthModalProvider';
import { ThemeProvider } from './contexts/theme-context';
import { Toaster } from './components/ui/sonner';
import { AppLayout } from './components/layout/app-layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import AnimationWrapper from './components/animations/AnimationWrapper';
import { OnboardingProvider } from './components/onboarding/onboarding-provider';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AnimationWrapper defaultIntensity="high" respectReducedMotion={true}>
          <AuthProvider>
            <AuthModalProvider>
              <AppLayout>
                <Outlet />
              </AppLayout>
              <Toaster richColors position="top-right" />
              <OnboardingProvider />
            </AuthModalProvider>
          </AuthProvider>
        </AnimationWrapper>
      </ThemeProvider>
    </ErrorBoundary>
  );
}