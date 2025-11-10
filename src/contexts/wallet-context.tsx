/**
 * Wallet Context
 * Manages wallet connections across the application
 */

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from 'react';
import type { ChainType, WalletType } from '@/lib/wallet-config';
import {
	CHAINS,
	isPhantomInstalled,
	isMetaMaskInstalled,
	isCoinbaseInstalled,
	getChainByChainId,
} from '@/lib/wallet-config';
import { toast } from 'sonner';

interface WalletContextType {
	connectedWallet: WalletType;
	walletAddress: string | null;
	selectedChain: ChainType;
	isConnecting: boolean;
	balance: number | null;
	error: string | null;

	connectPhantom: () => Promise<void>;
	connectMetaMask: () => Promise<void>;
	connectCoinbase: () => Promise<void>;
	disconnect: () => Promise<void>;
	switchChain: (chain: ChainType) => Promise<void>;
	getBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEYS = {
	WALLET: 'wallet_connected',
	ADDRESS: 'wallet_address',
	CHAIN: 'wallet_chain',
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
	const [connectedWallet, setConnectedWallet] = useState<WalletType>(null);
	const [walletAddress, setWalletAddress] = useState<string | null>(null);
	const [selectedChain, setSelectedChain] = useState<ChainType>('ethereum');
	const [isConnecting, setIsConnecting] = useState(false);
	const [balance, setBalance] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Load persisted wallet state from localStorage
	 */
	useEffect(() => {
		try {
			const savedWallet = localStorage.getItem(STORAGE_KEYS.WALLET) as WalletType;
			const savedAddress = localStorage.getItem(STORAGE_KEYS.ADDRESS);
			const savedChain = localStorage.getItem(STORAGE_KEYS.CHAIN) as ChainType;

			if (savedWallet && savedAddress) {
				setConnectedWallet(savedWallet);
				setWalletAddress(savedAddress);
				setSelectedChain(savedChain || 'ethereum');

				// Auto-reconnect if wallet is still available
				if (savedWallet === 'phantom' && isPhantomInstalled()) {
					reconnectPhantom();
				} else if (
					savedWallet === 'metamask' &&
					isMetaMaskInstalled()
				) {
					reconnectMetaMask();
				} else if (
					savedWallet === 'coinbase' &&
					isCoinbaseInstalled()
				) {
					reconnectCoinbase();
				}
			}
		} catch (err) {
			console.error('Failed to load wallet state:', err);
		}
	}, []);

	/**
	 * Save wallet state to localStorage
	 */
	const saveWalletState = useCallback(
		(wallet: WalletType, address: string | null, chain: ChainType) => {
			try {
				if (wallet && address) {
					localStorage.setItem(STORAGE_KEYS.WALLET, wallet);
					localStorage.setItem(STORAGE_KEYS.ADDRESS, address);
					localStorage.setItem(STORAGE_KEYS.CHAIN, chain);
				} else {
					localStorage.removeItem(STORAGE_KEYS.WALLET);
					localStorage.removeItem(STORAGE_KEYS.ADDRESS);
					localStorage.removeItem(STORAGE_KEYS.CHAIN);
				}
			} catch (err) {
				console.error('Failed to save wallet state:', err);
			}
		},
		[],
	);

	/**
	 * Auto-reconnect Phantom wallet
	 */
	const reconnectPhantom = useCallback(async () => {
		try {
			if (!isPhantomInstalled()) return;

			const resp = await window.phantom!.solana!.connect({
				onlyIfTrusted: true,
			});
			const address = resp.publicKey.toString();

			setConnectedWallet('phantom');
			setWalletAddress(address);
			setSelectedChain('solana');
		} catch (err) {
			console.error('Phantom auto-reconnect failed:', err);
		}
	}, []);

	/**
	 * Auto-reconnect MetaMask
	 */
	const reconnectMetaMask = useCallback(async () => {
		try {
			if (!isMetaMaskInstalled()) return;

			const accounts = (await window.ethereum!.request({
				method: 'eth_accounts',
			})) as string[];

			if (accounts.length > 0) {
				setConnectedWallet('metamask');
				setWalletAddress(accounts[0]);

				const chainId = window.ethereum!.chainId;
				if (chainId) {
					const chain =
						getChainByChainId(parseInt(chainId, 16)) || 'ethereum';
					setSelectedChain(chain);
				}
			}
		} catch (err) {
			console.error('MetaMask auto-reconnect failed:', err);
		}
	}, []);

	/**
	 * Auto-reconnect Coinbase Wallet
	 */
	const reconnectCoinbase = useCallback(async () => {
		try {
			if (!isCoinbaseInstalled()) return;

			if (window.coinbaseSolana?.isConnected) {
				setConnectedWallet('coinbase');
				setSelectedChain('solana');
			} else if (window.ethereum?.isCoinbaseWallet) {
				const accounts = (await window.ethereum.request({
					method: 'eth_accounts',
				})) as string[];

				if (accounts.length > 0) {
					setConnectedWallet('coinbase');
					setWalletAddress(accounts[0]);
					setSelectedChain('ethereum');
				}
			}
		} catch (err) {
			console.error('Coinbase auto-reconnect failed:', err);
		}
	}, []);

	/**
	 * Connect Phantom Wallet (Solana)
	 */
	const connectPhantom = useCallback(async () => {
		setIsConnecting(true);
		setError(null);

		try {
			if (!isPhantomInstalled()) {
				setError('Phantom wallet is not installed');
				toast.error('Phantom wallet is not installed', {
					description: 'Please install Phantom to continue',
					action: {
						label: 'Install',
						onClick: () =>
							window.open('https://phantom.app/download', '_blank'),
					},
				});
				return;
			}

			const resp = await window.phantom!.solana!.connect();
			const address = resp.publicKey.toString();

			setConnectedWallet('phantom');
			setWalletAddress(address);
			setSelectedChain('solana');
			saveWalletState('phantom', address, 'solana');

			toast.success('Phantom wallet connected', {
				description: `Connected to ${address.substring(0, 8)}...${address.substring(address.length - 4)}`,
			});

			getBalance();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to connect Phantom';
			setError(message);
			toast.error('Connection failed', { description: message });
		} finally {
			setIsConnecting(false);
		}
	}, [saveWalletState]);

	/**
	 * Connect MetaMask (EVM chains)
	 */
	const connectMetaMask = useCallback(async () => {
		setIsConnecting(true);
		setError(null);

		try {
			if (!isMetaMaskInstalled()) {
				setError('MetaMask is not installed');
				toast.error('MetaMask is not installed', {
					description: 'Please install MetaMask to continue',
					action: {
						label: 'Install',
						onClick: () =>
							window.open('https://metamask.io/download', '_blank'),
					},
				});
				return;
			}

			const accounts = (await window.ethereum!.request({
				method: 'eth_requestAccounts',
			})) as string[];

			if (accounts.length === 0) {
				throw new Error('No accounts found');
			}

			const address = accounts[0];
			const chainId = window.ethereum!.chainId;
			const chain =
				chainId && getChainByChainId(parseInt(chainId, 16))
					? getChainByChainId(parseInt(chainId, 16))!
					: 'ethereum';

			setConnectedWallet('metamask');
			setWalletAddress(address);
			setSelectedChain(chain);
			saveWalletState('metamask', address, chain);

			toast.success('MetaMask connected', {
				description: `Connected to ${address.substring(0, 8)}...${address.substring(address.length - 4)}`,
			});

			getBalance();

			window.ethereum!.on('accountsChanged', handleAccountsChanged);
			window.ethereum!.on('chainChanged', handleChainChanged);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to connect MetaMask';
			setError(message);
			toast.error('Connection failed', { description: message });
		} finally {
			setIsConnecting(false);
		}
	}, [saveWalletState]);

	/**
	 * Connect Coinbase Wallet
	 */
	const connectCoinbase = useCallback(async () => {
		setIsConnecting(true);
		setError(null);

		try {
			if (!isCoinbaseInstalled()) {
				setError('Coinbase Wallet is not installed');
				toast.error('Coinbase Wallet is not installed', {
					description: 'Please install Coinbase Wallet to continue',
					action: {
						label: 'Install',
						onClick: () =>
							window.open(
								'https://www.coinbase.com/wallet/downloads',
								'_blank',
							),
					},
				});
				return;
			}

			// Try Solana first if available
			if (window.coinbaseSolana) {
				const resp = await window.coinbaseSolana.connect();
				const address = resp.publicKey.toString();

				setConnectedWallet('coinbase');
				setWalletAddress(address);
				setSelectedChain('solana');
				saveWalletState('coinbase', address, 'solana');

				toast.success('Coinbase Wallet connected (Solana)');
			}
			// Otherwise use EVM
			else if (window.ethereum?.isCoinbaseWallet) {
				const accounts = (await window.ethereum.request({
					method: 'eth_requestAccounts',
				})) as string[];

				if (accounts.length === 0) {
					throw new Error('No accounts found');
				}

				const address = accounts[0];
				setConnectedWallet('coinbase');
				setWalletAddress(address);
				setSelectedChain('ethereum');
				saveWalletState('coinbase', address, 'ethereum');

				toast.success('Coinbase Wallet connected (Ethereum)');

				window.ethereum.on('accountsChanged', handleAccountsChanged);
				window.ethereum.on('chainChanged', handleChainChanged);
			} else {
				throw new Error('Coinbase Wallet not detected');
			}

			getBalance();
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: 'Failed to connect Coinbase Wallet';
			setError(message);
			toast.error('Connection failed', { description: message });
		} finally {
			setIsConnecting(false);
		}
	}, [saveWalletState]);

	/**
	 * Disconnect wallet
	 */
	const disconnect = useCallback(async () => {
		try {
			if (connectedWallet === 'phantom' && window.phantom?.solana) {
				await window.phantom.solana.disconnect();
			} else if (
				connectedWallet === 'coinbase' &&
				window.coinbaseSolana
			) {
				await window.coinbaseSolana.disconnect();
			}

			setConnectedWallet(null);
			setWalletAddress(null);
			setBalance(null);
			saveWalletState(null, null, 'ethereum');

			if (window.ethereum) {
				window.ethereum.removeListener(
					'accountsChanged',
					handleAccountsChanged,
				);
				window.ethereum.removeListener('chainChanged', handleChainChanged);
			}

			toast.success('Wallet disconnected');
		} catch (err) {
			console.error('Disconnect error:', err);
			toast.error('Failed to disconnect wallet');
		}
	}, [connectedWallet, saveWalletState]);

	/**
	 * Switch blockchain network
	 */
	const switchChain = useCallback(
		async (chain: ChainType) => {
			if (!connectedWallet || !walletAddress) {
				toast.error('No wallet connected');
				return;
			}

			try {
				const chainConfig = CHAINS[chain];

				if (chainConfig.type === 'solana') {
					toast.error('Cannot switch to Solana from EVM wallet', {
						description:
							'Please disconnect and connect with a Solana wallet',
					});
					return;
				}

				if (!window.ethereum) {
					throw new Error('No EVM wallet found');
				}

				const chainIdHex = `0x${chainConfig.chainId!.toString(16)}`;

				try {
					await window.ethereum.request({
						method: 'wallet_switchEthereumChain',
						params: [{ chainId: chainIdHex }],
					});

					setSelectedChain(chain);
					saveWalletState(connectedWallet, walletAddress, chain);
					toast.success(`Switched to ${chainConfig.displayName}`);
				} catch (switchError: unknown) {
					const error = switchError as { code?: number };
					if (error.code === 4902) {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: chainIdHex,
									chainName: chainConfig.displayName,
									nativeCurrency: chainConfig.nativeCurrency,
									rpcUrls: [chainConfig.rpcUrl],
									blockExplorerUrls: chainConfig.blockExplorer
										? [chainConfig.blockExplorer]
										: undefined,
								},
							],
						});

						setSelectedChain(chain);
						saveWalletState(connectedWallet, walletAddress, chain);
						toast.success(`Added and switched to ${chainConfig.displayName}`);
					} else {
						throw switchError;
					}
				}

				getBalance();
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to switch chain';
				toast.error('Chain switch failed', { description: message });
			}
		},
		[connectedWallet, walletAddress, saveWalletState],
	);

	/**
	 * Get wallet balance
	 */
	const getBalance = useCallback(async () => {
		if (!walletAddress || !connectedWallet) return;

		try {
			const chainConfig = CHAINS[selectedChain];

			if (chainConfig.type === 'solana') {
				toast.info('Balance fetching not implemented for Solana yet');
			} else if (window.ethereum) {
				const balanceHex = (await window.ethereum.request({
					method: 'eth_getBalance',
					params: [walletAddress, 'latest'],
				})) as string;

				const balanceWei = parseInt(balanceHex, 16);
				const balanceEth =
					balanceWei / Math.pow(10, chainConfig.nativeCurrency.decimals);
				setBalance(balanceEth);
			}
		} catch (err) {
			console.error('Failed to fetch balance:', err);
		}
	}, [walletAddress, connectedWallet, selectedChain]);

	/**
	 * Handle account change events
	 */
	const handleAccountsChanged = useCallback(
		(accounts: unknown) => {
			const accountsArray = accounts as string[];
			if (accountsArray.length === 0) {
				disconnect();
			} else {
				const newAddress = accountsArray[0];
				setWalletAddress(newAddress);
				saveWalletState(connectedWallet, newAddress, selectedChain);
				toast.info('Account changed');
			}
		},
		[disconnect, connectedWallet, selectedChain, saveWalletState],
	);

	/**
	 * Handle chain change events
	 */
	const handleChainChanged = useCallback(
		(chainIdHex: unknown) => {
			const chainId = parseInt(chainIdHex as string, 16);
			const chain = getChainByChainId(chainId);

			if (chain) {
				setSelectedChain(chain);
				saveWalletState(connectedWallet, walletAddress, chain);
				toast.info(`Switched to ${CHAINS[chain].displayName}`);
			} else {
				toast.warning('Connected to unsupported network');
			}

			getBalance();
		},
		[connectedWallet, walletAddress, saveWalletState, getBalance],
	);

	const value: WalletContextType = {
		connectedWallet,
		walletAddress,
		selectedChain,
		isConnecting,
		balance,
		error,
		connectPhantom,
		connectMetaMask,
		connectCoinbase,
		disconnect,
		switchChain,
		getBalance,
	};

	return (
		<WalletContext.Provider value={value}>{children}</WalletContext.Provider>
	);
}

export function useWallet() {
	const context = useContext(WalletContext);
	if (context === undefined) {
		throw new Error('useWallet must be used within a WalletProvider');
	}
	return context;
}
