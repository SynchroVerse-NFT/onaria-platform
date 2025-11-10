/**
 * Webhook Signer
 * HMAC-SHA256 signature generation and verification for webhook security
 */

import { createLogger } from '../../logger';

export class WebhookSigner {
    private logger = createLogger('WebhookSigner');

    /**
     * Sign a webhook payload with HMAC-SHA256
     */
    async sign(
        payload: object,
        secret: string,
        timestamp: number
    ): Promise<string> {
        try {
            // Create canonical string: timestamp + JSON payload
            const canonicalString = `${timestamp}.${JSON.stringify(payload)}`;

            // Convert secret to Uint8Array
            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const messageData = encoder.encode(canonicalString);

            // Import key for HMAC
            const key = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            // Generate signature
            const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);

            // Convert to hex string
            const signatureArray = Array.from(new Uint8Array(signatureBuffer));
            const signatureHex = signatureArray
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            return `sha256=${signatureHex}`;
        } catch (error) {
            this.logger.error('Error signing webhook payload', { error });
            throw error;
        }
    }

    /**
     * Verify a webhook signature
     */
    async verify(
        signature: string,
        payload: object,
        secret: string,
        timestamp: number
    ): Promise<boolean> {
        try {
            // Check signature format
            if (!signature.startsWith('sha256=')) {
                this.logger.warn('Invalid signature format', { signature });
                return false;
            }

            // Validate timestamp (reject if >5 minutes old)
            const now = Date.now();
            const timestampAge = Math.abs(now - timestamp);
            const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds

            if (timestampAge > maxAge) {
                this.logger.warn('Signature timestamp too old', {
                    timestamp,
                    age: timestampAge,
                    maxAge,
                });
                return false;
            }

            // Generate expected signature
            const expectedSignature = await this.sign(payload, secret, timestamp);

            // Compare signatures using timing-safe comparison
            return this.timingSafeEqual(signature, expectedSignature);
        } catch (error) {
            this.logger.error('Error verifying webhook signature', { error });
            return false;
        }
    }

    /**
     * Timing-safe string comparison to prevent timing attacks
     */
    private timingSafeEqual(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }

    /**
     * Generate a random webhook secret
     */
    generateSecret(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);

        return Array.from(array)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Validate webhook URL
     * Prevents webhooks to localhost, private IPs, and internal networks
     */
    validateWebhookUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);

            // Must use HTTPS in production
            if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
                this.logger.warn('Invalid webhook URL protocol', {
                    url,
                    protocol: parsedUrl.protocol,
                });
                return false;
            }

            // Check for localhost
            if (
                parsedUrl.hostname === 'localhost' ||
                parsedUrl.hostname === '127.0.0.1' ||
                parsedUrl.hostname === '0.0.0.0' ||
                parsedUrl.hostname === '::1'
            ) {
                this.logger.warn('Webhook URL cannot be localhost', { url });
                return false;
            }

            // Check for private IP ranges
            if (this.isPrivateIp(parsedUrl.hostname)) {
                this.logger.warn('Webhook URL cannot be private IP', { url });
                return false;
            }

            return true;
        } catch (error) {
            this.logger.warn('Invalid webhook URL format', { url, error });
            return false;
        }
    }

    /**
     * Check if hostname is a private IP address
     */
    private isPrivateIp(hostname: string): boolean {
        // IPv4 private ranges
        const privateRanges = [
            /^10\./,
            /^172\.(1[6-9]|2\d|3[01])\./,
            /^192\.168\./,
            /^169\.254\./, // Link-local
        ];

        return privateRanges.some((range) => range.test(hostname));
    }

    /**
     * Create webhook headers with signature
     */
    createWebhookHeaders(
        signature: string,
        timestamp: number,
        customHeaders: Record<string, string> = {}
    ): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp.toString(),
            'User-Agent': 'Onaria-Webhooks/1.0',
            ...customHeaders,
        };
    }
}
