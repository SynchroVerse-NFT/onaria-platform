/**
 * Chain Service Interface
 * Abstract base for blockchain transaction verification services
 */

/**
 * Supported blockchain networks
 */
export type ChainType = 'ethereum' | 'solana' | 'polygon' | 'base';

/**
 * Supported cryptocurrency tokens
 */
export type CryptoCurrency = 'ETH' | 'SOL' | 'MATIC';

/**
 * Transaction verification result
 */
export interface TransactionVerification {
    verified: boolean;
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    currency: string;
    blockNumber?: number;
    confirmations: number;
    blockTimestamp?: number;
    error?: string;
}

/**
 * Detailed transaction information
 */
export interface TransactionDetails {
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    currency: string;
    blockNumber?: number;
    confirmations: number;
    blockTimestamp?: number;
    status: 'pending' | 'confirmed' | 'failed';
    gasUsed?: string;
    gasPrice?: string;
}

/**
 * Chain-specific RPC configuration
 */
export interface ChainConfig {
    rpcUrl: string;
    minConfirmations: number;
    nativeCurrency: string;
    chainId?: number;
}

/**
 * Abstract base class for blockchain services
 * Provides common interface for all chain implementations
 */
export abstract class ChainService {
    protected config: ChainConfig;

    constructor(config: ChainConfig) {
        this.config = config;
    }

    /**
     * Verify a transaction meets all requirements
     * @param txHash - Transaction hash to verify
     * @param expectedRecipient - Expected recipient address
     * @param minAmountUsd - Minimum expected amount in USD
     * @returns Verification result with transaction details
     */
    abstract verifyTransaction(
        txHash: string,
        expectedRecipient: string,
        minAmountUsd: number
    ): Promise<TransactionVerification>;

    /**
     * Get detailed transaction information
     * @param txHash - Transaction hash
     * @returns Transaction details
     */
    abstract getTransactionDetails(txHash: string): Promise<TransactionDetails>;

    /**
     * Get wallet balance for an address
     * @param address - Wallet address
     * @returns Balance in native currency
     */
    abstract getBalance(address: string): Promise<number>;

    /**
     * Get current block number
     * @returns Current block number
     */
    abstract getCurrentBlockNumber(): Promise<number>;

    /**
     * Calculate confirmations for a transaction
     * @param blockNumber - Transaction block number
     * @returns Number of confirmations
     */
    async getConfirmations(blockNumber: number): Promise<number> {
        const currentBlock = await this.getCurrentBlockNumber();
        return Math.max(0, currentBlock - blockNumber + 1);
    }

    /**
     * Check if transaction has minimum required confirmations
     * @param confirmations - Current confirmations
     * @returns True if meets minimum
     */
    hasMinimumConfirmations(confirmations: number): boolean {
        return confirmations >= this.config.minConfirmations;
    }

    /**
     * Validate transaction hash format
     * @param txHash - Transaction hash to validate
     * @returns True if valid format
     */
    abstract isValidTxHash(txHash: string): boolean;

    /**
     * Validate wallet address format
     * @param address - Address to validate
     * @returns True if valid format
     */
    abstract isValidAddress(address: string): boolean;

    /**
     * Normalize address to standard format
     * @param address - Address to normalize
     * @returns Normalized address
     */
    abstract normalizeAddress(address: string): string;
}

/**
 * RPC error types
 */
export class RpcError extends Error {
    constructor(
        message: string,
        public code?: number,
        public data?: unknown
    ) {
        super(message);
        this.name = 'RpcError';
    }
}

/**
 * Transaction verification error types
 */
export class TransactionVerificationError extends Error {
    constructor(
        message: string,
        public reason: 'not_found' | 'insufficient_confirmations' | 'wrong_recipient' | 'amount_mismatch' | 'already_verified' | 'invalid_hash' | 'transaction_failed' | 'timeout'
    ) {
        super(message);
        this.name = 'TransactionVerificationError';
    }
}
