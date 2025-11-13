import { useEffect, useState, useRef, forwardRef, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { WebSocket } from 'partysocket';

interface PreviewIframeProps {
    src: string;
    className?: string;
    title?: string;
    shouldRefreshPreview?: boolean;
    manualRefreshTrigger?: number;
    webSocket?: WebSocket | null;
}

// ============================================================================
// Types & Constants
// ============================================================================

interface LoadState {
    status: 'idle' | 'loading' | 'postload' | 'loaded' | 'error';
    attempt: number;
    loadedSrc: string | null;
    errorMessage: string | null;
    previewType?: 'sandbox' | 'dispatcher';
}

const MAX_RETRIES = 10;
const REDEPLOY_AFTER_ATTEMPT = 8;
const POST_LOAD_WAIT_SANDBOX = 0;
const POST_LOAD_WAIT_DISPATCHER = 0;

const getRetryDelay = (attempt: number): number => {
	// 1s, 2s, 4s, 8s (capped)
	return Math.min(1000 * Math.pow(2, attempt), 8000);
};

// ============================================================================
// Main Component
// ============================================================================

export const PreviewIframe = forwardRef<HTMLIFrameElement, PreviewIframeProps>(
	({ src, className = '', title = 'Preview', shouldRefreshPreview = false, manualRefreshTrigger, webSocket }, ref) => {
		
		const [loadState, setLoadState] = useState<LoadState>({
			status: 'idle',
			attempt: 0,
			loadedSrc: null,
			errorMessage: null,
		});

		const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
		const hasRequestedRedeployRef = useRef(false);
        const postLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
		// ====================================================================
		// Core Loading Logic
		// ====================================================================

		/**
		 * Test if URL is accessible using a simple HEAD request
		 * Returns preview type if accessible, null otherwise
		 */
		const testAvailability = useCallback(async (url: string): Promise<'sandbox' | 'dispatcher' | null> => {
			try {
				const response = await fetch(url, {
					method: 'HEAD',
					mode: 'cors', // Using CORS to read security-validated headers
					cache: 'no-cache',
					signal: AbortSignal.timeout(8000),
				});

	
				if (!response.ok) {
						return null;
				}
				
				// Read the custom header to determine preview type
				// Header will only be present if origin validation passed on server
				const previewType = response.headers.get('X-Preview-Type');
				
                if (previewType === 'sandbox-error') {
                    return null;
                } else if (previewType === 'sandbox' || previewType === 'dispatcher') {
					return previewType;
				}
				
				// Fallback: If no header present (shouldn't happen with valid origin)
				// but the response is OK, assume sandbox for backward compatibility
					return 'sandbox';
			} catch (error) {
					return null;
			}
		}, []);

		/**
		 * Request automatic redeployment via WebSocket
		 */
		const requestRedeploy = useCallback(() => {
			if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
				console.warn('Cannot request redeploy: WebSocket not connected');
				return;
			}

			if (hasRequestedRedeployRef.current) {
					return;
			}

				
			try {
				webSocket.send(JSON.stringify({
					type: 'preview',
				}));
				hasRequestedRedeployRef.current = true;
			} catch (error) {
				console.error('Failed to send redeploy request:', error);
			}
		}, [webSocket]);

		/**
		 * Request screenshot capture via WebSocket
		 */
		const requestScreenshot = useCallback((url: string) => {
			if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
				console.warn('Cannot request screenshot: WebSocket not connected');
				return;
			}

				
			try {
				webSocket.send(JSON.stringify({
					type: 'capture_screenshot',
					data: {
						url,
						viewport: { width: 1280, height: 720 },
					},
				}));
			} catch (error) {
				console.error('Failed to send screenshot request:', error);
			}
		}, [webSocket]);

		/**
		 * Attempt to load the preview with retry logic
		 */
		const loadWithRetry = useCallback(async (url: string, attempt: number) => {
			// Clear any pending retry
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}

            if (postLoadTimeoutRef.current) {
                clearTimeout(postLoadTimeoutRef.current);
                postLoadTimeoutRef.current = null;
            }

			// Check if we've exceeded max retries
			if (attempt >= MAX_RETRIES) {
				setLoadState({
					status: 'error',
					attempt,
					loadedSrc: null,
					errorMessage: 'Preview failed to load after multiple attempts',
				});
				return;
			}

			// Update state to show loading
			setLoadState({
				status: 'loading',
				attempt: attempt + 1,
				loadedSrc: null,
				errorMessage: null,
			});

			// Test availability
			const previewType = await testAvailability(url);

			if (previewType) {
				// Success: put component into postload state, keep loading UI visible
					setLoadState({
					status: 'postload',
					attempt: attempt + 1,
					loadedSrc: url,
					errorMessage: null,
					previewType,
				});

				// Wait for page to render before revealing iframe and capturing screenshot
				const waitTime = previewType === 'dispatcher' ? POST_LOAD_WAIT_DISPATCHER : POST_LOAD_WAIT_SANDBOX;
					postLoadTimeoutRef.current = setTimeout(() => {
					setLoadState(prev => ({
						...prev,
						status: 'loaded',
					}));
					requestScreenshot(url);
				}, waitTime);
			} else {
				// Not available yet - retry with backoff
				const delay = getRetryDelay(attempt);
				const nextAttempt = attempt + 1;
				
	
				// Auto-redeploy after 3 failed attempts
				if (nextAttempt === REDEPLOY_AFTER_ATTEMPT) {
					requestRedeploy();
				}

				// Schedule next retry
				retryTimeoutRef.current = setTimeout(() => {
					loadWithRetry(url, nextAttempt);
				}, delay);
			}
		}, [testAvailability, requestScreenshot, requestRedeploy]);

		/**
		 * Force a fresh reload from scratch
		 */
		const forceReload = useCallback(() => {
				hasRequestedRedeployRef.current = false;
			
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}

            if (postLoadTimeoutRef.current) {
                clearTimeout(postLoadTimeoutRef.current);
                postLoadTimeoutRef.current = null;
            }

			setLoadState({
				status: 'idle',
				attempt: 0,
				loadedSrc: null,
				errorMessage: null,
			});

			// Start loading
			loadWithRetry(src, 0);
		}, [src, loadWithRetry]);

		// ====================================================================
		// Effects
		// ====================================================================

		/**
		 * Effect: Load when src changes
		 */
		useEffect(() => {
			if (!src) return;

				hasRequestedRedeployRef.current = false;
			
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}

            if (postLoadTimeoutRef.current) {
                clearTimeout(postLoadTimeoutRef.current);
                postLoadTimeoutRef.current = null;
            }

			setLoadState({
				status: 'idle',
				attempt: 0,
				loadedSrc: null,
				errorMessage: null,
			});

			loadWithRetry(src, 0);

			return () => {
				if (retryTimeoutRef.current) {
					clearTimeout(retryTimeoutRef.current);
					retryTimeoutRef.current = null;
				}
				if (postLoadTimeoutRef.current) {
					clearTimeout(postLoadTimeoutRef.current);
					postLoadTimeoutRef.current = null;
				}
			};
		}, [src, loadWithRetry]);

		/**
		 * Effect: Auto-refresh after deployment
		 */
		useEffect(() => {
			if (shouldRefreshPreview && loadState.status === 'loaded' && loadState.loadedSrc) {
					forceReload();
			}
		}, [shouldRefreshPreview, loadState.status, loadState.loadedSrc, forceReload]);

		/**
		 * Effect: Manual refresh trigger
		 */
		useEffect(() => {
			if (manualRefreshTrigger && manualRefreshTrigger > 0) {
					forceReload();
			}
		}, [manualRefreshTrigger, forceReload]);

		/**
		 * Effect: Cleanup on unmount
		 */
		useEffect(() => {
			return () => {
				if (retryTimeoutRef.current) {
					clearTimeout(retryTimeoutRef.current);
				}
				if (postLoadTimeoutRef.current) {
					clearTimeout(postLoadTimeoutRef.current);
				}
			};
		}, []);

		// ====================================================================
		// Render
		// ====================================================================

		// Successfully loaded - show iframe
		if (loadState.status === 'loaded' && loadState.loadedSrc) {
			return (
				<div className={`${className} relative rounded-xl overflow-hidden border-2 border-cosmic-blue/30 shadow-[0_0_30px_rgba(100,181,246,0.15),inset_0_0_20px_rgba(168,85,247,0.05)] bg-gradient-to-br from-cosmic-blue/5 to-cosmic-purple/5 backdrop-blur-sm`}>
					<iframe
						ref={ref}
						src={loadState.loadedSrc}
						className="w-full h-full rounded-xl"
						title={title}
						onError={() => {
							console.error('Iframe failed to load');
							setLoadState(prev => ({
								...prev,
								status: 'error',
								errorMessage: 'Preview failed to render',
							}));
						}}
					/>
				</div>
			);
		}

		// Loading state
		if (loadState.status === 'loading' || loadState.status === 'idle' || loadState.status === 'postload') {
			const delay = getRetryDelay(loadState.attempt - 1);
			const delaySeconds = Math.ceil(delay / 1000);

			return (
				<div className={`${className} relative flex flex-col items-center justify-center bg-bg-3/95 backdrop-blur-md border-2 border-cosmic-blue/20 rounded-xl shadow-[0_0_20px_rgba(100,181,246,0.1),inset_0_0_30px_rgba(168,85,247,0.03)]`}>
                    {loadState.status === 'postload' && loadState.loadedSrc && (
                        <iframe
                            ref={ref}
                            src={loadState.loadedSrc}
                            className="absolute inset-0 opacity-0 pointer-events-none"
                            title={title}
                            aria-hidden="true"
                            onError={() => {
                                console.error('Iframe failed to load');
                                setLoadState(prev => ({
                                    ...prev,
                                    status: 'error',
                                    errorMessage: 'Preview failed to render',
                                }));
                            }}
                        />
                    )}
					<div className="text-center p-8 max-w-md relative z-10">
						<div className="relative mb-4">
							<div className="absolute inset-0 blur-xl opacity-30">
								<RefreshCw className="size-8 text-cosmic-blue animate-spin mx-auto" />
							</div>
							<RefreshCw className="size-8 text-cosmic-blue animate-spin mx-auto relative" />
						</div>
						<h3 className="text-lg font-semibold bg-gradient-to-r from-cosmic-blue to-cosmic-purple bg-clip-text text-transparent mb-2">
							Loading Preview
						</h3>
						<p className="text-text-primary/70 text-sm mb-4">
							{loadState.attempt === 0
								? 'Checking if your deployed preview is ready...'
								: `Preview not ready yet. Retrying in ${delaySeconds}s... (attempt ${loadState.attempt}/${MAX_RETRIES})`
							}
						</p>
						{loadState.attempt >= REDEPLOY_AFTER_ATTEMPT && (
							<p className="text-xs text-cosmic-purple/80 bg-cosmic-purple/10 px-3 py-2 rounded-lg border border-cosmic-purple/20">
								Auto-redeployment triggered to refresh the preview
							</p>
						)}
						<div className="text-xs text-text-primary/50 mt-4 border-t border-cosmic-blue/10 pt-4">
							Preview URLs may take a moment to become available after deployment
						</div>
					</div>
				</div>
			);
		}

		// Error state - after max retries
		return (
			<div className={`${className} flex flex-col items-center justify-center bg-bg-3/95 backdrop-blur-md border-2 border-cosmic-orange/30 rounded-xl shadow-[0_0_20px_rgba(255,87,34,0.1),inset_0_0_30px_rgba(236,72,153,0.03)]`}>
				<div className="text-center p-8 max-w-md">
					<div className="relative mb-4">
						<div className="absolute inset-0 blur-xl opacity-30">
							<AlertCircle className="size-8 text-cosmic-orange mx-auto" />
						</div>
						<AlertCircle className="size-8 text-cosmic-orange mx-auto relative" />
					</div>
					<h3 className="text-lg font-semibold bg-gradient-to-r from-cosmic-orange to-cosmic-pink bg-clip-text text-transparent mb-2">
						Preview Not Available
					</h3>
					<p className="text-text-primary/70 text-sm mb-6">
						{loadState.errorMessage || 'The preview failed to load after multiple attempts.'}
					</p>
					<div className="space-y-3">
						<button
							onClick={forceReload}
							className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cosmic-blue to-cosmic-purple hover:from-cosmic-blue/90 hover:to-cosmic-purple/90 text-white rounded-lg transition-all duration-200 text-sm mx-auto font-medium w-full shadow-[0_0_20px_rgba(100,181,246,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
						>
							<RefreshCw className="size-4" />
							Try Again
						</button>
						<p className="text-xs text-text-primary/60 border-t border-cosmic-orange/10 pt-3">
							If the issue persists, please describe the problem in chat so I can help diagnose and fix it.
						</p>
					</div>
				</div>
			</div>
		);
	}
);

PreviewIframe.displayName = 'PreviewIframe';
