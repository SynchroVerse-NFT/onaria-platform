import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Supported wallet types
 */
export type WalletType = 'phantom' | 'metamask' | 'coinbase';

/**
 * Wallet configuration
 */
export interface WalletOption {
  type: WalletType;
  name: string;
  description: string;
  logo: React.ReactNode;
}

/**
 * Props for the WalletConnectModal component
 */
export interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (walletType: WalletType) => void;
  className?: string;
}

/**
 * Wallet options configuration
 * Logo placeholders - will be replaced with actual wallet logos in Phase 2
 */
const WALLET_OPTIONS: WalletOption[] = [
  {
    type: 'phantom',
    name: 'Phantom',
    description: 'Connect with Phantom wallet for Solana payments',
    logo: (
      <div className="size-12 rounded-lg bg-purple-500 flex items-center justify-center">
        <Wallet className="size-6 text-white" />
      </div>
    ),
  },
  {
    type: 'metamask',
    name: 'MetaMask',
    description: 'Connect with MetaMask for Ethereum payments',
    logo: (
      <div className="size-12 rounded-lg bg-orange-500 flex items-center justify-center">
        <Wallet className="size-6 text-white" />
      </div>
    ),
  },
  {
    type: 'coinbase',
    name: 'Coinbase Wallet',
    description: 'Connect with Coinbase Wallet for multi-chain support',
    logo: (
      <div className="size-12 rounded-lg bg-blue-600 flex items-center justify-center">
        <Wallet className="size-6 text-white" />
      </div>
    ),
  },
];

/**
 * WalletConnectModal component displays a modal with wallet connection options.
 * This is a skeleton UI structure that will be fully implemented in Phase 2.
 */
export function WalletConnectModal({
  isOpen,
  onClose,
  onWalletSelect,
  className,
}: WalletConnectModalProps) {
  const handleWalletClick = (walletType: WalletType) => {
    onWalletSelect(walletType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Choose your preferred wallet to connect and make crypto payments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {WALLET_OPTIONS.map((wallet) => (
            <Card
              key={wallet.type}
              className="cursor-pointer transition-all hover:border-blue-500 hover:shadow-md"
              onClick={() => handleWalletClick(wallet.type)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    {wallet.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary">{wallet.name}</h3>
                    <p className="text-sm text-text-secondary">{wallet.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWalletClick(wallet.type);
                    }}
                  >
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center text-xs text-text-tertiary">
          <p>Wallet integration will be fully implemented in Phase 2</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
