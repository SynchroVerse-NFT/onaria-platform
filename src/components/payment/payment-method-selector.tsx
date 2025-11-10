/**
 * Payment Method Selector
 * Component for selecting and managing payment methods including connected wallets
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/contexts/wallet-context';
import { WalletConnectModal } from './wallet-connect-modal';
import {
	truncateAddress,
	formatBalance,
	CHAINS,
	type ChainType,
} from '@/lib/wallet-config';
import {
	Wallet,
	CreditCard,
	ChevronRight,
	CheckCircle2,
	AlertCircle,
} from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface PaymentMethodSelectorProps {
	onMethodSelected?: (method: 'wallet' | 'card') => void;
	selectedMethod?: 'wallet' | 'card' | null;
	showCardOption?: boolean;
}

export function PaymentMethodSelector({
	onMethodSelected,
	selectedMethod,
	showCardOption = true,
}: PaymentMethodSelectorProps) {
	const {
		connectedWallet,
		walletAddress,
		selectedChain,
		balance,
		disconnect,
		switchChain,
	} = useWallet();
	const [walletModalOpen, setWalletModalOpen] = useState(false);

	const handleMethodSelect = (method: 'wallet' | 'card') => {
		if (method === 'wallet' && !connectedWallet) {
			setWalletModalOpen(true);
			return;
		}
		onMethodSelected?.(method);
	};

	const chainConfig = CHAINS[selectedChain];

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-sm font-medium mb-3">Payment Method</h3>

				<div className="space-y-3">
					{/* Crypto Wallet Option */}
					<Card
						className={`cursor-pointer transition-all hover:border-primary/50 ${
							selectedMethod === 'wallet'
								? 'border-primary ring-2 ring-primary/20'
								: ''
						}`}
						onClick={() => handleMethodSelect('wallet')}
					>
						<CardContent className="p-4">
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-start gap-3 flex-1">
									<div className="rounded-full bg-bg-3 p-2">
										<Wallet className="h-5 w-5" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<h4 className="font-medium text-sm">
												Crypto Wallet
											</h4>
											{selectedMethod === 'wallet' && (
												<CheckCircle2 className="h-4 w-4 text-primary" />
											)}
										</div>

										{connectedWallet && walletAddress ? (
											<div className="space-y-2">
												<div className="flex items-center gap-2 flex-wrap">
													<Badge
														variant="secondary"
														className="capitalize"
													>
														{connectedWallet}
													</Badge>
													<Badge variant="outline">
														{chainConfig.displayName}
													</Badge>
													<code className="text-xs bg-bg-3 px-2 py-1 rounded">
														{truncateAddress(walletAddress)}
													</code>
												</div>

												{balance !== null && (
													<p className="text-xs text-text-tertiary">
														Balance: {formatBalance(balance)}{' '}
														{chainConfig.nativeCurrency.symbol}
													</p>
												)}

												<div className="flex items-center gap-2 mt-2">
													<Select
														value={selectedChain}
														onValueChange={(value) =>
															switchChain(value as ChainType)
														}
													>
														<SelectTrigger className="w-[140px] h-7 text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{connectedWallet === 'phantom' ? (
																<SelectItem value="solana">
																	Solana
																</SelectItem>
															) : (
																<>
																	<SelectItem value="ethereum">
																		Ethereum
																	</SelectItem>
																	<SelectItem value="polygon">
																		Polygon
																	</SelectItem>
																	<SelectItem value="base">
																		Base
																	</SelectItem>
																</>
															)}
														</SelectContent>
													</Select>

													<Button
														variant="ghost"
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															disconnect();
														}}
														className="h-7 text-xs text-destructive hover:text-destructive"
													>
														Disconnect
													</Button>
												</div>
											</div>
										) : (
											<div>
												<p className="text-sm text-text-tertiary mb-2">
													Pay with cryptocurrency
												</p>
												<Button
													variant="outline"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														setWalletModalOpen(true);
													}}
													className="gap-2"
												>
													<Wallet className="h-4 w-4" />
													Connect Wallet
												</Button>
											</div>
										)}
									</div>
								</div>
								<ChevronRight className="h-5 w-5 text-text-tertiary shrink-0" />
							</div>
						</CardContent>
					</Card>

					{/* Credit Card Option */}
					{showCardOption && (
						<Card
							className={`cursor-pointer transition-all hover:border-primary/50 ${
								selectedMethod === 'card'
									? 'border-primary ring-2 ring-primary/20'
									: ''
							}`}
							onClick={() => handleMethodSelect('card')}
						>
							<CardContent className="p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-start gap-3 flex-1">
										<div className="rounded-full bg-bg-3 p-2">
											<CreditCard className="h-5 w-5" />
										</div>
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<h4 className="font-medium text-sm">
													Credit Card
												</h4>
												{selectedMethod === 'card' && (
													<CheckCircle2 className="h-4 w-4 text-primary" />
												)}
											</div>
											<p className="text-sm text-text-tertiary">
												Pay with credit or debit card
											</p>
											<div className="flex gap-1 mt-2">
												<Badge variant="outline" className="text-xs">
													Visa
												</Badge>
												<Badge variant="outline" className="text-xs">
													Mastercard
												</Badge>
												<Badge variant="outline" className="text-xs">
													Amex
												</Badge>
											</div>
										</div>
									</div>
									<ChevronRight className="h-5 w-5 text-text-tertiary shrink-0" />
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

			{/* Wallet requirements notice */}
			{selectedMethod === 'wallet' && connectedWallet && walletAddress && (
				<>
					<Separator />
					<div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2">
						<AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
						<div className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
							<p className="font-medium">Before you continue:</p>
							<ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
								<li>
									Ensure you have enough {chainConfig.nativeCurrency.symbol}{' '}
									for the transaction and gas fees
								</li>
								<li>
									Keep your wallet unlocked during the payment process
								</li>
								<li>Transaction cannot be reversed once confirmed</li>
							</ul>
						</div>
					</div>
				</>
			)}

			{/* Wallet Connect Modal */}
			<WalletConnectModal
				open={walletModalOpen}
				onOpenChange={setWalletModalOpen}
			/>
		</div>
	);
}
