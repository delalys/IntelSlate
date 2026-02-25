/**
 * Market Data Refresh Service
 *
 * Fetches and caches market data (quotes and historical data) for all tracked
 * stocks using the Yahoo Finance API. Handles partial failures gracefully.
 *
 * @module lib/services/marketDataService
 */

import {
  type YahooFinanceClient,
  type IHistoricalDataPoint,
  getDefaultYahooFinanceClient,
} from '../api/yahooFinanceClient';
import prisma from '@/lib/prisma';
import { getChartTimeframeSettings } from '@/lib/settings';

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[MarketData]';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of refreshing data for a single ticker
 */
export interface ITickerRefreshResult {
  /** Stock ticker symbol */
  ticker: string;
  /** Whether the refresh succeeded */
  success: boolean;
  /** Error message if the refresh failed */
  error?: string;
}

/**
 * Aggregate result of refreshing all market data
 */
export interface IRefreshResult {
  /** Total number of tickers processed */
  totalTickers: number;
  /** Number of successful refreshes */
  successCount: number;
  /** Number of failed refreshes */
  failureCount: number;
  /** Individual results for each ticker */
  results: ITickerRefreshResult[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs a message with the [MarketData] prefix
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the [MarketData] prefix
 */
function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Get the maximum timeframe between two timeframe values
 * Used to ensure we fetch enough data for both chart display and change calculations
 *
 * Special handling: If either timeframe is intraday (1d, 5d), we need to fetch
 * enough calendar days to cover the other timeframe, but we'll use intraday intervals
 */
function getMaxTimeframe(timeframe1: string, timeframe2: string): string {
  const timeframeOrder = ['1d', '5d', '1mo', '6mo', 'ytd', '1y', '5y', 'max'];

  const index1 = timeframeOrder.indexOf(timeframe1);
  const index2 = timeframeOrder.indexOf(timeframe2);

  // If either is not found, return the first one as fallback
  if (index1 === -1) return timeframe2;
  if (index2 === -1) return timeframe1;

  // Return the one with higher index (longer timeframe)
  return index1 > index2 ? timeframe1 : timeframe2;
}

// =============================================================================
// Database Functions
// =============================================================================

/**
 * Get all unique stock tickers from the database
 *
 * Queries the Stock table for distinct ticker values across all users.
 *
 * @returns Array of unique ticker strings, or empty array on error
 */
export async function getUniqueTickers(): Promise<string[]> {
  try {
    const stocks = await prisma.stock.findMany({
      select: { ticker: true },
      distinct: ['ticker'],
    });
    return stocks.map((s) => s.ticker);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to get unique tickers:', errorMessage);
    return [];
  }
}

// =============================================================================
// MarketDataService Class
// =============================================================================

/**
 * Service for refreshing and caching market data
 *
 * Orchestrates the pipeline:
 * 1. Get unique tickers from database
 * 2. For each ticker, fetch quote and historical data from Yahoo Finance
 * 3. Upsert data to MarketData table
 */
export class MarketDataService {
  private yahooFinanceClient: YahooFinanceClient;

  constructor(yahooFinanceClient: YahooFinanceClient) {
    this.yahooFinanceClient = yahooFinanceClient;
  }

  /**
   * Refresh market data for a single ticker
   *
   * Fetches current quote and historical data, then upserts to the database.
   *
   * @param ticker - Stock ticker symbol (e.g., "AAPL")
   * @param timeframe - Timeframe for historical data (e.g., '1d', '5d', '1mo', 'ytd', '1y', '5y', 'max'). Defaults to '1mo'.
   * @returns ITickerRefreshResult with success status and any error
   */
  async refreshTickerData(
    ticker: string,
    timeframe: string = '1mo',
  ): Promise<ITickerRefreshResult> {
    log('Refreshing data for:', ticker, 'timeframe:', timeframe);

    try {
      // Fetch quote data
      const quote = await this.yahooFinanceClient.getQuote(ticker);
      if (!quote) {
        logError('Failed to fetch quote for:', ticker);
        return {
          ticker,
          success: false,
          error: 'Failed to fetch quote data',
        };
      }

      // Fetch historical data
      const historicalData = await this.yahooFinanceClient.getHistoricalData(
        ticker,
        timeframe,
      );
      if (historicalData === null) {
        logError('Failed to fetch historical data for:', ticker);
        return {
          ticker,
          success: false,
          error: 'Failed to fetch historical data',
        };
      }

      // Upsert to database
      await this.upsertMarketData(
        ticker,
        quote.price,
        quote.previousClose,
        quote.change,
        quote.changePercent,
        historicalData,
      );

      log('Successfully refreshed data for:', ticker);
      return {
        ticker,
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError('Error refreshing data for:', ticker, errorMessage);
      return {
        ticker,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Refresh market data for all tracked tickers
   *
   * Gets all unique tickers from the database and refreshes each one
   * sequentially.
   *
   * @returns IRefreshResult with aggregate success/failure counts and details
   */
  async refreshAllMarketData(): Promise<IRefreshResult> {
    log('Starting market data refresh for all tickers');

    // Get chart timeframe settings
    const settings = await getChartTimeframeSettings();

    // Use the maximum across chart display, ticker change, and gauge change so
    // historicalData always covers enough history for every calculation.
    const fetchTimeframe = [settings.tickerChange, settings.gaugeChange].reduce(
      (max, tf) => getMaxTimeframe(max, tf),
      settings.tickerChart,
    );

    // Get unique tickers
    const tickers = await getUniqueTickers();

    if (tickers.length === 0) {
      log('No tickers to refresh');
      return {
        totalTickers: 0,
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }

    log(
      'Found',
      tickers.length,
      'unique tickers to refresh with timeframe:',
      fetchTimeframe,
      '(chart:',
      settings.tickerChart,
      ', tickerChange:',
      settings.tickerChange,
      ', gaugeChange:',
      settings.gaugeChange,
      ')',
    );

    const results: ITickerRefreshResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];

      const result = await this.refreshTickerData(ticker, fetchTimeframe);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    log(
      'Market data refresh completed:',
      successCount,
      'succeeded,',
      failureCount,
      'failed',
    );

    return {
      totalTickers: tickers.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Upsert market data to the database
   *
   * @param ticker - Stock ticker symbol
   * @param price - Current price
   * @param previousClose - Previous close price
   * @param change - Price change
   * @param changePercent - Price change percentage
   * @param historicalData - Array of historical data points
   */
  private async upsertMarketData(
    ticker: string,
    price: number,
    previousClose: number,
    change: number,
    changePercent: number,
    historicalData: IHistoricalDataPoint[],
  ): Promise<void> {
    await prisma.marketData.upsert({
      where: { ticker },
      update: {
        price,
        previousClose,
        change,
        changePercent,
        historicalData: historicalData as unknown as object[],
      },
      create: {
        ticker,
        price,
        previousClose,
        change,
        changePercent,
        historicalData: historicalData as unknown as object[],
      },
    });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let defaultService: MarketDataService | null = null;

/**
 * Get the default MarketDataService using Yahoo Finance client
 *
 * @returns MarketDataService instance (always available, no API key needed)
 */
export function getDefaultMarketDataService(): MarketDataService {
  if (!defaultService) {
    const yahooFinanceClient = getDefaultYahooFinanceClient();
    defaultService = new MarketDataService(yahooFinanceClient);
  }

  return defaultService;
}
