/**
 * Screenshot Manager Module
 * Handles screenshot capture using Cloudflare Browser Rendering API
 */

import { AgentContext } from './agent-context';
import { WebSocketMessageResponses } from '../../constants';
import { ImageAttachment, ImageType, uploadImage } from '../../../utils/images';
import { AppService } from '../../../database';

export class ScreenshotManager {
    constructor(private agent: AgentContext) {}

    /**
     * Capture screenshot of the given URL using Cloudflare Browser Rendering REST API
     */
    async captureScreenshot(
        url: string,
        viewport: { width: number; height: number } = { width: 1280, height: 720 }
    ): Promise<string> {
        if (!this.agent.env.DB || !this.agent.getAgentId()) {
            const error = 'Cannot capture screenshot: DB or agentId not available';
            this.agent.logger().warn(error);
            this.agent.broadcast(WebSocketMessageResponses.SCREENSHOT_CAPTURE_ERROR, {
                error,
                configurationError: true
            });
            throw new Error(error);
        }

        if (!url) {
            const error = 'URL is required for screenshot capture';
            this.agent.broadcast(WebSocketMessageResponses.SCREENSHOT_CAPTURE_ERROR, {
                error,
                url,
                viewport
            });
            throw new Error(error);
        }

        this.agent.logger().info('Capturing screenshot via REST API', { url, viewport });

        // Notify start of screenshot capture
        this.agent.broadcast(WebSocketMessageResponses.SCREENSHOT_CAPTURE_STARTED, {
            message: `Capturing screenshot of ${url}`,
            url,
            viewport
        });

        try {
            // Use Cloudflare Browser Rendering REST API
            const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${this.agent.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/snapshot`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.agent.env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    viewport: viewport,
                    gotoOptions: {
                        waitUntil: 'networkidle0',
                        timeout: 10000
                    },
                    screenshotOptions: {
                        fullPage: false,
                        type: 'png'
                    }
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                const error = `Browser Rendering API failed: ${response.status} - ${errorText}`;
                this.agent.broadcast(WebSocketMessageResponses.SCREENSHOT_CAPTURE_ERROR, {
                    error,
                    url,
                    viewport,
                    statusCode: response.status,
                    statusText: response.statusText
                });
                throw new Error(error);
            }

            const result = await response.json() as {
                success: boolean;
                result: {
                    screenshot: string; // base64 encoded
                    content: string;    // HTML content
                };
            };

            if (!result.success || !result.result.screenshot) {
                const error = 'Browser Rendering API succeeded but no screenshot returned';
                this.agent.broadcast(WebSocketMessageResponses.SCREENSHOT_CAPTURE_ERROR, {
                    error,
                    url,
                    viewport,
                    apiResponse: result
                });
                throw new Error(error);
            }

            // Get base64 screenshot data
            const base64Screenshot = result.result.screenshot;
            const screenshot: ImageAttachment = {
                id: this.agent.getAgentId(),
                filename: 'latest.png',
                mimeType: 'image/png',
                base64Data: base64Screenshot
            };
            const uploadedImage = await uploadImage(this.agent.env, screenshot, ImageType.SCREENSHOTS);

            // Persist in database
            try {
                const appService = new AppService(this.agent.env);
                await appService.updateAppScreenshot(this.agent.getAgentId(), uploadedImage.publicUrl);
            } catch (dbError) {
                const error = `Database update failed: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`;
                this.agent.broadcast(WebSocketMessageResponses.SCREENSHOT_CAPTURE_ERROR, {
                    error,
                    url,
                    viewport,
                    screenshotCaptured: true,
                    databaseError: true
                });
                throw new Error(error);
            }

            this.agent.logger().info('Screenshot captured and stored successfully', {
                url,
                storage: uploadedImage.publicUrl.startsWith('data:') ? 'database' : (uploadedImage.publicUrl.includes('/api/screenshots/') ? 'r2' : 'images'),
                length: base64Screenshot.length
            });

            // Notify successful screenshot capture
            this.agent.broadcast(WebSocketMessageResponses.SCREENSHOT_CAPTURE_SUCCESS, {
                message: `Successfully captured screenshot of ${url}`,
                url,
                viewport,
                screenshotSize: base64Screenshot.length,
                timestamp: new Date().toISOString()
            });

            return uploadedImage.publicUrl;

        } catch (error) {
            this.agent.logger().error('Failed to capture screenshot via REST API:', error);

            // Only broadcast if error wasn't already broadcast above
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (!errorMessage.includes('Browser Rendering API') && !errorMessage.includes('Database update failed')) {
                this.agent.broadcast(WebSocketMessageResponses.SCREENSHOT_CAPTURE_ERROR, {
                    error: errorMessage,
                    url,
                    viewport
                });
            }

            throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
