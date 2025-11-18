import { CodeGenState, FileState } from './state';
import { StructuredLogger } from '../../logger';
import { TemplateDetails } from 'worker/services/sandbox/sandboxTypes';
import { generateNanoId } from '../../utils/idGenerator';
import { generateProjectName } from '../utils/templateCustomizer';
import { ConversationMessage } from '../inferutils/common';

// Legacy file format interface for migration
interface LegacyFileFormat {
    filePath?: string;
    file_path?: string;
    fileContents?: string;
    file_contents?: string;
    filePurpose?: string;
    file_purpose?: string;
}

// State with potential deprecated properties
interface StateWithDeprecatedProps extends CodeGenState {
    latestScreenshot?: unknown;
    templateDetails?: TemplateDetails;
}

// Inference context with potential legacy properties
interface LegacyInferenceContext {
    userApiKeys?: unknown;
    [key: string]: unknown;
}

export class StateMigration {
    static migrateIfNeeded(state: CodeGenState, logger: StructuredLogger): CodeGenState | null {
        let needsMigration = false;

        //------------------------------------------------------------------------------------
        // Migrate files from old schema
        //------------------------------------------------------------------------------------
        const migrateFile = (file: FileState | LegacyFileFormat): FileState => {
            const hasOldFormat = 'file_path' in file || 'file_contents' in file || 'file_purpose' in file;

            if (hasOldFormat) {
                const legacyFile = file as LegacyFileFormat;
                return {
                    filePath: legacyFile.filePath || legacyFile.file_path || '',
                    fileContents: legacyFile.fileContents || legacyFile.file_contents || '',
                    filePurpose: legacyFile.filePurpose || legacyFile.file_purpose || '',
                    lastDiff: ''
                };
            }
            return file as FileState;
        };

        const migratedFilesMap: Record<string, FileState> = {};
        for (const [key, file] of Object.entries(state.generatedFilesMap)) {
            const migratedFile = migrateFile(file);
            
            migratedFilesMap[key] = {
                ...migratedFile,
            };
            
            if (migratedFile !== file) {
                needsMigration = true;
            }
        }

        //------------------------------------------------------------------------------------
        // Migrate conversations cleanups and internal memos
        //------------------------------------------------------------------------------------

        let migratedConversationMessages = state.conversationMessages;
        const MIN_MESSAGES_FOR_CLEANUP = 25;
        
        if (migratedConversationMessages && migratedConversationMessages.length > 0) {
            const originalCount = migratedConversationMessages.length;
            
            const seen = new Set<string>();
            const uniqueMessages = [];
            
            for (const message of migratedConversationMessages) {
                let key = message.conversationId;
                if (!key) {
                    const contentStr = typeof message.content === 'string' 
                        ? message.content.substring(0, 100)
                        : JSON.stringify(message.content || '').substring(0, 100);
                    key = `${message.role || 'unknown'}_${contentStr}_${Date.now()}`;
                }
                
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueMessages.push(message);
                }
            }
            
            uniqueMessages.sort((a, b) => {
                const getTimestamp = (msg: ConversationMessage): number => {
                    if (msg.conversationId && typeof msg.conversationId === 'string' && msg.conversationId.startsWith('conv-')) {
                        const parts = msg.conversationId.split('-');
                        if (parts.length >= 2) {
                            return parseInt(parts[1]) || 0;
                        }
                    }
                    return 0;
                };
                return getTimestamp(a) - getTimestamp(b);
            });
            
            if (uniqueMessages.length > MIN_MESSAGES_FOR_CLEANUP) {
                const realConversations = [];
                const internalMemos = [];
                
                for (const message of uniqueMessages) {
                    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content || '');
                    const isInternalMemo = content.includes('**<Internal Memo>**') || content.includes('Project Updates:');
                    
                    if (isInternalMemo) {
                        internalMemos.push(message);
                    } else {
                        realConversations.push(message);
                    }
                }
                
                logger.info('Conversation cleanup analysis', {
                    totalUniqueMessages: uniqueMessages.length,
                    realConversations: realConversations.length,
                    internalMemos: internalMemos.length,
                    willRemoveInternalMemos: uniqueMessages.length > MIN_MESSAGES_FOR_CLEANUP
                });
                
                migratedConversationMessages = realConversations;
            } else {
                migratedConversationMessages = uniqueMessages;
            }
            
            if (migratedConversationMessages.length !== originalCount) {
                logger.info('Fixed conversation message exponential bloat', {
                    originalCount,
                    deduplicatedCount: uniqueMessages.length,
                    finalCount: migratedConversationMessages.length,
                    duplicatesRemoved: originalCount - uniqueMessages.length,
                    internalMemosRemoved: uniqueMessages.length - migratedConversationMessages.length
                });
                needsMigration = true;
            }
        }

        //------------------------------------------------------------------------------------
        // Migrate inference context from old schema
        //------------------------------------------------------------------------------------
        let migratedInferenceContext = state.inferenceContext;
        if (migratedInferenceContext && 'userApiKeys' in migratedInferenceContext) {
            const legacyContext = migratedInferenceContext as unknown as LegacyInferenceContext;
            const { userApiKeys, ...cleanContext } = legacyContext;
            // Rebuild InferenceContext with required properties
            migratedInferenceContext = {
                enableRealtimeCodeFix: state.inferenceContext.enableRealtimeCodeFix,
                enableFastSmartCodeFix: state.inferenceContext.enableFastSmartCodeFix,
                agentId: state.inferenceContext.agentId,
                userId: state.inferenceContext.userId,
                ...cleanContext
            };
            needsMigration = true;
        }

        //------------------------------------------------------------------------------------
        // Migrate deprecated props
        //------------------------------------------------------------------------------------
        const stateWithDeprecated = state as unknown as StateWithDeprecatedProps;
        const stateHasDeprecatedProps = 'latestScreenshot' in stateWithDeprecated;
        if (stateHasDeprecatedProps) {
            needsMigration = true;
        }

        const stateHasProjectUpdatesAccumulator = 'projectUpdatesAccumulator' in stateWithDeprecated;
        if (!stateHasProjectUpdatesAccumulator) {
            needsMigration = true;
        }

        //------------------------------------------------------------------------------------
        // Migrate templateDetails -> templateName
        //------------------------------------------------------------------------------------
        let migratedTemplateName = state.templateName;
        const hasTemplateDetails = 'templateDetails' in stateWithDeprecated;
        if (hasTemplateDetails && stateWithDeprecated.templateDetails) {
            migratedTemplateName = stateWithDeprecated.templateDetails.name;
            needsMigration = true;
            logger.info('Migrating templateDetails to templateName', { templateName: migratedTemplateName });
        }

        //------------------------------------------------------------------------------------
        // Migrate projectName -> generate if missing
        //------------------------------------------------------------------------------------
        let migratedProjectName = state.projectName;
        if (!state.projectName) {
            // Generate project name for older apps
            migratedProjectName = generateProjectName(
                state.blueprint?.projectName || migratedTemplateName || state.query,
                generateNanoId(),
                20
            );
            needsMigration = true;
            logger.info('Generating missing projectName', { projectName: migratedProjectName });
        }

        //------------------------------------------------------------------------------------
        // Migrate trackedFeatures -> initialize if missing
        //------------------------------------------------------------------------------------
        let migratedTrackedFeatures = state.trackedFeatures;
        if (!state.trackedFeatures) {
            // Initialize empty tracked features array for older apps
            migratedTrackedFeatures = [];
            needsMigration = true;
            logger.info('Initializing trackedFeatures array for feature tracking system');
        }

        if (needsMigration) {
            logger.info('Migrating state: schema format, conversation cleanup, security fixes, and bootstrap setup', {
                generatedFilesCount: Object.keys(migratedFilesMap).length,
                finalConversationCount: migratedConversationMessages?.length || 0,
                removedUserApiKeys: state.inferenceContext && 'userApiKeys' in state.inferenceContext,
            });
            
            const newState: CodeGenState = {
                ...state,
                generatedFilesMap: migratedFilesMap,
                conversationMessages: migratedConversationMessages,
                inferenceContext: migratedInferenceContext,
                projectUpdatesAccumulator: [],
                templateName: migratedTemplateName,
                projectName: migratedProjectName,
                trackedFeatures: migratedTrackedFeatures
            };

            // Remove deprecated fields by reconstructing without them
            const newStateWithDeprecated = newState as unknown as StateWithDeprecatedProps;
            if (stateHasDeprecatedProps && 'latestScreenshot' in newStateWithDeprecated) {
                const { latestScreenshot, ...stateWithoutScreenshot } = newStateWithDeprecated;
                Object.assign(newState, stateWithoutScreenshot);
            }
            if (hasTemplateDetails && 'templateDetails' in newStateWithDeprecated) {
                const { templateDetails, ...stateWithoutTemplateDetails } = newStateWithDeprecated;
                Object.assign(newState, stateWithoutTemplateDetails);
            }

            return newState;
        }

        return null;
    }
}
