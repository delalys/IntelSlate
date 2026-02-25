'use client';

/**
 * Chart Settings Component
 *
 * Provides UI controls for configuring chart timeframes
 */

import { useState, useTransition, useEffect } from 'react';
import {
  TIMEFRAME_OPTIONS,
  type IChartTimeframeSettings,
} from '@/lib/constants';
import {
  updatePortfolioChartTimeframe,
  updatePortfolioChangeTimeframe,
  updateTickerChartTimeframe,
  updateTickerChangeTimeframe,
  updateGaugeChangeTimeframe,
} from '@/actions/chart-settings';
import { Select } from '@/components/ui/Select';

export interface IChartSettingsProps {
  settings: IChartTimeframeSettings;
  onSettingsChange?: () => void;
}

export function ChartSettings({
  settings,
  onSettingsChange,
}: IChartSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [localSettings, setLocalSettings] = useState(settings);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handlePortfolioChartChange = (value: string) => {
    setLocalSettings((prev) => ({ ...prev, portfolioChart: value }));
    startTransition(async () => {
      await updatePortfolioChartTimeframe(value);
      onSettingsChange?.();
    });
  };

  const handlePortfolioChangeChange = (value: string) => {
    setLocalSettings((prev) => ({ ...prev, portfolioChange: value }));
    startTransition(async () => {
      await updatePortfolioChangeTimeframe(value);
      onSettingsChange?.();
    });
  };

  const handleTickerChartChange = (value: string) => {
    setLocalSettings((prev) => ({ ...prev, tickerChart: value }));
    startTransition(async () => {
      await updateTickerChartTimeframe(value);
      onSettingsChange?.();
    });
  };

  const handleTickerChangeChange = (value: string) => {
    setLocalSettings((prev) => ({ ...prev, tickerChange: value }));
    startTransition(async () => {
      await updateTickerChangeTimeframe(value);
      onSettingsChange?.();
    });
  };

  const handleGaugeChangeChange = (value: string) => {
    setLocalSettings((prev) => ({ ...prev, gaugeChange: value }));
    startTransition(async () => {
      await updateGaugeChangeTimeframe(value);
      onSettingsChange?.();
    });
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Chart Timeframe */}
      <div className="space-y-2">
        <label htmlFor="portfolio-chart" className="field-label">
          Portfolio Chart Timeframe
        </label>
        <Select
          id="portfolio-chart"
          value={localSettings.portfolioChart}
          onChange={(e) => handlePortfolioChartChange(e.target.value)}
          disabled={isPending}
        >
          {TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Portfolio Change Timeframe */}
      <div className="space-y-2">
        <label htmlFor="portfolio-change" className="field-label">
          Portfolio Change Timeframe
        </label>
        <Select
          id="portfolio-change"
          value={localSettings.portfolioChange}
          onChange={(e) => handlePortfolioChangeChange(e.target.value)}
          disabled={isPending}
        >
          {TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Ticker Chart Timeframe */}
      <div className="space-y-2">
        <label htmlFor="ticker-chart" className="field-label">
          Ticker Card Chart Timeframe
        </label>
        <Select
          id="ticker-chart"
          value={localSettings.tickerChart}
          onChange={(e) => handleTickerChartChange(e.target.value)}
          disabled={isPending}
        >
          {TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Ticker Change Timeframe */}
      <div className="space-y-2">
        <label htmlFor="ticker-change" className="field-label">
          Ticker Card Change Timeframe
        </label>
        <Select
          id="ticker-change"
          value={localSettings.tickerChange}
          onChange={(e) => handleTickerChangeChange(e.target.value)}
          disabled={isPending}
        >
          {TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Gauge Change Timeframe */}
      <div className="space-y-2">
        <label htmlFor="gauge-change" className="field-label">
          Gauge Change Timeframe
        </label>
        <Select
          id="gauge-change"
          value={localSettings.gaugeChange}
          onChange={(e) => handleGaugeChangeChange(e.target.value)}
          disabled={isPending}
        >
          {TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {isPending && (
        <div className="text-xs text-gray-400">Saving changes...</div>
      )}
    </div>
  );
}
