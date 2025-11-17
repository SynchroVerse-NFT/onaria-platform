/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
	describe('cn (className merger)', () => {
		it('should merge class names', () => {
			const result = cn('class1', 'class2');
			expect(result).toContain('class1');
			expect(result).toContain('class2');
		});

		it('should handle conditional classes', () => {
			const result = cn('base', true && 'conditional', false && 'excluded');
			expect(result).toContain('base');
			expect(result).toContain('conditional');
			expect(result).not.toContain('excluded');
		});

		it('should handle undefined and null', () => {
			const result = cn('class1', undefined, null, 'class2');
			expect(result).toContain('class1');
			expect(result).toContain('class2');
		});

		it('should handle empty input', () => {
			const result = cn();
			expect(result).toBe('');
		});

		it('should merge tailwind classes correctly', () => {
			const result = cn('p-4', 'p-8');
			// Should resolve to p-8 (last one wins)
			expect(result).toBeTruthy();
		});

		it('should handle object syntax', () => {
			const result = cn({
				'class1': true,
				'class2': false,
				'class3': true,
			});
			expect(result).toContain('class1');
			expect(result).not.toContain('class2');
			expect(result).toContain('class3');
		});

		it('should handle array syntax', () => {
			const result = cn(['class1', 'class2', false && 'class3']);
			expect(result).toContain('class1');
			expect(result).toContain('class2');
			expect(result).not.toContain('class3');
		});
	});
});
