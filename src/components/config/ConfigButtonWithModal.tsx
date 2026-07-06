'use client';

/**
 * ConfigButtonWithModal Component
 *
 * A wrapper component that combines ConfigButton with ConfigModal,
 * managing the modal open/close state and stock data fetching.
 *
 * This component should be placed in the layout to provide configuration
 * access throughout the dashboard.
 *
 * @module components/config/ConfigButtonWithModal
 */

import { useCallback, useEffect, useState } from 'react';
import { getChartSettings } from '@/actions/chart-settings';
import { getClaudeApiKeyStatus } from '@/actions/claude-api-key';
import { getMarketData, getStocks } from '@/actions/stocks';
import { getTheme, updateTheme } from '@/actions/theme';
import type { MarketData, Stock } from '@/generated/prisma/client';
import type { IChartTimeframeSettings } from '@/lib/constants';
import { DEFAULT_TIMEFRAMES } from '@/lib/constants';
import { isScreenshotMode } from '@/lib/screenshot';
import { useTheme } from '@/theme-engine/ThemeProvider';
import { DEFAULT_THEME_ID, type TThemeId } from '@/theme-engine/types';
import { ConfigButton } from './ConfigButton';
import { ConfigModal } from './ConfigModal';

// =============================================================================
// Component
// =============================================================================

const LOG_PREFIX = '[ConfigButtonWithModal]';

export function ConfigButtonWithModal({
  autoOpen = false,
  isDemoMode = false,
}: {
  autoOpen?: boolean;
  isDemoMode?: boolean;
}) {
  const { setTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chartSettings, setChartSettings] =
    useState<IChartTimeframeSettings>(DEFAULT_TIMEFRAMES);
  const [themeId, setThemeId] = useState<TThemeId>(DEFAULT_THEME_ID);
  const [claudeApiKeyStatus, setClaudeApiKeyStatus] = useState({
    isSet: false,
  });
  const [isHiddenForScreenshot, setIsHiddenForScreenshot] = useState(false);

  useEffect(() => {
    setIsHiddenForScreenshot(isScreenshotMode());
  }, []);

  /**
   * Fetch stocks, market data, and chart settings from the server
   */
  const fetchStocks = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, settings, theme, status] = await Promise.all([
        getStocks(),
        getChartSettings(),
        getTheme(),
        getClaudeApiKeyStatus(),
      ]);

      setChartSettings(settings);
      setThemeId(theme);
      setClaudeApiKeyStatus(status);

      if (result.success) {
        const fetchedStocks = result.data ?? [];
        setStocks(fetchedStocks);

        if (fetchedStocks.length > 0) {
          const tickers = fetchedStocks.map((s) => s.ticker);
          const marketResult = await getMarketData(tickers);
          if (marketResult.success) {
            setMarketData(marketResult.data ?? []);
          } else {
            setMarketData([]);
            console.error(
              `${LOG_PREFIX} Failed to fetch market data:`,
              marketResult.error,
            );
          }
        } else {
          setMarketData([]);
        }
      } else {
        setStocks([]);
        setMarketData([]);
        console.error(`${LOG_PREFIX} Failed to fetch stocks:`, result.error);
      }
    } catch (error) {
      setStocks([]);
      setMarketData([]);
      console.error(`${LOG_PREFIX} Failed to fetch stocks:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle button click - open modal and fetch stocks
   */
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    fetchStocks();
  }, [fetchStocks]);

  useEffect(() => {
    if (autoOpen) {
      handleOpen();
    }
  }, [autoOpen, handleOpen]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Handle theme change (called by ConfigModal on Save with selected theme)
   */
  const handleThemeChange = useCallback(
    async (newThemeId: TThemeId) => {
      await updateTheme(newThemeId);
      setThemeId(newThemeId);
      setTheme(newThemeId);
    },
    [setTheme],
  );

  /**
   * Handle save - theme is applied via onThemeChange before close
   */
  const handleSave = useCallback(() => {
    // Theme and other section saves are handled by their callbacks
  }, []);

  /**
   * Handle stock changes - refetch the list
   */
  const handleStockChange = useCallback(() => {
    fetchStocks();
  }, [fetchStocks]);

  /**
   * Handle settings changes - refetch settings
   */
  const handleSettingsChange = useCallback(async () => {
    try {
      const settings = await getChartSettings();
      setChartSettings(settings);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to refetch settings:`, error);
    }
  }, []);

  /**
   * Handle Claude API key status change - refetch status only
   */
  const handleClaudeKeyStatusChange = useCallback(async () => {
    try {
      const status = await getClaudeApiKeyStatus();
      setClaudeApiKeyStatus(status);
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to refetch Claude API key status:`,
        error,
      );
    }
  }, []);

  if (isHiddenForScreenshot) return null;

  return (
    <>
      <ConfigButton onClick={handleOpen} isDemoMode={isDemoMode} />
      <ConfigModal
        isOpen={isOpen}
        onClose={handleClose}
        onSave={handleSave}
        stocks={stocks}
        marketData={marketData}
        onStockChange={handleStockChange}
        isLoading={isLoading}
        chartSettings={chartSettings}
        onSettingsChange={handleSettingsChange}
        themeId={themeId}
        onThemeChange={handleThemeChange}
        claudeApiKeyStatus={claudeApiKeyStatus}
        onClaudeKeyStatusChange={handleClaudeKeyStatusChange}
        isDemoMode={isDemoMode}
      />
    </>
  );
}
