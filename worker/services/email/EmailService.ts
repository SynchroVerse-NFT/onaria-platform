/**
 * Email Service
 * Handles sending emails for password reset and other notifications
 */

import { createLogger } from '../../logger';

const logger = createLogger('EmailService');

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text: string;
}

/**
 * Email Service for sending transactional emails
 */
export class EmailService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<void> {
        const resetUrl = `${baseUrl}/reset-password/confirm?token=${resetToken}`;

        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .content { color: #333; line-height: 1.6; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 600; font-size: 16px; }
        .button:hover { box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
        .link { word-break: break-all; color: #667eea; font-size: 13px; padding: 12px; background: #f7f7f7; border-radius: 6px; margin: 12px 0; }
        .footer { color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Onaria</div>
        </div>
        <div class="content">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            <p>You requested to reset your password for your Onaria account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <div class="link">${resetUrl}</div>
            <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p><strong>Onaria Platform</strong> - AI-Powered App Generation</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
        `;

        const textBody = `
Password Reset Request

You requested to reset your password for your Onaria account.

Click this link to reset your password: ${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.

---
Onaria Platform - AI-Powered App Generation
        `;

        await this.sendEmail({
            to: email,
            subject: 'Reset Your Onaria Password',
            html: htmlBody,
            text: textBody
        });
    }

    /**
     * Send email using configured service
     */
    private async sendEmail(options: EmailOptions): Promise<void> {
        try {
            // Check if Resend API key is configured
            if (this.env.RESEND_API_KEY) {
                await this.sendViaResend(options);
            } else if (this.env.SENDGRID_API_KEY) {
                await this.sendViaSendGrid(options);
            } else {
                // No email service configured - log to console for development
                logger.warn('No email service configured. Email would be sent:', {
                    to: options.to,
                    subject: options.subject,
                    textPreview: options.text.slice(0, 100) + '...'
                });

                // In development, we can still extract the reset URL from the email
                const resetUrlMatch = options.text.match(/https?:\/\/[^\s]+/);
                if (resetUrlMatch) {
                    logger.info('PASSWORD RESET URL (development only):', { url: resetUrlMatch[0] });
                }
            }
        } catch (error) {
            logger.error('Failed to send email', error);
            throw new Error('Failed to send email');
        }
    }

    /**
     * Send email via Resend
     */
    private async sendViaResend(options: EmailOptions): Promise<void> {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: this.env.EMAIL_FROM || 'Onaria <noreply@onaria.xyz>',
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('Resend API error', { status: response.status, error: errorText });
            throw new Error(`Failed to send email via Resend: ${response.status}`);
        }

        logger.info('Email sent via Resend', { to: options.to, subject: options.subject });
    }

    /**
     * Send email via SendGrid
     */
    private async sendViaSendGrid(options: EmailOptions): Promise<void> {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.env.SENDGRID_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personalizations: [{
                    to: [{ email: options.to }]
                }],
                from: {
                    email: this.env.EMAIL_FROM || 'noreply@onaria.xyz',
                    name: 'Onaria'
                },
                subject: options.subject,
                content: [
                    { type: 'text/plain', value: options.text },
                    { type: 'text/html', value: options.html }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error('SendGrid API error', { status: response.status, error: errorText });
            throw new Error(`Failed to send email via SendGrid: ${response.status}`);
        }

        logger.info('Email sent via SendGrid', { to: options.to, subject: options.subject });
    }
}
