/**
 * Wallet Connect Modal
 * Modal for connecting Web3 wallets (Phantom, MetaMask, Coinbase)
 */
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/contexts/wallet-context';
import {
	isPhantomInstalled,
	isMetaMaskInstalled,
	isCoinbaseInstalled,
	getWalletDownloadUrl,
} from '@/lib/wallet-config';
import {
	Wallet,
	ExternalLink,
	Loader2,
	CheckCircle2,
	AlertCircle,
} from 'lucide-react';

interface WalletConnectModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function WalletConnectModal({
	open,
	onOpenChange,
}: WalletConnectModalProps) {
	const {
		connectPhantom,
		connectMetaMask,
		connectCoinbase,
		isConnecting,
		error,
	} = useWallet();

	const wallets = [
		{
			id: 'phantom' as const,
			name: 'Phantom',
			description: 'Solana wallet for web3',
			icon: '👻',
			isInstalled: isPhantomInstalled(),
			connect: connectPhantom,
			chains: ['Solana'],
			downloadUrl: getWalletDownloadUrl('phantom'),
		},
		{
			id: 'metamask' as const,
			name: 'MetaMask',
			description: 'Ethereum wallet for web3',
			icon: '🦊',
			isInstalled: isMetaMaskInstalled(),
			connect: connectMetaMask,
			chains: ['Ethereum', 'Polygon', 'Base'],
			downloadUrl: getWalletDownloadUrl('metamask'),
		},
		{
			id: 'coinbase' as const,
			name: 'Coinbase Wallet',
			description: 'Multi-chain wallet',
			icon: '🔵',
			isInstalled: isCoinbaseInstalled(),
			connect: connectCoinbase,
			chains: ['Solana', 'Ethereum', 'Polygon', 'Base'],
			downloadUrl: getWalletDownloadUrl('coinbase'),
		},
	];

	const handleConnect = async (
		connectFn: () => Promise<void>,
		walletName: string,
	) => {
		try {
			await connectFn();
			onOpenChange(false);
		} catch (err) {
			console.error(`Failed to connect ${walletName}:`, err);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<Wallet className="h-5 w-5" />
						<DialogTitle>Connect Wallet</DialogTitle>
					</div>
					<DialogDescription>
						Choose a wallet to connect and make payments on supported
						blockchain networks.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 mt-4">
					{wallets.map((wallet) => (
						<div
							key={wallet.id}
							className="border rounded-lg p-4 hover:bg-bg-2 transition-colors"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-start gap-3 flex-1">
									<div className="text-3xl">{wallet.icon}</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<h3 className="font-medium text-sm">
												{wallet.name}
											</h3>
											{wallet.isInstalled && (
												<Badge
													variant="secondary"
													className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs"
												>
													<CheckCircle2 className="h-3 w-3 mr-1" />
													Installed
												</Badge>
											)}
										</div>
										<p className="text-xs text-text-tertiary mb-2">
											{wallet.description}
										</p>
										<div className="flex flex-wrap gap-1">
											{wallet.chains.map((chain) => (
												<Badge
													key={chain}
													variant="outline"
													className="text-xs"
												>
													{chain}
												</Badge>
											))}
										</div>
									</div>
								</div>
								<div className="shrink-0">
									{wallet.isInstalled ? (
										<Button
											onClick={() =>
												handleConnect(wallet.connect, wallet.name)
											}
											disabled={isConnecting}
											size="sm"
											className="gap-2"
										>
											{isConnecting && (
												<Loader2 className="h-4 w-4 animate-spin" />
											)}
											Connect
										</Button>
									) : (
										<Button
											onClick={() =>
												window.open(wallet.downloadUrl, '_blank')
											}
											variant="outline"
											size="sm"
											className="gap-2"
										>
											Install
											<ExternalLink className="h-3 w-3" />
										</Button>
									)}
								</div>
							</div>
						</div>
					))}
				</div>

				{error && (
					<>
						<Separator />
						<div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
							<AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
							<div>
								<p className="text-sm font-medium text-destructive">
									Connection Failed
								</p>
								<p className="text-xs text-destructive/80 mt-1">
									{error}
								</p>
							</div>
						</div>
					</>
				)}

				<Separator />

				<div className="text-xs text-text-tertiary space-y-2">
					<p className="font-medium">What is a wallet?</p>
					<p>
						A crypto wallet allows you to store digital assets and make
						blockchain transactions securely. Your private keys never leave
						your device.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
