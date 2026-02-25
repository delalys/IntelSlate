/**
 * News Refresh Cron Endpoint Tests
 *
 * Tests for the POST /api/cron/news endpoint that triggers
 * news refresh for stocks with significant price changes.
 *
 * @module app/api/cron/news/route.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, selectStocksForNewsFetch } from './route';
import type { Stock, MarketData } from '@/generated/prisma/client';

// =============================================================================
// Mocks
// =============================================================================

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    stock: {
      findMany: vi.fn(),
    },
    marketData: {
      findMany: vi.fn(),
    },
  },
}));

// Mock news service
vi.mock('@/lib/services/newsService', () => ({
  getDefaultNewsService: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { getDefaultNewsService } from '@/lib/services/newsService';

// =============================================================================
// Test Data
// =============================================================================

const createMockStock = (ticker: string): Stock => ({
  id: `stock-${ticker}`,
  userId: 'user-1',
  ticker,
  buyPrice: 100,
  quantity: 10,
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockMarketData = (
  ticker: string,
  changePercent: number,
): MarketData => ({
  id: `market-${ticker}`,
  ticker,
  price: 100,
  previousClose: 100 / (1 + changePercent / 100),
  change: changePercent,
  changePercent,
  historicalData: [],
  updatedAt: new Date(),
});

// =============================================================================
// selectStocksForNewsFetch Tests
// =============================================================================

describe('selectStocksForNewsFetch', () => {
  it('should select stocks with ≥3% change', () => {
    const stocks = [
      createMockStock('AAPL'),
      createMockStock('GOOGL'),
      createMockStock('MSFT'),
    ];

    const marketDataMap = new Map<string, MarketData>([
      ['AAPL', createMockMarketData('AAPL', 5.0)], // qualifies
      ['GOOGL', createMockMarketData('GOOGL', 2.0)], // doesn't qualify
      ['MSFT', createMockMarketData('MSFT', -4.0)], // qualifies (negative)
    ]);

    const result = selectStocksForNewsFetch(stocks, marketDataMap);

    expect(result).toHaveLength(2);
    expect(result[0].ticker).toBe('AAPL'); // 5% > 4%
    expect(result[1].ticker).toBe('MSFT'); // -4% absolute
  });

  it('should fall back to top movers when no stocks qualify', () => {
    const stocks = [
      createMockStock('AAPL'),
      createMockStock('GOOGL'),
      createMockStock('MSFT'),
    ];

    const marketDataMap = new Map<string, MarketData>([
      ['AAPL', createMockMarketData('AAPL', 1.0)],
      ['GOOGL', createMockMarketData('GOOGL', 2.5)], // highest mover
      ['MSFT', createMockMarketData('MSFT', -1.5)],
    ]);

    const result = selectStocksForNewsFetch(stocks, marketDataMap);

    expect(result).toHaveLength(3);
    expect(result[0].ticker).toBe('GOOGL'); // 2.5%
    expect(result[1].ticker).toBe('MSFT'); // -1.5% absolute
    expect(result[2].ticker).toBe('AAPL'); // 1.0% absolute
  });

  it('should limit to maximum 4 stocks', () => {
    const stocks = [
      createMockStock('AAPL'),
      createMockStock('GOOGL'),
      createMockStock('MSFT'),
      createMockStock('AMZN'),
      createMockStock('META'),
      createMockStock('NVDA'),
    ];

    const marketDataMap = new Map<string, MarketData>([
      ['AAPL', createMockMarketData('AAPL', 5.0)],
      ['GOOGL', createMockMarketData('GOOGL', 6.0)],
      ['MSFT', createMockMarketData('MSFT', -7.0)],
      ['AMZN', createMockMarketData('AMZN', 4.0)],
      ['META', createMockMarketData('META', 8.0)],
      ['NVDA', createMockMarketData('NVDA', -9.0)],
    ]);

    const result = selectStocksForNewsFetch(stocks, marketDataMap);

    expect(result).toHaveLength(4);
    // Should be sorted by absolute change: NVDA (9%), META (8%), MSFT (7%), GOOGL (6%)
    expect(result[0].ticker).toBe('NVDA');
    expect(result[1].ticker).toBe('META');
    expect(result[2].ticker).toBe('MSFT');
    expect(result[3].ticker).toBe('GOOGL');
  });

  it('should sort by absolute change percentage (biggest movers first)', () => {
    const stocks = [
      createMockStock('AAPL'),
      createMockStock('GOOGL'),
      createMockStock('MSFT'),
    ];

    const marketDataMap = new Map<string, MarketData>([
      ['AAPL', createMockMarketData('AAPL', 3.5)],
      ['GOOGL', createMockMarketData('GOOGL', -5.0)], // biggest absolute
      ['MSFT', createMockMarketData('MSFT', 4.0)],
    ]);

    const result = selectStocksForNewsFetch(stocks, marketDataMap);

    expect(result).toHaveLength(3);
    expect(result[0].ticker).toBe('GOOGL'); // 5.0 absolute
    expect(result[1].ticker).toBe('MSFT'); // 4.0 absolute
    expect(result[2].ticker).toBe('AAPL'); // 3.5 absolute
  });

  it('should skip stocks without market data', () => {
    const stocks = [
      createMockStock('AAPL'),
      createMockStock('GOOGL'),
      createMockStock('MSFT'),
    ];

    const marketDataMap = new Map<string, MarketData>([
      ['AAPL', createMockMarketData('AAPL', 5.0)],
      // GOOGL has no market data
      ['MSFT', createMockMarketData('MSFT', 4.0)],
    ]);

    const result = selectStocksForNewsFetch(stocks, marketDataMap);

    expect(result).toHaveLength(2);
    expect(result.find((s) => s.ticker === 'GOOGL')).toBeUndefined();
  });

  it('should return empty array when no stocks have market data', () => {
    const stocks = [createMockStock('AAPL'), createMockStock('GOOGL')];

    const marketDataMap = new Map<string, MarketData>();

    const result = selectStocksForNewsFetch(stocks, marketDataMap);

    expect(result).toHaveLength(0);
  });

  it('should return single stock when only one has market data', () => {
    const stocks = [createMockStock('AAPL'), createMockStock('GOOGL')];

    const marketDataMap = new Map<string, MarketData>([
      ['AAPL', createMockMarketData('AAPL', 1.0)],
    ]);

    const result = selectStocksForNewsFetch(stocks, marketDataMap);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe('AAPL');
  });

  it('should include exactly 3% threshold stocks', () => {
    const stocks = [createMockStock('AAPL'), createMockStock('GOOGL')];

    const marketDataMap = new Map<string, MarketData>([
      ['AAPL', createMockMarketData('AAPL', 3.0)], // exactly 3%
      ['GOOGL', createMockMarketData('GOOGL', 2.9)], // just under
    ]);

    const result = selectStocksForNewsFetch(stocks, marketDataMap);

    // AAPL qualifies at exactly 3%
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe('AAPL');
  });
});

// =============================================================================
// POST /api/cron/news Tests
// =============================================================================

describe('POST /api/cron/news', () => {
  let mockNewsService: {
    fetchAndSummarizeNewsForMultiple: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock news service
    mockNewsService = {
      fetchAndSummarizeNewsForMultiple: vi.fn(),
    };
  });

  // ===========================================================================
  // Success Cases
  // ===========================================================================

  it('should refresh news for selected stocks and return success response', async () => {
    const mockStocks = [createMockStock('AAPL'), createMockStock('GOOGL')];
    const mockMarketData = [
      createMockMarketData('AAPL', 5.0),
      createMockMarketData('GOOGL', 4.0),
    ];

    vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
    vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
    vi.mocked(getDefaultNewsService).mockResolvedValue(
      mockNewsService as unknown as ReturnType<typeof getDefaultNewsService>,
    );
    mockNewsService.fetchAndSummarizeNewsForMultiple.mockResolvedValue([
      { ticker: 'AAPL', success: true, articles: [], summary: 'Summary' },
      { ticker: 'GOOGL', success: true, articles: [], summary: 'Summary' },
    ]);

    const request = new Request('http://localhost:3000/api/cron/news', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.stocksProcessed).toBe(2);
    expect(data.successCount).toBe(2);
    expect(data.failureCount).toBe(0);
    expect(data.stocksSelected).toHaveLength(2);
    expect(data.timestamp).toBeDefined();
    expect(
      mockNewsService.fetchAndSummarizeNewsForMultiple,
    ).toHaveBeenCalledOnce();
  });

  it('should apply ≥3% / top 2 / max 4 selection logic', async () => {
    const mockStocks = [
      createMockStock('AAPL'),
      createMockStock('GOOGL'),
      createMockStock('MSFT'),
      createMockStock('AMZN'),
      createMockStock('META'),
    ];
    const mockMarketData = [
      createMockMarketData('AAPL', 5.0), // qualifies
      createMockMarketData('GOOGL', 2.0), // doesn't qualify
      createMockMarketData('MSFT', -4.0), // qualifies
      createMockMarketData('AMZN', 6.0), // qualifies
      createMockMarketData('META', -7.0), // qualifies (biggest)
    ];

    vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
    vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
    vi.mocked(getDefaultNewsService).mockResolvedValue(
      mockNewsService as unknown as ReturnType<typeof getDefaultNewsService>,
    );
    mockNewsService.fetchAndSummarizeNewsForMultiple.mockResolvedValue([
      { ticker: 'META', success: true, articles: [], summary: 'Summary' },
      { ticker: 'AMZN', success: true, articles: [], summary: 'Summary' },
      { ticker: 'AAPL', success: true, articles: [], summary: 'Summary' },
      { ticker: 'MSFT', success: true, articles: [], summary: 'Summary' },
    ]);

    const request = new Request('http://localhost:3000/api/cron/news', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stocksProcessed).toBe(4); // Max 4
    // Should be sorted by absolute change: META (7%), AMZN (6%), AAPL (5%), MSFT (4%)
    expect(data.stocksSelected[0].ticker).toBe('META');
    expect(data.stocksSelected[1].ticker).toBe('AMZN');
    expect(data.stocksSelected[2].ticker).toBe('AAPL');
    expect(data.stocksSelected[3].ticker).toBe('MSFT');
  });

  it('should handle partial failures in news fetching', async () => {
    const mockStocks = [createMockStock('AAPL'), createMockStock('GOOGL')];
    const mockMarketData = [
      createMockMarketData('AAPL', 5.0),
      createMockMarketData('GOOGL', 4.0),
    ];

    vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
    vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
    vi.mocked(getDefaultNewsService).mockResolvedValue(
      mockNewsService as unknown as ReturnType<typeof getDefaultNewsService>,
    );
    mockNewsService.fetchAndSummarizeNewsForMultiple.mockResolvedValue([
      { ticker: 'AAPL', success: true, articles: [], summary: 'Summary' },
      {
        ticker: 'GOOGL',
        success: false,
        articles: [],
        summary: null,
        error: 'API error',
      },
    ]);

    const request = new Request('http://localhost:3000/api/cron/news', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.successCount).toBe(1);
    expect(data.failureCount).toBe(1);
  });

  it('should handle empty stock list', async () => {
    vi.mocked(prisma.stock.findMany).mockResolvedValue([]);
    vi.mocked(getDefaultNewsService).mockResolvedValue(
      mockNewsService as unknown as ReturnType<typeof getDefaultNewsService>,
    );

    const request = new Request('http://localhost:3000/api/cron/news', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.stocksProcessed).toBe(0);
    expect(data.message).toBe('No stocks found');
    expect(
      mockNewsService.fetchAndSummarizeNewsForMultiple,
    ).not.toHaveBeenCalled();
  });

  it('should handle no stocks with market data', async () => {
    const mockStocks = [createMockStock('AAPL')];

    vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
    vi.mocked(prisma.marketData.findMany).mockResolvedValue([]);
    vi.mocked(getDefaultNewsService).mockResolvedValue(
      mockNewsService as unknown as ReturnType<typeof getDefaultNewsService>,
    );

    const request = new Request('http://localhost:3000/api/cron/news', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.stocksProcessed).toBe(0);
    expect(data.message).toBe('No stocks with market data');
    expect(
      mockNewsService.fetchAndSummarizeNewsForMultiple,
    ).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // Error Cases
  // ===========================================================================

  it('should return 500 when news service is not available', async () => {
    vi.mocked(getDefaultNewsService).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/cron/news', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'News service not available',
    });
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(getDefaultNewsService).mockResolvedValue(
      mockNewsService as unknown as ReturnType<typeof getDefaultNewsService>,
    );
    vi.mocked(prisma.stock.findMany).mockRejectedValue(
      new Error('Database connection failed'),
    );

    const request = new Request('http://localhost:3000/api/cron/news', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Database connection failed',
    });
  });

  it('should handle unknown errors', async () => {
    vi.mocked(getDefaultNewsService).mockResolvedValue(
      mockNewsService as unknown as ReturnType<typeof getDefaultNewsService>,
    );
    vi.mocked(prisma.stock.findMany).mockRejectedValue('Unknown error');

    const request = new Request('http://localhost:3000/api/cron/news', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Unknown error occurred',
    });
  });

  // ===========================================================================
  // Optional Auth Tests
  // ===========================================================================

  describe('Authentication (when configured)', () => {
    const originalEnv = process.env.CRON_AUTH_TOKEN;

    beforeEach(() => {
      // Set auth token for these tests
      process.env.CRON_AUTH_TOKEN = 'test-secret-token';
    });

    afterEach(() => {
      // Restore original env
      if (originalEnv !== undefined) {
        process.env.CRON_AUTH_TOKEN = originalEnv;
      } else {
        delete process.env.CRON_AUTH_TOKEN;
      }
    });

    it('should accept request with valid auth token', async () => {
      const mockStocks = [createMockStock('AAPL')];
      const mockMarketData = [createMockMarketData('AAPL', 5.0)];

      vi.mocked(prisma.stock.findMany).mockResolvedValue(mockStocks);
      vi.mocked(prisma.marketData.findMany).mockResolvedValue(mockMarketData);
      vi.mocked(getDefaultNewsService).mockResolvedValue(
        mockNewsService as unknown as ReturnType<typeof getDefaultNewsService>,
      );
      mockNewsService.fetchAndSummarizeNewsForMultiple.mockResolvedValue([
        { ticker: 'AAPL', success: true, articles: [], summary: 'Summary' },
      ]);

      const request = new Request('http://localhost:3000/api/cron/news', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret-token',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(
        mockNewsService.fetchAndSummarizeNewsForMultiple,
      ).toHaveBeenCalledOnce();
    });

    it('should reject request with invalid auth token', async () => {
      const request = new Request('http://localhost:3000/api/cron/news', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer wrong-token',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(
        mockNewsService.fetchAndSummarizeNewsForMultiple,
      ).not.toHaveBeenCalled();
    });

    it('should reject request without auth token', async () => {
      const request = new Request('http://localhost:3000/api/cron/news', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(
        mockNewsService.fetchAndSummarizeNewsForMultiple,
      ).not.toHaveBeenCalled();
    });
  });
});
