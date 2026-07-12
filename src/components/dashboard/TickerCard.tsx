import Image from 'next/image';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tag } from '@/components/ui/Tag';
import { ThemeDecor } from '@/components/ui/ThemeDecor';
import { getChangeColorClass } from '@/lib/colors';
import { LazyPortfolioChart } from './LazyPortfolioChart';

// =============================================================================
// Types
// =============================================================================

export interface ITickerCardProps {
  companyName: string;
  logoUrl?: string | null;
  price: number | null;
  changeAmount: number | null;
  changePercent?: number | null;
  currency?: string;
  locale?: string;
  isLast?: boolean;
  className?: string;
  historicalData?: number[];
  quantity?: number;
  buyPrice?: number;
  /** Timeframe label for the chart (e.g. '1mo') */
  chartTimeframe?: string;
  /** Timeframe label for the change value (e.g. '1d') */
  changeTimeframe?: string;
  /** When set (screenshot mode), the sparkline is server-rendered at this size */
  chartSsrSize?: { width: number; height: number };
}

// =============================================================================
// Utilities
// =============================================================================

function formatNumber(value: number, locale: string): string {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

function formatSignedCurrency(
  value: number,
  locale: string,
  currency: string,
): string {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat(locale, {
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  }).format(safeValue);
}

function formatPercentage(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const sign = safeValue >= 0 ? '+' : '';
  return `${sign}${safeValue.toFixed(2)}%`;
}

// =============================================================================
// Component
// =============================================================================

export function TickerCard({
  companyName,
  logoUrl,
  price,
  changeAmount,
  changePercent,
  currency = 'USD',
  locale = 'en-US',
  className,
  historicalData,
  chartTimeframe,
  changeTimeframe,
  chartSsrSize,
}: ITickerCardProps) {
  const safeChangeAmount: number = Number.isFinite(changeAmount)
    ? (changeAmount as number)
    : 0;

  const changeColorClass = getChangeColorClass(safeChangeAmount);

  return (
    <GlassCard
      className={`relative flex flex-col w-full ${className ?? ''}`}
      data-testid="ticker-card"
    >
      <div className="h-1/2 w-full p-4">
        <div className="flex items-center gap-2">
          {logoUrl && (
            <Image
              src={logoUrl}
              alt={`${companyName} logo`}
              width={20}
              height={20}
              sizes="1.25rem"
              loading="eager"
              unoptimized
              data-testid="ticker-card-logo"
              className="h-5 w-5 rounded-md object-cover hidden lg:block grayscale"
            />
          )}
          <Tag
            data-testid="ticker-card-name"
            className="inline-flex items-center"
          >
            {companyName}
          </Tag>
          <span
            data-testid="ticker-card-change"
            className={`ticker-change text-xs font-medium leading-none ${changeColorClass}`}
          >
            {changeAmount === null ? (
              '—'
            ) : (
              <div className="flex items-right">
                <span className="hidden xl:block">
                  {formatSignedCurrency(safeChangeAmount, locale, currency)}
                </span>
                {changePercent !== null && changePercent !== undefined && (
                  <span className="ml-1">
                    <span className="hidden lg:inline">(</span>
                    {formatPercentage(changePercent)}
                    <span className="hidden lg:inline">)</span>
                  </span>
                )}
                {changeTimeframe && (
                  <span className="ml-1 hidden xl:block">
                    {` ${changeTimeframe}`}
                  </span>
                )}
                <ThemeDecor
                  showFor="retro-ink"
                  as="div"
                  aria-hidden="true"
                  className="change-arrow hidden lg:block ml-1"
                >
                  {safeChangeAmount >= 0 ? ' \u25B2' : ' \u25BC'}
                </ThemeDecor>
              </div>
            )}
          </span>
        </div>
        <div
          data-testid="ticker-card-price"
          className="theme-numbers mt-4 pt-5 text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl leading-none font-semibold"
        >
          {price === null ? '—' : formatNumber(price, locale)}
        </div>
      </div>
      <div className="h-1/2 w-full relative">
        {historicalData && historicalData.length > 0 && (
          <div className="pt-2 h-full">
            <LazyPortfolioChart
              historicalData={historicalData.map((value, index) => ({
                date: `Day ${index}`,
                value,
              }))}
              dailyChange={safeChangeAmount}
              className="h-full"
              margin={{ top: 0, right: 0, bottom: 32, left: 0 }}
              chartTimeframe={chartTimeframe}
              ssr={Boolean(chartSsrSize)}
              defaultWidth={chartSsrSize?.width}
              defaultHeight={chartSsrSize?.height}
            />
          </div>
        )}
      </div>
      <span className="chart-timeframe absolute bottom-2 right-4 text-xs font-medium">
        {currency}
      </span>
    </GlassCard>
  );
}
