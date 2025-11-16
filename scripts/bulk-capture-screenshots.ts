/**
 * Bulk screenshot capture migration script
 * Run this locally to capture screenshots for all existing apps without screenshots
 *
 * Usage: bun scripts/bulk-capture-screenshots.ts
 */

import { createLogger } from '../worker/logger';

const logger = createLogger('BulkScreenshotCapture');

interface App {
    id: string;
    title: string;
    deploymentId: string | null;
}

async function main() {
    logger.info('Starting bulk screenshot capture migration...');

    const apiUrl = 'https://onaria.xyz/api/apps/bulk-capture-screenshots';

    logger.info(`Calling endpoint: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`API call failed with status ${response.status}:`, errorText);
            process.exit(1);
        }

        const data = await response.json();

        logger.info('Bulk screenshot capture completed!', data);
        logger.info(`Total apps: ${data.totalApps}`);
        logger.info(`Success: ${data.successCount}`);
        logger.info(`Failed: ${data.failureCount}`);

        if (data.results && data.results.length > 0) {
            logger.info('\nDetailed results:');
            data.results.forEach((result: any) => {
                if (result.success) {
                    logger.info(`✓ ${result.title} - Screenshot captured`);
                } else {
                    logger.error(`✗ ${result.title} - ${result.error}`);
                }
            });
        }

    } catch (error) {
        logger.error('Error running bulk screenshot capture:', error);
        process.exit(1);
    }
}

main();
