/**
 * Wallet Header Button
 * Small wallet connection button for the header
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/wallet-context';
import { WalletConnectModal } from '@/components/payment/wallet-connect-modal';
import { truncateAddress } from '@/lib/wallet-config';
import { Wallet } from 'lucide-react';

export function WalletHeaderButton() {
	const { connectedWallet, walletAddress, disconnect } = useWallet();
	const [walletModalOpen, setWalletModalOpen] = useState(false);

	if (connectedWallet && walletAddress) {
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={disconnect}
				className="gap-2 h-8 px-3"
				title="Disconnect wallet"
			>
				<span className="text-xl">👻</span>
				<span className="hidden sm:inline font-mono text-xs">
					{truncateAddress(walletAddress)}
				</span>
			</Button>
		);
	}

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setWalletModalOpen(true)}
				className="gap-2 h-8 px-3"
				title="Connect wallet"
			>
				<Wallet className="h-4 w-4" />
				<span className="hidden sm:inline">Wallet</span>
			</Button>
			<WalletConnectModal
				open={walletModalOpen}
				onOpenChange={setWalletModalOpen}
			/>
		</>
	);
}
