'use server';

/**
 * Stock Search Server Action
 *
 * Server Action for searching stock symbols via Yahoo Finance.
 * Runs server-side for consistency.
 *
 * @module actions/stock-search
 */

import {
  getDefaultYahooFinanceClient,
  type ISymbolSearchResult,
} from '@/lib/api/yahooFinanceClient';
import type { IActionResult } from './stocks';

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[StockSearch]';
const MIN_QUERY_LENGTH = 2;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs a message with the [StockSearch] prefix
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the [StockSearch] prefix
 */
function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

// =============================================================================
// Server Actions
// =============================================================================

/**
 * Search for stock symbols matching the given query
 *
 * This server action calls Yahoo Finance to find matching
 * stock symbols with company names and regions.
 *
 * @param query - Search keywords (minimum 2 characters)
 * @returns ActionResult with array of matching symbols or error
 */
export async function searchStocks(
  query: string,
): Promise<IActionResult<ISymbolSearchResult[]>> {
  const trimmedQuery = query.trim();

  log('Searching stocks:', trimmedQuery);

  // Validate minimum query length
  if (trimmedQuery.length < MIN_QUERY_LENGTH) {
    logError('Query too short:', trimmedQuery.length);
    return {
      success: false,
      error: `Search query must be at least ${MIN_QUERY_LENGTH} characters`,
    };
  }

  // Get Yahoo Finance client
  const client = getDefaultYahooFinanceClient();

  // Perform search
  const result = await client.searchSymbols(trimmedQuery);

  if (!result.success) {
    logError('Search failed:', result.error);
    return {
      success: false,
      error: result.error,
    };
  }

  log('Search successful:', result.results.length, 'results');
  return {
    success: true,
    data: result.results,
  };
}
