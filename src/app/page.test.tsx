/**
 * Dashboard Page Integration Tests
 *
 * Verifies the complete dashboard layout including:
 * - Three-zone layout (Portfolio, Ticker, News)
 * - NewsRow integration with NewsCache data
 * - Empty and error state handling
 * - Data fetching and prop passing
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MarketData,
  NewsCache,
  Stock,
  User,
} from '@/generated/prisma/client';

// Mock next-intl/server (setRequestLocale + getTranslations are server-only)
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// Mock ThemeProvider (used by ThemeDecor in page layout)
vi.mock('@/theme-engine/ThemeProvider', () => ({
  useTheme: () => ({ themeId: 'default', setTheme: vi.fn() }),
}));

// Mock settings (used by page)
vi.mock('@/lib/settings', () => ({
  getChartTimeframeSettings: vi.fn().mockResolvedValue({
    portfolioChart: '1mo',
    portfolioChange: '1mo',
    tickerChart: '1mo',
    tickerChange: '1mo',
  }),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    stock: {
      findMany: vi.fn(),
    },
    marketData: {
      findMany: vi.fn(),
    },
    newsCache: {
      findMany: vi.fn(),
    },
    portfolioSnapshot: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/components/dashboard/EmptyStateWithModal', () => ({
  EmptyStateWithModal: ({ className }: { className?: string }) => (
    <div data-testid="empty-state-with-modal" className={className} />
  ),
}));

vi.mock('@/components/dashboard/ErrorState', () => ({
  ErrorState: ({
    className,
    variant,
  }: {
    className?: string;
    variant?: string;
  }) => (
    <div
      data-testid="error-state"
      className={className}
      data-variant={variant}
    />
  ),
}));

vi.mock('@/components/dashboard/PortfolioZone', () => ({
  PortfolioZone: ({
    positions,
    currency,
    locale,
  }: {
    positions: unknown[];
    currency: string;
    locale: string;
  }) => (
    <div
      data-testid="portfolio-zone"
      data-positions={positions.length}
      data-currency={currency}
      data-locale={locale}
    />
  ),
}));

vi.mock('@/components/dashboard/PortfolioChart', () => ({
  PortfolioChart: ({ historicalData }: { historicalData: unknown[] }) => (
    <div data-testid="portfolio-chart" data-points={historicalData.length} />
  ),
}));

vi.mock('@/components/dashboard/TickerRow', () => ({
  TickerRow: ({
    stocks,
    marketData,
  }: {
    stocks: unknown[];
    marketData: unknown[];
  }) => (
    <div
      data-testid="ticker-row"
      data-stocks={stocks.length}
      data-market-data={marketData.length}
    />
  ),
}));

vi.mock('@/components/dashboard/NewsRow', () => ({
  NewsRow: ({
    stocks,
    marketData,
    newsCache,
    className,
  }: {
    stocks: unknown[];
    marketData: unknown[];
    newsCache: unknown[];
    className?: string;
  }) => (
    <div
      data-testid="news-row"
      data-stocks={stocks.length}
      data-market-data={marketData.length}
      data-news-cache={newsCache.length}
      className={className}
    />
  ),
}));

import Home from '@/app/[locale]/page';
import prisma from '@/lib/prisma';

const defaultParams = { params: Promise.resolve({ locale: 'en' }) };

// =============================================================================
// Test Data Factories
// =============================================================================

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'thomas@intelslate.local',
    createdAt: new Date('2026-02-03T00:00:00.000Z'),
    updatedAt: new Date('2026-02-03T00:00:00.000Z'),
    ...overrides,
  };
}

function createMockStock(overrides: Partial<Stock> = {}): Stock {
  return {
    id: 'stock-1',
    userId: 'user-1',
    ticker: 'AAPL',
    buyPrice: 150,
    quantity: 10,
    logoUrl: null,
    createdAt: new Date('2026-02-03T00:00:00.000Z'),
    updatedAt: new Date('2026-02-03T00:00:00.000Z'),
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
    updatedAt: new Date('2026-02-03T00:00:00.000Z'),
    ...overrides,
  };
}

function createMockNewsCache(overrides: Partial<NewsCache> = {}): NewsCache {
  return {
    id: 'news-1',
    ticker: 'AAPL',
    articles: [],
    summary: '• Stock hit all-time high\n• Strong earnings reported',
    updatedAt: new Date('2026-02-03T00:00:00.000Z'),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Three-Zone Layout', () => {
    it('renders all three zones: Portfolio, Ticker, and News', async () => {
      const mockUser = createMockUser();
      const mockStocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'MSFT' }),
      ];
      const mockMarketData = [
        createMockMarketData({ ticker: 'AAPL' }),
        createMockMarketData({ ticker: 'MSFT' }),
      ];
      const mockNewsCache = [
        createMockNewsCache({ ticker: 'AAPL' }),
        createMockNewsCache({ ticker: 'MSFT' }),
      ];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue(mockNewsCache);

      const Component = await Home(defaultParams);
      render(Component);

      // Verify three zones exist (Portfolio via testid; Tickers via aria-label; News via testid)
      expect(screen.getByTestId('portfolio-zone')).toBeInTheDocument();
      expect(screen.getByLabelText('Stock Tickers')).toBeInTheDocument();
      expect(screen.getByTestId('news-row')).toBeInTheDocument();
    });

    it('renders zones in correct flex layout', async () => {
      const mockUser = createMockUser();
      const mockStocks = [createMockStock()];
      const mockMarketData = [createMockMarketData()];
      const mockNewsCache = [createMockNewsCache()];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue(mockNewsCache);

      const Component = await Home(defaultParams);
      render(Component);

      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex', 'flex-1', 'flex-col', 'gap-5', 'p-6');

      // All three zones present (layout uses h-1/3 for each)
      expect(screen.getByTestId('portfolio-zone')).toBeInTheDocument();
      expect(screen.getByLabelText('Stock Tickers')).toBeInTheDocument();
      expect(screen.getByTestId('news-row')).toBeInTheDocument();
    });
  });

  describe('NewsRow Integration', () => {
    it('renders NewsRow component in the News zone', async () => {
      const mockUser = createMockUser();
      const mockStocks = [createMockStock()];
      const mockMarketData = [createMockMarketData()];
      const mockNewsCache = [createMockNewsCache()];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue(mockNewsCache);

      const Component = await Home(defaultParams);
      render(Component);

      const newsRow = screen.getByTestId('news-row');
      expect(newsRow).toBeInTheDocument();
    });

    it('passes correct props to NewsRow: stocks, marketData, newsCache', async () => {
      const mockUser = createMockUser();
      const mockStocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'MSFT' }),
        createMockStock({ id: '3', ticker: 'GOOG' }),
      ];
      const mockMarketData = [
        createMockMarketData({ ticker: 'AAPL' }),
        createMockMarketData({ ticker: 'MSFT' }),
        createMockMarketData({ ticker: 'GOOG' }),
      ];
      const mockNewsCache = [
        createMockNewsCache({ ticker: 'AAPL' }),
        createMockNewsCache({ ticker: 'MSFT' }),
      ];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue(mockNewsCache);

      const Component = await Home(defaultParams);
      render(Component);

      const newsRow = screen.getByTestId('news-row');
      expect(newsRow).toHaveAttribute('data-stocks', '3');
      expect(newsRow).toHaveAttribute('data-market-data', '3');
      expect(newsRow).toHaveAttribute('data-news-cache', '2');
    });

    it('passes h-full className to NewsRow for full height', async () => {
      const mockUser = createMockUser();
      const mockStocks = [createMockStock()];
      const mockMarketData = [createMockMarketData()];
      const mockNewsCache = [createMockNewsCache()];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue(mockNewsCache);

      const Component = await Home(defaultParams);
      render(Component);

      const newsRow = screen.getByTestId('news-row');
      expect(newsRow).toHaveClass('h-full');
    });
  });

  describe('NewsCache Data Fetching', () => {
    it('fetches NewsCache data for all stock tickers', async () => {
      const mockUser = createMockUser();
      const mockStocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'TSLA' }),
      ];
      const mockMarketData = [
        createMockMarketData({ ticker: 'AAPL' }),
        createMockMarketData({ ticker: 'TSLA' }),
      ];
      const mockNewsCache = [
        createMockNewsCache({ ticker: 'AAPL' }),
        createMockNewsCache({ ticker: 'TSLA' }),
      ];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue(mockNewsCache);

      await Home(defaultParams);

      expect(prisma.newsCache.findMany).toHaveBeenCalledWith({
        where: { ticker: { in: ['AAPL', 'TSLA'] } },
      });
    });

    it('does not fetch NewsCache when no stocks exist', async () => {
      const mockUser = createMockUser();

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue([]);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue([]);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue([]);

      await Home(defaultParams);

      expect(prisma.newsCache.findMany).not.toHaveBeenCalled();
    });

    it('passes empty newsCache array when no news exists', async () => {
      const mockUser = createMockUser();
      const mockStocks = [createMockStock()];
      const mockMarketData = [createMockMarketData()];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue([]);

      const Component = await Home(defaultParams);
      render(Component);

      const newsRow = screen.getByTestId('news-row');
      expect(newsRow).toHaveAttribute('data-news-cache', '0');
    });
  });

  describe('Empty State', () => {
    it('renders EmptyStateWithModal when no stocks configured', async () => {
      const mockUser = createMockUser();

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue([]);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue([]);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue([]);

      const Component = await Home(defaultParams);
      render(Component);

      expect(screen.getByTestId('empty-state-with-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('news-row')).not.toBeInTheDocument();
    });

    it('renders EmptyStateWithModal when user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.stock.findMany).mockResolvedValue([]);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue([]);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue([]);

      const Component = await Home(defaultParams);
      render(Component);

      expect(screen.getByTestId('empty-state-with-modal')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders ErrorState when stocks exist but no market data', async () => {
      const mockUser = createMockUser();
      const mockStocks = [createMockStock()];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue([]);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue([]);

      const Component = await Home(defaultParams);
      render(Component);

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.queryByTestId('news-row')).not.toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('renders PortfolioZone with correct positions', async () => {
      const mockUser = createMockUser();
      const mockStocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'MSFT' }),
      ];
      const mockMarketData = [
        createMockMarketData({ ticker: 'AAPL' }),
        createMockMarketData({ ticker: 'MSFT' }),
      ];
      const mockNewsCache = [createMockNewsCache({ ticker: 'AAPL' })];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue(mockNewsCache);

      const Component = await Home(defaultParams);
      render(Component);

      const portfolioZone = screen.getByTestId('portfolio-zone');
      expect(portfolioZone).toHaveAttribute('data-positions', '2');
      expect(portfolioZone).toHaveAttribute('data-currency', 'EUR');
      expect(portfolioZone).toHaveAttribute('data-locale', 'en-GB');
    });

    it('renders TickerRow with stocks and market data', async () => {
      const mockUser = createMockUser();
      const mockStocks = [
        createMockStock({ id: '1', ticker: 'AAPL' }),
        createMockStock({ id: '2', ticker: 'MSFT' }),
      ];
      const mockMarketData = [
        createMockMarketData({ ticker: 'AAPL' }),
        createMockMarketData({ ticker: 'MSFT' }),
      ];
      const mockNewsCache = [createMockNewsCache({ ticker: 'AAPL' })];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(prisma.newsCache.findMany).mockResolvedValue(mockNewsCache);

      const Component = await Home(defaultParams);
      render(Component);

      const tickerRow = screen.getByTestId('ticker-row');
      expect(tickerRow).toHaveAttribute('data-stocks', '2');
      expect(tickerRow).toHaveAttribute('data-market-data', '2');
    });
  });
});
