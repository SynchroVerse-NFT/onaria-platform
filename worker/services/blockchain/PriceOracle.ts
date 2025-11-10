/**
 * Price Oracle Service
 * Fetches cryptocurrency prices from public APIs with caching
 */

import { createLogger } from '../../logger';

const logger = createLogger('PriceOracle');

/**
 * Supported cryptocurrencies for price fetching
 */
export type SupportedCurrency = 'ETH' | 'SOL' | 'MATIC';

/**
 * Price data with metadata
 */
export interface PriceData {
    currency: SupportedCurrency;
    usd: number;
    lastUpdated: number;
}

/**
 * CoinGecko API response format
 */
interface CoinGeckoResponse {
    [key: string]: {
        usd: number;
        usd_24h_change?: number;
    };
}

/**
 * Price Oracle Class
 * Fetches and caches cryptocurrency prices
 */
export class PriceOracle {
    private priceCache: Map<SupportedCurrency, PriceData> = new Map();
    private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * CoinGecko coin IDs mapping
     */
    private readonly COIN_IDS: Record<SupportedCurrency, string> = {
        ETH: 'ethereum',
        SOL: 'solana',
        MATIC: 'matic-network'
    };

    /**
     * Get current price for a cryptocurrency
     * @param currency - Cryptocurrency symbol
     * @returns Current price in USD
     */
    async getPrice(currency: SupportedCurrency): Promise<number> {
        const cached = this.priceCache.get(currency);
        const now = Date.now();

        if (cached && now - cached.lastUpdated < this.CACHE_DURATION_MS) {
            logger.debug(`Using cached price for ${currency}`, { price: cached.usd });
            return cached.usd;
        }

        try {
            const price = await this.fetchPrice(currency);
            this.priceCache.set(currency, {
                currency,
                usd: price,
                lastUpdated: now
            });
            return price;
        } catch (error) {
            logger.error(`Failed to fetch price for ${currency}`, { error });

            if (cached) {
                logger.warn(`Using stale cached price for ${currency}`, {
                    price: cached.usd,
                    age: now - cached.lastUpdated
                });
                return cached.usd;
            }

            throw new Error(`Failed to fetch price for ${currency}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Convert crypto amount to USD
     * @param amount - Amount in cryptocurrency
     * @param currency - Cryptocurrency symbol
     * @returns USD value
     */
    async convertToUSD(amount: number, currency: SupportedCurrency): Promise<number> {
        const price = await this.getPrice(currency);
        return amount * price;
    }

    /**
     * Get prices for multiple currencies at once
     * @param currencies - Array of currency symbols
     * @returns Map of currency to price
     */
    async getPrices(currencies: SupportedCurrency[]): Promise<Map<SupportedCurrency, number>> {
        const prices = new Map<SupportedCurrency, number>();

        await Promise.all(
            currencies.map(async (currency) => {
                try {
                    const price = await this.getPrice(currency);
                    prices.set(currency, price);
                } catch (error) {
                    logger.error(`Failed to get price for ${currency}`, { error });
                }
            })
        );

        return prices;
    }

    /**
     * Fetch price from CoinGecko API
     * @param currency - Cryptocurrency symbol
     * @returns Current price in USD
     */
    private async fetchPrice(currency: SupportedCurrency): Promise<number> {
        const coinId = this.COIN_IDS[currency];

        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json() as CoinGeckoResponse;

            if (!data[coinId] || typeof data[coinId].usd !== 'number') {
                throw new Error(`Invalid response from CoinGecko for ${currency}`);
            }

            const price = data[coinId].usd;
            logger.debug(`Fetched price for ${currency}`, { price });

            return price;
        } catch (error) {
            logger.error(`CoinGecko API request failed for ${currency}`, { error, coinId });
            throw error;
        }
    }

    /**
     * Fetch price from fallback API (CryptoCompare)
     * Used as backup if CoinGecko fails
     * @param currency - Cryptocurrency symbol
     * @returns Current price in USD
     */
    private async fetchPriceFromCryptoCompare(currency: SupportedCurrency): Promise<number> {
        try {
            const response = await fetch(
                `https://min-api.cryptocompare.com/data/price?fsym=${currency}&tsyms=USD`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`CryptoCompare API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json() as { USD?: number };

            if (!data.USD || typeof data.USD !== 'number') {
                throw new Error(`Invalid response from CryptoCompare for ${currency}`);
            }

            logger.debug(`Fetched price from CryptoCompare for ${currency}`, { price: data.USD });
            return data.USD;
        } catch (error) {
            logger.error(`CryptoCompare API request failed for ${currency}`, { error });
            throw error;
        }
    }

    /**
     * Clear price cache
     */
    clearCache(): void {
        this.priceCache.clear();
        logger.debug('Price cache cleared');
    }

    /**
     * Clear specific currency from cache
     * @param currency - Currency to clear
     */
    clearCurrency(currency: SupportedCurrency): void {
        this.priceCache.delete(currency);
        logger.debug(`Cleared ${currency} from price cache`);
    }

    /**
     * Get cached price data (if available)
     * @param currency - Currency symbol
     * @returns Cached price data or undefined
     */
    getCachedPrice(currency: SupportedCurrency): PriceData | undefined {
        return this.priceCache.get(currency);
    }

    /**
     * Check if price is within acceptable range of expected amount
     * Allows for price fluctuation tolerance
     * @param actualUsd - Actual USD amount
     * @param expectedUsd - Expected USD amount
     * @param tolerancePercent - Tolerance percentage (default 5%)
     * @returns True if within tolerance
     */
    isWithinTolerance(actualUsd: number, expectedUsd: number, tolerancePercent: number = 5): boolean {
        const tolerance = expectedUsd * (tolerancePercent / 100);
        const minAcceptable = expectedUsd - tolerance;
        const maxAcceptable = expectedUsd + tolerance;

        const withinRange = actualUsd >= minAcceptable && actualUsd <= maxAcceptable;

        logger.debug('Price tolerance check', {
            actualUsd,
            expectedUsd,
            tolerancePercent,
            minAcceptable,
            maxAcceptable,
            withinRange
        });

        return withinRange;
    }
}

/**
 * Singleton instance for application-wide use
 */
let priceOracleInstance: PriceOracle | undefined;

/**
 * Get or create PriceOracle instance
 * @returns PriceOracle singleton
 */
export function getPriceOracle(): PriceOracle {
    if (!priceOracleInstance) {
        priceOracleInstance = new PriceOracle();
    }
    return priceOracleInstance;
}
