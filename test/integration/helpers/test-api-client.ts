/**
 * Test API Client
 * Wrapper for all API endpoints with authentication, CSRF handling, and session management
 */

export class RateLimitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RateLimitError';
	}
}

interface LoginResponse {
	success: boolean;
	data: {
		user: {
			id: string;
			email: string;
			displayName: string;
		};
		sessionId: string;
	};
}

interface CsrfResponse {
	success: boolean;
	data: {
		token: string;
	};
}

interface AgentCreationArgs {
	query: string;
	language?: string;
	frameworks?: string[];
	selectedTemplate?: string;
	agentMode?: 'deterministic' | 'smart';
}

interface AgentCreationResponse {
	message: string;
	agentId: string;
	websocketUrl: string;
	httpStatusUrl: string;
	template: {
		name: string;
		files: string[];
	};
}

interface PreviewDeployment {
	success: boolean;
	data: {
		previewURL: string;
		tunnelURL?: string;
		instanceId: string;
	};
}

export class TestApiClient {
	private baseUrl: string;
	private cookies: Map<string, string> = new Map(); // Cookie jar
	private csrfToken: string | null = null;
	private verbose: boolean;

	constructor(baseUrl: string = 'https://onaria.xyz', verbose: boolean = false) {
		this.baseUrl = baseUrl;
		this.verbose = verbose;
	}

	private log(message: string, data?: unknown): void {
		if (this.verbose) {
			console.log(`[TestApiClient] ${message}`, data || '');
		}
	}

	private parseCookies(cookieHeader: string): void {
		// Parse Set-Cookie header and store cookies
		const cookies = cookieHeader.split(',').map(c => c.trim());

		for (const cookie of cookies) {
			const parts = cookie.split(';')[0].split('=');
			if (parts.length >= 2) {
				const name = parts[0].trim();
				const value = parts.slice(1).join('=').trim();
				this.cookies.set(name, value);
				this.log(`Stored cookie: ${name}`);
			}
		}

		// Extract CSRF token from csrf-token cookie
		const csrfCookie = this.cookies.get('csrf-token');
		if (csrfCookie) {
			try {
				const decoded = decodeURIComponent(csrfCookie);
				const tokenData = JSON.parse(decoded);
				this.csrfToken = tokenData.token;
			} catch {
				this.csrfToken = csrfCookie;
			}
		}
	}

	private getCookieHeader(): string {
		const cookies: string[] = [];
		for (const [name, value] of this.cookies) {
			cookies.push(`${name}=${value}`);
		}
		return cookies.join('; ');
	}

	/**
	 * Get CSRF token
	 */
	async getCsrfToken(): Promise<string> {
		this.log('Getting CSRF token...');

		const response = await fetch(`${this.baseUrl}/api/auth/csrf-token`, {
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to get CSRF token: ${response.status} ${response.statusText}`);
		}

		const data = (await response.json()) as CsrfResponse;

		if (!data.success) {
			throw new Error('CSRF token request failed');
		}

		// Store cookies from response
		const setCookie = response.headers.get('set-cookie');
		if (setCookie) {
			this.parseCookies(setCookie);
		}

		// CSRF token should now be in this.csrfToken from cookie parsing
		if (!this.csrfToken) {
			this.csrfToken = data.data.token;
		}

		this.log('CSRF token obtained', { token: this.csrfToken?.substring(0, 8) + '...' });
		return this.csrfToken;
	}

	/**
	 * Login and establish session
	 */
	async login(email: string, password: string): Promise<LoginResponse> {
		this.log('Logging in...', { email });

		// Get CSRF token first
		if (!this.csrfToken) {
			await this.getCsrfToken();
		}

		const response = await fetch(`${this.baseUrl}/api/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-Token': this.csrfToken!,
				'Cookie': this.getCookieHeader(),
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				'Accept': 'application/json',
			},
			body: JSON.stringify({ email, password }),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Login failed: ${response.status} ${error}`);
		}

		// Store cookies from response
		const setCookie = response.headers.get('set-cookie');
		if (setCookie) {
			this.parseCookies(setCookie);
		}

		const data = (await response.json()) as LoginResponse;
		this.log('Login successful', { userId: data.data.user.id });

		return data;
	}

	/**
	 * Make authenticated request
	 */
	private async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const headers = new Headers(options.headers);

		// Add all cookies
		const cookieHeader = this.getCookieHeader();
		if (cookieHeader) {
			headers.set('Cookie', cookieHeader);
		}

		// Add CSRF token header for state-changing requests
		if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method) && this.csrfToken) {
			headers.set('X-CSRF-Token', this.csrfToken);
		}

		// Add standard headers
		headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
		headers.set('Accept', 'application/json');

		const url = `${this.baseUrl}${endpoint}`;
		this.log(`${options.method || 'GET'} ${endpoint}`);

		const response = await fetch(url, {
			...options,
			headers,
		});

		// Store cookies from response
		const setCookie = response.headers.get('set-cookie');
		if (setCookie) {
			this.parseCookies(setCookie);
		}

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Request failed: ${response.status} ${error}`);
		}

		return response.json() as Promise<T>;
	}

	/**
	 * Create a new agent and start code generation
	 */
	async createAgent(args: AgentCreationArgs): Promise<AgentCreationResponse> {
		this.log('Creating agent...', args);

		const endpoint = '/api/agent';
		const headers = new Headers({
			'Content-Type': 'application/json',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			'Accept': 'application/x-ndjson',
		});

		// Add all cookies
		const cookieHeader = this.getCookieHeader();
		if (cookieHeader) {
			headers.set('Cookie', cookieHeader);
		}

		// Add CSRF token header
		if (this.csrfToken) {
			headers.set('X-CSRF-Token', this.csrfToken);
		}

		const url = `${this.baseUrl}${endpoint}`;
		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(args),
		});

		if (!response.ok) {
			const error = await response.text();

			// Throw specific error for rate limits
			if (response.status === 429) {
				throw new RateLimitError(`Rate limit exceeded: ${error}`);
			}

			throw new Error(`Agent creation failed: ${response.status} ${error}`);
		}

		// Parse NDJSON stream
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('No response body');
		}

		const decoder = new TextDecoder();
		let buffer = '';
		let agentData: AgentCreationResponse | null = null;

		while (true) {
			const { done, value } = await reader.read();

			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				if (!line.trim()) continue;

				if (line === 'terminate') {
					this.log('Agent creation stream terminated');
					break;
				}

				try {
					const json = JSON.parse(line);

					// First message contains agent details
					if (json.agentId && json.websocketUrl) {
						agentData = json as AgentCreationResponse;
						this.log('Agent created', { agentId: agentData.agentId });
					}
				} catch (error) {
					// Skip malformed lines
					this.log('Skipping malformed line', { line, error });
				}
			}
		}

		if (!agentData) {
			throw new Error('Failed to extract agent data from stream');
		}

		return agentData;
	}

	/**
	 * Deploy preview for an agent
	 */
	async deployPreview(agentId: string): Promise<PreviewDeployment> {
		this.log('Deploying preview...', { agentId });

		return this.makeRequest<PreviewDeployment>(
			`/api/agent/${agentId}/preview`,
			{ method: 'GET' }
		);
	}

	/**
	 * Verify deployment by checking preview URL
	 */
	async verifyDeployment(previewUrl: string, timeout: number = 30000): Promise<boolean> {
		this.log('Verifying deployment...', { previewUrl });

		const startTime = Date.now();
		const retryDelay = 2000;

		while (Date.now() - startTime < timeout) {
			try {
				const response = await fetch(previewUrl, {
					method: 'GET',
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					},
				});

				if (response.ok) {
					this.log('Deployment verified successfully');
					return true;
				}

				this.log(`Deployment check failed: ${response.status}, retrying...`);
			} catch (error) {
				this.log('Deployment check error, retrying...', { error });
			}

			await new Promise(resolve => setTimeout(resolve, retryDelay));
		}

		this.log('Deployment verification timed out');
		return false;
	}

	/**
	 * Get model configurations
	 */
	async getModelConfigs(): Promise<unknown> {
		return this.makeRequest('/api/model-configs', { method: 'GET' });
	}

	/**
	 * Test model configuration
	 */
	async testModelConfig(agentActionName: string, useUserKeys: boolean = false): Promise<unknown> {
		return this.makeRequest('/api/model-configs/test', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ agentActionName, useUserKeys }),
		});
	}

	/**
	 * Get user's apps
	 */
	async getUserApps(): Promise<unknown> {
		return this.makeRequest('/api/apps', { method: 'GET' });
	}

	/**
	 * Logout and clear session
	 */
	async logout(): Promise<void> {
		this.log('Logging out...');

		try {
			await this.makeRequest('/api/auth/logout', { method: 'POST' });
		} catch (error) {
			this.log('Logout error (non-fatal)', { error });
		}

		this.cookies.clear();
		this.csrfToken = null;
		this.log('Session cleared');
	}
}
