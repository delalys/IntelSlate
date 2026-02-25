/**
 * PortfolioZone Component
 *
 * Displays total portfolio value and daily change metrics.
 */

import { ChangeIndicator } from '@/components/ui/ChangeIndicator';

// =============================================================================
// Types
// =============================================================================

export interface IPortfolioPosition {
  quantity: number;
  currentPrice: number;
  previousClose: number;
}

export interface IPortfolioZoneProps {
  positions: IPortfolioPosition[];
  currency?: string;
  locale?: string;
  className?: string;
  changeAmount?: number;
  timeframe?: string;
  ariaLabel?: string;
  portfolioLabel?: string;
}

function formatCurrency(
  value: number,
  locale: string,
  currency: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedCurrency(
  value: number,
  locale: string,
  currency: string,
): string {
  if (value === 0) {
    return formatCurrency(0, locale, currency);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  }).format(value);
}

function formatSignedPercent(value: number, locale: string): string {
  if (value === 0) {
    return '0.0%';
  }

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format(value / 100);
}

export function PortfolioZone({
  positions,
  currency = 'USD',
  locale = 'en-US',
  className,
  changeAmount,
  timeframe,
  ariaLabel = 'Portfolio zone',
  portfolioLabel = 'Portfolio',
}: IPortfolioZoneProps) {
  const totalValue = positions.reduce((sum, position) => {
    const quantity = Number.isFinite(position.quantity) ? position.quantity : 0;
    const currentPrice = Number.isFinite(position.currentPrice)
      ? position.currentPrice
      : 0;
    return sum + quantity * currentPrice;
  }, 0);

  // Use provided changeAmount if available, otherwise calculate daily change
  const displayChangeAmount =
    changeAmount !== undefined
      ? changeAmount
      : positions.reduce((sum, position) => {
          const quantity = Number.isFinite(position.quantity)
            ? position.quantity
            : 0;
          const currentPrice = Number.isFinite(position.currentPrice)
            ? position.currentPrice
            : 0;
          const previousClose = Number.isFinite(position.previousClose)
            ? position.previousClose
            : currentPrice;
          return sum + quantity * (currentPrice - previousClose);
        }, 0);

  const previousTotal = totalValue - displayChangeAmount;
  const changePercent =
    previousTotal !== 0 ? (displayChangeAmount / previousTotal) * 100 : 0;

  const safeChangePercent: number = Number.isFinite(changePercent)
    ? (changePercent as number)
    : 0;

  const containerClassName = ['flex flex-col gap-2 w-full', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <section className={containerClassName} aria-label={ariaLabel}>
      <div className="flex align-center  justify-center items-center text-center">
        <span
          data-testid="ticker-card-name"
          className="portfolio-tag inline-flex items-center rounded-md bg-gray-400/10 mr-2 px-2 py-1 text-s font-medium text-white"
        >
          {portfolioLabel}
        </span>
        <ChangeIndicator value={safeChangePercent} testId="daily-change-amount">
          {formatSignedCurrency(displayChangeAmount, locale, currency)} (
          {formatSignedPercent(changePercent, locale)})
        </ChangeIndicator>
      </div>
      <div
        data-testid="portfolio-total"
        className="theme-numbers text-xl sm:text-3xl md:text-4xl lg:text-6xl font-semibold leading-none"
      >
        {formatNumber(totalValue, locale)}
      </div>
      {timeframe && (
        <span
          data-testid="portfolio-timeframe-tag"
          className="chart-timeframe w-fit text-xs font-medium self-center"
        >
          {timeframe}
        </span>
      )}
      <span className="chart-timeframe absolute bottom-2 right-4 text-xs font-medium">
        {currency}
      </span>
    </section>
  );
}
