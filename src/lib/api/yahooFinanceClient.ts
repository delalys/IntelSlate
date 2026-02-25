/**
 * Yahoo Finance API Client
 *
 * Provides stock symbol search, quotes, and historical data via yahoo-finance2 library.
 * Server-side only. No API key required.
 *
 * @module lib/api/yahooFinanceClient
 */

import YahooFinance from 'yahoo-finance2';

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[YahooFinance]';
const MIN_QUERY_LENGTH = 2;

// Initialize yahoo-finance2 v3 client (requires instantiation)
const yahooFinance = new YahooFinance();

// =============================================================================
// Types
// =============================================================================

/**
 * Search result for a single stock symbol
 */
export interface ISymbolSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  matchScore: number;
}

/**
 * Response from searchSymbols method
 */
export interface ISearchResponse {
  success: boolean;
  results: ISymbolSearchResult[];
  error?: string;
}

/**
 * Stock quote data
 */
export interface IStockQuote {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

/**
 * Historical daily data point (OHLCV)
 */
export interface IHistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs a message with the [YahooFinance] prefix
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the [YahooFinance] prefix
 */
function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Format a date as YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a date with time as YYYY-MM-DD HH:MM string
 */
function formatDateTime(date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toISOString().split('T')[1].slice(0, 5);
  return `${dateStr} ${timeStr}`;
}

/**
 * Get the appropriate interval for a timeframe
 */
function getIntervalForTimeframe(timeframe: string): string {
  switch (timeframe) {
    case '1d':
      return '15m'; // 15-minute intervals for 1 day
    case '5d':
      return '1h'; // 1-hour intervals for 5 days
    default:
      return '1d'; // Daily intervals for longer periods
  }
}

/**
 * Calculate how many calendar days back we need to go to get N trading days
 * Accounts for weekends dynamically based on current day of week
 * @param tradingDays - Number of trading days needed
 * @returns Number of calendar days to go back
 */
function getCalendarDaysForTradingDays(tradingDays: number): number {
  const now = new Date();
  const _dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Count backwards to find how many calendar days we need
  let calendarDays = 0;
  let tradingDaysFound = 0;
  const checkDate = new Date(now);

  while (tradingDaysFound < tradingDays) {
    calendarDays++;
    checkDate.setDate(checkDate.getDate() - 1);
    const checkDay = checkDate.getDay();

    // Count it as a trading day if it's Monday-Friday (1-5)
    if (checkDay >= 1 && checkDay <= 5) {
      tradingDaysFound++;
    }
  }

  return calendarDays;
}

/**
 * Convert timeframe value to start date for Yahoo Finance API
 * @param timeframe - Timeframe value (e.g., '1d', '5d', '1mo', 'ytd', '1y', '5y', 'max')
 * @returns Start date for the timeframe
 */
function getStartDateForTimeframe(timeframe: string): Date {
  const now = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case '1d':
      // For 1 day intraday, show only today's trading session
      // Set start to beginning of today (00:00)
      startDate.setHours(0, 0, 0, 0);
      break;
    case '5d': {
      // Dynamically calculate calendar days needed for 5 trading days
      const daysBack = getCalendarDaysForTradingDays(5);
      startDate.setDate(now.getDate() - daysBack);
      break;
    }
    case '1mo':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '6mo':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'ytd':
      startDate.setMonth(0, 1); // January 1st of current year
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case '5y':
      startDate.setFullYear(now.getFullYear() - 5);
      break;
    case 'max':
      startDate.setFullYear(1970, 0, 1); // Unix epoch as "max" start
      break;
    default:
      // Default to 1 month
      startDate.setMonth(now.getMonth() - 1);
  }

  return startDate;
}

// =============================================================================
// YahooFinanceClient Class
// =============================================================================

/**
 * Client for Yahoo Finance API operations
 */
export class YahooFinanceClient {
  /**
   * Search for stock symbols matching the given query
   *
   * @param query - Search keywords (minimum 2 characters)
   * @returns ISearchResponse with matching symbols sorted by relevance
   */
  async searchSymbols(query: string): Promise<ISearchResponse> {
    const trimmedQuery = query.trim();

    // Validate minimum query length
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return {
        success: false,
        results: [],
        error: `Search query must be at least ${MIN_QUERY_LENGTH} characters`,
      };
    }

    log('Searching symbols:', trimmedQuery);

    try {
      const searchResult = await yahooFinance.search(trimmedQuery, {
        quotesCount: 10,
        newsCount: 0,
      });

      // Map Yahoo Finance results to our interface
      const results: ISymbolSearchResult[] = (searchResult.quotes || [])
        .filter((quote) => quote.symbol && quote.shortname)
        .map((quote, index) => ({
          symbol: String(quote.symbol),
          name: String(quote.shortname || quote.longname || quote.symbol),
          type: String(quote.quoteType || 'Equity'),
          region: String(quote.exchDisp || 'Unknown'),
          // Note: yahoo-finance2 search doesn't include currency, defaults to USD
          // For accurate currency, would need a separate quote() call per result
          currency: 'USD',
          // Calculate match score based on position (first result = best match)
          matchScore: Number(((10 - index) / 10).toFixed(4)),
        }));

      log('Search completed:', results.length, 'results');
      return {
        success: true,
        results,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError('Search failed:', errorMessage);
      return {
        success: false,
        results: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Get current quote data for a stock ticker
   *
   * @param ticker - Stock ticker symbol (e.g., "AAPL")
   * @returns IStockQuote with price, previousClose, change, changePercent or null on failure
   */
  async getQuote(ticker: string): Promise<IStockQuote | null> {
    const trimmedTicker = ticker.trim().toUpperCase();

    if (trimmedTicker.length === 0) {
      logError('Empty ticker provided');
      return null;
    }

    log('Fetching quote for:', trimmedTicker);

    try {
      const quote = await yahooFinance.quote(trimmedTicker);

      if (!quote || quote.regularMarketPrice === undefined) {
        logError('Empty quote response for:', trimmedTicker);
        return null;
      }

      const price = quote.regularMarketPrice;
      const previousClose = quote.regularMarketPreviousClose ?? price;
      const change = quote.regularMarketChange ?? 0;
      const changePercent = quote.regularMarketChangePercent ?? 0;

      const result: IStockQuote = {
        symbol: quote.symbol || trimmedTicker,
        price,
        previousClose,
        change,
        changePercent,
      };

      log('Quote fetched for:', trimmedTicker, 'price:', result.price);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError('Quote fetch failed:', errorMessage);
      return null;
    }
  }

  /**
   * Get historical daily data for a stock ticker
   *
   * @param ticker - Stock ticker symbol (e.g., "AAPL")
   * @param timeframe - Timeframe value (e.g., '1d', '5d', '1mo', 'ytd', '1y', '5y', 'max'). Defaults to '1mo'.
   * @returns Array of IHistoricalDataPoint (OHLCV) sorted by date descending, or null on failure
   */
  async getHistoricalData(
    ticker: string,
    timeframe: string = '1mo',
  ): Promise<IHistoricalDataPoint[] | null> {
    const trimmedTicker = ticker.trim().toUpperCase();

    if (trimmedTicker.length === 0) {
      logError('Empty ticker provided');
      return null;
    }

    log(
      'Fetching historical data for:',
      trimmedTicker,
      'timeframe:',
      timeframe,
    );

    try {
      // Calculate date range and interval based on timeframe
      const endDate = new Date();
      const startDate = getStartDateForTimeframe(timeframe);
      const interval = getIntervalForTimeframe(timeframe);
      const useDateTime = interval !== '1d'; // Use datetime for intraday data

      log(
        'Fetching with interval:',
        interval,
        'from:',
        startDate,
        'to:',
        endDate,
      );

      type TYahooQuoteRow = {
        date: Date;
        open: number | null;
        high: number | null;
        low: number | null;
        close: number | null;
        volume: number | null;
      };

      let rawData: TYahooQuoteRow[];

      if (interval === '15m' || interval === '1h') {
        const chartResult = await yahooFinance.chart(trimmedTicker, {
          period1: startDate,
          period2: endDate,
          interval: interval as '15m' | '1h' | '1d' | '1wk' | '1mo',
        });

        if (
          !chartResult ||
          !chartResult.quotes ||
          chartResult.quotes.length === 0
        ) {
          logError('Empty chart data response for:', trimmedTicker);
          return null;
        }

        rawData = chartResult.quotes as TYahooQuoteRow[];
      } else {
        const historicalResult = await yahooFinance.historical(trimmedTicker, {
          period1: startDate,
          period2: endDate,
          interval: interval as '1d' | '1wk' | '1mo',
        });

        if (!historicalResult || historicalResult.length === 0) {
          logError('Empty historical data response for:', trimmedTicker);
          return null;
        }

        rawData = historicalResult as TYahooQuoteRow[];
      }

      // Map to our interface and sort by date ascending (oldest first, for chart display)
      const results: IHistoricalDataPoint[] = rawData
        .map((dataPoint) => ({
          date: useDateTime
            ? formatDateTime(dataPoint.date)
            : formatDate(dataPoint.date),
          open: dataPoint.open ?? 0,
          high: dataPoint.high ?? 0,
          low: dataPoint.low ?? 0,
          close: dataPoint.close ?? 0,
          volume: dataPoint.volume ?? 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      log(
        'Historical data fetched for:',
        trimmedTicker,
        'timeframe:',
        timeframe,
        'interval:',
        interval,
        'data points:',
        results.length,
        'dates:',
        results.length > 0
          ? `${results[0].date} to ${results[results.length - 1].date}`
          : 'none',
      );
      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logError('Historical data fetch failed:', errorMessage);
      return null;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let defaultClient: YahooFinanceClient | null = null;

/**
 * Get the default Yahoo Finance client
 *
 * @returns YahooFinanceClient instance (always returns a valid client, no API key needed)
 */
export function getDefaultYahooFinanceClient(): YahooFinanceClient {
  if (!defaultClient) {
    defaultClient = new YahooFinanceClient();
  }

  return defaultClient;
}
