/**
 * Tests for ID generator utility
 */

import { describe, it, expect } from 'vitest';
import { generateId } from './idGenerator';

describe('idGenerator', () => {
	describe('generateId', () => {
		it('should generate a valid ID', () => {
			const id = generateId();
			expect(id).toBeTruthy();
			expect(typeof id).toBe('string');
			expect(id.length).toBeGreaterThan(0);
		});

		it('should generate unique IDs', () => {
			const id1 = generateId();
			const id2 = generateId();
			const id3 = generateId();

			expect(id1).not.toBe(id2);
			expect(id2).not.toBe(id3);
			expect(id1).not.toBe(id3);
		});

		it('should generate IDs with consistent format', () => {
			const ids = Array.from({ length: 100 }, () => generateId());

			// All IDs should be non-empty strings
			ids.forEach(id => {
				expect(typeof id).toBe('string');
				expect(id.length).toBeGreaterThan(0);
			});

			// All IDs should be unique
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(100);
		});

		it('should not contain invalid characters', () => {
			const id = generateId();

			// Should only contain alphanumeric characters and hyphens
			const validPattern = /^[a-zA-Z0-9-]+$/;
			expect(validPattern.test(id)).toBe(true);
		});

		it('should be URL-safe', () => {
			const id = generateId();

			// Should not contain characters that need URL encoding
			const encoded = encodeURIComponent(id);
			expect(encoded).toBe(id);
		});
	});
});
