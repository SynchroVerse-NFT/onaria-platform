/**
 * Cache Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService, CacheOptions } from './CacheService';
import { getCacheMonitor } from './CacheMonitor';

describe('CacheService', () => {
    let cacheService: CacheService;
    let mockCache: {
        match: ReturnType<typeof vi.fn>;
        put: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        cacheService = new CacheService();

        // Mock Cloudflare Cache API
        mockCache = {
            match: vi.fn(),
            put: vi.fn(),
            delete: vi.fn()
        };

        // Mock caches.default
        global.caches = {
            default: mockCache as unknown as Cache
        } as CacheStorage;
    });

    describe('get', () => {
        it('should retrieve response from cache', async () => {
            const mockResponse = new Response('cached data');
            mockCache.match.mockResolvedValue(mockResponse);

            const request = new Request('https://example.com/api/test');
            const result = await cacheService.get(request);

            expect(result).toBe(mockResponse);
            expect(mockCache.match).toHaveBeenCalledWith(request);
        });

        it('should return undefined for cache miss', async () => {
            mockCache.match.mockResolvedValue(undefined);

            const request = new Request('https://example.com/api/test');
            const result = await cacheService.get(request);

            expect(result).toBeUndefined();
        });
    });

    describe('put', () => {
        it('should store response in cache with correct headers', async () => {
            const response = new Response('test data', {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            const request = new Request('https://example.com/api/test');
            const options: CacheOptions = {
                ttlSeconds: 300,
                tags: ['test-tag']
            };

            await cacheService.put(request, response, options);

            expect(mockCache.put).toHaveBeenCalled();
            const [, cachedResponse] = mockCache.put.mock.calls[0];

            expect(cachedResponse.headers.get('Cache-Control')).toBe('public, max-age=300');
            expect(cachedResponse.headers.get('X-Cache')).toBe('MISS');
            expect(cachedResponse.headers.get('Cache-Tag')).toBe('test-tag');
        });

        it('should handle multiple tags', async () => {
            const response = new Response('test data');
            const request = new Request('https://example.com/api/test');
            const options: CacheOptions = {
                ttlSeconds: 120,
                tags: ['tag1', 'tag2', 'tag3']
            };

            await cacheService.put(request, response, options);

            const [, cachedResponse] = mockCache.put.mock.calls[0];
            expect(cachedResponse.headers.get('Cache-Tag')).toBe('tag1,tag2,tag3');
        });
    });

    describe('withCache', () => {
        it('should return cached response on cache hit', async () => {
            const cachedResponse = new Response('cached data', {
                headers: { 'Content-Type': 'application/json' }
            });
            mockCache.match.mockResolvedValue(cachedResponse);

            const operation = vi.fn().mockResolvedValue(new Response('fresh data'));
            const request = new Request('https://example.com/api/test');
            const options: CacheOptions = { ttlSeconds: 300 };

            const result = await cacheService.withCache(request, operation, options);

            expect(operation).not.toHaveBeenCalled();
            expect(result.headers.get('X-Cache')).toBe('HIT');

            const monitor = getCacheMonitor();
            const stats = monitor.getStatistics();
            expect(stats.cacheHits).toBeGreaterThan(0);
        });

        it('should execute operation and cache result on cache miss', async () => {
            mockCache.match.mockResolvedValue(undefined);

            const freshResponse = new Response('fresh data', { status: 200 });
            const operation = vi.fn().mockResolvedValue(freshResponse);
            const request = new Request('https://example.com/api/test');
            const options: CacheOptions = { ttlSeconds: 300 };

            const result = await cacheService.withCache(request, operation, options);

            expect(operation).toHaveBeenCalled();
            expect(mockCache.put).toHaveBeenCalled();
            expect(result).toBe(freshResponse);

            const monitor = getCacheMonitor();
            const stats = monitor.getStatistics();
            expect(stats.cacheMisses).toBeGreaterThan(0);
        });

        it('should not cache non-OK responses', async () => {
            mockCache.match.mockResolvedValue(undefined);

            const errorResponse = new Response('error', { status: 500 });
            const operation = vi.fn().mockResolvedValue(errorResponse);
            const request = new Request('https://example.com/api/test');
            const options: CacheOptions = { ttlSeconds: 300 };

            await cacheService.withCache(request, operation, options);

            expect(operation).toHaveBeenCalled();
            expect(mockCache.put).not.toHaveBeenCalled();
        });

        it('should bypass cache when bypassCache option is true', async () => {
            const cachedResponse = new Response('cached data');
            mockCache.match.mockResolvedValue(cachedResponse);

            const freshResponse = new Response('fresh data', { status: 200 });
            const operation = vi.fn().mockResolvedValue(freshResponse);
            const request = new Request('https://example.com/api/test');
            const options: CacheOptions = { ttlSeconds: 300, bypassCache: true };

            const result = await cacheService.withCache(request, operation, options);

            expect(mockCache.match).not.toHaveBeenCalled();
            expect(operation).toHaveBeenCalled();
            expect(result).toBe(freshResponse);
        });
    });

    describe('generateKey', () => {
        it('should generate key from request without user', () => {
            const request = new Request('https://example.com/api/test?param=value');
            const key = cacheService.generateKey(request);

            expect(key).toBe('/api/test?param=value');
        });

        it('should include userId in key when provided', () => {
            const request = new Request('https://example.com/api/test?param=value');
            const key = cacheService.generateKey(request, 'user123');

            expect(key).toBe('/api/test?param=value:user:user123');
        });
    });

    describe('invalidate', () => {
        it('should delete cache entry', async () => {
            mockCache.delete.mockResolvedValue(true);

            const request = new Request('https://example.com/api/test');
            await cacheService.invalidate(request);

            expect(mockCache.delete).toHaveBeenCalledWith(request);
        });

        it('should handle deletion failure gracefully', async () => {
            mockCache.delete.mockResolvedValue(false);

            const request = new Request('https://example.com/api/test');
            await expect(cacheService.invalidate(request)).resolves.not.toThrow();
        });
    });

    describe('invalidateByTags', () => {
        it('should log tag-based invalidation request', async () => {
            const tags = ['tag1', 'tag2'];
            await expect(cacheService.invalidateByTags(tags)).resolves.not.toThrow();
        });
    });
});
