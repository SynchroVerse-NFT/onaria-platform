# Multi-Chain Payment Verification Service

A comprehensive cryptocurrency payment verification system supporting Ethereum, Polygon, Base, and Solana blockchains. This service handles on-chain transaction verification, price conversion, and subscription management.

## Overview

The payment verification service consists of several components:

1. Blockchain Services (Chain-specific verification)
2. Price Oracle (USD conversion)
3. Chain Factory (Service instantiation)
4. Payment Service (Database operations)
5. Payment Controller (API endpoints)

## Architecture

### Chain Services

Each blockchain has its own service implementation:

- **EVMChainService**: Handles Ethereum, Polygon, and Base (all EVM-compatible chains)
- **SolanaChainService**: Handles Solana blockchain

All services extend the abstract `ChainService` class, providing a consistent interface for transaction verification.

### Supported Chains

| Chain | Native Currency | Min Confirmations | RPC Default |
|-------|----------------|-------------------|-------------|
| Ethereum | ETH | 12 | cloudflare-eth.com |
| Polygon | MATIC | 128 | polygon-rpc.com |
| Base | ETH | 12 | mainnet.base.org |
| Solana | SOL | 32 | api.mainnet-beta.solana.com |

## File Structure

```
worker/
├── services/
│   └── blockchain/
│       ├── ChainService.ts          # Abstract base class and interfaces
│       ├── EVMChainService.ts       # EVM chain implementation
│       ├── SolanaChainService.ts    # Solana implementation
│       ├── ChainFactory.ts          # Service factory
│       └── PriceOracle.ts           # Price fetching and conversion
├── database/
│   ├── schema.ts                    # Database schema (subscriptions, cryptoPayments)
│   └── services/
│       └── PaymentService.ts        # Database operations
└── api/
    └── controllers/
        └── payments/
            ├── controller.ts        # API endpoints
            └── types.ts             # TypeScript types
```

## Database Schema

### subscriptions

Stores user subscription information:

```typescript
{
  id: string;
  userId: string;
  planType: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'past_due';
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  amountPaid: number;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### cryptoPayments

Tracks cryptocurrency payment transactions:

```typescript
{
  id: string;
  userId: string;
  subscriptionId: string;
  txHash: string;
  chain: 'ethereum' | 'solana' | 'polygon' | 'base';
  fromAddress: string;
  toAddress: string;
  amount: string;              // Crypto amount (preserved precision)
  currency: string;            // ETH, SOL, MATIC
  amountUsd: number;           // USD value at payment time
  blockNumber: number;
  confirmations: number;
  blockTimestamp: Date;
  status: 'pending' | 'confirming' | 'verified' | 'failed' | 'expired';
  verifiedAt: Date;
  failureReason: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### POST /api/payments/crypto/verify

Verify a cryptocurrency payment transaction.

**Request:**
```typescript
{
  txHash: string;
  chain: 'ethereum' | 'solana' | 'polygon' | 'base';
}
```

**Response:**
```typescript
{
  verified: boolean;
  payment: CryptoPayment;
  subscription: {
    id: string;
    tier: string;
    status: string;
  };
  message: string;
}
```

**Verification Steps:**

1. Validate transaction hash format
2. Check if transaction already used (prevent double-spend)
3. Fetch transaction details from blockchain
4. Verify transaction succeeded
5. Verify recipient matches platform wallet
6. Convert crypto amount to USD
7. Check minimum confirmations
8. Match amount to subscription tier (within 5% tolerance)
9. Create/update subscription
10. Mark payment as verified

### POST /api/payments/crypto/webhook

Update payment confirmation status (for async monitoring).

**Request:**
```typescript
{
  txHash: string;
  confirmations: number;
  chain: 'ethereum' | 'solana' | 'polygon' | 'base';
}
```

**Response:**
```typescript
{
  processed: boolean;
  paymentId: string;
  message: string;
}
```

### GET /api/payments/history

Get user's payment history.

**Response:**
```typescript
{
  payments: CryptoPayment[];
  total: number;
}
```

## Configuration

### Environment Variables

Add these to your `wrangler.jsonc`:

```jsonc
{
  "vars": {
    // Platform wallet addresses
    "PLATFORM_WALLET_ETH": "0x...",      // Ethereum address (also used for Base)
    "PLATFORM_WALLET_SOL": "...",        // Solana address
    "PLATFORM_WALLET_POLYGON": "0x...",  // Polygon address

    // Optional: Custom RPC URLs
    "ETHEREUM_RPC_URL": "https://...",
    "POLYGON_RPC_URL": "https://...",
    "BASE_RPC_URL": "https://...",
    "SOLANA_RPC_URL": "https://..."
  }
}
```

## Usage Examples

### Basic Payment Verification

```typescript
import { createChainFactory } from './services/blockchain/ChainFactory';
import { getPriceOracle } from './services/blockchain/PriceOracle';

const chainFactory = createChainFactory(env);
const priceOracle = getPriceOracle();

// Verify transaction
const verification = await chainFactory.verifyTransaction(
  'ethereum',
  '0x123abc...',
  29 // expected USD amount
);

if (verification.verified) {
  console.log('Payment verified!');
  console.log('Amount:', verification.amount, verification.currency);
  console.log('USD value:', await priceOracle.convertToUSD(
    parseFloat(verification.amount),
    verification.currency
  ));
}
```

### Get Transaction Details

```typescript
const chainFactory = createChainFactory(env);

const details = await chainFactory.getTransactionDetails(
  'solana',
  'signature123...'
);

console.log('From:', details.fromAddress);
console.log('To:', details.toAddress);
console.log('Amount:', details.amount, details.currency);
console.log('Confirmations:', details.confirmations);
console.log('Status:', details.status);
```

### Price Oracle

```typescript
import { getPriceOracle } from './services/blockchain/PriceOracle';

const priceOracle = getPriceOracle();

// Get current price
const ethPrice = await priceOracle.getPrice('ETH');
console.log('ETH price:', ethPrice, 'USD');

// Convert amount to USD
const usdValue = await priceOracle.convertToUSD(0.01, 'ETH');
console.log('0.01 ETH =', usdValue, 'USD');

// Check if within tolerance
const isValid = priceOracle.isWithinTolerance(
  28.5, // actual USD
  29,   // expected USD
  5     // 5% tolerance
);
```

### Database Operations

```typescript
import { PaymentService } from './database/services/PaymentService';

const paymentService = new PaymentService(env);

// Create subscription
const subscription = await paymentService.createSubscription({
  userId: 'user123',
  planType: 'pro',
  billingCycle: 'monthly',
  amountPaid: 29,
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});

// Create payment record
const payment = await paymentService.createCryptoPayment({
  userId: 'user123',
  subscriptionId: subscription.id,
  txHash: '0x123abc...',
  chain: 'ethereum',
  fromAddress: '0xabc...',
  toAddress: '0xdef...',
  amount: '0.01',
  currency: 'ETH',
  amountUsd: 29,
  blockNumber: 12345678,
  confirmations: 12,
  blockTimestamp: Math.floor(Date.now() / 1000)
});

// Update payment status
await paymentService.updateCryptoPayment(payment.id, {
  status: 'verified',
  verifiedAt: new Date()
});
```

## Error Handling

The service includes comprehensive error handling:

### Transaction Verification Errors

```typescript
import { TransactionVerificationError } from './services/blockchain/ChainService';

try {
  await chainFactory.verifyTransaction(chain, txHash, expectedAmount);
} catch (error) {
  if (error instanceof TransactionVerificationError) {
    switch (error.reason) {
      case 'not_found':
        // Transaction doesn't exist
        break;
      case 'insufficient_confirmations':
        // Not enough confirmations yet
        break;
      case 'wrong_recipient':
        // Payment sent to wrong address
        break;
      case 'amount_mismatch':
        // Amount doesn't match expected
        break;
      case 'already_verified':
        // Transaction already used
        break;
      case 'invalid_hash':
        // Invalid transaction hash format
        break;
      case 'transaction_failed':
        // Transaction failed on blockchain
        break;
      case 'timeout':
        // RPC request timed out
        break;
    }
  }
}
```

### RPC Errors

```typescript
import { RpcError } from './services/blockchain/ChainService';

try {
  const tx = await chainService.getTransactionDetails(txHash);
} catch (error) {
  if (error instanceof RpcError) {
    console.error('RPC Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Data:', error.data);
  }
}
```

## Security Considerations

1. **Transaction Hash Validation**: All transaction hashes are validated for correct format before making RPC calls
2. **Double-Spend Prevention**: Each transaction hash can only be used once
3. **Recipient Verification**: Payments must be sent to the correct platform wallet
4. **Confirmation Requirements**: Minimum confirmations required before accepting payment
5. **Amount Verification**: Payment amount must match subscription tier (within tolerance)
6. **Price Fluctuation Tolerance**: 5% tolerance to account for price volatility
7. **Transaction Age**: Transactions should not be too old (implement as needed)

## Rate Limiting

RPC providers have rate limits. Consider:

1. Implementing retry logic with exponential backoff
2. Using multiple RPC providers for failover
3. Caching transaction data where appropriate
4. Using WebSockets for real-time updates instead of polling

## Testing

### Test Transaction Hashes

Use testnet transaction hashes for testing:

- **Ethereum Goerli**: `0x...`
- **Polygon Mumbai**: `0x...`
- **Solana Devnet**: `...`

### Mock Price Data

For testing, you can mock the price oracle:

```typescript
const mockPriceOracle = {
  getPrice: async (currency) => {
    const mockPrices = { ETH: 2000, SOL: 100, MATIC: 0.8 };
    return mockPrices[currency];
  },
  convertToUSD: async (amount, currency) => {
    const price = await mockPriceOracle.getPrice(currency);
    return amount * price;
  }
};
```

## Maintenance

### Price Oracle Cache

The price oracle caches prices for 5 minutes. To clear cache:

```typescript
const priceOracle = getPriceOracle();
priceOracle.clearCache(); // Clear all
priceOracle.clearCurrency('ETH'); // Clear specific currency
```

### Monitoring Pending Payments

Set up a cron job to check pending payments:

```typescript
const paymentService = new PaymentService(env);
const pendingPayments = await paymentService.getPendingPayments();

for (const payment of pendingPayments) {
  // Check confirmations
  // Update status if needed
}
```

## Migration

To use this system, you need to:

1. Run database migrations to create tables
2. Set platform wallet addresses in wrangler.jsonc
3. Deploy the worker
4. Update frontend to call verification endpoint

### Database Migration

```sql
-- Run migrations/XXX_create_payments_tables.sql
-- This will create:
-- - subscriptions table
-- - cryptoPayments table
-- - paymentMethods table (optional)
```

## Future Enhancements

1. Support for ERC-20 tokens (USDC, USDT)
2. Support for SPL tokens on Solana
3. Automated refund handling
4. Dispute resolution system
5. Multi-signature wallet support
6. Recurring subscription monitoring
7. Payment webhook notifications to users
8. Advanced analytics and reporting

## Support

For issues or questions, refer to:

- Blockchain documentation:
  - [Ethereum JSON-RPC](https://ethereum.org/en/developers/docs/apis/json-rpc/)
  - [Solana JSON-RPC](https://docs.solana.com/api/http)
- Price API documentation:
  - [CoinGecko API](https://www.coingecko.com/en/api/documentation)
  - [CryptoCompare API](https://min-api.cryptocompare.com/)
