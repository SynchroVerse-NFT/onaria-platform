/**
 * Command Executor Module
 * Handles command execution in sandbox, bootstrap script management, and package.json syncing
 */

import { AgentContextWithServices } from './agent-context';
import { ExecuteCommandsResponse } from '../../../services/sandbox/sandboxTypes';
import { WebSocketMessageResponses } from '../../constants';
import { looksLikeCommand, validateAndCleanBootstrapCommands } from '../../utils/common';
import { generateBootstrapScript } from '../../utils/templateCustomizer';
import { updatePackageJson } from '../../utils/packageSyncer';

export class CommandExecutor {
    constructor(private agent: AgentContextWithServices) {}

    /**
     * Get validated bootstrap commands from state
     */
    getBootstrapCommands(): string[] {
        const bootstrapCommands = this.agent.getState().commandsHistory || [];
        // Validate, deduplicate, and clean
        const { validCommands } = validateAndCleanBootstrapCommands(bootstrapCommands);
        return validCommands;
    }

    /**
     * Save executed commands to state and update bootstrap script
     */
    async saveExecutedCommands(commands: string[]): Promise<void> {
        this.agent.logger().info('Saving executed commands', { commands });

        // Merge with existing history
        const mergedCommands = [...(this.agent.getState().commandsHistory || []), ...commands];

        // Validate, deduplicate, and clean
        const { validCommands, invalidCommands, deduplicated } = validateAndCleanBootstrapCommands(mergedCommands);

        // Log what was filtered out
        if (invalidCommands.length > 0 || deduplicated > 0) {
            this.agent.logger().warn('[commands] Bootstrap commands cleaned', {
                invalidCommands,
                invalidCount: invalidCommands.length,
                deduplicatedCount: deduplicated,
                finalCount: validCommands.length
            });
        }

        // Update state with cleaned commands
        const currentState = this.agent.getState();
        this.agent.setState({
            ...currentState,
            commandsHistory: validCommands
        });

        // Update bootstrap script with validated commands
        await this.updateBootstrapScript(validCommands);

        // Sync package.json if any dependency-modifying commands were executed
        const hasDependencyCommands = commands.some(cmd =>
            cmd.includes('install') ||
            cmd.includes(' add ') ||
            cmd.includes('remove') ||
            cmd.includes('uninstall')
        );

        if (hasDependencyCommands) {
            this.agent.logger().info('Dependency commands executed, syncing package.json from sandbox');
            await this.syncPackageJsonFromSandbox();
        }
    }

    /**
     * Update bootstrap script when commands history changes
     * Called after significant command executions
     */
    private async updateBootstrapScript(commandsHistory: string[]): Promise<void> {
        if (!commandsHistory || commandsHistory.length === 0) {
            return;
        }

        const state = this.agent.getState();
        // Use only validated commands
        const bootstrapScript = generateBootstrapScript(
            state.projectName,
            commandsHistory
        );

        await this.agent.fileManager.saveGeneratedFile(
            {
                filePath: '.bootstrap.js',
                fileContents: bootstrapScript,
                filePurpose: 'Updated bootstrap script for first-time clone setup'
            },
            'chore: Update bootstrap script with latest commands'
        );

        this.agent.logger().info('Updated bootstrap script with commands', {
            commandCount: commandsHistory.length
        });
    }

    /**
     * Execute commands with retry logic
     * Chunks commands and retries failed ones with AI assistance
     */
    async executeCommands(
        commands: string[],
        shouldRetry: boolean = true,
        chunkSize: number = 5,
        getSandboxClient: () => { executeCommands: (instanceId: string, commands: string[]) => Promise<ExecuteCommandsResponse>; getInstanceStatus: (instanceId: string) => Promise<{ success: boolean; isHealthy: boolean }> },
        getProjectSetupAssistant: () => { generateSetupCommands: (context?: string) => Promise<{ commands: string[] } | undefined> }
    ): Promise<void> {
        const state = this.agent.getState();
        if (!state.sandboxInstanceId) {
            this.agent.logger().warn('No sandbox instance available for executing commands');
            return;
        }

        // Sanitize and prepare commands
        commands = commands.join('\n').split('\n').filter(cmd => cmd.trim() !== '').filter(cmd => looksLikeCommand(cmd) && !cmd.includes(' undefined'));
        if (commands.length === 0) {
            this.agent.logger().warn("No commands to execute");
            return;
        }

        commands = commands.map(cmd => cmd.trim().replace(/^\s*-\s*/, '').replace(/^npm/, 'bun'));
        this.agent.logger().info(`AI suggested ${commands.length} commands to run: ${commands.join(", ")}`);

        // Remove duplicate commands
        commands = Array.from(new Set(commands));

        // Execute in chunks
        const commandChunks = [];
        for (let i = 0; i < commands.length; i += chunkSize) {
            commandChunks.push(commands.slice(i, i + chunkSize));
        }

        const successfulCommands: string[] = [];
        const sandboxClient = getSandboxClient();

        for (const chunk of commandChunks) {
            // Retry failed commands up to 3 times
            let currentChunk = chunk;
            let retryCount = 0;
            const maxRetries = shouldRetry ? 3 : 1;

            while (currentChunk.length > 0 && retryCount < maxRetries) {
                try {
                    this.agent.broadcast(WebSocketMessageResponses.COMMAND_EXECUTING, {
                        message: retryCount > 0 ? `Retrying commands (attempt ${retryCount + 1}/${maxRetries})` : "Executing commands",
                        commands: currentChunk
                    });

                    const resp = await sandboxClient.executeCommands(
                        state.sandboxInstanceId,
                        currentChunk
                    );
                    if (!resp.results || !resp.success) {
                        this.agent.logger().error('Failed to execute commands', { response: resp });
                        // Check if instance is still running
                        const status = await sandboxClient.getInstanceStatus(state.sandboxInstanceId);
                        if (!status.success || !status.isHealthy) {
                            this.agent.logger().error(`Instance ${state.sandboxInstanceId} is no longer running`);
                            return;
                        }
                        break;
                    }

                    // Process results
                    const successful = resp.results.filter(r => r.success);
                    const failures = resp.results.filter(r => !r.success);

                    // Track successful commands
                    if (successful.length > 0) {
                        const successfulCmds = successful.map(r => r.command);
                        this.agent.logger().info(`Successfully executed ${successful.length} commands: ${successfulCmds.join(", ")}`);
                        successfulCommands.push(...successfulCmds);
                    }

                    // If all succeeded, move to next chunk
                    if (failures.length === 0) {
                        this.agent.logger().info(`All commands in chunk executed successfully`);
                        break;
                    }

                    // Handle failures
                    const failedCommands = failures.map(r => r.command);
                    this.agent.logger().warn(`${failures.length} commands failed: ${failedCommands.join(", ")}`);

                    // Only retry if shouldRetry is true
                    if (!shouldRetry) {
                        break;
                    }

                    retryCount++;

                    // For install commands, try AI regeneration
                    const failedInstallCommands = failedCommands.filter(cmd =>
                        cmd.startsWith("bun") || cmd.startsWith("npm") || cmd.includes("install")
                    );

                    if (failedInstallCommands.length > 0 && retryCount < maxRetries) {
                        // Use AI to suggest alternative commands
                        const projectSetup = getProjectSetupAssistant();
                        const newCommands = await projectSetup.generateSetupCommands(
                            `The following install commands failed: ${JSON.stringify(failures, null, 2)}. Please suggest alternative commands.`
                        );

                        if (newCommands?.commands && newCommands.commands.length > 0) {
                            this.agent.logger().info(`AI suggested ${newCommands.commands.length} alternative commands`);
                            this.agent.broadcast(WebSocketMessageResponses.COMMAND_EXECUTING, {
                                message: "Executing regenerated commands",
                                commands: newCommands.commands
                            });
                            currentChunk = newCommands.commands.filter(looksLikeCommand);
                        } else {
                            this.agent.logger().warn('AI could not generate alternative commands');
                            currentChunk = [];
                        }
                    } else {
                        // No retry needed for non-install commands
                        currentChunk = [];
                    }
                } catch (error) {
                    this.agent.logger().error('Error executing commands:', error);
                    // Stop retrying on error
                    break;
                }
            }
        }

        // Record command execution history
        const failedCommands = commands.filter(cmd => !successfulCommands.includes(cmd));

        if (failedCommands.length > 0) {
            this.agent.broadcastError('Failed to execute commands', new Error(failedCommands.join(", ")));
        } else {
            this.agent.logger().info(`All commands executed successfully: ${successfulCommands.join(", ")}`);
        }

        await this.saveExecutedCommands(successfulCommands);
    }

    /**
     * Sync package.json from sandbox to agent's git repository
     * Called after install/add/remove commands to keep dependencies in sync
     */
    private async syncPackageJsonFromSandbox(): Promise<void> {
        try {
            this.agent.logger().info('Fetching current package.json from sandbox');

            // This method needs access to agent's readFiles method
            // We'll need to pass this through or redesign
            // For now, this is a placeholder that needs refactoring
            this.agent.logger().warn('syncPackageJsonFromSandbox needs refactoring to access readFiles method');

        } catch (error) {
            this.agent.logger().error('Failed to sync package.json from sandbox', error);
            // Non-critical error - don't throw, just log
        }
    }

    /**
     * Sync package.json with content fetched from sandbox
     * This is the actual implementation that takes packageJsonContent as parameter
     */
    async syncPackageJson(packageJsonContent: string): Promise<void> {
        try {
            const state = this.agent.getState();
            const { updated, packageJson } = updatePackageJson(state.lastPackageJson, packageJsonContent);
            if (!updated) {
                this.agent.logger().info('package.json has not changed, skipping sync');
                return;
            }

            // Update state with latest package.json
            this.agent.setState({
                ...state,
                lastPackageJson: packageJson
            });

            // Commit to git repository
            const fileState = await this.agent.fileManager.saveGeneratedFile(
                {
                    filePath: 'package.json',
                    fileContents: packageJson,
                    filePurpose: 'Project dependencies and configuration'
                },
                'chore: sync package.json dependencies from sandbox'
            );

            this.agent.logger().info('Successfully synced package.json to git', {
                filePath: fileState.filePath,
            });

            // Broadcast update to clients
            this.agent.broadcast(WebSocketMessageResponses.FILE_GENERATED, {
                message: 'Synced package.json from sandbox',
                file: fileState
            });

        } catch (error) {
            this.agent.logger().error('Failed to sync package.json', error);
            // Non-critical error - don't throw, just log
        }
    }
}
