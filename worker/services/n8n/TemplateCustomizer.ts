/**
 * Template Customizer Service
 * Replaces placeholders in n8n workflow templates with actual configuration values
 */

export interface WorkflowConfig {
  webhookId: string;
  credentials: Record<string, string>;
  settings: Record<string, string | number | boolean>;
  userId: string;
  instanceName: string;
}

export interface CustomizedWorkflow {
  workflowJson: string;
  webhookUrls: string[];
  requiredCredentials: string[];
}

/**
 * Service for customizing n8n workflow templates
 */
export class TemplateCustomizer {
  private readonly placeholderPattern = /\{\{([A-Z_]+)\}\}/g;

  /**
   * Customize a workflow template with user-specific configuration
   */
  customize(templateJson: string, config: WorkflowConfig): CustomizedWorkflow {
    let workflowData: unknown;

    try {
      workflowData = JSON.parse(templateJson);
    } catch (error) {
      throw new Error(`Invalid workflow template JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Build replacement map
    const replacementMap = this.buildReplacementMap(config);

    // Apply replacements to workflow
    const customizedWorkflow = this.replaceInObject(workflowData, replacementMap);

    // Extract webhook URLs and required credentials
    const webhookUrls = this.extractWebhookUrls(customizedWorkflow);
    const requiredCredentials = this.extractRequiredCredentials(customizedWorkflow);

    return {
      workflowJson: JSON.stringify(customizedWorkflow, null, 2),
      webhookUrls,
      requiredCredentials,
    };
  }

  /**
   * Build replacement map from configuration
   */
  private buildReplacementMap(config: WorkflowConfig): Record<string, string> {
    const replacements: Record<string, string> = {
      WEBHOOK_ID: config.webhookId,
      USER_ID: config.userId,
      INSTANCE_NAME: config.instanceName,
      ...config.credentials,
      ...this.convertSettingsToStrings(config.settings),
    };

    return replacements;
  }

  /**
   * Convert settings values to strings for replacement
   */
  private convertSettingsToStrings(settings: Record<string, string | number | boolean>): Record<string, string> {
    const stringSettings: Record<string, string> = {};

    for (const [key, value] of Object.entries(settings)) {
      stringSettings[key] = String(value);
    }

    return stringSettings;
  }

  /**
   * Recursively replace placeholders in an object
   */
  private replaceInObject(obj: unknown, replacements: Record<string, string>): unknown {
    if (typeof obj === 'string') {
      return this.replacePlaceholders(obj, replacements);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceInObject(item, replacements));
    }

    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceInObject(value, replacements);
      }
      return result;
    }

    return obj;
  }

  /**
   * Replace placeholders in a string
   */
  private replacePlaceholders(text: string, replacements: Record<string, string>): string {
    return text.replace(this.placeholderPattern, (match, placeholder) => {
      const replacement = replacements[placeholder];
      if (replacement === undefined) {
        console.warn(`Placeholder ${placeholder} not found in configuration, leaving unchanged`);
        return match;
      }
      return replacement;
    });
  }

  /**
   * Extract webhook URLs from customized workflow
   */
  private extractWebhookUrls(workflow: unknown): string[] {
    const urls: string[] = [];

    const traverse = (obj: unknown): void => {
      if (typeof obj === 'string' && obj.includes('/webhook/')) {
        urls.push(obj);
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach(item => traverse(item));
        return;
      }

      if (obj !== null && typeof obj === 'object') {
        for (const value of Object.values(obj)) {
          traverse(value);
        }
      }
    };

    traverse(workflow);
    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Extract required credential IDs from workflow
   */
  private extractRequiredCredentials(workflow: unknown): string[] {
    const credentials: string[] = [];

    const traverse = (obj: unknown): void => {
      if (obj !== null && typeof obj === 'object') {
        const objRecord = obj as Record<string, unknown>;

        // Check if this is a credentials object
        if ('credentials' in objRecord && typeof objRecord.credentials === 'object' && objRecord.credentials !== null) {
          const credsObj = objRecord.credentials as Record<string, unknown>;
          for (const [credType, credData] of Object.entries(credsObj)) {
            if (credData && typeof credData === 'object' && 'name' in credData) {
              credentials.push(credType);
            }
          }
        }

        // Recurse into all properties
        for (const value of Object.values(objRecord)) {
          traverse(value);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(item => traverse(item));
      }
    };

    traverse(workflow);
    return [...new Set(credentials)]; // Remove duplicates
  }

  /**
   * Validate that a workflow template has valid structure
   */
  validateTemplate(templateJson: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const workflow = JSON.parse(templateJson);

      // Check required fields
      if (!workflow.name || typeof workflow.name !== 'string') {
        errors.push('Missing or invalid workflow name');
      }

      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        errors.push('Missing or invalid nodes array');
      } else if (workflow.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
      }

      if (!workflow.connections || typeof workflow.connections !== 'object') {
        errors.push('Missing or invalid connections object');
      }

      // Check for webhook node
      const hasWebhook = workflow.nodes?.some((node: { type?: string }) =>
        node.type === 'n8n-nodes-base.webhook'
      );
      if (!hasWebhook) {
        errors.push('Workflow must have at least one webhook trigger node');
      }

      // Check for placeholders
      const workflowStr = JSON.stringify(workflow);
      const placeholders = workflowStr.match(this.placeholderPattern);
      if (!placeholders || placeholders.length === 0) {
        console.warn('No placeholders found in template - this may be intentional');
      }

    } catch (error) {
      errors.push(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * List all placeholders in a template
   */
  listPlaceholders(templateJson: string): string[] {
    const placeholders = new Set<string>();
    const matches = templateJson.matchAll(this.placeholderPattern);

    for (const match of matches) {
      if (match[1]) {
        placeholders.add(match[1]);
      }
    }

    return Array.from(placeholders).sort();
  }

  /**
   * Generate sample configuration for a template
   */
  generateSampleConfig(templateJson: string): WorkflowConfig {
    const placeholders = this.listPlaceholders(templateJson);

    const credentials: Record<string, string> = {};
    const settings: Record<string, string> = {};

    for (const placeholder of placeholders) {
      // Categorize placeholders
      if (placeholder.includes('CREDENTIAL') || placeholder.includes('OAUTH')) {
        credentials[placeholder] = `sample_${placeholder.toLowerCase()}`;
      } else if (placeholder === 'WEBHOOK_ID') {
        // Skip, will be generated
      } else {
        settings[placeholder] = `sample_${placeholder.toLowerCase()}`;
      }
    }

    return {
      webhookId: 'generated-webhook-id',
      credentials,
      settings,
      userId: 'sample-user-id',
      instanceName: 'Sample Workflow Instance',
    };
  }
}

/**
 * Create a new TemplateCustomizer instance
 */
export function createTemplateCustomizer(): TemplateCustomizer {
  return new TemplateCustomizer();
}
