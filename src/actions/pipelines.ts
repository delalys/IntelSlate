'use server';

/**
 * Pipeline Server Actions
 *
 * Server Actions for manually triggering data pipelines
 * (Stock refresh, News fetch).
 *
 * @module actions/pipelines
 */

import prisma from '@/lib/prisma';
import { getDefaultMarketDataService } from '@/lib/services/marketDataService';
import { getDefaultNewsService } from '@/lib/services/newsService';
import { MVP_USER_EMAIL } from '@/lib/constants';
import type { IActionResult } from './stocks';

// =============================================================================
// Constants
// =============================================================================

const LOG_PREFIX = '[PipelineActions]';

// =============================================================================
// Types
// =============================================================================

interface IPipelineResult {
  processed: number;
  successCount: number;
  failureCount: number;
}

interface ILastRunTimes {
  stocksLastRun: string | null;
  newsLastRun: string | null;
}

interface INewsServiceResult {
  success: boolean;
  articles: { title: string; content: string; summary?: string }[];
  error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

// =============================================================================
// Server Actions
// =============================================================================

/**
 * Trigger a refresh of all stock market data
 */
export async function triggerStockRefresh(): Promise<
  IActionResult<IPipelineResult>
> {
  log('Triggering stock refresh');

  try {
    const service = getDefaultMarketDataService();
    const result = await service.refreshAllMarketData();

    log(
      'Stock refresh complete:',
      result.successCount,
      'succeeded,',
      result.failureCount,
      'failed',
    );

    // Create portfolio snapshot after refreshing market data
    try {
      const user = await prisma.user.findUnique({
        where: { email: MVP_USER_EMAIL },
        select: { id: true },
      });

      if (user) {
        const stocks = await prisma.stock.findMany({
          where: { userId: user.id },
        });

        const marketData = await prisma.marketData.findMany({
          where: { ticker: { in: stocks.map((s) => s.ticker) } },
        });

        const marketDataMap = new Map(marketData.map((m) => [m.ticker, m]));

        const totalValue = stocks.reduce((sum, stock) => {
          const marketEntry = marketDataMap.get(stock.ticker);
          const price = marketEntry?.price ?? stock.buyPrice;
          return sum + price * stock.quantity;
        }, 0);

        const today = new Date().toISOString().split('T')[0];

        await prisma.portfolioSnapshot.upsert({
          where: { userId_date: { userId: user.id, date: today } },
          update: { totalValue },
          create: { userId: user.id, date: today, totalValue },
        });

        log(
          'Portfolio snapshot saved for',
          today,
          'value:',
          totalValue.toFixed(2),
        );
      }
    } catch (snapshotError) {
      logError('Portfolio snapshot failed (non-critical):', snapshotError);
    }

    return {
      success: true,
      data: {
        processed: result.totalTickers,
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Stock refresh failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Trigger news fetch for all tracked stocks
 */
export async function triggerNewsRefresh(): Promise<
  IActionResult<IPipelineResult>
> {
  log('Triggering news refresh');

  try {
    // Get all stocks for the MVP user
    const user = await prisma.user.findUnique({
      where: { email: MVP_USER_EMAIL },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const stocks = await prisma.stock.findMany({
      where: { userId: user.id },
      select: { ticker: true },
    });

    if (stocks.length === 0) {
      return {
        success: true,
        data: { processed: 0, successCount: 0, failureCount: 0 },
      };
    }

    const stockInputs = stocks.map((s) => ({
      ticker: s.ticker,
      companyName: s.ticker,
    }));

    const newsService = await getDefaultNewsService();
    const results =
      await newsService.fetchAndSummarizeNewsForMultiple(stockInputs);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    log(
      'News refresh complete:',
      successCount,
      'succeeded,',
      failureCount,
      'failed',
    );

    return {
      success: true,
      data: {
        processed: results.length,
        successCount,
        failureCount,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('News refresh failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Trigger news fetch for a single stock ticker
 */
export async function triggerNewsRefreshForSingle(
  ticker: string,
  companyName?: string,
): Promise<IActionResult<INewsServiceResult>> {
  log('Triggering news refresh for single ticker:', ticker);

  try {
    const newsService = await getDefaultNewsService();
    const result = await newsService.fetchAndSummarizeNews(
      ticker,
      companyName || ticker,
    );

    if (result.success) {
      log(
        'News refresh complete for:',
        ticker,
        'articles:',
        result.articles.length,
      );
    } else {
      logError('News refresh failed for:', ticker, result.error);
    }

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('News refresh failed for:', ticker, errorMessage);
    return {
      success: false,
      error: errorMessage,
      data: {
        success: false,
        articles: [],
        error: errorMessage,
      },
    };
  }
}

/**
 * Run all pipelines sequentially: stocks → news
 */
export async function triggerAllPipelines(): Promise<
  IActionResult<IPipelineResult>
> {
  log('Triggering all pipelines');

  try {
    const stockResult = await triggerStockRefresh();
    const newsResult = await triggerNewsRefresh();

    const results = [stockResult, newsResult];
    const failed = results.find((r) => !r.success);

    const totalProcessed = results.reduce(
      (sum, r) => sum + (r.data?.processed ?? 0),
      0,
    );
    const totalSuccess = results.reduce(
      (sum, r) => sum + (r.data?.successCount ?? 0),
      0,
    );
    const totalFailure = results.reduce(
      (sum, r) => sum + (r.data?.failureCount ?? 0),
      0,
    );

    log(
      'All pipelines complete:',
      totalSuccess,
      'succeeded,',
      totalFailure,
      'failed',
    );

    return {
      success: !failed,
      data: {
        processed: totalProcessed,
        successCount: totalSuccess,
        failureCount: totalFailure,
      },
      ...(failed && { error: failed.error }),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('All pipelines failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get last run times for pipelines based on most recent DB updates
 */
export async function getLastRunTimes(): Promise<IActionResult<ILastRunTimes>> {
  try {
    const [stockResult, newsResult] = await Promise.all([
      prisma.marketData.aggregate({ _max: { updatedAt: true } }),
      prisma.newsCache.aggregate({ _max: { updatedAt: true } }),
    ]);

    return {
      success: true,
      data: {
        stocksLastRun: stockResult._max.updatedAt?.toISOString() ?? null,
        newsLastRun: newsResult._max.updatedAt?.toISOString() ?? null,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to get last run times:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
