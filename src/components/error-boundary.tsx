import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, RotateCcw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedBackground from '@/components/animations/AnimatedBackground';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack || undefined,
          },
        },
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      return (
        <div className="relative min-h-screen overflow-hidden transition-colors duration-500" style={{
          backgroundColor: isDark ? '#0a0a0f' : '#f0f4ff'
        }}>
          <AnimatedBackground isDark={isDark} />

          <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-8 md:p-12 max-w-2xl w-full shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="p-6 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-md border border-red-400/30 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
                    <AlertTriangle className="h-16 w-16 text-red-400" />
                  </div>
                  <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
                </div>

                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                  Something went wrong
                </h2>

                <p className="text-text-secondary text-lg mb-6 max-w-lg">
                  We encountered an unexpected error. Our team has been notified and we're working on a fix.
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-6 w-full text-left">
                    <summary className="cursor-pointer text-sm text-text-tertiary hover:text-text-secondary mb-2 flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Technical Details (Development Only)
                    </summary>
                    <div className="mt-3 p-4 bg-black/40 border border-red-400/20 rounded-xl overflow-auto max-h-64">
                      <pre className="text-xs text-red-300 whitespace-pre-wrap break-words">
                        {this.state.error.toString()}
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </div>
                  </details>
                )}

                <div className="flex flex-wrap gap-4 justify-center">
                  <Button
                    onClick={this.handleReset}
                    className="gap-2 bg-gradient-to-r from-cosmic-blue to-cosmic-purple hover:from-cosmic-blue/90 hover:to-cosmic-purple/90 shadow-lg hover:shadow-cosmic-blue/50 transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="gap-2 border-white/20 hover:border-cosmic-blue/50 hover:bg-cosmic-blue/10"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: { contexts?: { react?: { componentStack?: string } } }) => void;
    };
  }
}
