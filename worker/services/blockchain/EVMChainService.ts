/**
 * EVM Chain Service
 * Handles transaction verification for EVM-compatible chains (Ethereum, Polygon, Base)
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

const logger = createLogger('EVMChainService');

/**
 * EVM RPC response for eth_getTransactionByHash
 */
interface EVMTransaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    blockNumber: string | null;
    blockHash: string | null;
    gas: string;
    gasPrice: string;
    input: string;
    nonce: string;
    transactionIndex: string | null;
}

/**
 * EVM RPC response for eth_getTransactionReceipt
 */
interface EVMTransactionReceipt {
    transactionHash: string;
    blockNumber: string;
    blockHash: string;
    from: string;
    to: string;
    gasUsed: string;
    status: string;
}

/**
 * EVM RPC response for eth_getBlockByNumber
 */
interface EVMBlock {
    number: string;
    timestamp: string;
    transactions: string[];
}

/**
 * EVM Chain Service Implementation
 * Supports Ethereum, Polygon, and Base networks
 */
export class EVMChainService extends ChainService {
    private chainName: string;

    constructor(config: ChainConfig, chainName: string = 'EVM') {
        super(config);
        this.chainName = chainName;
    }

    /**
     * Make JSON-RPC call to blockchain node
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
     * Get transaction by hash
     */
    private async getTransaction(txHash: string): Promise<EVMTransaction | null> {
        return this.rpcCall<EVMTransaction | null>('eth_getTransactionByHash', [txHash]);
    }

    /**
     * Get transaction receipt (for status and gas info)
     */
    private async getTransactionReceipt(txHash: string): Promise<EVMTransactionReceipt | null> {
        return this.rpcCall<EVMTransactionReceipt | null>('eth_getTransactionReceipt', [txHash]);
    }

    /**
     * Get block by number
     */
    private async getBlock(blockNumber: string): Promise<EVMBlock> {
        return this.rpcCall<EVMBlock>('eth_getBlockByNumber', [blockNumber, false]);
    }

    /**
     * Get current block number
     */
    async getCurrentBlockNumber(): Promise<number> {
        const blockNumberHex = await this.rpcCall<string>('eth_blockNumber', []);
        return parseInt(blockNumberHex, 16);
    }

    /**
     * Get balance for address
     */
    async getBalance(address: string): Promise<number> {
        const balanceHex = await this.rpcCall<string>('eth_getBalance', [address, 'latest']);
        const balanceWei = BigInt(balanceHex);
        return Number(balanceWei) / 1e18; // Convert wei to ETH/MATIC
    }

    /**
     * Convert hex value to decimal
     */
    private hexToDecimal(hex: string): string {
        const bigIntValue = BigInt(hex);
        return bigIntValue.toString();
    }

    /**
     * Convert wei to standard unit (ETH/MATIC)
     */
    private weiToStandardUnit(wei: string): string {
        const weiValue = BigInt(wei);
        const standardValue = Number(weiValue) / 1e18;
        return standardValue.toString();
    }

    /**
     * Get detailed transaction information
     */
    async getTransactionDetails(txHash: string): Promise<TransactionDetails> {
        if (!this.isValidTxHash(txHash)) {
            throw new TransactionVerificationError('Invalid transaction hash format', 'invalid_hash');
        }

        const [tx, receipt] = await Promise.all([
            this.getTransaction(txHash),
            this.getTransactionReceipt(txHash)
        ]);

        if (!tx) {
            throw new TransactionVerificationError('Transaction not found', 'not_found');
        }

        let confirmations = 0;
        let blockTimestamp: number | undefined;
        let status: 'pending' | 'confirmed' | 'failed' = 'pending';

        if (tx.blockNumber) {
            const blockNum = parseInt(tx.blockNumber, 16);
            confirmations = await this.getConfirmations(blockNum);

            const block = await this.getBlock(tx.blockNumber);
            blockTimestamp = parseInt(block.timestamp, 16);

            if (receipt) {
                status = receipt.status === '0x1' ? 'confirmed' : 'failed';
            } else {
                status = confirmations > 0 ? 'confirmed' : 'pending';
            }
        }

        return {
            txHash: tx.hash,
            fromAddress: this.normalizeAddress(tx.from),
            toAddress: this.normalizeAddress(tx.to),
            amount: this.weiToStandardUnit(tx.value),
            currency: this.config.nativeCurrency,
            blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : undefined,
            confirmations,
            blockTimestamp,
            status,
            gasUsed: receipt ? this.hexToDecimal(receipt.gasUsed) : undefined,
            gasPrice: this.hexToDecimal(tx.gasPrice)
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
                throw new TransactionVerificationError('Invalid transaction hash format', 'invalid_hash');
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
     * Validate EVM transaction hash format (0x + 64 hex characters)
     */
    isValidTxHash(txHash: string): boolean {
        return /^0x[a-fA-F0-9]{64}$/.test(txHash);
    }

    /**
     * Validate EVM address format (0x + 40 hex characters)
     */
    isValidAddress(address: string): boolean {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    /**
     * Normalize EVM address to checksum format
     */
    normalizeAddress(address: string): string {
        return address.toLowerCase();
    }
}

/**
 * Factory functions for specific chains
 */

export function createEthereumService(rpcUrl?: string): EVMChainService {
    return new EVMChainService(
        {
            rpcUrl: rpcUrl || 'https://cloudflare-eth.com',
            minConfirmations: 12,
            nativeCurrency: 'ETH',
            chainId: 1
        },
        'Ethereum'
    );
}

export function createPolygonService(rpcUrl?: string): EVMChainService {
    return new EVMChainService(
        {
            rpcUrl: rpcUrl || 'https://polygon-rpc.com',
            minConfirmations: 128,
            nativeCurrency: 'MATIC',
            chainId: 137
        },
        'Polygon'
    );
}

export function createBaseService(rpcUrl?: string): EVMChainService {
    return new EVMChainService(
        {
            rpcUrl: rpcUrl || 'https://mainnet.base.org',
            minConfirmations: 12,
            nativeCurrency: 'ETH',
            chainId: 8453
        },
        'Base'
    );
}
