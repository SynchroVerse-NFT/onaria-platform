/**
 * Shared interfaces for agent modules
 * Provides access to agent state, services, and utilities
 */

import { StructuredLogger } from '../../../logger';
import { CodeGenState } from '../state';
import { InferenceContext } from '../../inferutils/config.types';
import { WebSocketMessageType, WebSocketMessageData } from '../../../api/websocketTypes';
import { GitVersionControl } from '../../git';
import { FileManager } from '../../services/implementations/FileManager';
import { StateManager } from '../../services/implementations/StateManager';
import { DeploymentManager } from '../../services/implementations/DeploymentManager';

/**
 * Core agent context interface
 * Provides minimal interface for modules to access agent state and utilities
 */
export interface AgentContext {
    // State access
    getState(): CodeGenState;
    setState(state: CodeGenState): void;
    getAgentId(): string;
    getInferenceContext(): InferenceContext;

    // Logging
    logger(): StructuredLogger;

    // Broadcasting
    broadcast<T extends WebSocketMessageType>(msg: T, data?: WebSocketMessageData<T>): void;
    broadcastError(context: string, error: unknown): void;

    // Environment
    env: Env;
}

/**
 * Extended context with services
 * For modules that need access to file management, git, deployment, etc.
 */
export interface AgentContextWithServices extends AgentContext {
    git: GitVersionControl;
    fileManager: FileManager;
    stateManager: StateManager;
    deploymentManager: DeploymentManager;
}
