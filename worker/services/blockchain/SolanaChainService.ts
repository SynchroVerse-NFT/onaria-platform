/**
 * Solana Chain Service
 * Handles transaction verification for Solana blockchain
 */

import {
    ChainService,
    TransactionVerification,
    TransactionDetails,
    RpcError,
    TransactionVerificationError,
    ChainConfig
} from './ChainService';
import { createLogger } from '../../logger';

const logger = createLogger('SolanaChainService');

/**
 * Solana transaction metadata
 */
interface SolanaTransactionMeta {
    err: unknown | null;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: unknown[];
    postTokenBalances?: unknown[];
}

/**
 * Solana transaction instruction
 */
interface SolanaInstruction {
    programId: string;
    accounts: number[];
    data: string;
}

/**
 * Solana transaction message
 */
interface SolanaTransactionMessage {
    accountKeys: string[];
    instructions: SolanaInstruction[];
    recentBlockhash: string;
}

/**
 * Solana transaction result
 */
interface SolanaTransaction {
    slot: number;
    transaction: {
        message: SolanaTransactionMessage;
        signatures: string[];
    };
    meta: SolanaTransactionMeta | null;
    blockTime: number | null;
}

/**
 * Solana RPC response wrapper
 */
interface SolanaRpcResponse<T> {
    jsonrpc: string;
    result: T;
    id: number;
}

/**
 * Solana Chain Service Implementation
 */
export class SolanaChainService extends ChainService {
    constructor(config: ChainConfig) {
        super(config);
    }

    /**
     * Make JSON-RPC call to Solana node
     */
    private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
        try {
            const response = await fetch(this.config.rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method,
                    params,
                    id: Date.now()
                })
            });

            if (!response.ok) {
                throw new RpcError(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json() as { result?: T; error?: { code: number; message: string; data?: unknown } };

            if (data.error) {
                throw new RpcError(data.error.message, data.error.code, data.error.data);
            }

            if (data.result === undefined) {
                throw new RpcError('No result in RPC response');
            }

            return data.result;
        } catch (error) {
            if (error instanceof RpcError) {
                throw error;
            }
            logger.error(`RPC call failed for ${method}`, { error, params });
            throw new RpcError(`RPC call failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get transaction by signature
     */
    private async getTransaction(signature: string): Promise<SolanaTransaction | null> {
        return this.rpcCall<SolanaTransaction | null>('getTransaction', [
            signature,
            {
                encoding: 'json',
                maxSupportedTransactionVersion: 0
            }
        ]);
    }

    /**
     * Get current slot (block height)
     */
    async getCurrentBlockNumber(): Promise<number> {
        return this.rpcCall<number>('getSlot', []);
    }

    /**
     * Get balance for address
     */
    async getBalance(address: string): Promise<number> {
        const response = await this.rpcCall<{ value: number }>('getBalance', [address]);
        return response.value / 1e9; // Convert lamports to SOL
    }

    /**
     * Convert lamports to SOL
     */
    private lamportsToSol(lamports: number): string {
        return (lamports / 1e9).toString();
    }

    /**
     * Extract transfer amount from transaction
     * For native SOL transfers, calculate from balance changes
     */
    private extractTransferAmount(tx: SolanaTransaction, recipientIndex: number): number {
        if (!tx.meta) {
            return 0;
        }

        const preBalance = tx.meta.preBalances[recipientIndex] || 0;
        const postBalance = tx.meta.postBalances[recipientIndex] || 0;
        return postBalance - preBalance;
    }

    /**
     * Find sender and recipient from transaction
     */
    private extractAddresses(tx: SolanaTransaction): { from: string; to: string; amount: number } {
        const accounts = tx.transaction.message.accountKeys;

        if (!tx.meta || accounts.length < 2) {
            return { from: accounts[0] || '', to: '', amount: 0 };
        }

        const senderIndex = 0;
        let recipientIndex = 1;
        let maxBalanceIncrease = 0;

        for (let i = 1; i < accounts.length; i++) {
            const balanceChange = this.extractTransferAmount(tx, i);
            if (balanceChange > maxBalanceIncrease) {
                maxBalanceIncrease = balanceChange;
                recipientIndex = i;
            }
        }

        return {
            from: accounts[senderIndex],
            to: accounts[recipientIndex],
            amount: maxBalanceIncrease
        };
    }

    /**
     * Get detailed transaction information
     */
    async getTransactionDetails(txHash: string): Promise<TransactionDetails> {
        if (!this.isValidTxHash(txHash)) {
            throw new TransactionVerificationError('Invalid transaction signature format', 'invalid_hash');
        }

        const tx = await this.getTransaction(txHash);

        if (!tx) {
            throw new TransactionVerificationError('Transaction not found', 'not_found');
        }

        const { from, to, amount } = this.extractAddresses(tx);

        const currentSlot = await this.getCurrentBlockNumber();
        const confirmations = Math.max(0, currentSlot - tx.slot + 1);

        let status: 'pending' | 'confirmed' | 'failed' = 'pending';
        if (tx.meta) {
            status = tx.meta.err ? 'failed' : 'confirmed';
        } else if (confirmations > 0) {
            status = 'confirmed';
        }

        return {
            txHash,
            fromAddress: this.normalizeAddress(from),
            toAddress: this.normalizeAddress(to),
            amount: this.lamportsToSol(amount),
            currency: this.config.nativeCurrency,
            blockNumber: tx.slot,
            confirmations,
            blockTimestamp: tx.blockTime || undefined,
            status,
            gasUsed: tx.meta?.fee.toString()
        };
    }

    /**
     * Verify transaction meets all requirements
     */
    async verifyTransaction(
        txHash: string,
        expectedRecipient: string,
        minAmountUsd: number
    ): Promise<TransactionVerification> {
        try {
            if (!this.isValidTxHash(txHash)) {
                throw new TransactionVerificationError('Invalid transaction signature format', 'invalid_hash');
            }

            const details = await this.getTransactionDetails(txHash);

            if (details.status === 'failed') {
                throw new TransactionVerificationError('Transaction failed on blockchain', 'transaction_failed');
            }

            const normalizedRecipient = this.normalizeAddress(expectedRecipient);
            if (details.toAddress.toLowerCase() !== normalizedRecipient.toLowerCase()) {
                throw new TransactionVerificationError(
                    `Wrong recipient. Expected: ${normalizedRecipient}, Got: ${details.toAddress}`,
                    'wrong_recipient'
                );
            }

            if (!this.hasMinimumConfirmations(details.confirmations)) {
                throw new TransactionVerificationError(
                    `Insufficient confirmations. Required: ${this.config.minConfirmations}, Got: ${details.confirmations}`,
                    'insufficient_confirmations'
                );
            }

            return {
                verified: true,
                txHash: details.txHash,
                fromAddress: details.fromAddress,
                toAddress: details.toAddress,
                amount: details.amount,
                currency: details.currency,
                blockNumber: details.blockNumber,
                confirmations: details.confirmations,
                blockTimestamp: details.blockTimestamp
            };
        } catch (error) {
            if (error instanceof TransactionVerificationError) {
                return {
                    verified: false,
                    txHash,
                    fromAddress: '',
                    toAddress: '',
                    amount: '0',
                    currency: this.config.nativeCurrency,
                    confirmations: 0,
                    error: error.message
                };
            }

            logger.error(`Verification failed for ${txHash}`, { error });
            throw error;
        }
    }

    /**
     * Validate Solana transaction signature format (base58, typically 87-88 characters)
     */
    isValidTxHash(txHash: string): boolean {
        return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(txHash);
    }

    /**
     * Validate Solana address format (base58, typically 32-44 characters)
     */
    isValidAddress(address: string): boolean {
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }

    /**
     * Normalize Solana address (no checksum in Solana, return as-is)
     */
    normalizeAddress(address: string): string {
        return address;
    }
}

/**
 * Factory function for Solana service
 */
export function createSolanaService(rpcUrl?: string): SolanaChainService {
    return new SolanaChainService({
        rpcUrl: rpcUrl || 'https://api.mainnet-beta.solana.com',
        minConfirmations: 32,
        nativeCurrency: 'SOL'
    });
}
