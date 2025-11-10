/**
 * Chain Factory
 * Creates appropriate blockchain service instances based on chain type
 */

import { ChainService, ChainType } from './ChainService';
import {
    createEthereumService,
    createPolygonService,
    createBaseService
} from './EVMChainService';
import { createSolanaService } from './SolanaChainService';

/**
 * Platform wallet addresses for each chain
 */
export interface PlatformWallets {
    ethereum: string;
    polygon: string;
    base: string;
    solana: string;
}

/**
 * Chain Factory Class
 * Provides centralized access to blockchain services
 */
export class ChainFactory {
    private ethereumService?: ChainService;
    private polygonService?: ChainService;
    private baseService?: ChainService;
    private solanaService?: ChainService;

    constructor(
        private wallets: PlatformWallets,
        private customRpcUrls?: {
            ethereum?: string;
            polygon?: string;
            base?: string;
            solana?: string;
        }
    ) {}

    /**
     * Get blockchain service for specified chain
     * @param chain - Chain type
     * @returns Chain service instance
     */
    getChainService(chain: ChainType): ChainService {
        switch (chain) {
            case 'ethereum':
                if (!this.ethereumService) {
                    this.ethereumService = createEthereumService(this.customRpcUrls?.ethereum);
                }
                return this.ethereumService;

            case 'polygon':
                if (!this.polygonService) {
                    this.polygonService = createPolygonService(this.customRpcUrls?.polygon);
                }
                return this.polygonService;

            case 'base':
                if (!this.baseService) {
                    this.baseService = createBaseService(this.customRpcUrls?.base);
                }
                return this.baseService;

            case 'solana':
                if (!this.solanaService) {
                    this.solanaService = createSolanaService(this.customRpcUrls?.solana);
                }
                return this.solanaService;

            default:
                throw new Error(`Unsupported chain: ${chain}`);
        }
    }

    /**
     * Get platform wallet address for specified chain
     * @param chain - Chain type
     * @returns Platform wallet address
     */
    getPlatformWallet(chain: ChainType): string {
        return this.wallets[chain];
    }

    /**
     * Get native currency for chain
     * @param chain - Chain type
     * @returns Native currency symbol
     */
    getNativeCurrency(chain: ChainType): string {
        switch (chain) {
            case 'ethereum':
            case 'base':
                return 'ETH';
            case 'polygon':
                return 'MATIC';
            case 'solana':
                return 'SOL';
            default:
                throw new Error(`Unknown chain: ${chain}`);
        }
    }

    /**
     * Verify transaction on specified chain
     * @param chain - Chain type
     * @param txHash - Transaction hash
     * @param minAmountUsd - Minimum expected amount in USD
     * @returns Verification result
     */
    async verifyTransaction(chain: ChainType, txHash: string, minAmountUsd: number) {
        const service = this.getChainService(chain);
        const platformWallet = this.getPlatformWallet(chain);
        return service.verifyTransaction(txHash, platformWallet, minAmountUsd);
    }

    /**
     * Get transaction details on specified chain
     * @param chain - Chain type
     * @param txHash - Transaction hash
     * @returns Transaction details
     */
    async getTransactionDetails(chain: ChainType, txHash: string) {
        const service = this.getChainService(chain);
        return service.getTransactionDetails(txHash);
    }

    /**
     * Check if transaction hash format is valid for chain
     * @param chain - Chain type
     * @param txHash - Transaction hash to validate
     * @returns True if valid
     */
    isValidTxHash(chain: ChainType, txHash: string): boolean {
        const service = this.getChainService(chain);
        return service.isValidTxHash(txHash);
    }

    /**
     * Check if address format is valid for chain
     * @param chain - Chain type
     * @param address - Address to validate
     * @returns True if valid
     */
    isValidAddress(chain: ChainType, address: string): boolean {
        const service = this.getChainService(chain);
        return service.isValidAddress(address);
    }
}

/**
 * Create ChainFactory from environment variables
 * @param env - Worker environment
 * @returns ChainFactory instance
 */
export function createChainFactory(env: Env): ChainFactory {
    const wallets: PlatformWallets = {
        ethereum: env.PLATFORM_WALLET_ETH || '',
        polygon: env.PLATFORM_WALLET_POLYGON || '',
        base: env.PLATFORM_WALLET_ETH || '', // Base uses same address as Ethereum (same wallet)
        solana: env.PLATFORM_WALLET_SOL || ''
    };

    const customRpcUrls = {
        ethereum: env.ETHEREUM_RPC_URL,
        polygon: env.POLYGON_RPC_URL,
        base: env.BASE_RPC_URL,
        solana: env.SOLANA_RPC_URL
    };

    return new ChainFactory(wallets, customRpcUrls);
}
