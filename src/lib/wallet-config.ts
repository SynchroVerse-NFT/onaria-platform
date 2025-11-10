/**
 * Wallet Configuration
 * Defines blockchain networks and wallet provider settings
 */

export type ChainType = 'solana' | 'ethereum' | 'polygon' | 'base';

export type WalletType = 'phantom' | 'metamask' | 'coinbase' | null;

export interface ChainConfig {
	name: string;
	displayName: string;
	type: 'solana' | 'evm';
	rpcUrl: string;
	chainId?: number;
	nativeCurrency: {
		name: string;
		symbol: string;
		decimals: number;
	};
	blockExplorer?: string;
}

export const CHAINS: Record<ChainType, ChainConfig> = {
	solana: {
		name: 'solana',
		displayName: 'Solana',
		type: 'solana',
		rpcUrl: 'https://api.mainnet-beta.solana.com',
		nativeCurrency: {
			name: 'Solana',
			symbol: 'SOL',
			decimals: 9,
		},
		blockExplorer: 'https://explorer.solana.com',
	},
	ethereum: {
		name: 'ethereum',
		displayName: 'Ethereum',
		type: 'evm',
		rpcUrl: 'https://eth.llamarpc.com',
		chainId: 1,
		nativeCurrency: {
			name: 'Ether',
			symbol: 'ETH',
			decimals: 18,
		},
		blockExplorer: 'https://etherscan.io',
	},
	polygon: {
		name: 'polygon',
		displayName: 'Polygon',
		type: 'evm',
		rpcUrl: 'https://polygon-rpc.com',
		chainId: 137,
		nativeCurrency: {
			name: 'MATIC',
			symbol: 'MATIC',
			decimals: 18,
		},
		blockExplorer: 'https://polygonscan.com',
	},
	base: {
		name: 'base',
		displayName: 'Base',
		type: 'evm',
		rpcUrl: 'https://mainnet.base.org',
		chainId: 8453,
		nativeCurrency: {
			name: 'Ether',
			symbol: 'ETH',
			decimals: 18,
		},
		blockExplorer: 'https://basescan.org',
	},
};

/**
 * Detect if Phantom wallet is installed
 */
export function isPhantomInstalled(): boolean {
	if (typeof window === 'undefined') return false;
	return 'phantom' in window && window.phantom?.solana?.isPhantom === true;
}

/**
 * Detect if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
	if (typeof window === 'undefined') return false;
	return 'ethereum' in window && window.ethereum?.isMetaMask === true;
}

/**
 * Detect if Coinbase Wallet is installed
 */
export function isCoinbaseInstalled(): boolean {
	if (typeof window === 'undefined') return false;
	return (
		'ethereum' in window &&
		(window.ethereum?.isCoinbaseWallet === true ||
			window.coinbaseSolana !== undefined)
	);
}

/**
 * Get wallet download URL
 */
export function getWalletDownloadUrl(wallet: WalletType): string {
	const urls: Record<NonNullable<WalletType>, string> = {
		phantom: 'https://phantom.app/download',
		metamask: 'https://metamask.io/download',
		coinbase: 'https://www.coinbase.com/wallet/downloads',
	};
	return wallet ? urls[wallet] : '';
}

/**
 * Truncate wallet address for display
 */
export function truncateAddress(address: string, chars = 4): string {
	if (!address) return '';
	if (address.length <= chars * 2) return address;
	return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

/**
 * Format balance for display
 */
export function formatBalance(balance: number, decimals = 4): string {
	if (balance === 0) return '0';
	if (balance < 0.0001) return '< 0.0001';
	return balance.toFixed(decimals);
}

/**
 * Validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
	try {
		return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
	} catch {
		return false;
	}
}

/**
 * Validate EVM address
 */
export function isValidEvmAddress(address: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get chain by chain ID
 */
export function getChainByChainId(chainId: number): ChainType | null {
	const chain = Object.entries(CHAINS).find(
		([, config]) => config.chainId === chainId,
	);
	return chain ? (chain[0] as ChainType) : null;
}

/**
 * Window interface extensions for wallet providers
 */
declare global {
	interface Window {
		phantom?: {
			solana?: {
				isPhantom: boolean;
				connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{
					publicKey: { toString: () => string };
				}>;
				disconnect: () => Promise<void>;
				on: (event: string, callback: (...args: unknown[]) => void) => void;
				off: (event: string, callback: (...args: unknown[]) => void) => void;
				publicKey?: { toString: () => string };
				isConnected: boolean;
				signMessage: (
					message: Uint8Array,
					encoding?: string,
				) => Promise<{ signature: Uint8Array }>;
			};
		};
		ethereum?: {
			isMetaMask?: boolean;
			isCoinbaseWallet?: boolean;
			request: (args: {
				method: string;
				params?: unknown[];
			}) => Promise<unknown>;
			on: (event: string, callback: (...args: unknown[]) => void) => void;
			removeListener: (
				event: string,
				callback: (...args: unknown[]) => void,
			) => void;
			selectedAddress?: string;
			chainId?: string;
		};
		coinbaseSolana?: {
			isConnected: boolean;
			connect: () => Promise<{ publicKey: { toString: () => string } }>;
			disconnect: () => Promise<void>;
			on: (event: string, callback: (...args: unknown[]) => void) => void;
			off: (event: string, callback: (...args: unknown[]) => void) => void;
		};
	}
}
