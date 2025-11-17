/**
 * Test utilities and helper functions
 */

import { vi } from 'vitest';
import type { AuthUser } from '@/api-types';
import type { EnhancedAppData } from '@/api-types';

/**
 * Create a mock authenticated user
 */
export function createMockUser(overrides?: Partial<AuthUser>): AuthUser {
	return {
		id: '123e4567-e89b-12d3-a456-426614174000',
		email: 'test@example.com',
		name: 'Test User',
		avatar: 'https://example.com/avatar.png',
		createdAt: new Date('2024-01-01').toISOString(),
		...overrides,
	};
}

/**
 * Create a mock app data
 */
export function createMockApp(overrides?: Partial<EnhancedAppData>): EnhancedAppData {
	return {
		id: '550e8400-e29b-41d4-a716-446655440000',
		userId: '123e4567-e89b-12d3-a456-426614174000',
		name: 'Test App',
		description: 'A test application',
		appIcon: null,
		screenshotUrl: null,
		previewUrl: null,
		cloudflareUrl: null,
		status: 'completed',
		visibility: 'public',
		starCount: 0,
		createdAt: new Date('2024-01-01').toISOString(),
		updatedAt: new Date('2024-01-01').toISOString(),
		generationSnapshot: null,
		user: {
			id: '123e4567-e89b-12d3-a456-426614174000',
			name: 'Test User',
			avatar: 'https://example.com/avatar.png',
		},
		...overrides,
	};
}

/**
 * Create mock WebSocket
 */
export function createMockWebSocket() {
	return {
		send: vi.fn(),
		close: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		readyState: WebSocket.OPEN,
		CONNECTING: 0,
		OPEN: 1,
		CLOSING: 2,
		CLOSED: 3,
	};
}

/**
 * Mock fetch response
 */
export function createMockResponse<T>(data: T, options?: { status?: number; statusText?: string }) {
	return {
		ok: (options?.status ?? 200) >= 200 && (options?.status ?? 200) < 300,
		status: options?.status ?? 200,
		statusText: options?.statusText ?? 'OK',
		json: async () => data,
		text: async () => JSON.stringify(data),
		headers: new Headers(),
	} as Response;
}

/**
 * Wait for async operations to complete
 */
export function waitFor(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock localStorage
 */
export function createMockLocalStorage() {
	let store: Record<string, string> = {};

	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => {
			const keys = Object.keys(store);
			return keys[index] || null;
		}),
	};
}

/**
 * Mock sessionStorage
 */
export function createMockSessionStorage() {
	return createMockLocalStorage();
}

/**
 * Create mock file
 */
export function createMockFile(name: string, content: string, type: string = 'text/plain'): File {
	const blob = new Blob([content], { type });
	return new File([blob], name, { type });
}

/**
 * Mock window.matchMedia for responsive tests
 */
export function mockMatchMedia(matches: boolean = false) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

/**
 * Mock IntersectionObserver
 */
export function mockIntersectionObserver() {
	global.IntersectionObserver = class IntersectionObserver {
		constructor() {}
		disconnect() {}
		observe() {}
		unobserve() {}
		takeRecords() {
			return [];
		}
	} as unknown as typeof IntersectionObserver;
}

/**
 * Mock ResizeObserver
 */
export function mockResizeObserver() {
	global.ResizeObserver = class ResizeObserver {
		constructor() {}
		disconnect() {}
		observe() {}
		unobserve() {}
	} as unknown as typeof ResizeObserver;
}
