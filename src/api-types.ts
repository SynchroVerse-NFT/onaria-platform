/**
 * Centralized API types - imports and re-exports types from worker
 * This file serves as the single source of truth for frontend-worker API communication
 */
import { SessionResponse } from 'worker/utils/authUtils';
import { AuthUser } from './api-types';

export type { SecretTemplate } from 'worker/types/secretsTemplates';

// Base API Response Types
export type { ControllerResponse, ApiResponse } from 'worker/api/controllers/types';

// Database Types
export type {
  PaginationInfo,
  EnhancedAppData,
  AppWithFavoriteStatus,
  TimePeriod,
  AppSortOption,
  SortOrder,
  AppQueryOptions,
  PublicAppQueryOptions
} from 'worker/database/types';

// App-related API Types
export type { 
  AppsListData,
  PublicAppsData, 
  SingleAppData,
  FavoriteToggleData,
  CreateAppData,
  UpdateAppVisibilityData,
  AppDeleteData,
  AppWithUserAndStats
} from 'worker/api/controllers/apps/types';

export type {
  AppDetailsData,
  AppStarToggleData,
  GeneratedCodeFile,
  GitCloneTokenData
} from 'worker/api/controllers/appView/types';

// User-related API Types
export type {
  UserAppsData,
  ProfileUpdateData,
} from 'worker/api/controllers/user/types';

// Stats API Types
export type {
  UserStatsData,
  UserActivityData
} from 'worker/api/controllers/stats/types';

// Analytics API Types
export type {
  UserAnalyticsResponseData,
  AgentAnalyticsResponseData,
} from 'worker/api/controllers/analytics/types';

export type { PlatformStatusData } from 'worker/api/controllers/status/types';

// Model Config API Types
export type {
  ModelConfigsData,
  ModelConfigData,
  ModelConfigUpdateData,
  ModelConfigTestData,
  ModelConfigResetData,
  ModelConfigDefaultsData,
  ModelConfigDeleteData,
  ByokProvidersData,
  UserProviderStatus,
  ModelsByProvider
} from 'worker/api/controllers/modelConfig/types';

// Model Provider API Types
export type {
  ModelProvidersListData,
  ModelProviderData,
  ModelProviderCreateData,
  ModelProviderUpdateData,
  ModelProviderDeleteData,
  ModelProviderTestData,
  CreateProviderRequest,
  UpdateProviderRequest,
  TestProviderRequest
} from 'worker/api/controllers/modelProviders/types';

// Frontend model config update interface that matches backend schema
export interface ModelConfigUpdate {
  modelName?: string | null;
  maxTokens?: number | null;
  temperature?: number | null;
  reasoningEffort?: string | null;
  fallbackModel?: string | null;
  isUserOverride?: boolean;
}

// Secrets API Types
export type {
  SecretsData,
  SecretStoreData,
  SecretDeleteData,
  SecretTemplatesData
} from 'worker/api/controllers/secrets/types';

// Payment API Types
export type {
  InitiateCryptoPaymentData,
  VerifyCryptoPaymentData,
  PaymentHistoryData,
  PaymentDetailsData,
  CryptoWebhookData
} from 'worker/api/controllers/payments/types';

// Agent/CodeGen API Types  
export type {
  AgentConnectionData,
} from 'worker/api/controllers/agent/types';

// WebSocket Types
export type { 
  WebSocketMessage, 
  WebSocketMessageData,
  CodeFixEdits 
} from 'worker/api/websocketTypes';

// Database/Schema Types commonly used in frontend
export type { 
  App,
  User,
  UserModelConfig,
  UserModelProvider
} from 'worker/database/schema';

export type {
  FavoriteToggleResult,
  UserStats,
  UserActivity,
  EncryptedSecret,
  UserModelConfigWithMetadata,
  ModelTestResult
} from 'worker/database/types';

// Agent/Generator Types
export type { 
  Blueprint as BlueprintType,
  CodeReviewOutputType,
  FileConceptType,
  FileOutputType as GeneratedFile,
} from 'worker/agents/schemas';

export type { 
  CodeGenState 
} from 'worker/agents/core/state';

export type {
  ConversationMessage,
} from 'worker/agents/inferutils/common';

export type { 
  RuntimeError,
  StaticAnalysisResponse 
} from 'worker/services/sandbox/sandboxTypes';

// Config/Inference Types
export type { 
  AgentActionKey,
  AgentConfig,
  ModelConfig,
  ReasoningEffortType as ReasoningEffort,
  ProviderOverrideType as ProviderOverride
} from 'worker/agents/inferutils/config.types';

export type { RateLimitError } from "worker/services/rate-limit/errors";
export type { AgentPreviewResponse, CodeGenArgs } from 'worker/api/controllers/agent/types';
export type { RateLimitErrorResponse } from 'worker/api/responses';
export { RateLimitExceededError, SecurityError, SecurityErrorType } from 'shared/types/errors';

export type { AIModels } from 'worker/agents/inferutils/config.types';
// Model selection types
export type ModelSelectionMode = 'platform' | 'byok' | 'custom';

// Match chat FileType interface
export interface FileType {
	filePath: string;
	fileContents: string;
	explanation?: string;
	isGenerating?: boolean;
	needsFixing?: boolean;
	hasErrors?: boolean;
	language?: string;
}

// Streaming response wrapper types for agent session creation
export interface StreamingResponse {
  success: boolean;
  stream: Response;
}

export type AgentStreamingResponse = StreamingResponse;

export {
	type ImageAttachment, 
	isSupportedImageType, 
	MAX_IMAGE_SIZE_BYTES,
	MAX_IMAGES_PER_MESSAGE,
	SUPPORTED_IMAGE_MIME_TYPES
} from 'worker/types/image-attachment';

// Auth types imported from worker
export type { 
  AuthSession, 
  ApiKeyInfo, 
  AuthResult, 
  AuthUser,
  OAuthProvider 
} from 'worker/types/auth-types';
export type { 
  SessionResponse 
} from 'worker/utils/authUtils';

// Auth API Response Types (using existing worker types)
export type LoginResponseData = SessionResponse;

export type RegisterResponseData = SessionResponse & {
  requiresVerification?: boolean;
};

export type ProfileResponseData = {
  user: AuthUser;
  sessionId: string;
};

export interface AuthProvidersResponseData {
  providers: {
    google: boolean;
    github: boolean;
    email: boolean;
  };
  hasOAuth: boolean;
  requiresEmailAuth: boolean;
  csrfToken?: string;
  csrfExpiresIn?: number;
}

export interface CsrfTokenResponseData {
  token: string;
  headerName: string;
  expiresIn?: number;
}

// Active Sessions Response - matches getUserSessions + isCurrent from controller
export interface ActiveSessionsData {
  sessions: Array<{
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    lastActivity: Date;
    createdAt: Date;
    isCurrent: boolean;
  }>;
}

// API Keys Response - matches controller response format
export interface ApiKeysData {
  keys: Array<{
    id: string;
    name: string;
    keyPreview: string;
    createdAt: Date | null;
    lastUsed: Date | null;
    isActive: boolean;
  }>;
}

export type {
    GitHubExportOptions,
    GitHubExportResult,
} from 'worker/services/github/types';

// ===============================
// Payment & Subscription Types
// ===============================

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise' | 'byok';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due';
export type Chain = 'ethereum' | 'solana' | 'polygon' | 'base';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: number;
  endDate?: number;
  autoRenew: boolean;
  paymentMethodId?: string;
  scheduledTier?: SubscriptionTier;
  scheduledChangeDate?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CryptoPayment {
  id: string;
  userId: string;
  subscriptionId?: string;
  chain: Chain;
  walletAddress: string;
  txHash: string;
  amount: number;
  currency: string;
  usdValue: number;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  requiredConfirmations: number;
  createdAt: number;
  confirmedAt?: number;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'wallet' | 'stripe';
  chain?: Chain;
  walletAddress?: string;
  last4?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UsageMetrics {
  aiGenerations: number;
  appsCreated: number;
  workflowExecutions: number;
  estimatedCost: number;
}

export interface TierLimits {
  aiGenerations: number;
  appsCreated: number;
  workflowExecutions: number;
  maxTeamMembers?: number;
  customDomains?: number;
}

export interface BillingRecord {
  id: string;
  userId: string;
  subscriptionId?: string;
  type: 'subscription' | 'upgrade' | 'downgrade' | 'refund' | 'credit';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId?: string;
  createdAt: number;
  processedAt?: number;
}

// Subscription API Response Types
export type {
  CurrentSubscriptionData,
  UpgradeSubscriptionData,
  DowngradeSubscriptionData,
  CancelSubscriptionData,
  ReactivateSubscriptionData
} from 'worker/api/controllers/subscriptions/types';

// Payment API Response Types
export type {
  InitiateCryptoPaymentData,
  VerifyCryptoPaymentData,
  PaymentHistoryData,
  PaymentDetailsData,
  CryptoWebhookData
} from 'worker/api/controllers/payments/types';

// Payment Method API Response Types
export type {
  PaymentMethodsData,
  PaymentMethodCreateData,
  PaymentMethodUpdateData,
  PaymentMethodDeleteData
} from 'worker/api/controllers/payment-methods/types';

// Usage API Response Types
export type {
  CurrentUsageData,
  UsageHistoryData,
  UsageExportData
} from 'worker/api/controllers/usage/types';

// Billing API Response Types
export type {
  BillingHistoryData,
  InvoiceDetailsData,
  NextBillingData
} from 'worker/api/controllers/billing/types';

// Feature API Response Types
export type {
  AvailableFeaturesData,
  FeatureCheckData
} from 'worker/api/controllers/features/types';
