import React from 'react';
import { Outlet, useLocation } from 'react-router';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { GlobalHeader } from './global-header';
import { AppsDataProvider } from '@/contexts/apps-data-context';
import clsx from 'clsx';

interface AppLayoutProps {
  children?: React.ReactNode;
}

const APP_VERSION = '2.1.0';

export function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  return (
    <AppsDataProvider>
      <SidebarProvider
        defaultOpen={false}
        style={{
          "--sidebar-width": "320px",
          "--sidebar-width-mobile": "280px",
          "--sidebar-width-icon": "52px"
        } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarInset className={clsx("relative flex flex-col h-screen", pathname !== "/" && "overflow-hidden")}>
          {/* Subtle cosmic background - lighter than homepage */}
          <div className="fixed inset-0 pointer-events-none z-0">
            {/* Subtle radial gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-bg-3 via-bg-3 to-bg-2/80" />

            {/* Very subtle dot pattern */}
            <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]">
              <svg width="100%" height="100%">
                <defs>
                  <pattern
                    id="cosmic-dots-subtle"
                    viewBox="-6 -6 12 12"
                    patternUnits="userSpaceOnUse"
                    width="18"
                    height="18"
                  >
                    <circle cx="0" cy="0" r="0.8" fill="currentColor" className="text-accent" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cosmic-dots-subtle)" />
              </svg>
            </div>
          </div>

          {/* Main content with glassmorphism container */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Only show GlobalHeader on non-homepage routes */}
            {pathname !== "/" && <GlobalHeader />}
            <div className={clsx("flex-1", pathname !== "/" && "min-h-0 overflow-auto")}>
              {/* Subtle glassmorphic container for content */}
              <div className={clsx("h-full", pathname !== "/" && "backdrop-blur-[0.5px] bg-bg-3/50")}>
                {children || <Outlet />}
              </div>
            </div>
          </div>

          <div className="fixed bottom-2 left-2 text-xs text-muted-foreground/50 pointer-events-none select-none z-50">
            v{APP_VERSION}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AppsDataProvider>
  );
}