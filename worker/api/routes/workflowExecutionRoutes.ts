/**
 * Workflow Execution Routes
 * API routes for workflow execution tracking and management
 */

import { WorkflowExecutionsController } from '../controllers/workflows/executions/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup workflow execution routes
 */
export function setupWorkflowExecutionRoutes(app: Hono<AppEnv>): void {
    // Create a sub-router for workflow execution routes
    const executionsRouter = new Hono<AppEnv>();

    // Execution operations
    executionsRouter.get('/', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowExecutionsController, WorkflowExecutionsController.getExecutions));
    executionsRouter.get('/:executionId', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowExecutionsController, WorkflowExecutionsController.getExecution));
    executionsRouter.post('/:executionId/retry', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowExecutionsController, WorkflowExecutionsController.retryExecution));

    // Mount the router under /api/workflows/executions
    app.route('/api/workflows/executions', executionsRouter);

    // Workflow stats endpoint (separate from executions)
    app.get('/api/workflows/stats', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowExecutionsController, WorkflowExecutionsController.getStats));
}
