/**
 * Simple Screenshot Capture Script
 *
 * This script captures screenshots for apps that don't have one yet.
 * It queries the production database via wrangler d1, uses Cloudflare Browser
 * Rendering API to capture screenshots, and updates the database.
 *
 * Prerequisites:
 *   - CLOUDFLARE_ACCOUNT_ID (from wrangler.jsonc)
 *   - CLOUDFLARE_API_TOKEN environment variable
 *
 * Usage:
 *   npm run capture-screenshots
 *   npm run capture-screenshots 5 (test with 5 apps)
 */

interface App {
  id: string;
  title: string;
  deploymentId: string;
}

interface BrowserRenderingResult {
  success: boolean;
  result?: {
    screenshot: string;
    content: string;
  };
  errors?: Array<{ message?: string }>;
}

interface CloudflareImagesResult {
  success: boolean;
  result?: {
    id: string;
    variants?: string[];
  };
  errors?: Array<{ message?: string }>;
}

// Configuration
const ACCOUNT_ID = 'b8f6f3323cd90ef8795b8164cf633c14';
const CUSTOM_DOMAIN = 'onaria.xyz';
const USE_CLOUDFLARE_IMAGES = true;
const R2_BUCKET = 'onaria-apps';

// Get API token from environment
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!API_TOKEN) {
  console.error('Error: CLOUDFLARE_API_TOKEN environment variable is required');
  process.exit(1);
}

// Parse limit from command line
const limitArg = process.argv[2];
const LIMIT = limitArg ? parseInt(limitArg, 10) : undefined;

// Execute wrangler d1 command
async function executeD1Command(sql: string): Promise<string> {
  const { execSync } = await import('child_process');

  const escapedSql = sql.replace(/"/g, '\\"');
  const command = `npx wrangler d1 execute onaria_db --remote --command "${escapedSql}"`;

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return output;
  } catch (error: unknown) {
    if (error instanceof Error && 'stdout' in error) {
      return (error as { stdout: string }).stdout;
    }
    throw error;
  }
}

// Parse D1 JSON output
function parseD1Output(output: string): Array<Record<string, unknown>> {
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('[') || line.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(line);
        if (Array.isArray(parsed)) {
          return parsed;
        } else if (parsed.results) {
          return parsed.results;
        }
      } catch {
        continue;
      }
    }
  }
  return [];
}

// Get apps needing screenshots
async function getAppsNeedingScreenshots(limit?: number): Promise<App[]> {
  console.log('Querying database for apps needing screenshots...');

  const sql = `
    SELECT id, title, deployment_id as deploymentId
    FROM apps
    WHERE screenshot_url IS NULL
      AND deployment_id IS NOT NULL
      AND deployment_id != ''
    ORDER BY created_at DESC
    ${limit ? `LIMIT ${limit}` : ''}
  `;

  const output = await executeD1Command(sql);
  const results = parseD1Output(output);

  return results as App[];
}

// Capture screenshot using Browser Rendering API
async function captureScreenshot(deploymentId: string): Promise<string> {
  const previewUrl = `https://${deploymentId}.${CUSTOM_DOMAIN}/`;
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/snapshot`;

  console.log(`  Capturing from: ${previewUrl}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: previewUrl,
      viewport: { width: 1280, height: 720 },
      gotoOptions: {
        waitUntil: 'networkidle0',
        timeout: 15000
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

  const result = await response.json() as BrowserRenderingResult;

  if (!result.success || !result.result?.screenshot) {
    throw new Error('No screenshot returned from Browser Rendering API');
  }

  return result.result.screenshot;
}

// Convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  // In Node.js, we can use Buffer
  const buffer = Buffer.from(base64, 'base64');
  return new Uint8Array(buffer);
}

// Upload to Cloudflare Images
async function uploadToCloudflareImages(
  appId: string,
  base64Data: string
): Promise<string> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`;
  const filename = `${appId}-screenshot.png`;

  const data = base64ToUint8Array(base64Data);
  const blob = new Blob([data], { type: 'image/png' });

  const form = new FormData();
  form.append('file', blob, filename);

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_TOKEN}` },
    body: form,
  });

  const json = await resp.json() as CloudflareImagesResult;

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

// Upload to R2
async function uploadToR2(
  appId: string,
  base64Data: string,
  cfImagesUrl?: string
): Promise<string> {
  const data = base64ToUint8Array(base64Data);
  const r2Key = `screenshots/${appId}/screenshot.png`;

  const url = `https://${R2_BUCKET}.${ACCOUNT_ID}.r2.cloudflarestorage.com/${r2Key}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'image/png'
  };

  if (cfImagesUrl) {
    headers['x-amz-meta-cfimagesurl'] = cfImagesUrl;
  }

  const resp = await fetch(url, {
    method: 'PUT',
    headers,
    body: data
  });

  if (!resp.ok) {
    throw new Error(`R2 upload failed: ${resp.status} - ${await resp.text()}`);
  }

  const publicUrl = `https://${CUSTOM_DOMAIN}/api/${r2Key}`;
  return publicUrl;
}

// Update app screenshot in database
async function updateAppScreenshot(appId: string, screenshotUrl: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000); // Unix timestamp for SQLite

  const sql = `
    UPDATE apps
    SET screenshot_url = '${screenshotUrl.replace(/'/g, "''")}',
        screenshot_captured_at = ${now},
        updated_at = ${now}
    WHERE id = '${appId}'
  `;

  await executeD1Command(sql);
}

// Main execution
async function main() {
  console.log('Simple Screenshot Capture Script\n');
  console.log(`Account ID: ${ACCOUNT_ID}`);
  console.log(`Custom Domain: ${CUSTOM_DOMAIN}`);
  console.log(`Cloudflare Images: ${USE_CLOUDFLARE_IMAGES ? 'Enabled' : 'Disabled'}`);
  if (LIMIT) {
    console.log(`Limit: ${LIMIT} apps`);
  }
  console.log('');

  // Get apps needing screenshots
  const apps = await getAppsNeedingScreenshots(LIMIT);

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
    errors: [] as Array<{ title: string; error: string }>
  };

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    console.log(`\n[${i + 1}/${apps.length}] ${app.title}`);
    console.log(`  ID: ${app.id}`);

    try {
      // Capture screenshot
      const base64Screenshot = await captureScreenshot(app.deploymentId);
      const sizeKB = (base64Screenshot.length * 0.75 / 1024).toFixed(2);
      console.log(`  Screenshot captured: ${sizeKB} KB`);

      let screenshotUrl = '';

      // Upload to Cloudflare Images if enabled
      if (USE_CLOUDFLARE_IMAGES) {
        try {
          screenshotUrl = await uploadToCloudflareImages(app.id, base64Screenshot);
          console.log(`  Uploaded to Cloudflare Images: ${screenshotUrl}`);
        } catch (err) {
          console.warn(`  Cloudflare Images failed, falling back to R2:`,
            err instanceof Error ? err.message : String(err));
        }
      }

      // Upload to R2 (as backup or primary)
      const r2Url = await uploadToR2(app.id, base64Screenshot, screenshotUrl);
      if (!screenshotUrl) {
        screenshotUrl = r2Url;
        console.log(`  Uploaded to R2: ${r2Url}`);
      } else {
        console.log(`  Backed up to R2: ${r2Url}`);
      }

      // Update database
      await updateAppScreenshot(app.id, screenshotUrl);
      console.log(`  Database updated`);
      console.log(`  ✓ Success`);

      results.success++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Failed: ${errorMessage}`);

      results.failed++;
      results.errors.push({
        title: app.title,
        error: errorMessage
      });
    }

    // Add delay to avoid rate limiting
    if (i < apps.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log('\n\n=== Summary ===');
  console.log(`Total: ${results.total}`);
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\nFailed apps:');
    results.errors.forEach(({ title, error }) => {
      console.log(`  - ${title}: ${error}`);
    });
  }
}

// Run the script
main().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
