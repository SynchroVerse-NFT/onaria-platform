/**
 * Workflow Template Routes
 * API routes for workflow template management
 */

import { WorkflowTemplatesController } from '../controllers/workflows/templates/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup workflow template routes
 */
export function setupWorkflowTemplateRoutes(app: Hono<AppEnv>): void {
    // Create a sub-router for workflow template routes
    const templatesRouter = new Hono<AppEnv>();

    // Template operations
    templatesRouter.get('/', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowTemplatesController, WorkflowTemplatesController.getTemplates));
    templatesRouter.get('/:templateId', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowTemplatesController, WorkflowTemplatesController.getTemplate));
    templatesRouter.post('/:templateId/preview', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowTemplatesController, WorkflowTemplatesController.previewTemplate));

    // Mount the router under /api/workflows/templates
    app.route('/api/workflows/templates', templatesRouter);
}
