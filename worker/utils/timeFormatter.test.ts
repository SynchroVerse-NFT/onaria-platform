/**
 * Tests for time formatter utility
 */

import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './timeFormatter';

describe('timeFormatter', () => {
	describe('formatRelativeTime', () => {
		it('should format recent time as "just now"', () => {
			const now = new Date();
			const result = formatRelativeTime(now.toISOString());
			expect(result).toContain('now');
		});

		it('should format time from minutes ago', () => {
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
			const result = formatRelativeTime(fiveMinutesAgo.toISOString());
			expect(result).toContain('minute');
		});

		it('should format time from hours ago', () => {
			const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
			const result = formatRelativeTime(twoHoursAgo.toISOString());
			expect(result).toContain('hour');
		});

		it('should format time from days ago', () => {
			const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
			const result = formatRelativeTime(threeDaysAgo.toISOString());
			expect(result).toContain('day');
		});

		it('should handle invalid date strings', () => {
			const result = formatRelativeTime('invalid-date');
			expect(result).toBeTruthy();
		});

		it('should handle future dates', () => {
			const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
			const result = formatRelativeTime(futureDate.toISOString());
			expect(result).toBeTruthy();
		});

		it('should handle very old dates', () => {
			const veryOld = new Date('2020-01-01');
			const result = formatRelativeTime(veryOld.toISOString());
			expect(result).toBeTruthy();
		});
	});
});
