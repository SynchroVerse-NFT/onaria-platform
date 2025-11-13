/**
 * Test Assertions
 * Custom assertions for testing agent workflows
 */

import { expect } from 'vitest';

interface CodeGenState {
	generatedFilesMap?: Record<string, FileState>;
	generatedPhases?: PhaseState[];
	currentDevState?: string;
	mvpGenerated?: boolean;
	sandboxInstanceId?: string;
	[key: string]: unknown;
}

interface FileState {
	filePath: string;
	fileContents: string;
	filePurpose?: string;
	hasErrors?: boolean;
}

interface PhaseState {
	name: string;
	completed: boolean;
	files?: string[];
}

/**
 * Assert state has minimum number of generated files
 */
export function assertHasGeneratedFiles(
	state: CodeGenState | null,
	minCount: number
): void {
	expect(state, 'State should exist').toBeDefined();
	expect(state!.generatedFilesMap, 'Generated files map should exist').toBeDefined();

	const fileCount = Object.keys(state!.generatedFilesMap!).length;
	expect(
		fileCount,
		`Should have at least ${minCount} files, but got ${fileCount}`
	).toBeGreaterThanOrEqual(minCount);
}

/**
 * Assert specific file exists in generated files
 */
export function assertFileExists(
	state: CodeGenState | null,
	filePath: string
): void {
	expect(state, 'State should exist').toBeDefined();
	expect(state!.generatedFilesMap, 'Generated files map should exist').toBeDefined();
	expect(
		state!.generatedFilesMap![filePath],
		`File ${filePath} should exist in generated files`
	).toBeDefined();
}

/**
 * Assert file contains specific content
 */
export function assertFileContains(
	state: CodeGenState | null,
	filePath: string,
	content: string
): void {
	assertFileExists(state, filePath);

	const file = state!.generatedFilesMap![filePath];
	expect(
		file.fileContents,
		`File ${filePath} should contain "${content}"`
	).toContain(content);
}

/**
 * Assert file does not have errors
 */
export function assertFileHasNoErrors(
	state: CodeGenState | null,
	filePath: string
): void {
	assertFileExists(state, filePath);

	const file = state!.generatedFilesMap![filePath];
	expect(
		file.hasErrors,
		`File ${filePath} should not have errors`
	).not.toBe(true);
}

/**
 * Assert phase has been completed
 */
export function assertPhaseCompleted(
	state: CodeGenState | null,
	phaseName: string
): void {
	expect(state, 'State should exist').toBeDefined();
	expect(state!.generatedPhases, 'Generated phases should exist').toBeDefined();

	const phase = state!.generatedPhases!.find(p => p.name === phaseName);
	expect(phase, `Phase "${phaseName}" should exist`).toBeDefined();
	expect(phase!.completed, `Phase "${phaseName}" should be completed`).toBe(true);
}

/**
 * Assert state is in specific dev state
 */
export function assertDevState(
	state: CodeGenState | null,
	expectedState: string
): void {
	expect(state, 'State should exist').toBeDefined();
	expect(
		state!.currentDevState,
		`Current dev state should be ${expectedState}`
	).toBe(expectedState);
}

/**
 * Assert MVP has been generated
 */
export function assertMvpGenerated(state: CodeGenState | null): void {
	expect(state, 'State should exist').toBeDefined();
	expect(state!.mvpGenerated, 'MVP should be generated').toBe(true);
}

/**
 * Assert sandbox instance exists
 */
export function assertHasSandboxInstance(state: CodeGenState | null): void {
	expect(state, 'State should exist').toBeDefined();
	expect(state!.sandboxInstanceId, 'Sandbox instance ID should exist').toBeDefined();
	expect(
		state!.sandboxInstanceId,
		'Sandbox instance ID should not be empty'
	).not.toBe('');
}

/**
 * Assert preview URL is valid and accessible
 */
export async function assertPreviewUrlAccessible(
	previewUrl: string,
	timeout: number = 30000
): Promise<void> {
	expect(previewUrl, 'Preview URL should exist').toBeDefined();
	expect(previewUrl, 'Preview URL should be a valid URL').toMatch(/^https?:\/\//);

	const startTime = Date.now();
	let lastError: Error | null = null;

	while (Date.now() - startTime < timeout) {
		try {
			const response = await fetch(previewUrl, {
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				},
			});

			if (response.ok) {
				return; // Success
			}

			lastError = new Error(`Preview URL returned ${response.status}`);
		} catch (error) {
			lastError = error as Error;
		}

		// Wait before retry
		await new Promise(resolve => setTimeout(resolve, 2000));
	}

	throw new Error(
		`Preview URL not accessible after ${timeout}ms. Last error: ${lastError?.message}`
	);
}

/**
 * Assert common project files exist
 */
export function assertCommonProjectFiles(state: CodeGenState | null): void {
	expect(state, 'State should exist').toBeDefined();
	expect(state!.generatedFilesMap, 'Generated files map should exist').toBeDefined();

	const files = Object.keys(state!.generatedFilesMap!);

	// Should have package.json
	expect(
		files.some(f => f.endsWith('package.json')),
		'Should have package.json'
	).toBe(true);

	// Should have README
	expect(
		files.some(f => f.toLowerCase().includes('readme')),
		'Should have README file'
	).toBe(true);

	// Should have source files
	expect(
		files.some(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')),
		'Should have source code files'
	).toBe(true);
}

/**
 * Assert files have valid JSON content (for package.json, tsconfig.json, etc)
 */
export function assertValidJson(
	state: CodeGenState | null,
	filePath: string
): void {
	assertFileExists(state, filePath);

	const file = state!.generatedFilesMap![filePath];

	expect(() => {
		JSON.parse(file.fileContents);
	}, `File ${filePath} should contain valid JSON`).not.toThrow();
}

/**
 * Assert no files have errors
 */
export function assertNoFileErrors(state: CodeGenState | null): void {
	expect(state, 'State should exist').toBeDefined();
	expect(state!.generatedFilesMap, 'Generated files map should exist').toBeDefined();

	const filesWithErrors = Object.entries(state!.generatedFilesMap!)
		.filter(([_, file]) => file.hasErrors)
		.map(([path]) => path);

	expect(
		filesWithErrors.length,
		`Found files with errors: ${filesWithErrors.join(', ')}`
	).toBe(0);
}

/**
 * Assert WebSocket message received
 */
export function assertMessageReceived(
	messages: Array<{ type: string }>,
	messageType: string
): void {
	const found = messages.some(msg => msg.type === messageType);
	expect(found, `Should have received message type: ${messageType}`).toBe(true);
}

/**
 * Assert message sequence (ordered)
 */
export function assertMessageSequence(
	messages: Array<{ type: string }>,
	expectedSequence: string[]
): void {
	const types = messages.map(msg => msg.type);

	for (let i = 0; i < expectedSequence.length; i++) {
		const expectedType = expectedSequence[i];
		const foundIndex = types.indexOf(expectedType, i > 0 ? types.indexOf(expectedSequence[i - 1]) : 0);

		expect(
			foundIndex,
			`Expected message "${expectedType}" should appear in sequence`
		).toBeGreaterThanOrEqual(0);

		if (i > 0) {
			const previousIndex = types.indexOf(expectedSequence[i - 1]);
			expect(
				foundIndex,
				`Message "${expectedType}" should come after "${expectedSequence[i - 1]}"`
			).toBeGreaterThan(previousIndex);
		}
	}
}

/**
 * Assert minimum message count
 */
export function assertMinMessageCount(
	messages: unknown[],
	minCount: number,
	description: string = 'messages'
): void {
	expect(
		messages.length,
		`Should have at least ${minCount} ${description}, but got ${messages.length}`
	).toBeGreaterThanOrEqual(minCount);
}
