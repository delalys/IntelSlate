/**
 * NewsRow Component Tests
 *
 * Verifies display logic for showing news for stocks with significant price changes.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketData, NewsCache, Stock } from '@/generated/prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    stock: {
      findMany: vi.fn(),
    },
    marketData: {
      findMany: vi.fn(),
    },
    newsCache: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';
import { NewsRow } from './NewsRow';

// =============================================================================
// Test Data Factories
// =============================================================================

function createMockStock(overrides: Partial<Stock> = {}): Stock {
  return {
    id: 'stock-1',
    userId: 'user-1',
    ticker: 'AAPL',
    buyPrice: 150,
    quantity: 10,
    logoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockMarketData(overrides: Partial<MarketData> = {}): MarketData {
  return {
    id: 'market-1',
    ticker: 'AAPL',
    price: 155,
    previousClose: 150,
    change: 5,
    changePercent: 3.33,
    historicalData: [],
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockNewsCache(overrides: Partial<NewsCache> = {}): NewsCache {
  // The component reads newsCache.articles (JSON array of {title, content, summary})
  const summaryText =
    overrides.summary !== undefined ? overrides.summary : null;
  const articles =
    overrides.articles ??
    (summaryText
      ? [{ title: 'Article 1', content: 'Content', summary: summaryText }]
      : []);
  return {
    id: 'news-1',
    ticker: 'AAPL',
    summary: summaryText,
    updatedAt: new Date(),
    ...overrides,
    articles,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('NewsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Stock Selection Logic', () => {
    it('selects stocks with ≥3% daily change', async () => {
      const stocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'MSFT' }),
        createMockStock({ id: '3', ticker: 'GOOG' }),
      ];

      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 5.5 }), // ≥3%
        createMockMarketData({ ticker: 'MSFT', changePercent: 1.2 }), // <3%
        createMockMarketData({ ticker: 'GOOG', changePercent: -4.1 }), // ≥3% (negative)
      ];

      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• AAPL news' }),
        createMockNewsCache({ ticker: 'MSFT', summary: '• MSFT news' }),
        createMockNewsCache({ ticker: 'GOOG', summary: '• GOOG news' }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
      });
      render(Component);

      // Should show AAPL and GOOG (both ≥3%), not MSFT
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOG')).toBeInTheDocument();
      expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
    });

    it('falls back to top 3 movers when no stocks qualify for ≥3%', async () => {
      const stocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'MSFT' }),
        createMockStock({ id: '3', ticker: 'GOOG' }),
        createMockStock({ id: '4', ticker: 'AMZN' }),
      ];

      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 1.5 }), // <3%
        createMockMarketData({ ticker: 'MSFT', changePercent: 2.1 }), // <3% but higher
        createMockMarketData({ ticker: 'GOOG', changePercent: 0.5 }), // <3% lowest
        createMockMarketData({ ticker: 'AMZN', changePercent: -2.8 }), // <3% but high abs
      ];

      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• AAPL news' }),
        createMockNewsCache({ ticker: 'MSFT', summary: '• MSFT news' }),
        createMockNewsCache({ ticker: 'GOOG', summary: '• GOOG news' }),
        createMockNewsCache({ ticker: 'AMZN', summary: '• AMZN news' }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
      });
      render(Component);

      // Should show top 3 movers: AMZN (2.8%), MSFT (2.1%), AAPL (1.5%)
      expect(screen.getByText('AMZN')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.queryByText('GOOG')).not.toBeInTheDocument();
    });

    it('limits display to maximum 3 news blocks', async () => {
      const stocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'MSFT' }),
        createMockStock({ id: '3', ticker: 'GOOG' }),
        createMockStock({ id: '4', ticker: 'AMZN' }),
        createMockStock({ id: '5', ticker: 'TSLA' }),
      ];

      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 6.0 }),
        createMockMarketData({ ticker: 'MSFT', changePercent: 5.5 }),
        createMockMarketData({ ticker: 'GOOG', changePercent: 5.0 }),
        createMockMarketData({ ticker: 'AMZN', changePercent: 4.5 }),
        createMockMarketData({ ticker: 'TSLA', changePercent: 4.0 }),
      ];

      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• AAPL news' }),
        createMockNewsCache({ ticker: 'MSFT', summary: '• MSFT news' }),
        createMockNewsCache({ ticker: 'GOOG', summary: '• GOOG news' }),
        createMockNewsCache({ ticker: 'AMZN', summary: '• AMZN news' }),
        createMockNewsCache({ ticker: 'TSLA', summary: '• TSLA news' }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
      });
      render(Component);

      const newsBlocks = screen.getAllByTestId('news-block');
      expect(newsBlocks).toHaveLength(3);
    });

    it('sorts by absolute change percentage (biggest movers first)', async () => {
      const stocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'MSFT' }),
        createMockStock({ id: '3', ticker: 'GOOG' }),
      ];

      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 3.5 }),
        createMockMarketData({ ticker: 'MSFT', changePercent: -5.0 }), // Biggest absolute
        createMockMarketData({ ticker: 'GOOG', changePercent: 4.0 }),
      ];

      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• AAPL news' }),
        createMockNewsCache({ ticker: 'MSFT', summary: '• MSFT news' }),
        createMockNewsCache({ ticker: 'GOOG', summary: '• GOOG news' }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
      });
      render(Component);

      const newsBlocks = screen.getAllByTestId('news-block');
      const tickers = newsBlocks.map(
        (block) =>
          block.querySelector('[data-testid="news-block-ticker"]')?.textContent,
      );

      // Should be sorted: MSFT (5%), GOOG (4%), AAPL (3.5%)
      expect(tickers).toEqual(['MSFT', 'GOOG', 'AAPL']);
    });
  });

  describe('Layout Rendering', () => {
    it('renders in flex row layout with gap-6', async () => {
      const stocks = [createMockStock({ ticker: 'AAPL' })];
      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 5.0 }),
      ];
      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• News' }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
      });
      render(Component);

      const container = screen.getByTestId('news-row');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-row');
      expect(container).toHaveClass('gap-6');
    });

    it('renders NewsBlock with flex-1 and w-full classes', async () => {
      const stocks = [createMockStock({ ticker: 'AAPL' })];
      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 5.0 }),
      ];
      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• News' }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
      });
      render(Component);

      const newsBlock = screen.getByTestId('news-block');
      expect(newsBlock).toHaveClass('flex-1');
    });

    it('applies custom className when provided', async () => {
      const stocks = [createMockStock({ ticker: 'AAPL' })];
      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 5.0 }),
      ];
      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• News' }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
        className: 'custom-class',
      });
      render(Component);

      const container = screen.getByTestId('news-row');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Empty/No Data States', () => {
    it('returns null when no stocks provided', async () => {
      const Component = await NewsRow({
        stocks: [],
        marketData: [],
        newsCache: [],
      });
      render(Component);

      expect(screen.queryByTestId('news-row')).not.toBeInTheDocument();
    });

    it('returns null when no news cache available', async () => {
      const stocks = [createMockStock({ ticker: 'AAPL' })];
      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 5.0 }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache: [],
      });
      render(Component);

      expect(screen.queryByTestId('news-row')).not.toBeInTheDocument();
    });

    it('excludes stocks without news summary', async () => {
      const stocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'MSFT' }),
      ];

      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 5.0 }),
        createMockMarketData({ ticker: 'MSFT', changePercent: 4.0 }),
      ];

      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• AAPL news' }),
        createMockNewsCache({ ticker: 'MSFT', summary: null }), // No summary
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
      });
      render(Component);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
    });

    it('shows a single stock when none qualify and only one exists', async () => {
      const stocks = [createMockStock({ ticker: 'AAPL' })];
      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 1.0 }),
      ];
      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• News' }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
      });
      render(Component);

      // Should show the single stock with news
      expect(screen.getByTestId('news-row')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });
  });

  describe('Data Fetching (Server Component)', () => {
    it('fetches data from database when props not provided', async () => {
      const mockStocks = [createMockStock({ ticker: 'AAPL' })];
      const mockMarketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 5.0 }),
      ];
      const mockNewsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• News' }),
      ];

      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue(mockNewsCache);

      const Component = await NewsRow({});
      render(Component);

      expect(prisma.stock.findMany).toHaveBeenCalled();
      expect(prisma.marketData.findMany).toHaveBeenCalled();
      expect(prisma.newsCache.findMany).toHaveBeenCalled();
    });

    it('does not fetch when all props provided', async () => {
      const stocks = [createMockStock({ ticker: 'AAPL' })];
      const marketData = [
        createMockMarketData({ ticker: 'AAPL', changePercent: 5.0 }),
      ];
      const newsCache = [
        createMockNewsCache({ ticker: 'AAPL', summary: '• News' }),
      ];

      const Component = await NewsRow({
        stocks,
        marketData,
        newsCache,
      });
      render(Component);

      expect(prisma.stock.findMany).not.toHaveBeenCalled();
      expect(prisma.marketData.findMany).not.toHaveBeenCalled();
      expect(prisma.newsCache.findMany).not.toHaveBeenCalled();
    });
  });
});
