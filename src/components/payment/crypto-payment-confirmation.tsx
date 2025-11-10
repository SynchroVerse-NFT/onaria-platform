import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Clock, ExternalLink, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Transaction status type
 */
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

/**
 * Blockchain network type
 */
export type CryptoNetwork = 'ethereum' | 'solana' | 'polygon' | 'bsc';

/**
 * Props for the CryptoPaymentConfirmation component
 */
export interface CryptoPaymentConfirmationProps {
  txHash: string;
  amount: number;
  currency: string;
  network: CryptoNetwork;
  status: TransactionStatus;
  confirmations?: number;
  requiredConfirmations?: number;
  onCopyHash?: () => void;
  className?: string;
}

/**
 * Network configuration with explorer URLs
 */
const NETWORK_CONFIG: Record<CryptoNetwork, {
  name: string;
  explorerUrl: string;
  explorerName: string;
  color: string;
}> = {
  ethereum: {
    name: 'Ethereum',
    explorerUrl: 'https://etherscan.io/tx/',
    explorerName: 'Etherscan',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  solana: {
    name: 'Solana',
    explorerUrl: 'https://solscan.io/tx/',
    explorerName: 'Solscan',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  polygon: {
    name: 'Polygon',
    explorerUrl: 'https://polygonscan.com/tx/',
    explorerName: 'PolygonScan',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  },
  bsc: {
    name: 'BSC',
    explorerUrl: 'https://bscscan.com/tx/',
    explorerName: 'BscScan',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
};

/**
 * Status configuration
 */
const STATUS_CONFIG: Record<TransactionStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="size-5 animate-pulse" />,
    color: 'text-yellow-600',
    description: 'Transaction is being processed on the blockchain',
  },
  confirmed: {
    label: 'Confirmed',
    icon: <Check className="size-5" />,
    color: 'text-green-600',
    description: 'Transaction has been confirmed on the blockchain',
  },
  failed: {
    label: 'Failed',
    icon: <AlertCircle className="size-5" />,
    color: 'text-red-600',
    description: 'Transaction failed. Please try again or contact support',
  },
};

/**
 * Truncate transaction hash for display
 */
function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

/**
 * CryptoPaymentConfirmation component displays transaction details after a crypto payment,
 * including transaction hash, status, confirmations, and link to block explorer.
 */
export function CryptoPaymentConfirmation({
  txHash,
  amount,
  currency,
  network,
  status,
  confirmations = 0,
  requiredConfirmations = 12,
  onCopyHash,
  className,
}: CryptoPaymentConfirmationProps) {
  const networkConfig = NETWORK_CONFIG[network];
  const statusConfig = STATUS_CONFIG[status];
  const explorerUrl = `${networkConfig.explorerUrl}${txHash}`;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(txHash);
    onCopyHash?.();
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Payment Confirmation</CardTitle>
            <CardDescription>
              Your crypto payment has been submitted
            </CardDescription>
          </div>
          <div className={cn('p-2 rounded-lg', statusConfig.color)}>
            {statusConfig.icon}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'pending' && (
          <Alert>
            <Loader2 className="size-4 animate-spin" />
            <AlertDescription>
              {statusConfig.description}
              {confirmations > 0 && requiredConfirmations > 0 && (
                <div className="mt-2 text-xs">
                  Confirmations: {confirmations} / {requiredConfirmations}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {status === 'confirmed' && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
            <Check className="size-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              {statusConfig.description}
            </AlertDescription>
          </Alert>
        )}

        {status === 'failed' && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              {statusConfig.description}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-lg border p-4 bg-bg-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Status</span>
            <Badge className={cn(networkConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Amount</span>
            <span className="font-semibold text-text-primary">
              {amount.toFixed(6)} {currency}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Network</span>
            <Badge className={cn(networkConfig.color)}>
              {networkConfig.name}
            </Badge>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-sm text-text-secondary">Transaction Hash</span>
            <div className="flex flex-col items-end gap-1">
              <code className="text-xs font-mono text-text-primary">
                {truncateHash(txHash)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyHash}
                className="h-6 px-2 text-xs"
              >
                <Copy className="mr-1 size-3" />
                Copy
              </Button>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="mr-2 size-4" />
          View on {networkConfig.explorerName}
        </Button>
      </CardContent>
    </Card>
  );
}
