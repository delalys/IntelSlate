/**
 * Settings utility functions for chart timeframe configuration
 */

import {
  DEFAULT_TIMEFRAMES,
  type IChartTimeframeSettings,
} from '@/lib/constants';
import prisma from '@/lib/prisma';
import { DEFAULT_THEME_ID, type TThemeId } from '@/theme-engine/types';

// =============================================================================
// Setting Keys
// =============================================================================

const SETTING_KEYS = {
  PORTFOLIO_CHART: 'chart.portfolio.timeframe',
  PORTFOLIO_CHANGE: 'chart.portfolio.change',
  TICKER_CHART: 'chart.ticker.timeframe',
  TICKER_CHANGE: 'chart.ticker.change',
  GAUGE_CHANGE: 'chart.gauge.change',
} as const;

/** Key for Claude API key in SystemConfig (server-only; never send raw value to client) */
export const CLAUDE_API_KEY_SETTING = 'claude.api_key';

/** Key for app theme in SystemConfig */
export const THEME_SETTING_KEY = 'app.theme';

// =============================================================================
// Public Functions
// =============================================================================

/**
 * Get all chart timeframe settings from database
 * Returns default values if settings don't exist
 */
export async function getChartTimeframeSettings(): Promise<IChartTimeframeSettings> {
  try {
    const settings = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: Object.values(SETTING_KEYS),
        },
      },
    });

    console.log('[Settings] Raw settings from DB:', settings);

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const result = {
      portfolioChart:
        settingsMap.get(SETTING_KEYS.PORTFOLIO_CHART) ??
        DEFAULT_TIMEFRAMES.portfolioChart,
      portfolioChange:
        settingsMap.get(SETTING_KEYS.PORTFOLIO_CHANGE) ??
        DEFAULT_TIMEFRAMES.portfolioChange,
      tickerChart:
        settingsMap.get(SETTING_KEYS.TICKER_CHART) ??
        DEFAULT_TIMEFRAMES.tickerChart,
      tickerChange:
        settingsMap.get(SETTING_KEYS.TICKER_CHANGE) ??
        DEFAULT_TIMEFRAMES.tickerChange,
      gaugeChange:
        settingsMap.get(SETTING_KEYS.GAUGE_CHANGE) ??
        DEFAULT_TIMEFRAMES.gaugeChange,
    };

    console.log('[Settings] Resolved settings:', result);

    return result;
  } catch (error) {
    console.error(
      '[Settings] Failed to fetch chart timeframe settings:',
      error,
    );
    return DEFAULT_TIMEFRAMES;
  }
}

/**
 * Update a single chart timeframe setting in database
 */
export async function updateChartTimeframeSetting(
  key: keyof typeof SETTING_KEYS,
  value: string,
): Promise<void> {
  try {
    const settingKey = SETTING_KEYS[key];

    await prisma.systemConfig.upsert({
      where: { key: settingKey },
      update: { value },
      create: { key: settingKey, value },
    });
  } catch (error) {
    console.error(`[Settings] Failed to update setting ${key}:`, error);
    throw error;
  }
}

// =============================================================================
// Claude API Key (server-only; never expose raw key to client)
// =============================================================================

/**
 * Get Claude API key from database (server-only).
 * Used by summarization pipeline to choose Claude vs Ollama.
 */
export async function getClaudeApiKey(): Promise<string | null> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { key: CLAUDE_API_KEY_SETTING },
    });
    const value = row?.value?.trim();
    return value && value.length > 0 ? value : null;
  } catch (error) {
    console.error('[Settings] Failed to fetch Claude API key:', error);
    return null;
  }
}

/**
 * Set or clear Claude API key in database.
 * Pass empty string to clear.
 */
export async function setClaudeApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  try {
    if (trimmed.length === 0) {
      await prisma.systemConfig.deleteMany({
        where: { key: CLAUDE_API_KEY_SETTING },
      });
      return;
    }
    await prisma.systemConfig.upsert({
      where: { key: CLAUDE_API_KEY_SETTING },
      update: { value: trimmed },
      create: { key: CLAUDE_API_KEY_SETTING, value: trimmed },
    });
  } catch (error) {
    console.error('[Settings] Failed to set Claude API key:', error);
    throw error;
  }
}

/**
 * Check whether a Claude API key is configured (for UI only; does not return the key).
 */
export async function getClaudeApiKeyStatus(): Promise<{ isSet: boolean }> {
  const key = await getClaudeApiKey();
  return { isSet: key !== null };
}

// =============================================================================
// Theme (app.theme)
// =============================================================================

/**
 * Get stored theme id from database. Returns default on missing or error.
 */
export async function getThemeId(): Promise<TThemeId> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { key: THEME_SETTING_KEY },
    });
    const value = row?.value?.trim();
    if (value && (value === 'default' || value === 'retro-ink')) {
      return value as TThemeId;
    }
    return DEFAULT_THEME_ID;
  } catch (error) {
    console.error('[Settings] Failed to fetch theme id:', error);
    return DEFAULT_THEME_ID;
  }
}

/**
 * Set theme id in database.
 */
export async function setThemeId(value: TThemeId): Promise<void> {
  try {
    await prisma.systemConfig.upsert({
      where: { key: THEME_SETTING_KEY },
      update: { value },
      create: { key: THEME_SETTING_KEY, value },
    });
  } catch (error) {
    console.error('[Settings] Failed to set theme id:', error);
    throw error;
  }
}
