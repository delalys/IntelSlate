/**
 * NewsRow Component
 *
 * Displays AI-summarized news for stocks with significant price changes.
 *
 * Display Logic:
 * 1. Select stocks with ≥3% daily change (positive or negative)
 * 2. If none qualify, select the top movers by absolute change (fallback)
 * 3. Maximum 4 news blocks displayed
 * 4. Sort by absolute change percentage (biggest movers first)
 *
 * @module components/dashboard/NewsRow
 */

import type { MarketData, NewsCache, Stock } from '@/generated/prisma/client';
import type { IArticleWithSummary } from '@/lib/api/ollama';
import { MVP_USER_EMAIL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { selectByAbsChange } from '@/lib/utils/newsSelection';
import { NewsBlock } from './NewsBlock';

// =============================================================================
// Constants
// =============================================================================

/** Minimum absolute change percentage to qualify for news display */
const MIN_CHANGE_THRESHOLD = 3;

/** Maximum number of news cartridges to display */
const MAX_DISPLAY_COUNT = 3;

/** Fallback count when no stocks meet the threshold */
const FALLBACK_DISPLAY_COUNT = 3;

// =============================================================================
// Types
// =============================================================================

export interface INewsRowProps {
  stocks?: Stock[];
  marketData?: MarketData[];
  newsCache?: NewsCache[];
  className?: string;
}

interface IStockWithNews {
  ticker: string;
  changePercent: number;
  articles: IArticleWithSummary[];
}

// =============================================================================
// Helper Functions
// =============================================================================

function parseArticlesFromJson(articlesJson: unknown): IArticleWithSummary[] {
  if (!Array.isArray(articlesJson)) {
    return [];
  }
  return articlesJson.filter(
    (a): a is IArticleWithSummary =>
      typeof a === 'object' &&
      a !== null &&
      typeof a.title === 'string' &&
      typeof a.content === 'string',
  );
}

function selectStocksForNews(
  stocks: Stock[],
  marketDataMap: Map<string, MarketData>,
  newsCacheMap: Map<string, NewsCache>,
): IStockWithNews[] {
  // Build list of stocks with valid news and market data
  const stocksWithData: IStockWithNews[] = [];

  for (const stock of stocks) {
    const marketEntry = marketDataMap.get(stock.ticker);
    const newsEntry = newsCacheMap.get(stock.ticker);

    if (!marketEntry || !newsEntry) {
      continue;
    }

    // Parse articles from JSON and check if any have summaries
    const articles = parseArticlesFromJson(newsEntry.articles);
    const hasSummaries = articles.some((a) => a.summary);

    if (!hasSummaries) {
      continue;
    }

    stocksWithData.push({
      ticker: stock.ticker,
      changePercent: marketEntry.changePercent,
      articles,
    });
  }

  return selectByAbsChange(stocksWithData, {
    minAbsChangePercent: MIN_CHANGE_THRESHOLD,
    fallbackCount: FALLBACK_DISPLAY_COUNT,
    maxCount: MAX_DISPLAY_COUNT,
  });
}

// =============================================================================
// Component
// =============================================================================

export async function NewsRow({
  stocks,
  marketData,
  newsCache,
  className,
}: INewsRowProps) {
  // Resolve stocks from database if not provided
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

  // Early return if no stocks
  if (resolvedStocks.length === 0) {
    return null;
  }

  // Get tickers for querying related data
  const tickers = resolvedStocks.map((stock) => stock.ticker);

  // Resolve market data from database if not provided
  const resolvedMarketData =
    marketData ??
    (await prisma.marketData.findMany({
      where: { ticker: { in: tickers } },
    }));

  // Resolve news cache from database if not provided
  const resolvedNewsCache =
    newsCache ??
    (await prisma.newsCache.findMany({
      where: { ticker: { in: tickers } },
    }));

  // Build lookup maps for efficient access
  const marketDataMap = new Map(
    resolvedMarketData.map((entry) => [entry.ticker, entry]),
  );
  const newsCacheMap = new Map(
    resolvedNewsCache.map((entry) => [entry.ticker, entry]),
  );

  // Select stocks for display using business logic
  const selectedStocks = selectStocksForNews(
    resolvedStocks,
    marketDataMap,
    newsCacheMap,
  );

  // Early return if no stocks selected (no news available)
  if (selectedStocks.length === 0) {
    return null;
  }

  // Build container class names
  const containerClassName = [
    'flex w-full h-full flex-row gap-6',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName} data-testid="news-row">
      {selectedStocks.map((stock) => (
        <NewsBlock
          key={stock.ticker}
          ticker={stock.ticker}
          articles={stock.articles}
          className="flex-1 w-full"
        />
      ))}
    </div>
  );
}
