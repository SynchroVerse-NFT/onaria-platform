import type { Blueprint, PhaseConceptType ,
    FileOutputType,
} from '../schemas';
// import type { ScreenshotData } from './types';
import type { ConversationMessage } from '../inferutils/common';
import type { InferenceContext } from '../inferutils/config.types';

export interface FileState extends FileOutputType {
    lastDiff: string;
}

export interface PhaseState extends PhaseConceptType {
    // deploymentNeeded: boolean;
    completed: boolean;
}

export type TrackedFeatureStatus = 'pending' | 'in_progress' | 'completed' | 'deferred' | 'cancelled';

export interface TrackedFeature {
    id: string;                    // Unique ID (uuid)
    description: string;           // Feature description
    status: TrackedFeatureStatus;  // Current status
    requestedAt: number;           // Timestamp (unixepoch)
    requestedInPhase: number;      // Phase number when requested
    implementedInPhase?: number;   // Phase number when completed
    requiresConfirmation: boolean; // Whether to ask user
    userConfirmed?: boolean;       // User confirmation status
    notes?: string;                // LLM explanation (why deferred, etc.)
}

export enum CurrentDevState {
    IDLE,
    PHASE_GENERATING,
    PHASE_IMPLEMENTING,
    REVIEWING,
    FINALIZING,
}

export const MAX_PHASES = 12;
export const MAX_TOTAL_PHASES = 15; // Hard cap on total phases - lowered from 30 to prevent excessive generation

export interface CodeGenState {
    blueprint: Blueprint;
    projectName: string,
    query: string;
    generatedFilesMap: Record<string, FileState>;
    generatedPhases: PhaseState[];
    commandsHistory?: string[]; // History of commands run
    lastPackageJson?: string; // Last package.json file contents
    templateName: string;
    sandboxInstanceId?: string;
    
    shouldBeGenerating: boolean; // Persistent flag indicating generation should be active
    mvpGenerated: boolean;
    reviewingInitiated: boolean;
    agentMode: 'deterministic' | 'smart';
    sessionId: string;
    hostname: string;
    phasesCounter: number;

    pendingUserInputs: string[];
    trackedFeatures: TrackedFeature[]; // Individual feature tracking with validation
    currentDevState: CurrentDevState;
    reviewCycles?: number; // Number of review cycles for code review phase
    currentPhase?: PhaseConceptType; // Current phase being worked on
    
    conversationMessages: ConversationMessage[];
    projectUpdatesAccumulator: string[];
    inferenceContext: InferenceContext;

    lastDeepDebugTranscript: string | null;

    // Timestamp when initialize() started - used to detect stale/broken apps
    initializingAt?: number;
} 
