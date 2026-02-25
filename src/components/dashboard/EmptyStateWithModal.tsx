'use client';

/**
 * EmptyStateWithModal Component
 *
 * A wrapper component that combines EmptyState with ConfigModal,
 * managing the modal open/close state and stock data fetching.
 *
 * This component displays the empty state when no stocks are configured
 * and provides a seamless way to open the configuration modal.
 *
 * @module components/dashboard/EmptyStateWithModal
 */

import { useCallback, useState } from 'react';
import { getChartSettings } from '@/actions/chart-settings';
import { getStocks } from '@/actions/stocks';
import { ConfigModal } from '@/components/config/ConfigModal';
import type { Stock } from '@/generated/prisma/client';
import type { IChartTimeframeSettings } from '@/lib/constants';
import { DEFAULT_TIMEFRAMES } from '@/lib/constants';
import { EmptyState } from './EmptyState';

// =============================================================================
// Types
// =============================================================================

export interface IEmptyStateWithModalProps {
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

const LOG_PREFIX = '[EmptyStateWithModal]';

export function EmptyStateWithModal({ className }: IEmptyStateWithModalProps) {
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chartSettings, setChartSettings] =
    useState<IChartTimeframeSettings>(DEFAULT_TIMEFRAMES);

  /**
   * Fetch stocks and chart settings from the server
   */
  const fetchStocks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getStocks();
      if (result.success) {
        setStocks(result.data ?? []);
      } else {
        setStocks([]);
        console.error(`${LOG_PREFIX} Failed to fetch stocks:`, result.error);
      }

      // Fetch chart settings
      const settings = await getChartSettings();
      setChartSettings(settings);
    } catch (error) {
      setStocks([]);
      console.error(`${LOG_PREFIX} Failed to fetch stocks:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle config button click - open modal and fetch stocks
   */
  const handleConfigClick = useCallback(() => {
    setIsOpen(true);
    fetchStocks();
  }, [fetchStocks]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Handle save - currently just closes the modal
   */
  const handleSave = useCallback(() => {
    // Save action is handled by individual stock operations
    // This callback can be used for any additional save logic
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

  return (
    <>
      <EmptyState onConfigClick={handleConfigClick} className={className} />
      <ConfigModal
        isOpen={isOpen}
        onClose={handleClose}
        onSave={handleSave}
        stocks={stocks}
        onStockChange={handleStockChange}
        isLoading={isLoading}
        chartSettings={chartSettings}
        onSettingsChange={handleSettingsChange}
      />
    </>
  );
}
