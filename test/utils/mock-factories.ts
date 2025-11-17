/**
 * Mock data factories for testing
 */

import type {
	EnhancedAppData,
	AppWithUserAndStats,
	UserStatsData,
	ModelConfigData,
	GeneratedCodeFile
} from '@/api-types';

/**
 * Create multiple mock apps
 */
export function createMockApps(count: number, overrides?: Partial<EnhancedAppData>): EnhancedAppData[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `app-${i}`,
		userId: 'user-123',
		name: `Test App ${i}`,
		description: `Description for test app ${i}`,
		appIcon: null,
		screenshotUrl: `https://example.com/screenshot-${i}.png`,
		previewUrl: `https://preview.example.com/app-${i}`,
		cloudflareUrl: null,
		status: 'completed' as const,
		visibility: 'public' as const,
		starCount: i * 10,
		createdAt: new Date(Date.now() - i * 86400000).toISOString(),
		updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
		generationSnapshot: null,
		user: {
			id: 'user-123',
			name: 'Test User',
			avatar: 'https://example.com/avatar.png',
		},
		...overrides,
	}));
}

/**
 * Create mock app with user and stats
 */
export function createMockAppWithStats(overrides?: Partial<AppWithUserAndStats>): AppWithUserAndStats {
	return {
		id: 'app-123',
		userId: 'user-123',
		name: 'Test App',
		description: 'A test application',
		appIcon: null,
		screenshotUrl: 'https://example.com/screenshot.png',
		previewUrl: 'https://preview.example.com/app',
		cloudflareUrl: null,
		status: 'completed',
		visibility: 'public',
		starCount: 42,
		createdAt: new Date('2024-01-01').toISOString(),
		updatedAt: new Date('2024-01-02').toISOString(),
		generationSnapshot: null,
		user: {
			id: 'user-123',
			email: 'test@example.com',
			name: 'Test User',
			avatar: 'https://example.com/avatar.png',
			createdAt: new Date('2023-01-01').toISOString(),
		},
		...overrides,
	};
}

/**
 * Create mock user stats
 */
export function createMockUserStats(overrides?: Partial<UserStatsData>): UserStatsData {
	return {
		totalApps: 10,
		publicApps: 7,
		privateApps: 3,
		totalStars: 150,
		...overrides,
	};
}

/**
 * Create mock model config
 */
export function createMockModelConfig(overrides?: Partial<ModelConfigData>): ModelConfigData {
	return {
		id: 'config-123',
		userId: 'user-123',
		operation: 'conversation',
		modelName: 'gpt-4',
		providerId: 'openai',
		maxTokens: 4096,
		temperature: 0.7,
		reasoningEffort: null,
		fallbackModel: 'gpt-3.5-turbo',
		isUserOverride: false,
		createdAt: new Date('2024-01-01').toISOString(),
		updatedAt: new Date('2024-01-01').toISOString(),
		...overrides,
	};
}

/**
 * Create mock generated code file
 */
export function createMockCodeFile(overrides?: Partial<GeneratedCodeFile>): GeneratedCodeFile {
	return {
		path: 'src/index.ts',
		content: 'console.log("Hello, world!");',
		language: 'typescript',
		...overrides,
	};
}

/**
 * Create mock WebSocket message
 */
export function createMockWebSocketMessage<T extends string>(type: T, data?: Record<string, unknown>) {
	return {
		type,
		timestamp: Date.now(),
		...data,
	};
}

/**
 * Create pagination info
 */
export function createMockPaginationInfo(overrides?: {
	currentPage?: number;
	pageSize?: number;
	totalItems?: number;
	totalPages?: number;
}) {
	const { currentPage = 1, pageSize = 10, totalItems = 100, totalPages = 10 } = overrides || {};
	return {
		currentPage,
		pageSize,
		totalItems,
		totalPages,
		hasNextPage: currentPage < totalPages,
		hasPreviousPage: currentPage > 1,
	};
}

/**
 * Create mock error response
 */
export function createMockErrorResponse(message: string = 'An error occurred', code?: string) {
	return {
		success: false as const,
		error: message,
		code,
	};
}

/**
 * Create mock success response
 */
export function createMockSuccessResponse<T>(data: T) {
	return {
		success: true as const,
		data,
	};
}
