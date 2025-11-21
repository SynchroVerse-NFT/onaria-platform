/**
 * GitHub Operations Module
 * Handles GitHub repository export and token management
 */

import { AgentContextWithServices } from './agent-context';
import { GitHubPushRequest, TemplateDetails } from '../../../services/sandbox/sandboxTypes';
import { GitHubExportResult } from '../../../services/github/types';
import { GitHubService } from '../../../services/github/GitHubService';
import { WebSocketMessageResponses } from '../../constants';
import { AppService } from '../../../database';

interface GitHubTokenCache {
    token: string;
    username: string;
    expiresAt: number;
}

export class GitHubOperations {
    private githubTokenCache: GitHubTokenCache | null = null;

    constructor(private agent: AgentContextWithServices) {}

    /**
     * Cache GitHub OAuth token in memory for subsequent exports
     * Token is ephemeral - lost on DO eviction
     */
    setGitHubToken(token: string, username: string, ttl: number = 3600000): void {
        this.githubTokenCache = {
            token,
            username,
            expiresAt: Date.now() + ttl
        };
        this.agent.logger().info('GitHub token cached', {
            username,
            expiresAt: new Date(this.githubTokenCache.expiresAt).toISOString()
        });
    }

    /**
     * Get cached GitHub token if available and not expired
     */
    getGitHubToken(): { token: string; username: string } | null {
        if (!this.githubTokenCache) {
            return null;
        }

        if (Date.now() >= this.githubTokenCache.expiresAt) {
            this.agent.logger().info('GitHub token expired, clearing cache');
            this.githubTokenCache = null;
            return null;
        }

        return {
            token: this.githubTokenCache.token,
            username: this.githubTokenCache.username
        };
    }

    /**
     * Clear cached GitHub token
     */
    clearGitHubToken(): void {
        this.githubTokenCache = null;
        this.agent.logger().info('GitHub token cache cleared');
    }

    /**
     * Export generated code to a GitHub repository
     */
    async pushToGitHub(options: GitHubPushRequest): Promise<GitHubExportResult> {
        try {
            this.agent.logger().info('Starting GitHub export using DO git');

            // Broadcast export started
            this.agent.broadcast(WebSocketMessageResponses.GITHUB_EXPORT_STARTED, {
                message: `Starting GitHub export to repository "${options.cloneUrl}"`,
                repositoryName: options.repositoryHtmlUrl,
                isPrivate: options.isPrivate
            });

            // Export git objects from DO
            this.agent.broadcast(WebSocketMessageResponses.GITHUB_EXPORT_PROGRESS, {
                message: 'Preparing git repository...',
                step: 'preparing',
                progress: 20
            });

            const { gitObjects, query, templateDetails } = await this.exportGitObjects();

            this.agent.logger().info('Git objects exported', {
                objectCount: gitObjects.length,
                hasTemplate: !!templateDetails
            });

            // Get app createdAt timestamp for template base commit
            let appCreatedAt: Date | undefined = undefined;
            try {
                const appId = this.agent.getAgentId();
                if (appId) {
                    const appService = new AppService(this.agent.env);
                    const app = await appService.getAppDetails(appId);
                    if (app && app.createdAt) {
                        appCreatedAt = new Date(app.createdAt);
                        this.agent.logger().info('Using app createdAt for template base', {
                            createdAt: appCreatedAt.toISOString()
                        });
                    }
                }
            } catch (error) {
                this.agent.logger().warn('Failed to get app createdAt, using current time', { error });
                appCreatedAt = new Date(); // Fallback to current time
            }

            // Push to GitHub using new service
            this.agent.broadcast(WebSocketMessageResponses.GITHUB_EXPORT_PROGRESS, {
                message: 'Uploading to GitHub repository...',
                step: 'uploading_files',
                progress: 40
            });

            const result = await GitHubService.exportToGitHub({
                gitObjects,
                templateDetails,
                appQuery: query,
                appCreatedAt,
                token: options.token,
                repositoryUrl: options.repositoryHtmlUrl,
                username: options.username,
                email: options.email
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to export to GitHub');
            }

            this.agent.logger().info('GitHub export completed', {
                commitSha: result.commitSha
            });

            // Cache token for subsequent exports
            if (options.token && options.username) {
                try {
                    this.setGitHubToken(options.token, options.username);
                    this.agent.logger().info('GitHub token cached after successful export');
                } catch (cacheError) {
                    // Non-fatal - continue with finalization
                    this.agent.logger().warn('Failed to cache GitHub token', { error: cacheError });
                }
            }

            // Update database
            this.agent.broadcast(WebSocketMessageResponses.GITHUB_EXPORT_PROGRESS, {
                message: 'Finalizing GitHub export...',
                step: 'finalizing',
                progress: 90
            });

            const agentId = this.agent.getAgentId();
            this.agent.logger().info('[DB Update] Updating app with GitHub repository URL', {
                agentId,
                repositoryUrl: options.repositoryHtmlUrl,
                visibility: options.isPrivate ? 'private' : 'public'
            });

            const appService = new AppService(this.agent.env);
            const updateResult = await appService.updateGitHubRepository(
                agentId || '',
                options.repositoryHtmlUrl || '',
                options.isPrivate ? 'private' : 'public'
            );

            this.agent.logger().info('[DB Update] Database update result', {
                agentId,
                success: updateResult,
                repositoryUrl: options.repositoryHtmlUrl
            });

            // Broadcast success
            this.agent.broadcast(WebSocketMessageResponses.GITHUB_EXPORT_COMPLETED, {
                message: `Successfully exported to GitHub repository: ${options.repositoryHtmlUrl}`,
                repositoryUrl: options.repositoryHtmlUrl,
                cloneUrl: options.cloneUrl,
                commitSha: result.commitSha
            });

            this.agent.logger().info('GitHub export completed successfully', {
                repositoryUrl: options.repositoryHtmlUrl,
                commitSha: result.commitSha
            });

            return {
                success: true,
                repositoryUrl: options.repositoryHtmlUrl,
                cloneUrl: options.cloneUrl
            };

        } catch (error) {
            this.agent.logger().error('GitHub export failed', error);
            this.agent.broadcast(WebSocketMessageResponses.GITHUB_EXPORT_ERROR, {
                message: `GitHub export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                repositoryUrl: options.repositoryHtmlUrl,
                cloneUrl: options.cloneUrl
            };
        }
    }

    /**
     * Export git objects
     * The route handler will build the repo with template rebasing
     */
    private async exportGitObjects(): Promise<{
        gitObjects: Array<{ path: string; data: Uint8Array }>;
        query: string;
        hasCommits: boolean;
        templateDetails: TemplateDetails | null;
    }> {
        try {
            // Export git objects efficiently (minimal DO memory usage)
            const gitObjects = this.agent.git.fs.exportGitObjects();

            // Initialize git if needed
            await this.agent.git.init();

            // Get template details if available
            const state = this.agent.getState();
            let templateDetails: TemplateDetails | null = null;
            if (state.templateName) {
                // Template details should be cached in the agent
                // This assumes the agent has a method to get template details
                // We'll need to pass this through or access it differently
                templateDetails = null; // TODO: Get from agent's templateDetailsCache
            }

            return {
                gitObjects,
                query: state.query || 'N/A',
                hasCommits: gitObjects.length > 0,
                templateDetails
            };
        } catch (error) {
            this.agent.logger().error('exportGitObjects failed', error);
            throw error;
        }
    }
}
