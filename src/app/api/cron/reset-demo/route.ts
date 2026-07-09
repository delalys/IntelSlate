/**
 * Demo Data Reset Cron Endpoint
 *
 * POST /api/cron/reset-demo
 *
 * This is a public demo instance — visitors can add/edit/remove stocks via
 * the UI with no authentication. This endpoint snaps the portfolio and
 * related settings back to the canonical mock data, so one visitor's
 * changes don't permanently affect what everyone else sees.
 *
 * Recommended schedule: every 10 minutes.
 *
 * @module app/api/cron/reset-demo/route
 */

import { NextResponse } from 'next/server';
import { MVP_USER_EMAIL } from '@/lib/constants';
import { DEMO_STOCKS, DEMO_SYSTEM_CONFIG } from '@/lib/demoData';
import prisma from '@/lib/prisma';

const LOG_PREFIX = '[ResetDemoCron]';

function log(message: string, ...args: unknown[]): void {
  console.log(`${LOG_PREFIX} ${message}`, ...args);
}

function logError(message: string, ...args: unknown[]): void {
  console.error(`${LOG_PREFIX} ${message}`, ...args);
}

/**
 * Checks if the request has valid authentication (if auth is configured)
 */
function isAuthorized(request: Request): boolean {
  const requiredToken = process.env.CRON_AUTH_TOKEN;
  if (!requiredToken) {
    return true;
  }
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }
  const token = authHeader.replace(/^Bearer\s+/, '');
  return token === requiredToken;
}

/**
 * POST /api/cron/reset-demo
 *
 * Resets the MVP user's stock positions and demo-related SystemConfig
 * entries back to the canonical mock data.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    logError('Unauthorized cron request');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: MVP_USER_EMAIL },
      select: { id: true },
    });

    if (!user) {
      logError('MVP user not found');
      return NextResponse.json(
        { success: false, error: 'MVP user not found' },
        { status: 500 },
      );
    }

    const canonicalTickers = DEMO_STOCKS.map((s) => s.ticker);

    // Remove any stock positions visitors added that aren't part of the mock portfolio
    const removed = await prisma.stock.deleteMany({
      where: {
        userId: user.id,
        ticker: { notIn: canonicalTickers },
      },
    });

    // Restore the canonical mock positions (undoes edits to price/quantity/logo)
    for (const stock of DEMO_STOCKS) {
      await prisma.stock.upsert({
        where: { userId_ticker: { userId: user.id, ticker: stock.ticker } },
        update: {
          buyPrice: stock.buyPrice,
          quantity: stock.quantity,
          logoUrl: `/api/logo/${stock.domain}`,
        },
        create: {
          userId: user.id,
          ticker: stock.ticker,
          buyPrice: stock.buyPrice,
          quantity: stock.quantity,
          logoUrl: `/api/logo/${stock.domain}`,
        },
      });
    }

    // Restore demo-related app settings (theme, chart timeframes)
    for (const setting of DEMO_SYSTEM_CONFIG) {
      await prisma.systemConfig.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
      });
    }

    log(
      `Reset complete: removed ${removed.count} non-canonical stock(s), restored ${DEMO_STOCKS.length} mock positions and ${DEMO_SYSTEM_CONFIG.length} settings`,
    );

    return NextResponse.json({
      success: true,
      removedStocks: removed.count,
      restoredStocks: DEMO_STOCKS.length,
      restoredSettings: DEMO_SYSTEM_CONFIG.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    logError('Demo reset failed:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
