/**
 * News Refresh Cron Endpoint
 *
 * POST /api/cron/news
 *
 * Triggers news refresh for stocks with significant price changes.
 * Applies smart selection logic to minimize API usage:
 * 1. Select stocks with ≥3% daily change (positive or negative)
 * 2. If none qualify, select the top movers by absolute change (fallback)
 * 3. Maximum 4 stocks selected for news fetching
 * 4. Fetches max 2 articles per stock
 *
 * Designed to be called by external cron services (e.g., cron-job.org)
 * Recommended schedule: Daily at 6:00 AM JST
 *
 * @module app/api/cron/news/route
 */

import { NextResponse } from 'next/server';
import type { MarketData, Stock } from '@/generated/prisma/client';
import { MVP_USER_EMAIL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { getDefaultNewsService } from '@/lib/services/newsService';
import { selectByAbsChange } from '@/lib/utils/newsSelection';

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[CronJob]';

/** Minimum absolute change percentage to qualify for news fetch */
const MIN_CHANGE_THRESHOLD = 3;

/** Fallback count when no stocks meet the threshold */
const FALLBACK_STOCK_COUNT = 3;

/** Maximum number of stocks to fetch news for */
const MAX_STOCK_COUNT = 4;

// =============================================================================
// Types
// =============================================================================

interface IStockForNews {
  ticker: string;
  companyName: string;
  changePercent: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs a message with the [CronJob] prefix
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Logs an error with the [CronJob] prefix
 */
function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Checks if the request has valid authentication (if auth is configured)
 *
 * If CRON_AUTH_TOKEN is set in environment variables, validates that the
 * Authorization header matches "Bearer <token>".
 *
 * @param request - The incoming request
 * @returns true if auth is valid or not required, false if auth failed
 */
function isAuthorized(request: Request): boolean {
  const requiredToken = process.env.CRON_AUTH_TOKEN;

  // If no token is configured, allow all requests
  if (!requiredToken) {
    return true;
  }

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.replace(/^Bearer\s+/, '');
  return token === requiredToken;
}

/**
 * Selects stocks for news fetching based on price change criteria.
 *
 * Selection Logic:
 * 1. Filter stocks with ≥3% absolute change
 * 2. If none qualify, take top movers by absolute change (fallback)
 * 3. Sort by absolute change percentage (descending)
 * 4. Limit to MAX_STOCK_COUNT (4)
 */
export function selectStocksForNewsFetch(
  stocks: Stock[],
  marketDataMap: Map<string, MarketData>,
): IStockForNews[] {
  // Build list of stocks with valid market data
  const stocksWithData: IStockForNews[] = [];

  for (const stock of stocks) {
    const marketEntry = marketDataMap.get(stock.ticker);

    // Skip if no market data
    if (!marketEntry) {
      continue;
    }

    stocksWithData.push({
      ticker: stock.ticker,
      companyName: stock.ticker, // Use ticker as company name (we don't store company names)
      changePercent: marketEntry.changePercent,
    });
  }

  return selectByAbsChange(stocksWithData, {
    minAbsChangePercent: MIN_CHANGE_THRESHOLD,
    fallbackCount: FALLBACK_STOCK_COUNT,
    maxCount: MAX_STOCK_COUNT,
  });
}

// =============================================================================
// Route Handler
// =============================================================================

/**
 * POST /api/cron/news
 *
 * Refreshes news for stocks with significant price changes.
 *
 * @param request - The incoming request
 * @returns JSON response with success status and refresh results
 */
export async function POST(request: Request) {
  // Block pipelines in demo mode
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.json(
      { success: false, error: 'Pipelines are disabled in demo mode' },
      { status: 403 },
    );
  }

  const startTime = new Date();
  log('News refresh cron job started at', startTime.toISOString());

  // Optional authentication check
  if (!isAuthorized(request)) {
    logError('Unauthorized cron request');
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    );
  }

  try {
    const newsService = await getDefaultNewsService();

    if (!newsService) {
      logError('News service not available');
      return NextResponse.json(
        {
          success: false,
          error: 'News service not available',
        },
        { status: 500 },
      );
    }

    // Step 1: Get all stocks for MVP user
    log('Fetching stocks for news selection...');
    const stocks = await prisma.stock.findMany({
      where: {
        user: {
          email: MVP_USER_EMAIL,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (stocks.length === 0) {
      log('No stocks found, nothing to refresh');
      return NextResponse.json({
        success: true,
        stocksProcessed: 0,
        stocksSelected: [],
        message: 'No stocks found',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Get market data for all stocks
    const tickers = stocks.map((stock) => stock.ticker);
    const marketData = await prisma.marketData.findMany({
      where: { ticker: { in: tickers } },
    });

    // Build market data map
    const marketDataMap = new Map(
      marketData.map((entry) => [entry.ticker, entry]),
    );

    // Step 3: Apply selection logic
    log('Applying news selection logic...');
    const selectedStocks = selectStocksForNewsFetch(stocks, marketDataMap);

    if (selectedStocks.length === 0) {
      log('No stocks selected for news refresh');
      return NextResponse.json({
        success: true,
        stocksProcessed: 0,
        stocksSelected: [],
        message: 'No stocks with market data',
        timestamp: new Date().toISOString(),
      });
    }

    log(
      'Selected',
      selectedStocks.length,
      'stocks for news fetch:',
      selectedStocks.map((s) => s.ticker).join(', '),
    );

    // Step 4: Fetch news for selected stocks
    log('Fetching news for selected stocks...');
    const results = await newsService.fetchAndSummarizeNewsForMultiple(
      selectedStocks.map((stock) => ({
        ticker: stock.ticker,
        companyName: stock.companyName,
      })),
    );

    // Count successes and failures
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

    log(
      'News refresh completed:',
      successCount,
      'succeeded,',
      failureCount,
      'failed in',
      durationSeconds.toFixed(1),
      'seconds',
    );

    // Return success response
    return NextResponse.json({
      success: true,
      stocksProcessed: results.length,
      successCount,
      failureCount,
      stocksSelected: selectedStocks.map((s) => ({
        ticker: s.ticker,
        changePercent: s.changePercent,
      })),
      timestamp: endTime.toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    logError('News refresh failed:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
