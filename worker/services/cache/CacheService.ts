/**
 * Enhanced Cache Service using Cloudflare Cache API with monitoring
 */

import { getCacheMonitor } from './CacheMonitor';
import { createLogger } from '../../logger';

const logger = createLogger('CacheService');

export interface CacheOptions {
	ttlSeconds: number;
	tags?: string[];
	bypassCache?: boolean; // For debugging/testing
}

export class CacheService {
	/**
	 * Get cached response
	 */
	async get(keyOrRequest: string | Request): Promise<Response | undefined> {
		// Use caches.default for Cloudflare Workers
		const cache = caches.default;
		return await cache.match(keyOrRequest);
	}

	/**
	 * Store response in cache
	 */
	async put(
		keyOrRequest: string | Request,
		response: Response,
		options: CacheOptions,
	): Promise<void> {

		// Convert Headers to a plain object
		const headersObj: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headersObj[key] = value;
		});

		const responseToCache = new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: {
				...headersObj,
				'Cache-Control': `public, max-age=${options.ttlSeconds}`,
				'X-Cache': 'MISS', // Mark as cache miss initially
				...(options.tags
					? { 'Cache-Tag': options.tags.join(',') }
					: {}),
			},
		});

		// Use caches.default for Cloudflare Workers
		const cache = caches.default;
		await cache.put(keyOrRequest, responseToCache);
	}

	/**
	 * Generate cache key from request
	 */
	generateKey(request: Request, userId?: string): string {
		const url = new URL(request.url);
		const baseKey = `${url.pathname}${url.search}`;
		return userId ? `${baseKey}:user:${userId}` : baseKey;
	}

	/**
	 * Extract endpoint path for monitoring
	 */
	private getEndpointPath(request: Request | string): string {
		if (typeof request === 'string') {
			return request;
		}
		const url = new URL(request.url);
		// Remove query params for cleaner grouping
		return url.pathname;
	}

	/**
	 * Simple wrapper for caching controller responses with monitoring
	 */
	async withCache(
		cacheKeyOrRequest: string | Request,
		operation: () => Promise<Response>,
		options: CacheOptions,
	): Promise<Response> {
		const startTime = Date.now();
		const monitor = getCacheMonitor();
		const endpoint = this.getEndpointPath(cacheKeyOrRequest);
		const cacheKey = typeof cacheKeyOrRequest === 'string'
			? cacheKeyOrRequest
			: cacheKeyOrRequest.url;

		// Bypass cache if requested (for debugging)
		if (options.bypassCache) {
			logger.debug('Cache bypassed', { endpoint });
			const response = await operation();
			const responseTime = Date.now() - startTime;
			monitor.recordMiss(endpoint, responseTime, cacheKey);
			return response;
		}

		// Try to get from cache first
		const cached = await this.get(cacheKeyOrRequest);
		if (cached) {
			const responseTime = Date.now() - startTime;
			monitor.recordHit(endpoint, responseTime, cacheKey);

			// Add cache hit header
			const headers = new Headers(cached.headers);
			headers.set('X-Cache', 'HIT');

			const responseWithHeader = new Response(cached.body, {
				status: cached.status,
				statusText: cached.statusText,
				headers
			});

			logger.debug('Cache hit', { endpoint, responseTimeMs: responseTime });
			return responseWithHeader;
		}

		// Execute operation and cache result
		const response = await operation();
		const responseTime = Date.now() - startTime;
		monitor.recordMiss(endpoint, responseTime, cacheKey);

		if (response.ok) {
			await this.put(cacheKeyOrRequest, response.clone(), options);
			logger.debug('Cache miss, stored new entry', {
				endpoint,
				responseTimeMs: responseTime,
				ttl: options.ttlSeconds
			});
		} else {
			logger.debug('Cache miss, response not OK, not caching', {
				endpoint,
				status: response.status
			});
		}

		return response;
	}

	/**
	 * Invalidate cache entries by tags
	 * Note: Cloudflare Workers Cache API doesn't support tag-based invalidation natively
	 * This would require custom implementation with KV store or Cache-Tag header purging
	 */
	async invalidateByTags(tags: string[]): Promise<void> {
		logger.info('Cache invalidation requested', { tags });
		// TODO: Implement tag-based invalidation using Cloudflare Cache Purge API
		// For now, we log the request. Full implementation would require:
		// 1. Track cache keys by tags in KV
		// 2. Purge specific keys when tags match
		// 3. Or use Cloudflare Cache Purge API with Cache-Tag header
	}

	/**
	 * Invalidate specific cache key
	 */
	async invalidate(keyOrRequest: string | Request): Promise<void> {
		const cache = caches.default;
		const deleted = await cache.delete(keyOrRequest);
		const endpoint = this.getEndpointPath(keyOrRequest);
		logger.debug('Cache invalidation', {
			endpoint,
			success: deleted
		});
	}
}
