/**
 * Stock Price Refresh Cron Endpoint
 *
 * POST /api/cron/stocks
 *
 * Triggers market data refresh for all tracked stocks. Designed to be called
 * by external cron services (e.g., cron-job.org) on a scheduled basis.
 *
 * Recommended schedule: Hourly at :55 (5 minutes before TRMNL screenshot)
 *
 * @module app/api/cron/stocks/route
 */

import { NextResponse } from 'next/server';
import { MVP_USER_EMAIL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { getDefaultMarketDataService } from '@/lib/services/marketDataService';

const LOG_PREFIX = '[CronJob]';

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
 * POST /api/cron/stocks
 *
 * Refreshes market data for all tracked stocks.
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
  log('Stock price refresh cron job started at', startTime.toISOString());

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
    // Get the market data service
    const service = getDefaultMarketDataService();

    if (!service) {
      logError('Market data service not available');
      return NextResponse.json(
        {
          success: false,
          error: 'Market data service not available',
        },
        { status: 500 },
      );
    }

    // Trigger the refresh
    log('Triggering market data refresh...');
    const result = await service.refreshAllMarketData();

    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

    log(
      'Stock price refresh completed:',
      result.successCount,
      'succeeded,',
      result.failureCount,
      'failed in',
      durationSeconds.toFixed(1),
      'seconds',
    );

    // Create portfolio snapshot with fresh prices
    let snapshotCreated = false;
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

        snapshotCreated = true;
        log(
          'Portfolio snapshot saved for',
          today,
          'value:',
          totalValue.toFixed(2),
        );
      }
    } catch (snapshotError) {
      logError(
        'Portfolio snapshot failed (non-critical):',
        snapshotError instanceof Error
          ? snapshotError.message
          : 'Unknown error',
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      stocksUpdated: result.successCount,
      totalStocks: result.totalTickers,
      failures: result.failureCount,
      snapshotCreated,
      timestamp: endTime.toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    logError('Stock price refresh failed:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
