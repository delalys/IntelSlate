'use server';

/**
 * Stock Server Actions
 *
 * Server Actions for stock CRUD operations.
 * Validates input with Zod schemas and handles errors gracefully.
 *
 * @module actions/stocks
 */

import { revalidatePath } from 'next/cache';
import type { MarketData, Stock } from '@/generated/prisma/client';
import { getDefaultLogoDevClient } from '@/lib/api/logodev';
import prisma from '@/lib/prisma';
import { getDefaultMarketDataService } from '@/lib/services/marketDataService';
import {
  AddStockSchema,
  type TAddStockInput,
  type TUpdateStockInput,
  UpdateStockSchema,
} from '@/schemas/stock';

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[StockActions]';
const MAX_STOCKS_PER_USER = 5;
const MVP_USER_EMAIL = 'thomas@intelslate.local';

// =============================================================================
// Types
// =============================================================================

/**
 * Result type for server actions
 * Returns success/error state with optional data
 */
export interface IActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    newsFetchStatus?: 'success' | 'failed' | 'skipped';
    newsFetchError?: string;
    articlesCount?: number;
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs a message with the [StockActions] prefix
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the [StockActions] prefix
 */
function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Gets the hardcoded MVP user ID
 * In production, this would come from authentication
 */
async function getMvpUserId(): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: MVP_USER_EMAIL },
      select: { id: true },
    });
    return user?.id ?? null;
  } catch (error) {
    logError('Failed to get MVP user:', error);
    return null;
  }
}

/**
 * Converts ticker to domain for Logo.dev lookup
 * e.g., "AAPL" -> "apple.com", "GOOGL" -> "google.com"
 */
function tickerToDomain(ticker: string): string {
  // Common ticker to domain mappings
  const domainMap: Record<string, string> = {
    AAPL: 'apple.com',
    GOOGL: 'google.com',
    GOOG: 'google.com',
    MSFT: 'microsoft.com',
    AMZN: 'amazon.com',
    META: 'meta.com',
    TSLA: 'tesla.com',
    NVDA: 'nvidia.com',
    NFLX: 'netflix.com',
    INTC: 'intel.com',
    AMD: 'amd.com',
    CRM: 'salesforce.com',
    ORCL: 'oracle.com',
    IBM: 'ibm.com',
    CSCO: 'cisco.com',
    ADBE: 'adobe.com',
    PYPL: 'paypal.com',
    SQ: 'squareup.com',
    SHOP: 'shopify.com',
    SPOT: 'spotify.com',
    UBER: 'uber.com',
    LYFT: 'lyft.com',
    SNAP: 'snap.com',
    TWTR: 'twitter.com',
    PINS: 'pinterest.com',
    ZM: 'zoom.us',
    DOCU: 'docusign.com',
    OKTA: 'okta.com',
    NOW: 'servicenow.com',
    WDAY: 'workday.com',
  };

  const upperTicker = ticker.toUpperCase();
  if (domainMap[upperTicker]) {
    return domainMap[upperTicker];
  }

  // Fallback: use lowercase ticker + .com
  return `${ticker.toLowerCase()}.com`;
}

// =============================================================================
// Server Actions
// =============================================================================

/**
 * Add a new stock to the user's portfolio
 *
 * @param data - Stock data (ticker, buyPrice, quantity)
 * @returns IActionResult with created stock or error
 */
export async function addStock(
  data: TAddStockInput,
): Promise<IActionResult<Stock>> {
  log('Adding stock:', data.ticker);

  try {
    // Get MVP user ID
    const userId = await getMvpUserId();
    if (!userId) {
      logError('MVP user not found');
      return { success: false, error: 'User not found' };
    }

    // Validate input with Zod
    const validationResult = AddStockSchema.safeParse(data);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((e) => e.message)
        .join(', ');
      logError('Validation failed:', errorMessage);
      return { success: false, error: errorMessage };
    }

    const validatedData = validationResult.data;

    // Check if stock already exists for this user
    const existingStock = await prisma.stock.findFirst({
      where: {
        userId,
        ticker: validatedData.ticker,
      },
    });

    if (existingStock) {
      logError('Stock already exists:', validatedData.ticker);
      return {
        success: false,
        error: `You already have ${validatedData.ticker} in your portfolio`,
      };
    }

    // Check 5 stock limit
    const stockCount = await prisma.stock.count({
      where: { userId },
    });

    if (stockCount >= MAX_STOCKS_PER_USER) {
      logError('Maximum stock limit reached');
      return {
        success: false,
        error: `You have reached the maximum of ${MAX_STOCKS_PER_USER} stocks`,
      };
    }

    // Fetch logo from Logo.dev
    let logoUrl: string | null = null;
    const logoClient = getDefaultLogoDevClient();

    if (logoClient) {
      const domain = tickerToDomain(validatedData.ticker);
      log('Fetching logo for domain:', domain);

      const logoResult = await logoClient.fetchLogo(domain);
      if (logoResult.success && logoResult.logoUrl) {
        logoUrl = logoResult.logoUrl;
        log('Logo fetched successfully:', logoUrl);
      } else {
        log('Logo fetch failed, continuing without logo:', logoResult.error);
      }
    } else {
      log('Logo.dev client not available, skipping logo fetch');
    }

    // Create stock in database
    const stock = await prisma.stock.create({
      data: {
        userId,
        ticker: validatedData.ticker,
        buyPrice: validatedData.buyPrice,
        quantity: validatedData.quantity,
        logoUrl,
      },
    });

    log('Stock created successfully:', stock.id);
    revalidatePath('/');

    // Fetch market data for the new stock (non-blocking)
    const marketDataService = getDefaultMarketDataService();
    if (marketDataService) {
      log('Fetching market data for new stock:', validatedData.ticker);
      const marketResult = await marketDataService.refreshTickerData(
        validatedData.ticker,
      );
      if (!marketResult.success) {
        log('Market data fetch failed (non-critical):', marketResult.error);
      }
    }

    return {
      success: true,
      data: stock,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to add stock:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Update an existing stock's buyPrice and/or quantity
 *
 * @param id - Stock ID to update
 * @param data - Partial stock data (buyPrice, quantity)
 * @returns IActionResult with updated stock or error
 */
export async function updateStock(
  id: string,
  data: TUpdateStockInput,
): Promise<IActionResult<Stock>> {
  log('Updating stock:', id);

  try {
    // Validate stock ID
    if (!id || id.trim() === '') {
      logError('Stock id is required');
      return { success: false, error: 'Stock id is required' };
    }

    // Get MVP user ID
    const userId = await getMvpUserId();
    if (!userId) {
      logError('MVP user not found');
      return { success: false, error: 'User not found' };
    }

    // Validate input with Zod
    const validationResult = UpdateStockSchema.safeParse(data);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((e) => e.message)
        .join(', ');
      logError('Validation failed:', errorMessage);
      return { success: false, error: errorMessage };
    }

    const validatedData = validationResult.data;

    // Update stock in database (only for the MVP user)
    const stock = await prisma.stock.update({
      where: {
        id,
        userId, // Ensure stock belongs to user
      },
      data: {
        ...(validatedData.buyPrice !== undefined && {
          buyPrice: validatedData.buyPrice,
        }),
        ...(validatedData.quantity !== undefined && {
          quantity: validatedData.quantity,
        }),
      },
    });

    log('Stock updated successfully:', stock.id);
    revalidatePath('/');
    return { success: true, data: stock };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to update stock:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Remove a stock from the user's portfolio
 *
 * @param id - Stock ID to remove
 * @returns IActionResult with deleted stock or error
 */
export async function removeStock(id: string): Promise<IActionResult<Stock>> {
  log('Removing stock:', id);

  try {
    // Validate stock ID
    if (!id || id.trim() === '') {
      logError('Stock id is required');
      return { success: false, error: 'Stock id is required' };
    }

    // Get MVP user ID
    const userId = await getMvpUserId();
    if (!userId) {
      logError('MVP user not found');
      return { success: false, error: 'User not found' };
    }

    // Delete stock from database (only for the MVP user)
    const stock = await prisma.stock.delete({
      where: {
        id,
        userId, // Ensure stock belongs to user
      },
    });

    log('Stock removed successfully:', stock.id);
    revalidatePath('/');
    return { success: true, data: stock };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to remove stock:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get all stocks for the hardcoded user
 *
 * @returns IActionResult with array of stocks or error
 */
export async function getStocks(): Promise<IActionResult<Stock[]>> {
  log('Fetching stocks');

  try {
    // Get MVP user ID
    const userId = await getMvpUserId();
    if (!userId) {
      logError('MVP user not found');
      return { success: false, error: 'User not found' };
    }

    // Fetch all stocks for user
    const stocks = await prisma.stock.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    log('Stocks fetched successfully:', stocks.length);
    return { success: true, data: stocks };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to fetch stocks:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get market data for specified tickers
 *
 * @param tickers - Array of stock tickers to fetch market data for
 * @returns IActionResult with array of market data or error
 */
export async function getMarketData(
  tickers: string[],
): Promise<IActionResult<MarketData[]>> {
  log('Fetching market data for:', tickers.join(', '));

  try {
    if (tickers.length === 0) {
      return { success: true, data: [] };
    }

    const marketData = await prisma.marketData.findMany({
      where: { ticker: { in: tickers } },
    });

    log('Market data fetched successfully:', marketData.length);
    return { success: true, data: marketData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to fetch market data:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
