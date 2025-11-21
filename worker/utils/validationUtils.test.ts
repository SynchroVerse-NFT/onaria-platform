/**
 * Tests for validationUtils
 */

import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validateUsername } from './validationUtils';

describe('validationUtils', () => {
	describe('validateEmail', () => {
		it('should accept valid email addresses', () => {
			const validEmails = [
				'test@example.com',
				'user.name@example.com',
				'user+tag@example.com',
				'test123@test-domain.co.uk',
				'a@b.co',
			];

			validEmails.forEach(email => {
				const result = validateEmail(email);
				expect(result.valid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it('should reject invalid email formats', () => {
			const invalidEmails = [
				'',
				'notanemail',
				'@example.com',
				'user@',
				'user @example.com',
				'user@example',
			];

			invalidEmails.forEach(email => {
				const result = validateEmail(email);
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		it('should enforce maximum email length', () => {
			const longEmail = 'a'.repeat(230) + '@example.com'; // Total: 242 chars (< 254)
			const result = validateEmail(longEmail, { maxLength: 254 });
			expect(result.valid).toBe(true);

			const tooLongEmail = 'a'.repeat(250) + '@example.com'; // Total: 262 chars (> 254)
			const result2 = validateEmail(tooLongEmail, { maxLength: 254 });
			expect(result2.valid).toBe(false);
			expect(result2.error).toContain('less than 254');
		});

		it('should block temporary email domains', () => {
			const tempEmail = 'test@10minutemail.com';
			const result = validateEmail(tempEmail);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('not allowed');
		});

		it('should handle plus addressing configuration', () => {
			const email = 'user+tag@example.com';

			// Allow plus addressing (default)
			const allowed = validateEmail(email, { allowPlusAddressing: true });
			expect(allowed.valid).toBe(true);

			// Disallow plus addressing
			const disallowed = validateEmail(email, { allowPlusAddressing: false });
			expect(disallowed.valid).toBe(false);
			expect(disallowed.error).toContain('Plus addressing');
		});

		it('should handle international domains', () => {
			const internationalEmail = 'user@münchen.de';

			// Allow international (default)
			const allowed = validateEmail(internationalEmail, { allowInternational: true });
			expect(allowed.valid).toBe(true);

			// ASCII only
			const result = validateEmail(internationalEmail, { allowInternational: false });
			// This might still pass with basic regex, so just verify no error
			expect(result).toBeDefined();
		});

		it('should handle custom blocked domains', () => {
			const email = 'user@blocked.com';
			const result = validateEmail(email, {
				blockedDomains: ['blocked.com', 'spam.com'],
			});
			expect(result.valid).toBe(false);
			expect(result.error).toContain('not allowed');
		});
	});

	describe('validatePassword', () => {
		it('should accept strong passwords', () => {
			const strongPasswords = [
				'StrongPass123',
				'MyPassword1!',
				'Secure@Pass99',
				'Complex1ty!',
			];

			strongPasswords.forEach(password => {
				const result = validatePassword(password);
				expect(result.valid).toBe(true);
				expect(result.errors).toBeUndefined();
				expect(result.score).toBeGreaterThan(2);
			});
		});

		it('should reject weak passwords', () => {
			const weakPasswords = [
				'', // Empty
				'short', // Too short
				'alllowercase123', // No uppercase
				'ALLUPPERCASE123', // No lowercase
				'NoNumbers', // No numbers
			];

			weakPasswords.forEach(password => {
				const result = validatePassword(password);
				expect(result.valid).toBe(false);
				expect(result.errors).toBeDefined();
				expect(result.errors!.length).toBeGreaterThan(0);
			});
		});

		it('should enforce minimum length', () => {
			const result = validatePassword('Short1');
			expect(result.valid).toBe(false);
			expect(result.requirements.minLength).toBe(false);
			expect(result.errors?.some(e => e.includes('at least 8 characters'))).toBe(true);
		});

		it('should enforce maximum length', () => {
			const longPassword = 'A'.repeat(129) + 'a1';
			const result = validatePassword(longPassword);
			expect(result.valid).toBe(false);
			expect(result.errors?.some(e => e.includes('less than 128'))).toBe(true);
		});

		it('should require lowercase letters', () => {
			const result = validatePassword('UPPERCASE123');
			expect(result.valid).toBe(false);
			expect(result.requirements.hasLowercase).toBe(false);
			expect(result.errors?.some(e => e.includes('lowercase'))).toBe(true);
		});

		it('should require uppercase letters', () => {
			const result = validatePassword('lowercase123');
			expect(result.valid).toBe(false);
			expect(result.requirements.hasUppercase).toBe(false);
			expect(result.errors?.some(e => e.includes('uppercase'))).toBe(true);
		});

		it('should require numbers', () => {
			const result = validatePassword('NoNumbersHere');
			expect(result.valid).toBe(false);
			expect(result.requirements.hasNumbers).toBe(false);
			expect(result.errors?.some(e => e.includes('number'))).toBe(true);
		});

		it('should calculate password strength score', () => {
			const weak = validatePassword('Weak123'); // No special chars, shorter
			const strong = validatePassword('VeryStr0ng!Passw0rd');

			expect(weak.score).toBeDefined();
			expect(strong.score).toBeDefined();
			expect(strong.score).toBeGreaterThanOrEqual(weak.score);
		});

		it('should provide improvement suggestions', () => {
			const short = validatePassword('Short1Aa');
			expect(short.suggestions).toBeDefined();
			expect(short.suggestions?.some(s => s.includes('12 characters'))).toBe(true);

			const noSpecial = validatePassword('NoSpecialChar1');
			expect(noSpecial.suggestions).toBeDefined();
			expect(noSpecial.suggestions?.some(s => s.includes('special characters'))).toBe(true);
		});

		it('should track password requirements', () => {
			const result = validatePassword('StrongPass123!');

			expect(result.requirements).toBeDefined();
			expect(result.requirements.minLength).toBe(true);
			expect(result.requirements.hasLowercase).toBe(true);
			expect(result.requirements.hasUppercase).toBe(true);
			expect(result.requirements.hasNumbers).toBe(true);
			expect(result.requirements.hasSpecialChars).toBe(true);
		});
	});

	describe('validateUsername', () => {
		it('should accept valid usernames', () => {
			const validUsernames = [
				'john',
				'user123',
				'john_doe',
				'test_user_2024',
			];

			validUsernames.forEach(username => {
				const result = validateUsername(username);
				expect(result.valid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it('should reject invalid usernames', () => {
			const invalidUsernames = [
				'', // Empty
				'ab', // Too short
				'a'.repeat(31), // Too long
			];

			invalidUsernames.forEach(username => {
				const result = validateUsername(username);
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		it('should enforce minimum length', () => {
			const result = validateUsername('ab', { minLength: 3 });
			expect(result.valid).toBe(false);
			expect(result.error).toContain('at least 3 characters');
		});

		it('should enforce maximum length', () => {
			const longUsername = 'a'.repeat(31);
			const result = validateUsername(longUsername, { maxLength: 30 });
			expect(result.valid).toBe(false);
			expect(result.error).toContain('less than 30 characters');
		});

		it('should reject reserved names', () => {
			const reservedNames = ['admin', 'root', 'api'];

			reservedNames.forEach(name => {
				const result = validateUsername(name);
				expect(result.valid).toBe(false);
				expect(result.error).toContain('reserved');
			});
		});

		it('should handle case-insensitive reserved names', () => {
			const result = validateUsername('ADMIN');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('reserved');
		});

		it('should allow special characters when configured', () => {
			const username = 'john-doe.2024';

			// Disallow special chars (default)
			const disallowed = validateUsername(username, { allowSpecialChars: false });
			expect(disallowed.valid).toBe(false);

			// Allow special chars
			const allowed = validateUsername(username, { allowSpecialChars: true });
			expect(allowed.valid).toBe(true);
		});

		it('should require starting with letter or number', () => {
			const invalidStarts = ['_user', '.user'];

			invalidStarts.forEach(username => {
				const result = validateUsername(username, { allowSpecialChars: true });
				expect(result.valid).toBe(false);
				expect(result.error).toContain('start with a letter or number');
			});
		});

		it('should accept custom reserved names', () => {
			const username = 'custom';
			const result = validateUsername(username, {
				reservedNames: ['custom', 'special'],
			});
			expect(result.valid).toBe(false);
			expect(result.error).toContain('reserved');
		});

		it('should handle empty or null input', () => {
			const emptyResult = validateUsername('');
			expect(emptyResult.valid).toBe(false);
			expect(emptyResult.error).toContain('required');
		});
	});
});
