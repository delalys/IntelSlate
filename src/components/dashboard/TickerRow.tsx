import { headers } from 'next/headers';
import type { MarketData, Stock } from '@/generated/prisma/client';
import type { IChartTimeframeSettings } from '@/lib/constants';
import { MVP_USER_EMAIL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { TickerCard } from './TickerCard';

export interface ITickerRowProps {
  stocks?: Stock[];
  marketData?: MarketData[];
  className?: string;
  timeframeSettings?: IChartTimeframeSettings;
  /** Capture viewport (screenshot mode): sparklines are server-rendered sized for it */
  screenshotSize?: { width: number; height: number };
}

function formatTickerName(ticker: string): string {
  return ticker.trim().toUpperCase();
}

/**
 * TRMNL's screenshot capture re-renders our HTML in a separate browser
 * context and only rewrites relative CSS/JS URLs to absolute - not <img>
 * src attributes - so a root-relative logo path resolves against the wrong
 * origin there and fails to load. Making it absolute up front fixes this
 * for every consumer, not just TRMNL.
 */
function toAbsoluteUrl(path: string | null, origin: string): string | null {
  return path?.startsWith('/') ? `${origin}${path}` : path;
}

function computeChangeAmount(
  price: number,
  previousClose: number,
  fallback: number,
): number {
  const safePrice = Number.isFinite(price) ? price : fallback;
  const safePrevious = Number.isFinite(previousClose)
    ? previousClose
    : safePrice;

  return safePrice - safePrevious;
}

type THistoryPoint = {
  value?: number;
  close?: number;
  price?: number;
  date?: string;
};

/**
 * Extract historical prices from historical data and optionally filter by timeframe
 * @param historicalData - Array of historical data points
 * @param timeframe - Optional timeframe to filter data (e.g., '1d', '5d', '1mo')
 */
function extractHistoricalPrices(
  historicalData: unknown,
  timeframe?: string,
): number[] {
  if (!Array.isArray(historicalData)) {
    return [];
  }

  // Filter data by timeframe if provided
  let filteredData = historicalData;
  if (timeframe && historicalData.length > 0) {
    // For short timeframes (1d, 5d), we show all intraday data points
    // For longer timeframes, we show N trading days
    let dataPointsToShow = historicalData.length; // Default to all data

    switch (timeframe) {
      case '1d':
        // Show all 15-minute intervals for the day (up to ~26 data points for market hours)
        dataPointsToShow = historicalData.length;
        break;
      case '5d':
        // Show all hourly intervals for 5 days (up to ~32 data points for 5 trading days)
        dataPointsToShow = historicalData.length;
        break;
      case '1mo':
        dataPointsToShow = 20; // ~20 trading days in a month
        break;
      case '6mo':
        dataPointsToShow = 120; // ~120 trading days in 6 months
        break;
      case 'ytd':
      case '1y':
      case '5y':
      case 'max':
        dataPointsToShow = historicalData.length; // Show all available data
        break;
    }

    // Take the last N data points from the historical data (which is sorted oldest → newest)
    const startIndex = Math.max(0, historicalData.length - dataPointsToShow);
    filteredData = historicalData.slice(startIndex);
  }

  return filteredData
    .map((point: THistoryPoint) => {
      if (Number.isFinite(point?.value)) {
        return Number(point.value);
      }
      if (Number.isFinite(point?.close)) {
        return Number(point.close);
      }
      if (Number.isFinite(point?.price)) {
        return Number(point.price);
      }
      return null;
    })
    .filter((price): price is number => price !== null);
}

type TTickerChange = { amount: number; percent: number };

/**
 * Calculate ticker change (amount + percent) based on timeframe.
 * Historical data is sorted oldest → newest.
 */
function calculateTickerChange(
  currentPrice: number,
  historicalData: unknown,
  timeframe: string,
): TTickerChange | null {
  if (!Array.isArray(historicalData) || historicalData.length < 2) {
    return null;
  }

  // Use the most recent close from historical data as "current"
  const latestPoint = historicalData[
    historicalData.length - 1
  ] as THistoryPoint;
  const latestClose =
    latestPoint?.close ??
    latestPoint?.value ??
    latestPoint?.price ??
    currentPrice;

  // Detect whether historical data is intraday (date field contains a time component)
  const firstPoint = historicalData[0] as THistoryPoint;
  const isIntraday =
    typeof firstPoint?.date === 'string' && firstPoint.date.includes(' ');

  // For 1d: daily historical data can't give an accurate single-day change because
  // hist[0] may be weeks or months ago. Return null so the caller falls back to
  // the DB-stored change/changePercent which always reflects the 1-day figure.
  if (timeframe === '1d') {
    return null;
  }

  let comparisonIndex = 0;

  switch (timeframe) {
    case '5d':
      // Intraday 5d data: first point is 5 days ago → compare to hist[0]
      // Daily data: look back 5 trading days from the end
      comparisonIndex = isIntraday
        ? 0
        : Math.max(0, historicalData.length - 5 - 1);
      break;
    case '1mo':
      comparisonIndex = Math.max(0, historicalData.length - 20 - 1);
      break;
    case '6mo':
      comparisonIndex = Math.max(0, historicalData.length - 120 - 1);
      break;
    case 'ytd':
      comparisonIndex = 0;
      break;
    case '1y':
      comparisonIndex = Math.max(0, historicalData.length - 252 - 1);
      break;
    case '5y':
      comparisonIndex = Math.max(0, historicalData.length - 252 * 5 - 1);
      break;
    case 'max':
      comparisonIndex = 0;
      break;
    default:
      comparisonIndex = Math.max(0, historicalData.length - 2);
  }

  const historicalPoint = historicalData[comparisonIndex] as THistoryPoint;
  const historicalPrice =
    historicalPoint?.close ?? historicalPoint?.value ?? historicalPoint?.price;

  if (!Number.isFinite(historicalPrice) || Number(historicalPrice) === 0) {
    return null;
  }

  const base = Number(historicalPrice);
  return {
    amount: latestClose - base,
    percent: ((latestClose - base) / base) * 100,
  };
}

// =============================================================================
// Component
// =============================================================================

export async function TickerRow({
  stocks,
  marketData,
  className,
  timeframeSettings,
  screenshotSize,
}: ITickerRowProps) {
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const origin = `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`;

  const resolvedStocks =
    stocks ??
    (await prisma.stock.findMany({
      where: {
        user: {
          email: MVP_USER_EMAIL,
        },
      },
      orderBy: { createdAt: 'asc' },
    }));

  const resolvedMarketData =
    marketData ??
    (resolvedStocks.length
      ? await prisma.marketData.findMany({
          where: {
            ticker: { in: resolvedStocks.map((stock) => stock.ticker) },
          },
        })
      : []);

  if (resolvedStocks.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500">
        Stock tickers will appear here
      </div>
    );
  }

  const marketDataByTicker = new Map(
    resolvedMarketData.map((entry) => [entry.ticker, entry]),
  );

  const containerClassName = [
    'flex w-full h-full flex-row gap-4 md:gap-6 lg:gap-8',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // Approximate sparkline size for SSR in screenshot mode (~89% of the
  // viewport width split across cards; chart occupies the lower card half).
  // Devices that run JS re-measure and correct this after hydration.
  const chartSsrSize = screenshotSize
    ? {
        width: Math.round(
          (screenshotSize.width * 0.89) / resolvedStocks.length,
        ),
        height: Math.round(screenshotSize.height * 0.12),
      }
    : undefined;

  return (
    <div className={containerClassName} data-testid="ticker-row">
      {resolvedStocks.map((stock, index) => {
        const marketEntry = marketDataByTicker.get(stock.ticker);
        const fallbackPrice = Number.isFinite(stock.buyPrice)
          ? stock.buyPrice
          : 0;
        const price: number | null = Number.isFinite(marketEntry?.price)
          ? (marketEntry?.price as number)
          : null;

        // Calculate change based on timeframe setting if provided
        const tickerChange = timeframeSettings?.tickerChange
          ? calculateTickerChange(
              marketEntry?.price ?? fallbackPrice,
              marketEntry?.historicalData,
              timeframeSettings.tickerChange,
            )
          : null;

        const changeAmount: number | null = tickerChange
          ? tickerChange.amount
          : Number.isFinite(marketEntry?.change)
            ? Number(marketEntry?.change)
            : Number.isFinite(marketEntry?.previousClose)
              ? computeChangeAmount(
                  marketEntry?.price ?? fallbackPrice,
                  marketEntry?.previousClose ?? fallbackPrice,
                  fallbackPrice,
                )
              : null;

        const historicalPrices = extractHistoricalPrices(
          marketEntry?.historicalData,
          timeframeSettings?.tickerChart,
        );

        // Use the percent derived from the same historical comparison when available
        const changePercent: number | null = tickerChange
          ? tickerChange.percent
          : Number.isFinite(marketEntry?.changePercent)
            ? Number(marketEntry?.changePercent)
            : null;

        const timeframeValue = timeframeSettings?.tickerChart;
        const changeTimeframeValue = timeframeSettings?.tickerChange;

        return (
          <TickerCard
            key={stock.id}
            companyName={formatTickerName(stock.ticker)}
            logoUrl={toAbsoluteUrl(stock.logoUrl, origin)}
            price={price}
            changeAmount={changeAmount}
            changePercent={changePercent}
            isLast={index === resolvedStocks.length - 1}
            historicalData={historicalPrices}
            quantity={stock.quantity}
            buyPrice={stock.buyPrice}
            chartTimeframe={timeframeValue}
            changeTimeframe={changeTimeframeValue}
            chartSsrSize={chartSsrSize}
          />
        );
      })}
    </div>
  );
}
