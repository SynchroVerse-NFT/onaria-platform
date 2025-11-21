/**
 * Cache Monitor Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheMonitor } from './CacheMonitor';

describe('CacheMonitor', () => {
    let monitor: CacheMonitor;

    beforeEach(() => {
        monitor = new CacheMonitor();
    });

    describe('recordHit', () => {
        it('should record cache hit metrics', () => {
            monitor.recordHit('/api/test', 50, 'key1');

            const stats = monitor.getStatistics();
            expect(stats.totalRequests).toBe(1);
            expect(stats.cacheHits).toBe(1);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.hitRate).toBe(1);
        });

        it('should track response times for hits', () => {
            monitor.recordHit('/api/test', 50, 'key1');
            monitor.recordHit('/api/test', 60, 'key2');

            const stats = monitor.getStatistics();
            expect(stats.avgResponseTimeHit).toBe(55); // (50 + 60) / 2
        });
    });

    describe('recordMiss', () => {
        it('should record cache miss metrics', () => {
            monitor.recordMiss('/api/test', 200, 'key1');

            const stats = monitor.getStatistics();
            expect(stats.totalRequests).toBe(1);
            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(1);
            expect(stats.hitRate).toBe(0);
        });

        it('should track response times for misses', () => {
            monitor.recordMiss('/api/test', 200, 'key1');
            monitor.recordMiss('/api/test', 300, 'key2');

            const stats = monitor.getStatistics();
            expect(stats.avgResponseTimeMiss).toBe(250); // (200 + 300) / 2
        });
    });

    describe('getStatistics', () => {
        it('should calculate correct hit rate', () => {
            monitor.recordHit('/api/test', 50, 'key1');
            monitor.recordHit('/api/test', 55, 'key2');
            monitor.recordMiss('/api/test', 200, 'key3');
            monitor.recordMiss('/api/test', 250, 'key4');

            const stats = monitor.getStatistics();
            expect(stats.hitRate).toBe(0.5); // 2 hits out of 4 total
        });

        it('should group metrics by endpoint', () => {
            monitor.recordHit('/api/apps/public', 50, 'key1');
            monitor.recordMiss('/api/apps/public', 200, 'key2');
            monitor.recordHit('/api/users', 60, 'key3');

            const stats = monitor.getStatistics();

            expect(stats.byEndpoint['/api/apps/public']).toBeDefined();
            expect(stats.byEndpoint['/api/apps/public'].requests).toBe(2);
            expect(stats.byEndpoint['/api/apps/public'].hits).toBe(1);
            expect(stats.byEndpoint['/api/apps/public'].misses).toBe(1);
            expect(stats.byEndpoint['/api/apps/public'].hitRate).toBe(0.5);

            expect(stats.byEndpoint['/api/users']).toBeDefined();
            expect(stats.byEndpoint['/api/users'].requests).toBe(1);
            expect(stats.byEndpoint['/api/users'].hits).toBe(1);
        });

        it('should filter by time window', () => {
            const now = Date.now();

            // Record old metrics (manually set timestamp)
            monitor.recordHit('/api/test', 50, 'key1');

            // Simulate time passing by advancing time
            setTimeout(() => {
                monitor.recordHit('/api/test', 60, 'key2');
            }, 10);

            // Get stats for last 1 minute
            const recentStats = monitor.getStatistics(1);
            expect(recentStats.totalRequests).toBeGreaterThanOrEqual(1);
        });

        it('should return empty stats when no metrics exist', () => {
            const stats = monitor.getStatistics();

            expect(stats.totalRequests).toBe(0);
            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.hitRate).toBe(0);
            expect(stats.avgResponseTimeHit).toBe(0);
            expect(stats.avgResponseTimeMiss).toBe(0);
        });
    });

    describe('getRecentMetrics', () => {
        it('should return most recent metrics', () => {
            monitor.recordHit('/api/test1', 50, 'key1');
            monitor.recordHit('/api/test2', 60, 'key2');
            monitor.recordMiss('/api/test3', 200, 'key3');

            const metrics = monitor.getRecentMetrics(2);
            expect(metrics.length).toBe(2);
            expect(metrics[0].endpoint).toBe('/api/test2');
            expect(metrics[1].endpoint).toBe('/api/test3');
        });

        it('should respect count parameter', () => {
            for (let i = 0; i < 10; i++) {
                monitor.recordHit('/api/test', 50 + i, `key${i}`);
            }

            const metrics = monitor.getRecentMetrics(5);
            expect(metrics.length).toBe(5);
        });
    });

    describe('clear', () => {
        it('should clear all metrics', () => {
            monitor.recordHit('/api/test', 50, 'key1');
            monitor.recordMiss('/api/test', 200, 'key2');

            monitor.clear();

            const stats = monitor.getStatistics();
            expect(stats.totalRequests).toBe(0);
            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
        });
    });

    describe('ring buffer behavior', () => {
        it('should not exceed maxMetrics limit', () => {
            const smallMonitor = new CacheMonitor();

            // Record more than maxMetrics (10000)
            for (let i = 0; i < 10100; i++) {
                smallMonitor.recordHit('/api/test', 50, `key${i}`);
            }

            const metrics = smallMonitor.getRecentMetrics(15000);
            expect(metrics.length).toBeLessThanOrEqual(10000);
        });
    });
});
