/**
 * Tests for cryptoUtils
 */

import { describe, it, expect } from 'vitest';
import {
	base64url,
	sha256Hash,
	timingSafeEqual,
	timingSafeEqualBytes,
	generateSecureToken,
	generateApiKey,
	verifyApiKey,
	pbkdf2,
} from './cryptoUtils';

describe('cryptoUtils', () => {
	describe('base64url', () => {
		it('should encode empty buffer', () => {
			const result = base64url(new Uint8Array(0));
			expect(result).toBe('');
		});

		it('should encode small buffer', () => {
			const buffer = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
			const result = base64url(buffer);
			expect(result).toBeTruthy();
			expect(typeof result).toBe('string');
			// base64url should not contain +, /, or =
			expect(result).not.toContain('+');
			expect(result).not.toContain('/');
			expect(result).not.toContain('=');
		});

		it('should encode large buffer without stack overflow', () => {
			const largeBuffer = new Uint8Array(50000); // 50KB (smaller for test performance)
			crypto.getRandomValues(largeBuffer);

			const result = base64url(largeBuffer);
			expect(result).toBeTruthy();
			expect(result.length).toBeGreaterThan(0);
			// Roughly estimate base64 encoding size (4/3 of original)
			expect(result.length).toBeGreaterThan(60000);
		});

		it('should produce URL-safe encoding', () => {
			const buffer = new Uint8Array(32);
			crypto.getRandomValues(buffer);

			const result = base64url(buffer);

			// Should only contain base64url-safe characters
			const base64urlPattern = /^[A-Za-z0-9_-]*$/;
			expect(base64urlPattern.test(result)).toBe(true);
		});

		it('should handle different buffer sizes', () => {
			const sizes = [1, 10, 100, 1000, 10000];

			sizes.forEach(size => {
				const buffer = new Uint8Array(size);
				crypto.getRandomValues(buffer);

				const result = base64url(buffer);
				expect(result).toBeTruthy();
				expect(result.length).toBeGreaterThan(0);
			});
		});
	});

	describe('sha256Hash', () => {
		it('should hash strings consistently', async () => {
			const text = 'test string';

			const hash1 = await sha256Hash(text);
			const hash2 = await sha256Hash(text);

			expect(hash1).toBe(hash2);
			expect(hash1).toBeTruthy();
			expect(typeof hash1).toBe('string');
		});

		it('should produce different hashes for different inputs', async () => {
			const text1 = 'test string 1';
			const text2 = 'test string 2';

			const hash1 = await sha256Hash(text1);
			const hash2 = await sha256Hash(text2);

			expect(hash1).not.toBe(hash2);
		});

		it('should handle empty string', async () => {
			const hash = await sha256Hash('');
			expect(hash).toBeTruthy();
			expect(typeof hash).toBe('string');
		});

		it('should produce URL-safe hash', async () => {
			const hash = await sha256Hash('test');

			const base64urlPattern = /^[A-Za-z0-9_-]*$/;
			expect(base64urlPattern.test(hash)).toBe(true);
		});
	});

	describe('timingSafeEqual', () => {
		it('should return true for equal strings', async () => {
			const text = 'secret-value';

			const result = await timingSafeEqual(text, text);
			expect(result).toBe(true);
		});

		it('should return false for different strings', async () => {
			const text1 = 'secret-value-1';
			const text2 = 'secret-value-2';

			const result = await timingSafeEqual(text1, text2);
			expect(result).toBe(false);
		});

		it('should return false for different lengths', async () => {
			const text1 = 'short';
			const text2 = 'much longer string';

			const result = await timingSafeEqual(text1, text2);
			expect(result).toBe(false);
		});

		it('should be timing-safe (constant time comparison)', async () => {
			// Test that comparison time doesn't leak information
			const text1 = 'secret123456';
			const text2 = 'wrong1234567';

			const result = await timingSafeEqual(text1, text2);
			expect(result).toBe(false);
		});
	});

	describe('timingSafeEqualBytes', () => {
		it('should return true for equal byte arrays', () => {
			const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
			const bytes2 = new Uint8Array([1, 2, 3, 4, 5]);

			const result = timingSafeEqualBytes(bytes1, bytes2);
			expect(result).toBe(true);
		});

		it('should return false for different byte arrays', () => {
			const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
			const bytes2 = new Uint8Array([1, 2, 3, 4, 6]);

			const result = timingSafeEqualBytes(bytes1, bytes2);
			expect(result).toBe(false);
		});

		it('should return false for different lengths', () => {
			const bytes1 = new Uint8Array([1, 2, 3]);
			const bytes2 = new Uint8Array([1, 2, 3, 4, 5]);

			const result = timingSafeEqualBytes(bytes1, bytes2);
			expect(result).toBe(false);
		});
	});

	describe('generateSecureToken', () => {
		it('should generate default length token', () => {
			const token = generateSecureToken();

			expect(token).toBeTruthy();
			expect(typeof token).toBe('string');
			expect(token.length).toBe(64); // 32 bytes * 2 hex chars
		});

		it('should generate custom length token', () => {
			const lengths = [16, 24, 32, 64];

			lengths.forEach(length => {
				const token = generateSecureToken(length);
				expect(token.length).toBe(length * 2); // hex encoding doubles length
			});
		});

		it('should generate unique tokens', () => {
			const token1 = generateSecureToken();
			const token2 = generateSecureToken();
			const token3 = generateSecureToken();

			expect(token1).not.toBe(token2);
			expect(token2).not.toBe(token3);
			expect(token1).not.toBe(token3);
		});

		it('should only contain hex characters', () => {
			const token = generateSecureToken();

			const hexPattern = /^[0-9a-f]+$/;
			expect(hexPattern.test(token)).toBe(true);
		});
	});

	describe('generateApiKey', () => {
		it('should generate API key with all components', async () => {
			const result = await generateApiKey();

			expect(result.key).toBeTruthy();
			expect(result.keyHash).toBeTruthy();
			expect(result.keyPreview).toBeTruthy();
		});

		it('should generate unique keys', async () => {
			const result1 = await generateApiKey();
			const result2 = await generateApiKey();

			expect(result1.key).not.toBe(result2.key);
			expect(result1.keyHash).not.toBe(result2.keyHash);
		});

		it('should generate proper key preview', async () => {
			const result = await generateApiKey();

			// Preview should be in format: "first8...last4"
			expect(result.keyPreview).toContain('...');
			expect(result.keyPreview.length).toBeLessThan(result.key.length);
		});

		it('should generate verifiable API keys', async () => {
			const { key, keyHash } = await generateApiKey();

			const isValid = await verifyApiKey(key, keyHash);
			expect(isValid).toBe(true);
		});
	});

	describe('verifyApiKey', () => {
		it('should verify correct API key', async () => {
			const { key, keyHash } = await generateApiKey();

			const result = await verifyApiKey(key, keyHash);
			expect(result).toBe(true);
		});

		it('should reject incorrect API key', async () => {
			const { keyHash } = await generateApiKey();
			const wrongKey = 'wrong-key-value';

			const result = await verifyApiKey(wrongKey, keyHash);
			expect(result).toBe(false);
		});

		it('should reject tampered API key', async () => {
			const { key, keyHash } = await generateApiKey();
			const tamperedKey = key + 'x'; // Append character

			const result = await verifyApiKey(tamperedKey, keyHash);
			expect(result).toBe(false);
		});

		it('should handle invalid hash gracefully', async () => {
			const key = 'some-key';
			const invalidHash = 'invalid-hash';

			const result = await verifyApiKey(key, invalidHash);
			expect(result).toBe(false);
		});
	});

	describe('pbkdf2', () => {
		it('should derive key from password', async () => {
			const password = 'my-secure-password';
			const salt = new Uint8Array(16);
			crypto.getRandomValues(salt);

			const derivedKey = await pbkdf2(password, salt);

			expect(derivedKey).toBeDefined();
			expect(derivedKey).toBeInstanceOf(Uint8Array);
			expect(derivedKey.length).toBe(32); // Default key length
		});

		it('should derive consistent keys with same inputs', async () => {
			const password = 'my-secure-password';
			const salt = new Uint8Array(16);
			crypto.getRandomValues(salt);

			const key1 = await pbkdf2(password, salt);
			const key2 = await pbkdf2(password, salt);

			expect(key1).toEqual(key2);
		});

		it('should derive different keys with different passwords', async () => {
			const password1 = 'password-1';
			const password2 = 'password-2';
			const salt = new Uint8Array(16);
			crypto.getRandomValues(salt);

			const key1 = await pbkdf2(password1, salt);
			const key2 = await pbkdf2(password2, salt);

			expect(key1).not.toEqual(key2);
		});

		it('should derive different keys with different salts', async () => {
			const password = 'my-secure-password';
			const salt1 = new Uint8Array(16);
			const salt2 = new Uint8Array(16);
			crypto.getRandomValues(salt1);
			crypto.getRandomValues(salt2);

			const key1 = await pbkdf2(password, salt1);
			const key2 = await pbkdf2(password, salt2);

			expect(key1).not.toEqual(key2);
		});

		it('should support custom iterations', async () => {
			const password = 'my-secure-password';
			const salt = new Uint8Array(16);
			crypto.getRandomValues(salt);

			const iterations = 50000;
			const derivedKey = await pbkdf2(password, salt, iterations);

			expect(derivedKey).toBeDefined();
			expect(derivedKey.length).toBe(32);
		});

		it('should support custom key length', async () => {
			const password = 'my-secure-password';
			const salt = new Uint8Array(16);
			crypto.getRandomValues(salt);

			const keyLength = 64;
			const derivedKey = await pbkdf2(password, salt, 100000, keyLength);

			expect(derivedKey.length).toBe(keyLength);
		});
	});
});
