import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Wallet, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Payment method type
 */
export type PaymentMethodType = 'credit_card' | 'crypto';

/**
 * Blockchain network type
 */
export type BlockchainNetwork = 'ethereum' | 'solana' | 'polygon' | 'bsc';

/**
 * Payment method interface
 */
export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  last4?: string;
  network?: BlockchainNetwork;
  walletAddress?: string;
  isDefault?: boolean;
}

/**
 * Props for the PaymentMethodSelector component
 */
export interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  selectedMethod?: string;
  onSelect: (methodId: string) => void;
  onAddNew: () => void;
  className?: string;
}

/**
 * Network badge colors
 */
const NETWORK_COLORS: Record<BlockchainNetwork, string> = {
  ethereum: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  solana: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  polygon: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  bsc: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

/**
 * Truncate wallet address for display
 */
function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get payment method icon
 */
function getPaymentMethodIcon(type: PaymentMethodType): React.ReactNode {
  return type === 'credit_card' ? (
    <CreditCard className="size-5" />
  ) : (
    <Wallet className="size-5" />
  );
}

/**
 * PaymentMethodSelector component displays a radio group or card selection UI
 * for choosing between credit card and crypto wallet payment methods.
 */
export function PaymentMethodSelector({
  paymentMethods,
  selectedMethod,
  onSelect,
  onAddNew,
  className,
}: PaymentMethodSelectorProps) {
  return (
    <div className={cn('w-full space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">Payment Method</h3>
        <Button variant="outline" size="sm" onClick={onAddNew}>
          <Plus className="mr-2 size-4" />
          Add New
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="mx-auto size-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary mb-4">No payment methods added yet</p>
            <Button onClick={onAddNew}>
              <Plus className="mr-2 size-4" />
              Add Payment Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <RadioGroup
          value={selectedMethod}
          onValueChange={onSelect}
          className="space-y-3"
        >
          {paymentMethods.map((method) => (
            <label
              key={method.id}
              htmlFor={method.id}
              className="cursor-pointer"
            >
              <Card
                className={cn(
                  'transition-all hover:border-blue-500',
                  selectedMethod === method.id && 'border-blue-500 ring-2 ring-blue-500/20'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <RadioGroupItem
                      value={method.id}
                      id={method.id}
                      className="shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-text-secondary">
                          {getPaymentMethodIcon(method.type)}
                        </div>
                        <span className="font-semibold text-text-primary">
                          {method.name}
                        </span>
                        {method.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                        {selectedMethod === method.id && (
                          <Check className="size-4 text-blue-600 ml-auto" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {method.type === 'credit_card' && method.last4 && (
                          <span className="text-sm text-text-secondary">
                            **** **** **** {method.last4}
                          </span>
                        )}

                        {method.type === 'crypto' && method.walletAddress && (
                          <span className="text-sm text-text-secondary font-mono">
                            {truncateAddress(method.walletAddress)}
                          </span>
                        )}

                        {method.network && (
                          <Badge className={cn('text-xs', NETWORK_COLORS[method.network])}>
                            {method.network.charAt(0).toUpperCase() + method.network.slice(1)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </label>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}
