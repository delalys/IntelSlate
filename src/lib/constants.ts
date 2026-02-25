/**
 * Application-wide constants
 */

// MVP single-user email - used throughout the app until multi-user is implemented
export const MVP_USER_EMAIL = 'thomas@intelslate.local';

// =============================================================================
// Chart Timeframe Settings
// =============================================================================

/**
 * Timeframe option for chart settings
 */
export interface ITimeframeOption {
  label: string;
  value: string;
}

/**
 * Chart timeframe settings structure
 */
export interface IChartTimeframeSettings {
  portfolioChart: string;
  portfolioChange: string;
  tickerChart: string;
  tickerChange: string;
  gaugeChange: string;
}

/**
 * Available timeframe options for charts
 */
export const TIMEFRAME_OPTIONS: ITimeframeOption[] = [
  { label: '1 Day', value: '1d' },
  { label: '5 Days', value: '5d' },
  { label: '1 Month', value: '1mo' },
  { label: '6 Months', value: '6mo' },
  { label: 'YTD', value: 'ytd' },
  { label: '1 Year', value: '1y' },
  { label: '5 Years', value: '5y' },
  { label: 'All', value: 'max' },
];

/**
 * Default timeframe values for each chart type
 */
export const DEFAULT_TIMEFRAMES: IChartTimeframeSettings = {
  portfolioChart: '1mo',
  portfolioChange: '1mo',
  tickerChart: '1mo',
  tickerChange: '1d',
  gaugeChange: '1mo',
};
