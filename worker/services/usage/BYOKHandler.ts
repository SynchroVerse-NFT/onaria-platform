import { createObjectLogger } from '../../logger';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../../database/schema';

export interface UserAPIKeys {
	openai?: string;
	anthropic?: string;
	google?: string;
}

export class BYOKHandler {
	private static logger = createObjectLogger(this, 'BYOKHandler');

	static async shouldUseUserKeys(
		db: DrizzleD1Database<typeof schema>,
		userId: string
	): Promise<boolean> {
		try {
			// Check if user has active BYOK subscription
			const subscription = await db
				.select()
				.from(schema.subscriptions)
				.where(eq(schema.subscriptions.userId, userId))
				.limit(1);

			if (!subscription || subscription.length === 0) {
				return false;
			}

			const sub = subscription[0];
			return sub.planType === 'byok' && sub.status === 'active';
		} catch (error) {
			this.logger.error('Failed to check BYOK status', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			return false;
		}
	}

	static async getUserAPIKeys(
		db: DrizzleD1Database<typeof schema>,
		userId: string
	): Promise<UserAPIKeys> {
		try {
			const secrets = await db
				.select()
				.from(schema.userSecrets)
				.where(eq(schema.userSecrets.userId, userId))
				.limit(1);

			if (!secrets || secrets.length === 0) {
				return {};
			}

			const secret = secrets[0];

			// Decrypt secrets if they exist
			// Note: The actual decryption would happen using the encryption key
			// stored securely in the environment
			const keys: UserAPIKeys = {};

			// Parse the encrypted value JSON
			if (secret.encryptedValue) {
				try {
					const decryptedData = await this.decryptUserSecrets(secret.encryptedValue);
					return decryptedData;
				} catch (error) {
					this.logger.error('Failed to decrypt user secrets', {
						userId,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}

			return keys;
		} catch (error) {
			this.logger.error('Failed to get user API keys', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			return {};
		}
	}

	private static async decryptUserSecrets(encryptedValue: string): Promise<UserAPIKeys> {
		// This is a placeholder for actual decryption logic
		// In production, this would:
		// 1. Use a secure encryption key from environment
		// 2. Decrypt the encryptedValue string
		// 3. Parse the JSON to get API keys
		// 4. Return the structured keys

		try {
			// For now, assume the encrypted value is base64-encoded JSON
			const decoded = atob(encryptedValue);
			const keys = JSON.parse(decoded) as UserAPIKeys;
			return keys;
		} catch (error) {
			return {};
		}
	}

	static async setUserAPIKeys(
		db: DrizzleD1Database<typeof schema>,
		userId: string,
		keys: UserAPIKeys
	): Promise<void> {
		try {
			const encryptedValue = await this.encryptUserSecrets(keys);

			// Check if secrets already exist
			const existing = await db
				.select()
				.from(schema.userSecrets)
				.where(eq(schema.userSecrets.userId, userId))
				.limit(1);

			if (existing && existing.length > 0) {
				// Update existing
				await db
					.update(schema.userSecrets)
					.set({
						encryptedValue,
						updatedAt: new Date()
					})
					.where(eq(schema.userSecrets.userId, userId));
			} else {
				// Insert new
				await db.insert(schema.userSecrets).values({
					id: crypto.randomUUID(),
					userId,
					encryptedValue,
					createdAt: new Date(),
					updatedAt: new Date()
				});
			}

			this.logger.info('Set user API keys', { userId });
		} catch (error) {
			this.logger.error('Failed to set user API keys', {
				userId,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			throw error;
		}
	}

	private static async encryptUserSecrets(keys: UserAPIKeys): Promise<string> {
		// This is a placeholder for actual encryption logic
		// In production, this would:
		// 1. Use a secure encryption key from environment
		// 2. Encrypt the keys JSON
		// 3. Return the encrypted string

		try {
			// For now, just base64 encode (NOT SECURE for production)
			const json = JSON.stringify(keys);
			return btoa(json);
		} catch (error) {
			throw new Error('Failed to encrypt user secrets');
		}
	}

	static async hasRequiredKeys(
		db: DrizzleD1Database<typeof schema>,
		userId: string,
		provider: 'openai' | 'anthropic' | 'google'
	): Promise<boolean> {
		const keys = await this.getUserAPIKeys(db, userId);
		return !!keys[provider];
	}
}
