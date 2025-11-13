/**
 * Test Fixtures
 * Test data and prompts for consistent testing
 */

export const TEST_CREDENTIALS = {
	email: 'info@synchroverse.io',
	password: 'Synchro2025$$',
};

export const TEST_PROMPTS = {
	simpleTodo: 'Create a simple todo app with React. It should have a list of todos with add, delete, and mark complete functionality.',

	simpleCounter: 'Build a counter app with React. It should have increment, decrement, and reset buttons.',

	weatherApp: 'Create a weather app that shows current weather for a city. Use OpenWeatherMap API. Include temperature, description, and icon.',

	chatApp: 'Build a real-time chat application with React. Users should be able to send messages and see messages from others.',

	noteApp: 'Create a notes taking app with React. Users should be able to create, edit, delete, and search notes.',

	dashboardApp: 'Build an analytics dashboard with React and charts. Show sample data with line charts, bar charts, and stats cards.',

	calculator: 'Create a calculator app with React. It should support basic operations: addition, subtraction, multiplication, and division.',

	timerApp: 'Build a pomodoro timer app with React. It should have 25-minute work sessions and 5-minute breaks.',
};

export const EXPECTED_FILE_PATTERNS = {
	react: {
		packageJson: 'package.json',
		readme: 'README.md',
		indexHtml: 'index.html',
		mainComponent: /App\.(tsx|jsx|ts|js)/,
		viteConfig: 'vite.config.ts',
		tsConfig: 'tsconfig.json',
		minFileCount: 5,
	},

	node: {
		packageJson: 'package.json',
		readme: 'README.md',
		mainFile: /(index|server|app)\.(ts|js)/,
		minFileCount: 3,
	},
};

export const WEBSOCKET_MESSAGE_TYPES = {
	// Connection
	agent_connected: 'agent_connected',
	cf_agent_state: 'cf_agent_state',

	// Generation
	generation_started: 'generation_started',
	phase_generating: 'phase_generating',
	phase_generated: 'phase_generated',
	phase_implementing: 'phase_implementing',
	phase_implemented: 'phase_implemented',
	file_generating: 'file_generating',
	file_chunk_generated: 'file_chunk_generated',
	file_generated: 'file_generated',
	generation_complete: 'generation_complete',

	// Deployment
	deployment_started: 'deployment_started',
	deployment_completed: 'deployment_completed',
	deployment_failed: 'deployment_failed',

	// Code quality
	code_reviewing: 'code_reviewing',
	code_reviewed: 'code_reviewed',
	runtime_error_found: 'runtime_error_found',
	static_analysis_results: 'static_analysis_results',

	// Commands
	command_executing: 'command_executing',
	command_executed: 'command_executed',

	// Conversation
	conversation_response: 'conversation_response',

	// Errors
	error: 'error',
	rate_limit_error: 'rate_limit_error',
};

export const EXPECTED_MESSAGE_SEQUENCES = {
	basicGeneration: [
		'agent_connected',
		'generation_started',
		'phase_generated',
		'phase_implementing',
		'file_generating',
		'file_generated',
		'phase_implemented',
		'generation_complete',
	],

	withDeployment: [
		'agent_connected',
		'generation_started',
		'phase_implemented',
		'deployment_started',
		'deployment_completed',
	],

	withCodeReview: [
		'phase_implemented',
		'code_reviewing',
		'static_analysis_results',
		'code_reviewed',
	],
};

export const MODEL_CONFIG_ACTIONS = [
	'conversationalResponse',
	'blueprint',
	'projectSetup',
	'phaseGeneration',
	'codeGeneration',
	'fileRegeneration',
	'codeReview',
	'templateSelection',
];

export const TIMEOUT_VALUES = {
	auth: 10000,              // 10 seconds
	agentCreation: 30000,     // 30 seconds
	websocketConnect: 10000,  // 10 seconds
	fileGeneration: 60000,    // 1 minute per file
	phaseGeneration: 120000,  // 2 minutes per phase
	fullGeneration: 600000,   // 10 minutes for complete generation
	deployment: 120000,       // 2 minutes for deployment
	previewCheck: 30000,      // 30 seconds for preview accessibility
};

export function createAgentArgs(prompt: string, options: Partial<{
	language: string;
	frameworks: string[];
	selectedTemplate: string;
	agentMode: 'deterministic' | 'smart';
}> = {}) {
	return {
		query: prompt,
		language: options.language || 'typescript',
		frameworks: options.frameworks || ['react', 'vite'],
		selectedTemplate: options.selectedTemplate || 'auto',
		agentMode: options.agentMode || 'smart',
	};
}

export function createConversationMessage(content: string) {
	return {
		type: 'conversation_message',
		role: 'user',
		content,
		timestamp: Date.now(),
	};
}

export const MOCK_RESPONSES = {
	successfulLogin: {
		success: true,
		data: {
			user: {
				id: 'test-user-id',
				email: TEST_CREDENTIALS.email,
				displayName: 'Test User',
			},
			sessionId: 'test-session-id',
		},
	},

	agentConnected: {
		type: 'agent_connected',
		state: {
			projectName: 'test-app',
			templateName: 'react-typescript',
			currentDevState: 'IDLE',
			generatedFilesMap: {},
			generatedPhases: [],
			mvpGenerated: false,
		},
		templateDetails: {
			name: 'react-typescript',
			files: ['package.json', 'vite.config.ts', 'index.html'],
		},
	},

	generationComplete: {
		type: 'generation_complete',
		message: 'Generation complete',
		instanceId: 'test-instance-id',
		previewURL: 'https://test-preview.example.com',
	},
};
