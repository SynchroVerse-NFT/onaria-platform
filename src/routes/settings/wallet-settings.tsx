/**
 * Wallet Settings Component
 * Manages connected wallets, balances, and payment preferences
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/contexts/wallet-context';
import { WalletConnectModal } from '@/components/payment/wallet-connect-modal';
import {
	formatBalance,
	CHAINS,
	type ChainType,
} from '@/lib/wallet-config';
import {
	Wallet,
	Plus,
	ExternalLink,
	RefreshCw,
	AlertCircle,
	CheckCircle2,
	Copy,
	LogOut,
} from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function WalletSettings() {
	const {
		connectedWallet,
		walletAddress,
		selectedChain,
		balance,
		isConnecting,
		disconnect,
		switchChain,
		getBalance,
	} = useWallet();

	const [walletModalOpen, setWalletModalOpen] = useState(false);
	const [loadingBalance, setLoadingBalance] = useState(false);

	const chainConfig = selectedChain ? CHAINS[selectedChain] : null;

	// Auto-fetch balance on mount and chain change
	useEffect(() => {
		if (connectedWallet && walletAddress) {
			handleRefreshBalance();
		}
	}, [connectedWallet, walletAddress, selectedChain]);

	const handleRefreshBalance = async () => {
		setLoadingBalance(true);
		try {
			await getBalance();
		} catch (err) {
			console.error('Failed to refresh balance:', err);
			toast.error('Failed to refresh balance');
		} finally {
			setLoadingBalance(false);
		}
	};

	const handleCopyAddress = () => {
		if (walletAddress) {
			navigator.clipboard.writeText(walletAddress);
			toast.success('Address copied to clipboard');
		}
	};

	const handleViewExplorer = () => {
		if (walletAddress && chainConfig?.blockExplorer) {
			const explorerUrl = `${chainConfig.blockExplorer}/address/${walletAddress}`;
			window.open(explorerUrl, '_blank');
		}
	};

	return (
		<div className="space-y-6">
			{/* Connected Wallet Card */}
			{connectedWallet && walletAddress ? (
				<Card>
					<CardHeader variant="minimal">
						<div className="flex items-center justify-between border-b w-full py-3">
							<div className="flex items-center gap-3 text-text-primary">
								<Wallet className="h-5 w-5" />
								<CardTitle className="text-lg">Connected Wallet</CardTitle>
							</div>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="gap-2 text-destructive hover:text-destructive"
									>
										<LogOut className="h-4 w-4" />
										Disconnect
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Disconnect Wallet?</AlertDialogTitle>
										<AlertDialogDescription>
											Are you sure you want to disconnect your wallet? You
											can reconnect anytime.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={disconnect}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											Disconnect
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</CardHeader>
					<CardContent className="space-y-6 px-6 mt-4">
						{/* Wallet Info */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-text-tertiary mb-1">
										Wallet Type
									</p>
									<div className="flex items-center gap-2">
										<Badge
											variant="secondary"
											className="capitalize text-sm"
										>
											{connectedWallet}
										</Badge>
										<Badge variant="outline" className="text-sm">
											<CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
											Connected
										</Badge>
									</div>
								</div>
							</div>

							<Separator />

							<div>
								<p className="text-sm text-text-tertiary mb-2">
									Wallet Address
								</p>
								<div className="flex items-center gap-2">
									<code className="flex-1 bg-bg-3 px-3 py-2 rounded text-sm font-mono">
										{walletAddress}
									</code>
									<Button
										variant="outline"
										size="sm"
										onClick={handleCopyAddress}
										className="gap-2 shrink-0"
									>
										<Copy className="h-4 w-4" />
										Copy
									</Button>
									{chainConfig?.blockExplorer && (
										<Button
											variant="outline"
											size="sm"
											onClick={handleViewExplorer}
											className="gap-2 shrink-0"
										>
											<ExternalLink className="h-4 w-4" />
											Explorer
										</Button>
									)}
								</div>
							</div>

							<Separator />

							{/* Network Selection */}
							<div>
								<p className="text-sm text-text-tertiary mb-2">Network</p>
								<Select
									value={selectedChain}
									onValueChange={(value) =>
										switchChain(value as ChainType)
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{connectedWallet === 'phantom' ? (
											<SelectItem value="solana">
												<div className="flex items-center gap-2">
													<span>Solana Mainnet</span>
												</div>
											</SelectItem>
										) : (
											<>
												<SelectItem value="ethereum">
													<div className="flex items-center gap-2">
														<span>Ethereum Mainnet</span>
													</div>
												</SelectItem>
												<SelectItem value="polygon">
													<div className="flex items-center gap-2">
														<span>Polygon</span>
													</div>
												</SelectItem>
												<SelectItem value="base">
													<div className="flex items-center gap-2">
														<span>Base</span>
													</div>
												</SelectItem>
											</>
										)}
									</SelectContent>
								</Select>
							</div>

							<Separator />

							{/* Balance */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm text-text-tertiary">Balance</p>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleRefreshBalance}
										disabled={loadingBalance}
										className="gap-2 h-7 text-xs"
									>
										<RefreshCw
											className={`h-3 w-3 ${loadingBalance ? 'animate-spin' : ''}`}
										/>
										Refresh
									</Button>
								</div>
								<div className="bg-bg-3 rounded-lg p-4">
									<div className="flex items-baseline gap-2">
										<span className="text-2xl font-bold">
											{balance !== null
												? formatBalance(balance)
												: '—'}
										</span>
										<span className="text-lg text-text-tertiary">
											{chainConfig?.nativeCurrency.symbol}
										</span>
									</div>
									{chainConfig && (
										<p className="text-xs text-text-tertiary mt-1">
											on {chainConfig.displayName}
										</p>
									)}
								</div>
							</div>
						</div>

						{/* Usage Tips */}
						<div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
							<div className="flex gap-2">
								<AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
								<div className="text-xs text-blue-900 dark:text-blue-100 space-y-2">
									<p className="font-medium">Wallet Tips:</p>
									<ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
										<li>
											Keep your wallet secure and never share your seed
											phrase
										</li>
										<li>
											Always verify transaction details before
											confirming
										</li>
										<li>
											Ensure you have enough funds to cover gas fees
										</li>
										<li>
											Transactions on blockchain are irreversible
										</li>
									</ul>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			) : (
				/* No Wallet Connected */
				<Card>
					<CardHeader variant="minimal">
						<div className="flex items-center gap-3 border-b w-full py-3 text-text-primary">
							<Wallet className="h-5 w-5" />
							<CardTitle className="text-lg">Wallet</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="px-6 mt-4">
						<div className="text-center py-12">
							<div className="rounded-full bg-bg-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
								<Wallet className="h-8 w-8 text-text-tertiary" />
							</div>
							<h3 className="font-medium text-lg mb-2">
								No Wallet Connected
							</h3>
							<p className="text-sm text-text-tertiary mb-6 max-w-md mx-auto">
								Connect your crypto wallet to make payments with
								cryptocurrency. Supports Phantom (Solana), MetaMask, and
								Coinbase Wallet.
							</p>
							<Button
								onClick={() => setWalletModalOpen(true)}
								className="gap-2"
								disabled={isConnecting}
							>
								<Plus className="h-4 w-4" />
								Connect Wallet
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Supported Networks */}
			<Card>
				<CardHeader variant="minimal">
					<div className="flex items-center gap-3 border-b w-full py-3 text-text-primary">
						<CardTitle className="text-lg">Supported Networks</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="px-6 mt-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{Object.entries(CHAINS).map(([key, chain]) => (
							<div
								key={key}
								className={`border rounded-lg p-4 ${
									selectedChain === key
										? 'border-primary bg-primary/5'
										: ''
								}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1">
										<h4 className="font-medium text-sm mb-1">
											{chain.displayName}
										</h4>
										<p className="text-xs text-text-tertiary mb-2">
											{chain.nativeCurrency.symbol} payments
										</p>
										<div className="flex items-center gap-2">
											<Badge variant="outline" className="text-xs">
												{chain.type === 'solana' ? 'Solana' : 'EVM'}
											</Badge>
											{selectedChain === key && (
												<Badge
													variant="default"
													className="text-xs bg-primary"
												>
													Active
												</Badge>
											)}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Wallet Connect Modal */}
			<WalletConnectModal
				open={walletModalOpen}
				onOpenChange={setWalletModalOpen}
			/>
		</div>
	);
}
