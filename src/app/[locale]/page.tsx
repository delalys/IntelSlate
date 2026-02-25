import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EmptyStateWithModal } from '@/components/dashboard/EmptyStateWithModal';
import { ErrorState } from '@/components/dashboard/ErrorState';
import { LazyPortfolioChart } from '@/components/dashboard/LazyPortfolioChart';
import { NewsRow } from '@/components/dashboard/NewsRow';
import { PortfolioGauge } from '@/components/dashboard/PortfolioGauge';
import {
  type IPortfolioPosition,
  PortfolioZone,
} from '@/components/dashboard/PortfolioZone';
import { TickerRow } from '@/components/dashboard/TickerRow';
import { GlassCard } from '@/components/ui/GlassCard';
import { SideLabel } from '@/components/ui/SideLabel';
import { ThemeDecor } from '@/components/ui/ThemeDecor';
import { MVP_USER_EMAIL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { getChartTimeframeSettings } from '@/lib/settings';

function calculateDailyChangeAmount(positions: IPortfolioPosition[]): number {
  return positions.reduce((sum, position) => {
    const quantity = Number.isFinite(position.quantity) ? position.quantity : 0;
    const currentPrice = Number.isFinite(position.currentPrice)
      ? position.currentPrice
      : 0;
    const previousClose = Number.isFinite(position.previousClose)
      ? position.previousClose
      : currentPrice;
    return sum + quantity * (currentPrice - previousClose);
  }, 0);
}

type THistoryPoint = {
  value?: number;
  close?: number;
  price?: number;
  date?: string;
};

/**
 * Compute equal-weight average percentage change across stocks.
 * Each stock contributes equally regardless of position size.
 * For 1d: uses previousClose from market data.
 * For other timeframes: uses per-stock historical data.
 */
function calculateEqualWeightChangePercent(
  stocks: Array<{ ticker: string }>,
  marketDataByTicker: Map<
    string,
    {
      price: number;
      previousClose: number;
      historicalData: unknown;
    }
  >,
  timeframe: string,
): number {
  if (stocks.length === 0) return 0;

  const percentChanges: number[] = [];

  for (const stock of stocks) {
    const entry = marketDataByTicker.get(stock.ticker);
    if (!entry) continue;

    if (timeframe === '1d') {
      const prev = entry.previousClose;
      if (Number.isFinite(prev) && prev !== 0) {
        percentChanges.push(((entry.price - prev) / prev) * 100);
      }
      continue;
    }

    const hist = entry.historicalData;
    if (!Array.isArray(hist) || hist.length < 2) continue;

    const latest = hist[hist.length - 1] as THistoryPoint;
    const latestClose =
      latest?.close ?? latest?.value ?? latest?.price ?? entry.price;

    let idx = 0;
    switch (timeframe) {
      case '5d':
        idx = 0;
        break;
      case '1mo':
        idx = Math.max(0, hist.length - 20 - 1);
        break;
      case '6mo':
        idx = Math.max(0, hist.length - 120 - 1);
        break;
      case 'ytd':
        idx = 0;
        break;
      case '1y':
        idx = Math.max(0, hist.length - 252 - 1);
        break;
      case '5y':
        idx = Math.max(0, hist.length - 252 * 5 - 1);
        break;
      case 'max':
        idx = 0;
        break;
      default:
        idx = Math.max(0, hist.length - 2);
    }

    const comp = hist[idx] as THistoryPoint;
    const compPrice = comp?.close ?? comp?.value ?? comp?.price;

    if (Number.isFinite(compPrice) && compPrice !== 0) {
      percentChanges.push(
        ((latestClose - Number(compPrice)) / Number(compPrice)) * 100,
      );
    }
  }

  if (percentChanges.length === 0) return 0;
  return (
    percentChanges.reduce((sum, pct) => sum + pct, 0) / percentChanges.length
  );
}

/**
 * Number of daily snapshots to show per timeframe.
 * Mirrors the data-point-count approach used by ticker charts
 * (extractHistoricalPrices in TickerRow) so the chart visually
 * changes when the user switches timeframes, even with limited data.
 */
function snapshotCountForTimeframe(timeframe: string): number {
  switch (timeframe) {
    case '1d':
      return 2;
    case '5d':
      return 5;
    case '1mo':
      return 30;
    case '6mo':
      return 180;
    case '1y':
      return 365;
    case '5y':
      return 365 * 5;
    case 'ytd':
    case 'max':
      return Number.MAX_SAFE_INTEGER;
    default:
      return 30;
  }
}

/**
 * Filter portfolio snapshots by timeframe (count-based slice from the end).
 */
function filterSnapshotsByTimeframe(
  snapshots: Array<{ date: Date | string; totalValue: number }>,
  timeframe: string,
): Array<{ date: string; value: number }> {
  const count = snapshotCountForTimeframe(timeframe);
  const startIndex = Math.max(0, snapshots.length - count);

  return snapshots.slice(startIndex).map((snapshot) => ({
    date:
      snapshot.date instanceof Date
        ? snapshot.date.toISOString()
        : String(snapshot.date),
    value: snapshot.totalValue,
  }));
}

/**
 * Calculate change amount based on timeframe (count-based).
 */
function calculateChangeAmount(
  snapshots: Array<{ date: Date | string; totalValue: number }>,
  currentTotal: number,
  timeframe: string,
): number {
  if (snapshots.length === 0) return 0;

  const count = snapshotCountForTimeframe(timeframe);
  const startIndex = Math.max(0, snapshots.length - count);
  const oldestValue = snapshots[startIndex].totalValue;

  return currentTotal - oldestValue;
}

/**
 * Dashboard Layout Shell - Server Component
 *
 * Three-zone flexbox layout optimized for 800×480 e-ink display (TRMNL)
 * - Portfolio Zone: ~25% height (flex-1)
 * - Ticker Row: ~30% height (flex-[1.2])
 * - News Row: ~38% height (flex-[1.5])
 *
 * All sizing uses relative units (rem, flex) - no fixed pixel heights.
 */
type THomeProps = { params: Promise<{ locale: string }> };

export default async function Home({ params }: THomeProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard');

  const timeframeSettings = await getChartTimeframeSettings();

  const user = await prisma.user.findUnique({
    where: { email: MVP_USER_EMAIL },
    select: { id: true },
  });

  const stocks = user
    ? await prisma.stock.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  const tickers = stocks.map((stock) => stock.ticker);

  const marketData = stocks.length
    ? await prisma.marketData.findMany({
        where: { ticker: { in: tickers } },
      })
    : [];

  // Fetch news cache for all stocks
  const newsCache = stocks.length
    ? await prisma.newsCache.findMany({
        where: { ticker: { in: tickers } },
      })
    : [];

  const marketDataByTicker = new Map(
    marketData.map((entry) => [entry.ticker, entry]),
  );

  const latestMarketUpdate = marketData.reduce<Date | undefined>(
    (latest, entry) =>
      !latest || entry.updatedAt > latest ? entry.updatedAt : latest,
    undefined,
  );

  const stocksMissingMarketData = stocks.filter(
    (stock) => !marketDataByTicker.has(stock.ticker),
  );

  const positions: IPortfolioPosition[] = stocks.map((stock) => {
    const marketEntry = marketDataByTicker.get(stock.ticker);
    const fallbackPrice = Number.isFinite(stock.buyPrice) ? stock.buyPrice : 0;
    return {
      quantity: Number.isFinite(stock.quantity) ? stock.quantity : 0,
      currentPrice: marketEntry?.price ?? fallbackPrice,
      previousClose: marketEntry?.previousClose ?? fallbackPrice,
    };
  });

  const dailyChangeAmount = calculateDailyChangeAmount(positions);

  // Fetch portfolio snapshots for historical chart data
  const snapshots = user
    ? await prisma.portfolioSnapshot.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
      })
    : [];

  // Calculate current total portfolio value
  const currentTotal = positions.reduce((sum, position) => {
    return sum + position.quantity * position.currentPrice;
  }, 0);

  // Filter historical data based on portfolio chart timeframe setting
  const historicalData = filterSnapshotsByTimeframe(
    snapshots,
    timeframeSettings.portfolioChart,
  );

  // Calculate portfolio change based on portfolio change timeframe setting
  // For 1d, use market-data previousClose (snapshots lack intraday granularity)
  const portfolioChangeAmount =
    timeframeSettings.portfolioChange === '1d'
      ? dailyChangeAmount
      : calculateChangeAmount(
          snapshots,
          currentTotal,
          timeframeSettings.portfolioChange,
        );

  // Calculate gauge change as equal-weight average of per-stock percentage changes
  const gaugeChangePercent = calculateEqualWeightChangePercent(
    stocks,
    marketDataByTicker,
    timeframeSettings.gaugeChange,
  );

  const hasStocks = stocks.length > 0;
  const hasMarketData = marketData.length > 0;
  const hasPartialMarketData =
    hasMarketData && stocksMissingMarketData.length > 0;

  // Empty state when no stocks are configured
  if (!hasStocks) {
    return (
      <main className="flex h-screen flex-col p-4">
        <EmptyStateWithModal className="flex-1" />
      </main>
    );
  }

  if (!hasMarketData) {
    return (
      <main className="flex h-screen flex-col p-4">
        <ErrorState
          message={t('dataUnavailable')}
          className="flex-1"
          lastUpdate={latestMarketUpdate}
        />
      </main>
    );
  }

  return (
    <div className="h-screen w-full hidden md:flex relative bg-primary-color p-5 pt-4  flex-col">
      <ThemeDecor showFor="retro-ink" as="div" className="text-center shrink-0">
        <div className="relative inline-block top-[6px]">
          <h2 className="absolute left-0 w-full h-full text-center text-md uppercase tracking-widest border-2 border-white rounded-md inline-block   transform-[perspective(100px)_rotateX(-30deg)] origin-bottom bg-background">
            {/* STOCKWATCH */}
          </h2>
          <h2 className="p-0.5 px-2 pb-0.75 relative">INTELSLATE</h2>
        </div>
      </ThemeDecor>
      <main className="flex flex-1 min-h-0 flex-col gap-5 p-6 rounded-2xl">
        {/* Portfolio Zone - 33% of height */}
        <div className="relative h-1/3 min-h-0">
          <ThemeDecor showFor="retro-ink" as="div">
            <SideLabel>Strength Meter</SideLabel>
            <SideLabel align="right">{t('portfolioChartLabel')}</SideLabel>
          </ThemeDecor>
          <GlassCard
            className="relative flex h-full min-h-0 flex-col"
            aria-label="Portfolio Overview"
          >
            <div className="flex flex-row h-full min-h-0">
              <ThemeDecor
                showFor="retro-ink"
                as="div"
                className="shrink-0 w-2/6 h-full flex items-center justify-center "
              >
                <PortfolioGauge
                  changePercent={gaugeChangePercent}
                  timeframe={timeframeSettings.gaugeChange}
                />
              </ThemeDecor>
              <div className="flex-1 w-2/6 h-full p-4 flex items-center text-center">
                <PortfolioZone
                  positions={positions}
                  currency="EUR"
                  locale="en-GB"
                  changeAmount={portfolioChangeAmount}
                  timeframe={timeframeSettings.portfolioChange}
                  ariaLabel={t('portfolioZone')}
                  portfolioLabel={t('portfolio')}
                />
              </div>
              <div className="flex-1 w-2/6 pl-4 h-full relative">
                <LazyPortfolioChart
                  historicalData={historicalData}
                  dailyChange={dailyChangeAmount}
                  chartTimeframe={timeframeSettings.portfolioChart}
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Ticker Row - 33% of height */}
        <div className="relative h-1/3 min-h-0">
          <ThemeDecor showFor="retro-ink" as="div">
            <SideLabel>Stock Insight</SideLabel>
          </ThemeDecor>
          <section
            className="flex h-full min-h-0 items-center justify-center"
            aria-label="Stock Tickers"
          >
            <div className="flex w-full h-full flex-col gap-3">
              {hasPartialMarketData ? (
                <ErrorState
                  message={t('dataUnavailable')}
                  variant="compact"
                  className="py-2"
                  lastUpdate={latestMarketUpdate}
                />
              ) : null}
              <TickerRow
                stocks={stocks}
                marketData={marketData}
                timeframeSettings={timeframeSettings}
              />
            </div>
          </section>
        </div>

        {/* News Row - 33% of height */}
        <div className="relative h-1/3 min-h-0">
          <ThemeDecor showFor="retro-ink" as="div">
            <SideLabel>AI Summary</SideLabel>
          </ThemeDecor>
          <GlassCard
            className="px-6 py-4 flex h-full min-h-0 flex-col justify-center"
            aria-label="News Headlines"
          >
            <NewsRow
              stocks={stocks}
              marketData={marketData}
              newsCache={newsCache}
              className="h-full"
            />
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
