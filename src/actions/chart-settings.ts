'use server';

/**
 * Server actions for chart timeframe settings
 */

import { revalidatePath } from 'next/cache';
import type { IChartTimeframeSettings } from '@/lib/constants';
import {
  getChartTimeframeSettings,
  updateChartTimeframeSetting,
} from '@/lib/settings';

/**
 * Get chart timeframe settings
 */
export async function getChartSettings(): Promise<IChartTimeframeSettings> {
  return await getChartTimeframeSettings();
}

/**
 * Update portfolio chart timeframe setting
 */
export async function updatePortfolioChartTimeframe(
  value: string,
): Promise<void> {
  try {
    await updateChartTimeframeSetting('PORTFOLIO_CHART', value);
    revalidatePath('/');
  } catch (error) {
    console.error(
      '[Action] Failed to update portfolio chart timeframe:',
      error,
    );
    throw new Error('Failed to update portfolio chart timeframe');
  }
}

/**
 * Update portfolio change timeframe setting
 */
export async function updatePortfolioChangeTimeframe(
  value: string,
): Promise<void> {
  try {
    await updateChartTimeframeSetting('PORTFOLIO_CHANGE', value);
    revalidatePath('/');
  } catch (error) {
    console.error(
      '[Action] Failed to update portfolio change timeframe:',
      error,
    );
    throw new Error('Failed to update portfolio change timeframe');
  }
}

/**
 * Update ticker chart timeframe setting
 * Note: This triggers a data refresh to fetch historical data for the new timeframe
 */
export async function updateTickerChartTimeframe(value: string): Promise<void> {
  try {
    await updateChartTimeframeSetting('TICKER_CHART', value);

    // Trigger data refresh with new timeframe by calling the cron endpoint internally
    // This ensures the historical data matches the selected timeframe immediately
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/stocks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        console.warn('[Action] Data refresh triggered but may have failed');
      }
    } catch (refreshError) {
      console.warn(
        '[Action] Could not trigger immediate data refresh:',
        refreshError,
      );
      // Non-fatal: cron will run on schedule anyway
    }

    revalidatePath('/');
  } catch (error) {
    console.error('[Action] Failed to update ticker chart timeframe:', error);
    throw new Error('Failed to update ticker chart timeframe');
  }
}

/**
 * Update gauge change timeframe setting
 * Note: This triggers a data refresh so historicalData covers the new timeframe
 */
export async function updateGaugeChangeTimeframe(value: string): Promise<void> {
  try {
    await updateChartTimeframeSetting('GAUGE_CHANGE', value);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/stocks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        console.warn('[Action] Data refresh triggered but may have failed');
      }
    } catch (refreshError) {
      console.warn(
        '[Action] Could not trigger immediate data refresh:',
        refreshError,
      );
    }

    revalidatePath('/');
  } catch (error) {
    console.error('[Action] Failed to update gauge change timeframe:', error);
    throw new Error('Failed to update gauge change timeframe');
  }
}

/**
 * Update ticker change timeframe setting
 * Note: This triggers a data refresh to fetch historical data for the new timeframe
 */
export async function updateTickerChangeTimeframe(
  value: string,
): Promise<void> {
  try {
    await updateChartTimeframeSetting('TICKER_CHANGE', value);

    // Trigger data refresh with new timeframe by calling the cron endpoint internally
    // This ensures the historical data matches the selected timeframe immediately
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/stocks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        console.warn('[Action] Data refresh triggered but may have failed');
      }
    } catch (refreshError) {
      console.warn(
        '[Action] Could not trigger immediate data refresh:',
        refreshError,
      );
      // Non-fatal: cron will run on schedule anyway
    }

    revalidatePath('/');
  } catch (error) {
    console.error('[Action] Failed to update ticker change timeframe:', error);
    throw new Error('Failed to update ticker change timeframe');
  }
}
