/**
 * Seed Workflow Templates Script
 * Populates the database with pre-built n8n workflow templates
 */

import { drizzle } from 'drizzle-orm/d1';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { D1Database } from '@cloudflare/workers-types';
import { workflows, type NewWorkflow } from '../database/schema';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Load template JSON from file
 */
function loadTemplate(filename: string): string {
  const templatePath = join(__dirname, '../services/n8n/templates', filename);
  return readFileSync(templatePath, 'utf-8');
}

/**
 * Template definitions with metadata
 */
const TEMPLATE_DEFINITIONS = [
  {
    name: 'Lead Capture to Sheets & Email',
    description: 'Automatically add new app creators to Google Sheets and send personalized welcome emails. Perfect for tracking leads and nurturing new users.',
    category: 'automation',
    templateFile: 'lead-capture-template.json',
    iconUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg',
    requiredSecrets: ['gmail', 'sheets'],
  },
  {
    name: 'Payment Success to Discord',
    description: 'Send real-time payment notifications to your Discord server. Includes special alerts for high-value transactions.',
    category: 'notification',
    templateFile: 'payment-discord-template.json',
    iconUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discord.svg',
    requiredSecrets: ['discord'],
  },
  {
    name: 'Error Alert to Slack',
    description: 'Monitor application errors and send detailed alerts to your Slack channel. Includes throttling to prevent alert spam.',
    category: 'monitoring',
    templateFile: 'error-slack-template.json',
    iconUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/slack.svg',
    requiredSecrets: ['slack'],
  },
  {
    name: 'New App to Twitter/X',
    description: 'Automatically tweet about new apps created on your platform. Supports images and customizable hashtags.',
    category: 'marketing',
    templateFile: 'app-twitter-template.json',
    iconUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg',
    requiredSecrets: ['twitter'],
  },
  {
    name: 'Deployment to GitHub Issue',
    description: 'Post deployment status to linked GitHub issues and automatically close them on success. Great for CI/CD workflows.',
    category: 'devops',
    templateFile: 'deployment-github-template.json',
    iconUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/github.svg',
    requiredSecrets: ['github'],
  },
];

/**
 * Seed workflow templates into database
 */
export async function seedWorkflowTemplates(db: D1Database): Promise<void> {
  const database = drizzle(db);
  const now = Date.now();

  console.log('Starting workflow template seeding...');

  for (const template of TEMPLATE_DEFINITIONS) {
    try {
      // Load template JSON
      let templateData: string;
      try {
        templateData = loadTemplate(template.templateFile);
      } catch (error) {
        console.error(`Failed to load template file ${template.templateFile}:`, error);
        continue;
      }

      // Validate JSON
      try {
        JSON.parse(templateData);
      } catch (error) {
        console.error(`Invalid JSON in template ${template.templateFile}:`, error);
        continue;
      }

      // Create workflow record
      const workflowData: NewWorkflow = {
        id: generateId(),
        name: template.name,
        description: template.description,
        category: template.category,
        isTemplate: true,
        templateData: JSON.parse(templateData),
        iconUrl: template.iconUrl,
        requiredSecrets: template.requiredSecrets,
        configSchema: null, // Can be added later if needed
        isActive: true,
        isPublic: true,
        createdBy: null, // System-generated templates
        createdAt: now,
        updatedAt: now,
      };

      await database.insert(workflows).values(workflowData);

      console.log(`✓ Seeded template: ${template.name}`);
    } catch (error) {
      console.error(`Failed to seed template ${template.name}:`, error);
    }
  }

  console.log('Workflow template seeding completed!');
}

/**
 * Check if templates already exist
 */
export async function checkExistingTemplates(db: D1Database): Promise<number> {
  const database = drizzle(db);

  try {
    const existingTemplates = await database
      .select()
      .from(workflows)
      .where(sql`${workflows.isTemplate} = 1`)
      .all();

    return existingTemplates.length;
  } catch (error) {
    console.error('Failed to check existing templates:', error);
    return -1;
  }
}

/**
 * Clear all workflow templates (use with caution!)
 */
export async function clearWorkflowTemplates(db: D1Database): Promise<void> {
  const database = drizzle(db);

  console.warn('Clearing all workflow templates...');

  try {
    await database
      .delete(workflows)
      .where(sql`${workflows.isTemplate} = 1`)
      .run();

    console.log('All workflow templates cleared');
  } catch (error) {
    console.error('Failed to clear templates:', error);
    throw error;
  }
}

/**
 * Main execution function for CLI usage
 *
 * Usage:
 *   wrangler d1 execute DB --file=worker/scripts/seedWorkflowTemplates.ts
 *
 * Or run directly in worker:
 *   POST /api/admin/seed-workflows (admin endpoint)
 */
export async function main(env: { DB: D1Database }): Promise<void> {
  console.log('=== Workflow Template Seeder ===\n');

  // Check existing templates
  const existingCount = await checkExistingTemplates(env.DB);
  console.log(`Existing templates in database: ${existingCount}\n`);

  if (existingCount > 0) {
    console.log('Templates already exist. Run clearWorkflowTemplates() first if you want to reseed.\n');
    return;
  }

  // Seed templates
  await seedWorkflowTemplates(env.DB);

  // Verify
  const newCount = await checkExistingTemplates(env.DB);
  console.log(`\nTotal templates in database: ${newCount}`);
  console.log('✓ Seeding complete!');
}

// Export for use in other modules
export default {
  seedWorkflowTemplates,
  checkExistingTemplates,
  clearWorkflowTemplates,
  main,
};
