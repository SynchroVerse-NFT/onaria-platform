/**
 * Main Authentication Service
 * Orchestrates all auth operations including login, registration, and OAuth
 */

import * as schema from '../schema';
import { eq, and, sql, or, lt, isNull } from 'drizzle-orm';
import { JWTUtils } from '../../utils/jwtUtils';
import { generateSecureToken } from '../../utils/cryptoUtils';
import { SessionService } from './SessionService';
import { PasswordService } from '../../utils/passwordService';
import { GoogleOAuthProvider } from '../../services/oauth/google';
import { GitHubOAuthProvider } from '../../services/oauth/github';
import { BaseOAuthProvider } from '../../services/oauth/base';
import {
    SecurityError,
    SecurityErrorType
} from 'shared/types/errors';
import { AuthResult, AuthUserSession } from '../../types/auth-types';
import { generateId } from '../../utils/idGenerator';
import {
    AuthUser,
    OAuthProvider
} from '../../types/auth-types';
import { mapUserResponse } from '../../utils/authUtils';
import { createLogger } from '../../logger';
import { validateEmail, validatePassword } from '../../utils/validationUtils';
import { extractRequestMetadata } from '../../utils/authUtils';
import { BaseService } from './BaseService';

const logger = createLogger('AuthService');

/**
 * Login credentials
 */
export interface LoginCredentials {
    email: string;
    password: string;
}

/**
 * Registration data
 */
export interface RegistrationData {
    email: string;
    password: string;
    name?: string;
}


/**
 * Main Authentication Service
 */
export class AuthService extends BaseService {
    private readonly sessionService: SessionService;
    private readonly passwordService: PasswordService;
    private readonly jwtUtils: JWTUtils;

    constructor(
        env: Env,
    ) {
        super(env);
        this.sessionService = new SessionService(env);
        this.passwordService = new PasswordService();
        this.jwtUtils = JWTUtils.getInstance(env);
    }
    
    /**
     * Register a new user
     *
     * Uses transaction to ensure atomic user creation + session creation.
     * Rollback occurs if either operation fails, preventing orphaned users without sessions.
     *
     * Transaction boundaries:
     * - User creation (users table)
     * - Session creation (sessions table)
     * - Auth attempt logging (auth_attempts table)
     */
    async register(data: RegistrationData, request: Request): Promise<AuthResult> {
        try {
            // Validate email format using centralized utility
            const emailValidation = validateEmail(data.email);
            if (!emailValidation.valid) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    emailValidation.error || 'Invalid email format',
                    400
                );
            }

            // Validate password using centralized utility
            const passwordValidation = validatePassword(data.password, undefined, {
                email: data.email,
                name: data.name
            });
            if (!passwordValidation.valid) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    passwordValidation.errors!.join(', '),
                    400
                );
            }

            // Check if user already exists (outside transaction for performance)
            const existingUser = await this.database
                .select()
                .from(schema.users)
                .where(eq(schema.users.email, data.email.toLowerCase()))
                .get();

            if (existingUser) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    'Email already registered',
                    400
                );
            }

            // Hash password (outside transaction - CPU intensive)
            const passwordHash = await this.passwordService.hash(data.password);

            // Prepare IDs and data
            const userId = generateId();
            const sessionId = generateId();
            const now = new Date();
            const userEmail = data.email.toLowerCase();

            // Generate tokens (outside transaction)
            const { accessToken } = await this.jwtUtils.createAccessToken(
                userId,
                userEmail,
                sessionId
            );
            const accessTokenHash = await this.jwtUtils.hashToken(accessToken);
            const requestMetadata = extractRequestMetadata(request);
            const deviceInfo = requestMetadata.userAgent;
            const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

            // Execute atomic transaction: user + session + auth log
            const result = await this.database.transaction(async (tx) => {
                // 1. Create user
                await tx.insert(schema.users).values({
                    id: userId,
                    email: userEmail,
                    passwordHash,
                    displayName: data.name || data.email.split('@')[0],
                    emailVerified: true,
                    provider: 'email',
                    providerId: userId,
                    createdAt: now,
                    updatedAt: now
                });

                // 2. Create session
                await tx.insert(schema.sessions).values({
                    id: sessionId,
                    userId,
                    accessTokenHash,
                    refreshTokenHash: '',
                    expiresAt,
                    lastActivity: now,
                    ipAddress: requestMetadata.ipAddress,
                    userAgent: requestMetadata.userAgent,
                    deviceInfo,
                    createdAt: now
                });

                // 3. Log auth attempt
                await tx.insert(schema.authAttempts).values({
                    identifier: userEmail,
                    attemptType: 'register',
                    success: true,
                    ipAddress: requestMetadata.ipAddress
                });

                // 4. Retrieve created user
                const newUser = await tx
                    .select()
                    .from(schema.users)
                    .where(eq(schema.users.id, userId))
                    .get();

                if (!newUser) {
                    throw new SecurityError(
                        SecurityErrorType.INVALID_INPUT,
                        'Failed to retrieve created user',
                        500
                    );
                }

                return newUser;
            });

            logger.info('User registered and logged in directly', { userId, email: data.email });

            return {
                user: mapUserResponse(result),
                sessionId: sessionId,
                expiresAt: expiresAt,
                accessToken,
            };
        } catch (error) {
            // Log failed attempt outside transaction (non-critical)
            await this.logAuthAttempt(data.email, 'register', false, request).catch(() => {});

            if (error instanceof SecurityError) {
                throw error;
            }

            logger.error('Registration error', error);
            throw new SecurityError(
                SecurityErrorType.INVALID_INPUT,
                'Registration failed',
                500
            );
        }
    }
    
    /**
     * Get lockout configuration based on subscription tier
     */
    private getLockoutConfig(subscriptionTier: string = 'free'): { threshold: number; durationMs: number } {
        const configs: Record<string, { threshold: number; durationMs: number }> = {
            free: { threshold: 5, durationMs: 30 * 60 * 1000 }, // 5 attempts, 30 min
            basic: { threshold: 10, durationMs: 15 * 60 * 1000 }, // 10 attempts, 15 min
            pro: { threshold: 15, durationMs: 10 * 60 * 1000 }, // 15 attempts, 10 min
            enterprise: { threshold: 20, durationMs: 5 * 60 * 1000 } // 20 attempts, 5 min
        };

        return configs[subscriptionTier] || configs.free;
    }

    /**
     * Login with email and password
     */
    async login(credentials: LoginCredentials, request: Request): Promise<AuthResult> {
        try {
            // Find user
            const user = await this.database
                .select()
                .from(schema.users)
                .where(
                    and(
                        eq(schema.users.email, credentials.email.toLowerCase()),
                        sql`${schema.users.deletedAt} IS NULL`
                    )
                )
                .get();

            if (!user || !user.passwordHash) {
                await this.logAuthAttempt(credentials.email, 'login', false, request);
                throw new SecurityError(
                    SecurityErrorType.UNAUTHORIZED,
                    'Invalid email or password',
                    401
                );
            }

            // Check if account is locked
            if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
                const minutesRemaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
                logger.warn('Login attempt on locked account', {
                    userId: user.id,
                    email: user.email,
                    lockedUntil: user.lockedUntil,
                    minutesRemaining
                });

                throw new SecurityError(
                    SecurityErrorType.UNAUTHORIZED,
                    `Account locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
                    401
                );
            }

            // Verify password
            const passwordValid = await this.passwordService.verify(
                credentials.password,
                user.passwordHash
            );

            if (!passwordValid) {
                await this.logAuthAttempt(credentials.email, 'login', false, request);

                // Increment failed login attempts and check for lockout
                const lockoutConfig = this.getLockoutConfig(user.subscriptionTier || 'free');
                const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;

                if (newFailedAttempts >= lockoutConfig.threshold) {
                    // Lock the account
                    const lockedUntil = new Date(Date.now() + lockoutConfig.durationMs);

                    await this.database
                        .update(schema.users)
                        .set({
                            failedLoginAttempts: newFailedAttempts,
                            lockedUntil,
                            updatedAt: new Date()
                        })
                        .where(eq(schema.users.id, user.id));

                    logger.warn('Account locked due to failed login attempts', {
                        userId: user.id,
                        email: user.email,
                        attempts: newFailedAttempts,
                        lockedUntil
                    });

                    const lockoutMinutes = Math.ceil(lockoutConfig.durationMs / 60000);
                    throw new SecurityError(
                        SecurityErrorType.UNAUTHORIZED,
                        `Account locked due to too many failed login attempts. Please try again in ${lockoutMinutes} minutes.`,
                        401
                    );
                } else {
                    // Update failed attempts count
                    await this.database
                        .update(schema.users)
                        .set({
                            failedLoginAttempts: newFailedAttempts,
                            updatedAt: new Date()
                        })
                        .where(eq(schema.users.id, user.id));

                    const remainingAttempts = lockoutConfig.threshold - newFailedAttempts;
                    logger.debug('Failed login attempt', {
                        userId: user.id,
                        email: user.email,
                        attempts: newFailedAttempts,
                        remainingAttempts
                    });
                }

                throw new SecurityError(
                    SecurityErrorType.UNAUTHORIZED,
                    'Invalid email or password',
                    401
                );
            }

            // Password is valid - reset failed attempts and unlock account
            await this.database
                .update(schema.users)
                .set({
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    lastActiveAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(schema.users.id, user.id));

            // Create session
            const { accessToken, session } = await this.sessionService.createSession(
                user.id,
                request
            );

            // Log successful attempt
            await this.logAuthAttempt(credentials.email, 'login', true, request);

            logger.info('User logged in', { userId: user.id, email: user.email });

            return {
                user: mapUserResponse(user),
                accessToken,
                sessionId: session.sessionId,
                expiresAt: session.expiresAt,
            };
        } catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }

            logger.error('Login error', error);
            throw new SecurityError(
                SecurityErrorType.UNAUTHORIZED,
                'Login failed',
                500
            );
        }
    }
    
    /**
     * Logout
     */
    async logout(sessionId: string): Promise<void> {
        try {
            await this.sessionService.revokeSessionId(sessionId);
            logger.info('User logged out', { sessionId });
        } catch (error) {
            logger.error('Logout error', error);
            throw new SecurityError(
                SecurityErrorType.UNAUTHORIZED,
                'Logout failed',
                500
            );
        }
    }

    async getOauthProvider(provider: OAuthProvider, request: Request): Promise<BaseOAuthProvider> {
        const url = new URL(request.url).origin;
        
        switch (provider) {
            case 'google':
                return GoogleOAuthProvider.create(this.env, url);
            case 'github':
                return GitHubOAuthProvider.create(this.env, url);
            default:
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    `OAuth provider ${provider} not configured`,
                    400
                );
        }
    }
    
    /**
     * Get OAuth authorization URL
     */
    async getOAuthAuthorizationUrl(
        provider: OAuthProvider,
        request: Request,
        intendedRedirectUrl?: string
    ): Promise<string> {
        const oauthProvider = await this.getOauthProvider(provider, request);
        if (!oauthProvider) {
            throw new SecurityError(
                SecurityErrorType.INVALID_INPUT,
                `OAuth provider ${provider} not configured`,
                400
            );
        }
        
        // Clean up expired OAuth states first
        await this.cleanupExpiredOAuthStates();
        
        // Validate and sanitize intended redirect URL
        let validatedRedirectUrl: string | null = null;
        if (intendedRedirectUrl) {
            validatedRedirectUrl = this.validateRedirectUrl(intendedRedirectUrl, request);
        }
        
        // Generate state for CSRF protection
        const state = generateSecureToken();
        
        // Generate PKCE code verifier
        const codeVerifier = BaseOAuthProvider.generateCodeVerifier();
        
        // Store OAuth state with intended redirect URL
        await this.database.insert(schema.oauthStates).values({
            id: generateId(),
            state,
            provider,
            codeVerifier,
            redirectUri: validatedRedirectUrl || oauthProvider['redirectUri'],
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 600000), // 10 minutes
            isUsed: false,
            scopes: [],
            userId: null,
            nonce: null
        });
        
        // Get authorization URL
        const authUrl = await oauthProvider.getAuthorizationUrl(state, codeVerifier);
        
        logger.info('OAuth authorization initiated', { provider });
        
        return authUrl;
    }
    
    /**
     * Clean up expired OAuth states
     */
    private async cleanupExpiredOAuthStates(): Promise<void> {
        try {
            const now = new Date();
            await this.database
                .delete(schema.oauthStates)
                .where(
                    or(
                        lt(schema.oauthStates.expiresAt, now),
                        eq(schema.oauthStates.isUsed, true)
                    )
                );
            
            logger.debug('Cleaned up expired OAuth states');
        } catch (error) {
            logger.error('Error cleaning up OAuth states', error);
        }
    }
    
    /**
     * Handle OAuth callback
     *
     * Uses transaction to ensure atomic state update + user creation/update + session creation.
     * Rollback occurs if any operation fails, preventing OAuth state marked as used without user/session.
     *
     * Transaction boundaries:
     * - OAuth state update (oauth_states table)
     * - User creation/update (users table)
     * - Session creation (sessions table)
     * - Auth attempt logging (auth_attempts table)
     */
    async handleOAuthCallback(
        provider: OAuthProvider,
        code: string,
        state: string,
        request: Request
    ): Promise<AuthResult> {
        try {
            const oauthProvider = await this.getOauthProvider(provider, request);
            if (!oauthProvider) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    `OAuth provider ${provider} not configured`,
                    400
                );
            }

            // Verify state (outside transaction for performance)
            const now = new Date();
            const oauthState = await this.database
                .select()
                .from(schema.oauthStates)
                .where(
                    and(
                        eq(schema.oauthStates.state, state),
                        eq(schema.oauthStates.provider, provider),
                        eq(schema.oauthStates.isUsed, false)
                    )
                )
                .get();

            if (!oauthState || new Date(oauthState.expiresAt) < now) {
                throw new SecurityError(
                    SecurityErrorType.CSRF_VIOLATION,
                    'Invalid or expired OAuth state',
                    400
                );
            }

            // Exchange code for tokens (outside transaction - external API call)
            const tokens = await oauthProvider.exchangeCodeForTokens(
                code,
                oauthState.codeVerifier || undefined
            );

            // Get user info (outside transaction - external API call)
            const oauthUserInfo = await oauthProvider.getUserInfo(tokens.accessToken);

            // Prepare session data
            const sessionId = generateId();
            const { accessToken: sessionAccessToken } = await this.jwtUtils.createAccessToken(
                '', // userId will be set after user creation
                oauthUserInfo.email,
                sessionId
            );
            const accessTokenHash = await this.jwtUtils.hashToken(sessionAccessToken);
            const requestMetadata = extractRequestMetadata(request);
            const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

            // Execute atomic transaction: OAuth state + user + session + auth log
            const result = await this.database.transaction(async (tx) => {
                // 1. Mark OAuth state as used
                await tx
                    .update(schema.oauthStates)
                    .set({ isUsed: true })
                    .where(eq(schema.oauthStates.id, oauthState.id));

                // 2. Find or create OAuth user
                let user = await tx
                    .select()
                    .from(schema.users)
                    .where(eq(schema.users.email, oauthUserInfo.email.toLowerCase()))
                    .get();

                if (!user) {
                    // Create new user
                    const userId = generateId();
                    const now = new Date();

                    await tx.insert(schema.users).values({
                        id: userId,
                        email: oauthUserInfo.email.toLowerCase(),
                        displayName: oauthUserInfo.name || oauthUserInfo.email.split('@')[0],
                        avatarUrl: oauthUserInfo.picture,
                        emailVerified: oauthUserInfo.emailVerified || false,
                        provider: provider,
                        providerId: oauthUserInfo.id,
                        createdAt: now,
                        updatedAt: now
                    });

                    user = await tx
                        .select()
                        .from(schema.users)
                        .where(eq(schema.users.id, userId))
                        .get();
                } else {
                    // Update existing user with OAuth info
                    await tx
                        .update(schema.users)
                        .set({
                            displayName: oauthUserInfo.name || user.displayName,
                            avatarUrl: oauthUserInfo.picture || user.avatarUrl,
                            provider: provider,
                            providerId: oauthUserInfo.id,
                            emailVerified: oauthUserInfo.emailVerified || user.emailVerified,
                            updatedAt: new Date()
                        })
                        .where(eq(schema.users.id, user.id));

                    // Refresh user data
                    user = await tx
                        .select()
                        .from(schema.users)
                        .where(eq(schema.users.id, user.id))
                        .get();
                }

                if (!user) {
                    throw new SecurityError(
                        SecurityErrorType.UNAUTHORIZED,
                        'Failed to create or update OAuth user',
                        500
                    );
                }

                // 3. Create session
                await tx.insert(schema.sessions).values({
                    id: sessionId,
                    userId: user.id,
                    accessTokenHash,
                    refreshTokenHash: '',
                    expiresAt,
                    lastActivity: new Date(),
                    ipAddress: requestMetadata.ipAddress,
                    userAgent: requestMetadata.userAgent,
                    deviceInfo: requestMetadata.userAgent,
                    createdAt: new Date()
                });

                // 4. Log auth attempt
                await tx.insert(schema.authAttempts).values({
                    identifier: user.email,
                    attemptType: `oauth_${provider}` as 'oauth_google' | 'oauth_github',
                    success: true,
                    ipAddress: requestMetadata.ipAddress
                });

                return user;
            });

            logger.info('OAuth login successful', { userId: result.id, provider });

            return {
                user: mapUserResponse(result),
                accessToken: sessionAccessToken,
                sessionId: sessionId,
                expiresAt: expiresAt,
                redirectUrl: oauthState.redirectUri || undefined
            };
        } catch (error) {
            // Log failed attempt outside transaction (non-critical)
            await this.logAuthAttempt('', `oauth_${provider}`, false, request).catch(() => {});

            if (error instanceof SecurityError) {
                throw error;
            }

            logger.error('OAuth callback error', error);
            throw new SecurityError(
                SecurityErrorType.UNAUTHORIZED,
                'OAuth authentication failed',
                500
            );
        }
    }
    
    /**
     * Log authentication attempt
     */
    private async logAuthAttempt(
        identifier: string,
        attemptType: string,
        success: boolean,
        request: Request
    ): Promise<void> {
        try {
            const requestMetadata = extractRequestMetadata(request);
            
            await this.database.insert(schema.authAttempts).values({
                identifier: identifier.toLowerCase(),
                attemptType: attemptType as 'login' | 'register' | 'oauth_google' | 'oauth_github' | 'refresh' | 'reset_password',
                success: success,
                ipAddress: requestMetadata.ipAddress
            });
        } catch (error) {
            logger.error('Failed to log auth attempt', error);
        }
    }
    
    /**
     * Validate and sanitize redirect URL to prevent open redirect attacks
     */
    private validateRedirectUrl(redirectUrl: string, request: Request): string | null {
        try {
            const requestUrl = new URL(request.url);
            
            // Handle relative URLs by constructing absolute URL with same origin
            const redirectUrlObj = redirectUrl.startsWith('/') 
                ? new URL(redirectUrl, requestUrl.origin)
                : new URL(redirectUrl);
            
            // Only allow same-origin redirects for security
            if (redirectUrlObj.origin !== requestUrl.origin) {
                logger.warn('OAuth redirect URL rejected: different origin', {
                    redirectUrl: redirectUrl,
                    requestOrigin: requestUrl.origin,
                    redirectOrigin: redirectUrlObj.origin
                });
                return null;
            }
            
            // Prevent redirecting to authentication endpoints to avoid loops
            const authPaths = ['/api/auth/', '/logout'];
            if (authPaths.some(path => redirectUrlObj.pathname.startsWith(path))) {
                logger.warn('OAuth redirect URL rejected: auth endpoint', {
                    redirectUrl: redirectUrl,
                    pathname: redirectUrlObj.pathname
                });
                return null;
            }
            
            return redirectUrl;
        } catch (error) {
            logger.warn('Invalid OAuth redirect URL format', { redirectUrl, error });
            return null;
        }
    }

    /**
     * Generate and store verification OTP for email
     */
    private async generateAndStoreVerificationOtp(email: string): Promise<void> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

        // Store OTP in database (you may need to create a verification_otps table)
        await this.database.insert(schema.verificationOtps).values({
            id: generateId(),
            email: email.toLowerCase(),
            otp: await this.passwordService.hash(otp), // Hash the OTP for security
            expiresAt,
            createdAt: new Date()
        });

        // TODO: Send email with OTP (integrate with email service)
        logger.info('Verification OTP generated', { email, otp: otp.slice(0, 2) + '****' });
    }

    /**
     * Verify email with OTP
     */
    async verifyEmailWithOtp(email: string, otp: string, request: Request): Promise<AuthResult> {
        try {
            // Find valid OTP
            const storedOtp = await this.database
                .select()
                .from(schema.verificationOtps)
                .where(
                    and(
                        eq(schema.verificationOtps.email, email.toLowerCase()),
                        eq(schema.verificationOtps.used, false),
                        sql`${schema.verificationOtps.expiresAt} > ${new Date()}`
                    )
                )
                .orderBy(sql`${schema.verificationOtps.createdAt} DESC`)
                .get();

            if (!storedOtp) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    'Invalid or expired verification code',
                    400
                );
            }

            // Verify OTP
            const otpValid = await this.passwordService.verify(otp, storedOtp.otp);
            if (!otpValid) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    'Invalid verification code',
                    400
                );
            }

            // Mark OTP as used
            await this.database
                .update(schema.verificationOtps)
                .set({ used: true, usedAt: new Date() })
                .where(eq(schema.verificationOtps.id, storedOtp.id));

            // Find and verify the user
            const user = await this.database
                .select()
                .from(schema.users)
                .where(eq(schema.users.email, email.toLowerCase()))
                .get();

            if (!user) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    'User not found',
                    404
                );
            }

            // Update user as verified
            await this.database
                .update(schema.users)
                .set({ emailVerified: true, updatedAt: new Date() })
                .where(eq(schema.users.id, user.id));

            // Create session for verified user
            const { accessToken, session } = await this.sessionService.createSession(
                user.id,
                request
            );

            // Log successful verification
            await this.logAuthAttempt(email, 'email_verification', true, request);
            logger.info('Email verified successfully', { email, userId: user.id });

            return {
                user: mapUserResponse({ ...user, emailVerified: true }),
                accessToken,
                sessionId: session.sessionId,
                expiresAt: session.expiresAt,
            };
        } catch (error) {
            await this.logAuthAttempt(email, 'email_verification', false, request);
            
            if (error instanceof SecurityError) {
                throw error;
            }
            
            logger.error('Email verification error', error);
            throw new SecurityError(
                SecurityErrorType.INVALID_INPUT,
                'Email verification failed',
                500
            );
        }
    }

    /**
     * Get user for authentication (for middleware)
     */
    async getUserForAuth(userId: string): Promise<AuthUser | null> {
        try {
            const user = await this.database
                .select({
                    id: schema.users.id,
                    email: schema.users.email,
                    displayName: schema.users.displayName,
                    username: schema.users.username,
                    avatarUrl: schema.users.avatarUrl,
                    bio: schema.users.bio,
                    timezone: schema.users.timezone,
                    provider: schema.users.provider,
                    emailVerified: schema.users.emailVerified,
                    createdAt: schema.users.createdAt,
                })
                .from(schema.users)
                .where(
                    and(
                        eq(schema.users.id, userId),
                        isNull(schema.users.deletedAt)
                    )
                )
                .get()
                .catch((error: unknown) => {
                    logger.error('getUserForAuth query failed', {
                        errorMessage: error instanceof Error ? error.message : String(error),
                        errorName: error instanceof Error ? error.name : 'UnknownError',
                        errorCause: (error as any)?.cause,
                        errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
                        userId
                    });
                    throw error;
                });
            
            if (!user) {
                logger.debug('User not found for auth', { userId });
                return null;
            }
            
            return mapUserResponse(user);
        } catch (error: unknown) {
            logger.error('Error getting user for auth', {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.name : 'UnknownError',
                errorCause: (error as any)?.cause,
                userId
            });
            return null;
        }
    }
    
    /**
     * Validate token and return user (for middleware)
     */
    async validateTokenAndGetUser(token: string, env: Env): Promise<AuthUserSession | null> {
        try {
            const jwtUtils = JWTUtils.getInstance(env);
            const payload = await jwtUtils.verifyToken(token);
            
            if (!payload || payload.type !== 'access') {
                return null;
            }
            
            // Check if token is expired
            if (payload.exp * 1000 < Date.now()) {
                logger.debug('Token expired', { exp: payload.exp });
                return null;
            }
            
            // Get user from database
            const user = await this.getUserForAuth(payload.sub);
            if (!user) {
                return null;
            }
            
            return {
                user,
                sessionId: payload.sessionId,
            };
        } catch (error) {
            logger.error('Token validation error', error);
            return null;
        }
    }
    
    /**
     * Resend verification OTP
     */
    async resendVerificationOtp(email: string): Promise<void> {
        try {
            // Check if user exists and is unverified
            const user = await this.database
                .select()
                .from(schema.users)
                .where(eq(schema.users.email, email.toLowerCase()))
                .get();

            if (!user) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    'No account found with this email',
                    404
                );
            }

            if (user.emailVerified) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    'Email is already verified',
                    400
                );
            }

            // Invalidate existing OTPs
            await this.database
                .update(schema.verificationOtps)
                .set({ used: true, usedAt: new Date() })
                .where(
                    and(
                        eq(schema.verificationOtps.email, email.toLowerCase()),
                        eq(schema.verificationOtps.used, false)
                    )
                );

            // Generate new OTP
            await this.generateAndStoreVerificationOtp(email.toLowerCase());

            logger.info('Verification OTP resent', { email });
        } catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }

            logger.error('Resend verification OTP error', error);
            throw new SecurityError(
                SecurityErrorType.INVALID_INPUT,
                'Failed to resend verification code',
                500
            );
        }
    }

    /**
     * Request password reset - Generate and store token
     */
    async requestPasswordReset(email: string, request: Request): Promise<{ token: string }> {
        try {
            const normalizedEmail = email.toLowerCase();

            // Find user (don't reveal if user exists - security best practice)
            const user = await this.database
                .select()
                .from(schema.users)
                .where(
                    and(
                        eq(schema.users.email, normalizedEmail),
                        sql`${schema.users.deletedAt} IS NULL`
                    )
                )
                .get();

            // Always return success to prevent email enumeration
            if (!user || user.provider !== 'email') {
                logger.info('Password reset requested for non-existent or OAuth user', { email: normalizedEmail });
                // Generate fake token to maintain consistent timing
                const fakeToken = generateSecureToken();
                return { token: fakeToken };
            }

            // Invalidate any existing reset tokens for this user
            await this.database
                .update(schema.passwordResetTokens)
                .set({ used: true })
                .where(
                    and(
                        eq(schema.passwordResetTokens.userId, user.id),
                        eq(schema.passwordResetTokens.used, false)
                    )
                );

            // Generate secure reset token
            const resetToken = generateSecureToken();
            const tokenHash = await this.passwordService.hash(resetToken);
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

            // Store token in database
            await this.database.insert(schema.passwordResetTokens).values({
                id: generateId(),
                userId: user.id,
                tokenHash,
                expiresAt,
                used: false,
                createdAt: new Date()
            });

            // Log auth attempt
            await this.logAuthAttempt(normalizedEmail, 'reset_password', true, request);

            logger.info('Password reset token generated', {
                userId: user.id,
                email: normalizedEmail,
                expiresAt
            });

            return { token: resetToken };
        } catch (error) {
            logger.error('Password reset request error', error);

            if (error instanceof SecurityError) {
                throw error;
            }

            throw new SecurityError(
                SecurityErrorType.INVALID_INPUT,
                'Failed to process password reset request',
                500
            );
        }
    }

    /**
     * Confirm password reset - Verify token and update password
     */
    async confirmPasswordReset(token: string, newPassword: string, request: Request): Promise<void> {
        try {
            // Validate new password
            const passwordValidation = validatePassword(newPassword, undefined);
            if (!passwordValidation.valid) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    passwordValidation.errors!.join(', '),
                    400
                );
            }

            // Find all non-expired, unused tokens and verify against provided token
            const now = new Date();
            const allTokens = await this.database
                .select()
                .from(schema.passwordResetTokens)
                .where(
                    and(
                        eq(schema.passwordResetTokens.used, false),
                        sql`${schema.passwordResetTokens.expiresAt} > ${now}`
                    )
                )
                .all();

            let validToken: typeof allTokens[0] | null = null;

            // Check each token hash
            for (const tokenRecord of allTokens) {
                const isValid = await this.passwordService.verify(token, tokenRecord.tokenHash);
                if (isValid) {
                    validToken = tokenRecord;
                    break;
                }
            }

            if (!validToken) {
                logger.warn('Invalid or expired password reset token', { token: token.slice(0, 8) + '...' });
                throw new SecurityError(
                    SecurityErrorType.UNAUTHORIZED,
                    'Invalid or expired reset token',
                    401
                );
            }

            // Get user
            const user = await this.database
                .select()
                .from(schema.users)
                .where(eq(schema.users.id, validToken.userId))
                .get();

            if (!user) {
                throw new SecurityError(
                    SecurityErrorType.INVALID_INPUT,
                    'User not found',
                    404
                );
            }

            // Hash new password
            const passwordHash = await this.passwordService.hash(newPassword);

            // Update password and reset lockout in transaction
            await this.database.transaction(async (tx) => {
                // 1. Update user password and clear lockout
                await tx
                    .update(schema.users)
                    .set({
                        passwordHash,
                        passwordChangedAt: new Date(),
                        failedLoginAttempts: 0,
                        lockedUntil: null,
                        updatedAt: new Date()
                    })
                    .where(eq(schema.users.id, user.id));

                // 2. Mark token as used
                await tx
                    .update(schema.passwordResetTokens)
                    .set({ used: true })
                    .where(eq(schema.passwordResetTokens.id, validToken.id));

                // 3. Invalidate all existing sessions for security
                await tx
                    .update(schema.sessions)
                    .set({
                        isRevoked: true,
                        revokedAt: new Date(),
                        revokedReason: 'Password reset'
                    })
                    .where(eq(schema.sessions.userId, user.id));

                // 4. Log auth attempt
                await tx.insert(schema.authAttempts).values({
                    identifier: user.email,
                    attemptType: 'reset_password',
                    success: true,
                    ipAddress: extractRequestMetadata(request).ipAddress
                });
            });

            logger.info('Password reset successful', {
                userId: user.id,
                email: user.email
            });
        } catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }

            logger.error('Password reset confirmation error', error);
            throw new SecurityError(
                SecurityErrorType.INVALID_INPUT,
                'Failed to reset password',
                500
            );
        }
    }
}