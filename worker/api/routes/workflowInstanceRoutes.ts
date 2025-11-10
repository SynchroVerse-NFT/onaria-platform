/**
 * Workflow Instance Routes
 * API routes for workflow instance management
 */

import { WorkflowInstancesController } from '../controllers/workflows/instances/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup workflow instance routes
 */
export function setupWorkflowInstanceRoutes(app: Hono<AppEnv>): void {
    // Create a sub-router for workflow instance routes
    const instancesRouter = new Hono<AppEnv>();

    // Instance CRUD operations
    instancesRouter.post('/', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowInstancesController, WorkflowInstancesController.createInstance));
    instancesRouter.get('/', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowInstancesController, WorkflowInstancesController.getInstances));
    instancesRouter.get('/:instanceId', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowInstancesController, WorkflowInstancesController.getInstance));
    instancesRouter.put('/:instanceId', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowInstancesController, WorkflowInstancesController.updateInstance));
    instancesRouter.delete('/:instanceId', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowInstancesController, WorkflowInstancesController.deleteInstance));

    // Instance activation/deactivation
    instancesRouter.post('/:instanceId/activate', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowInstancesController, WorkflowInstancesController.activateInstance));
    instancesRouter.post('/:instanceId/deactivate', setAuthLevel(AuthConfig.authenticated), adaptController(WorkflowInstancesController, WorkflowInstancesController.deactivateInstance));

    // Mount the router under /api/workflows/instances
    app.route('/api/workflows/instances', instancesRouter);
}
