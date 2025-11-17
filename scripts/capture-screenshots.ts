/**
 * Screenshot Capture Script
 *
 * This script captures screenshots for apps that don't have one yet.
 * It uses Cloudflare Browser Rendering API to capture screenshots,
 * uploads them to R2/Cloudflare Images, and updates the database.
 *
 * Usage:
 *   npm run capture-screenshots
 *   npm run capture-screenshots -- --limit 5 (test with 5 apps)
 *   npm run capture-screenshots -- --dry-run (preview without changes)
 */

import { drizzle } from 'drizzle-orm/d1';
import { createClient } from '@libsql/client';
import { eq, and, isNull, sql } from 'drizzle-orm';
import * as schema from '../worker/database/schema';

// Configuration from environment or command line
interface Config {
  accountId: string;
  apiToken: string;
  customDomain: string;
  databaseUrl: string;
  databaseAuthToken?: string;
  useCloudflareImages: boolean;
  limit?: number;
  dryRun: boolean;
}

interface ImageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  base64Data: string;
}

enum ImageType {
  SCREENSHOTS = 'screenshots',
  UPLOADS = 'uploads',
}

// Parse command line arguments
function parseArgs(): { limit?: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  return {
    limit: limit ? parseInt(limit, 10) : undefined,
    dryRun
  };
}

// Get configuration from environment
function getConfig(): Config {
  const { limit, dryRun } = parseArgs();

  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    customDomain: process.env.CUSTOM_DOMAIN || 'onaria.xyz',
    databaseUrl: process.env.DATABASE_URL || '',
    databaseAuthToken: process.env.DATABASE_AUTH_TOKEN,
    useCloudflareImages: process.env.USE_CLOUDFLARE_IMAGES === 'true',
    limit,
    dryRun
  };
}

// Validate configuration
function validateConfig(config: Config): void {
  const required = ['accountId', 'apiToken', 'customDomain', 'databaseUrl'];
  const missing = required.filter(key => !config[key as keyof Config]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Upload to Cloudflare Images
async function uploadToCloudflareImages(
  config: Config,
  image: ImageAttachment,
  type: ImageType
): Promise<string> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1`;
  const filename = `${image.id}-${type}-${image.filename}`;

  const data = base64ToUint8Array(image.base64Data);
  const blob = new Blob([data], { type: image.mimeType });
  const form = new FormData();
  form.append('file', blob, filename);

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.apiToken}` },
    body: form,
  });

  const json = await resp.json() as {
    success: boolean;
    result?: { id: string; variants?: string[] };
    errors?: Array<{ message?: string }>;
  };

  if (!resp.ok || !json.success || !json.result) {
    const errMsg = json.errors?.map(e => e.message).join('; ') || `status ${resp.status}`;
    throw new Error(`Cloudflare Images upload failed: ${errMsg}`);
  }

  const variants = json.result.variants || [];
  if (variants.length > 0) {
    return variants[0];
  }
  throw new Error('Cloudflare Images upload succeeded without variants');
}

// Upload to R2 using HTTP API
async function uploadToR2(
  config: Config,
  image: ImageAttachment,
  type: ImageType,
  cfImagesUrl?: string
): Promise<{ url: string; r2Key: string }> {
  const data = base64ToUint8Array(image.base64Data);
  const r2Key = `${type}/${image.id}/${encodeURIComponent(image.filename)}`;

  // Use R2 HTTP API
  const bucketName = 'onaria-apps';
  const url = `https://${bucketName}.${config.accountId}.r2.cloudflarestorage.com/${r2Key}`;

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': image.mimeType,
      'x-amz-meta-cfimagesurl': cfImagesUrl || ''
    },
    body: data
  });

  if (!resp.ok) {
    throw new Error(`R2 upload failed: ${resp.status} - ${await resp.text()}`);
  }

  const publicUrl = `https://${config.customDomain}/api/${r2Key}`;
  return { url: publicUrl, r2Key };
}

// Capture screenshot using Browser Rendering API
async function captureScreenshot(
  config: Config,
  appId: string,
  deploymentId: string
): Promise<string> {
  const previewUrl = `https://${deploymentId}.${config.customDomain}/`;
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/browser-rendering/snapshot`;

  console.log(`  Capturing screenshot from: ${previewUrl}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: previewUrl,
      viewport: { width: 1280, height: 720 },
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
    throw new Error(`Browser Rendering API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as {
    success: boolean;
    result: {
      screenshot: string;
      content: string;
    };
  };

  if (!result.success || !result.result.screenshot) {
    throw new Error('No screenshot returned from Browser Rendering API');
  }

  return result.result.screenshot;
}

// Upload image and return public URL
async function uploadScreenshot(
  config: Config,
  appId: string,
  base64Screenshot: string
): Promise<string> {
  const image: ImageAttachment = {
    id: appId,
    filename: 'screenshot.png',
    mimeType: 'image/png',
    base64Data: base64Screenshot
  };

  let cfImagesUrl = '';

  // Try Cloudflare Images first if enabled
  if (config.useCloudflareImages) {
    try {
      cfImagesUrl = await uploadToCloudflareImages(config, image, ImageType.SCREENSHOTS);
      console.log(`  Uploaded to Cloudflare Images: ${cfImagesUrl}`);
    } catch (err) {
      console.warn(`  Cloudflare Images upload failed, falling back to R2:`,
        err instanceof Error ? err.message : String(err));
    }
  }

  // Upload to R2
  const { url: r2Url } = await uploadToR2(config, image, ImageType.SCREENSHOTS, cfImagesUrl);
  console.log(`  Uploaded to R2: ${r2Url}`);

  // Return Cloudflare Images URL if available, otherwise R2 URL
  return cfImagesUrl || r2Url;
}

// Update app screenshot in database
async function updateAppScreenshot(
  db: ReturnType<typeof drizzle>,
  appId: string,
  screenshotUrl: string
): Promise<void> {
  await db
    .update(schema.apps)
    .set({
      screenshotUrl,
      screenshotCapturedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.apps.id, appId))
    .run();
}

// Main execution
async function main() {
  console.log('Screenshot Capture Script\n');

  const config = getConfig();
  validateConfig(config);

  if (config.dryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  // Connect to database using wrangler d1 execute proxy
  const client = createClient({
    url: config.databaseUrl,
    authToken: config.databaseAuthToken
  });

  const db = drizzle(client, { schema });

  // Get apps needing screenshots
  console.log('Fetching apps needing screenshots...');
  const query = db
    .select({
      id: schema.apps.id,
      title: schema.apps.title,
      deploymentId: schema.apps.deploymentId
    })
    .from(schema.apps)
    .where(and(
      isNull(schema.apps.screenshotUrl),
      sql`${schema.apps.deploymentId} IS NOT NULL AND ${schema.apps.deploymentId} != ''`
    ))
    .orderBy(schema.apps.createdAt);

  const apps = config.limit ? await query.limit(config.limit) : await query.all();

  console.log(`Found ${apps.length} apps needing screenshots\n`);

  if (apps.length === 0) {
    console.log('No apps need screenshots. Exiting.');
    return;
  }

  // Process each app
  const results = {
    total: apps.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ appId: string; title: string; error: string }>
  };

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    console.log(`[${i + 1}/${apps.length}] Processing: ${app.title}`);
    console.log(`  App ID: ${app.id}`);
    console.log(`  Deployment ID: ${app.deploymentId}`);

    try {
      if (!app.deploymentId) {
        throw new Error('No deployment ID');
      }

      // Capture screenshot
      const base64Screenshot = await captureScreenshot(config, app.id, app.deploymentId);
      console.log(`  Screenshot captured (${(base64Screenshot.length / 1024).toFixed(2)} KB)`);

      // Upload screenshot
      const screenshotUrl = await uploadScreenshot(config, app.id, base64Screenshot);

      // Update database
      if (!config.dryRun) {
        await updateAppScreenshot(db, app.id, screenshotUrl);
        console.log(`  Database updated with screenshot URL`);
      } else {
        console.log(`  [DRY RUN] Would update database with: ${screenshotUrl}`);
      }

      results.success++;
      console.log(`  ✓ Success\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Failed: ${errorMessage}\n`);

      results.failed++;
      results.errors.push({
        appId: app.id,
        title: app.title,
        error: errorMessage
      });
    }

    // Add a small delay to avoid rate limiting
    if (i < apps.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Print summary
  console.log('\n=== Summary ===');
  console.log(`Total apps: ${results.total}`);
  console.log(`Successful: ${results.success}`);
  console.log(`Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\nFailed apps:');
    results.errors.forEach(({ title, error }) => {
      console.log(`  - ${title}: ${error}`);
    });
  }

  if (config.dryRun) {
    console.log('\n[DRY RUN] No changes were made to the database');
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
