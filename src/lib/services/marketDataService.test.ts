/**
 * Market Data Service Tests
 *
 * Tests for the market data refresh service that fetches and caches
 * stock quotes and historical data from Yahoo Finance.
 *
 * @module lib/services/marketDataService.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketDataService, getUniqueTickers } from './marketDataService';
import type {
  YahooFinanceClient,
  IStockQuote,
  IHistoricalDataPoint,
} from '../api/yahooFinanceClient';

// =============================================================================
// Mocks
// =============================================================================

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  default: {
    stock: {
      findMany: vi.fn(),
    },
    marketData: {
      upsert: vi.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

// =============================================================================
// Test Data
// =============================================================================

const mockQuote: IStockQuote = {
  symbol: 'AAPL',
  price: 150.25,
  previousClose: 148.5,
  change: 1.75,
  changePercent: 1.18,
};

const mockHistoricalData: IHistoricalDataPoint[] = [
  {
    date: '2026-02-04',
    open: 149.0,
    high: 151.0,
    low: 148.5,
    close: 150.25,
    volume: 1000000,
  },
  {
    date: '2026-02-03',
    open: 148.0,
    high: 149.5,
    low: 147.5,
    close: 148.5,
    volume: 950000,
  },
];

// =============================================================================
// getUniqueTickers Tests
// =============================================================================

describe('getUniqueTickers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unique tickers from the database', async () => {
    vi.mocked(prisma.stock.findMany).mockResolvedValue([
      { ticker: 'AAPL' },
      { ticker: 'GOOGL' },
      { ticker: 'MSFT' },
    ] as never);

    const tickers = await getUniqueTickers();

    expect(tickers).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    expect(prisma.stock.findMany).toHaveBeenCalledWith({
      select: { ticker: true },
      distinct: ['ticker'],
    });
  });

  it('should return empty array when no stocks exist', async () => {
    vi.mocked(prisma.stock.findMany).mockResolvedValue([]);

    const tickers = await getUniqueTickers();

    expect(tickers).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(prisma.stock.findMany).mockRejectedValue(
      new Error('DB connection failed'),
    );

    const tickers = await getUniqueTickers();

    expect(tickers).toEqual([]);
  });
});

// =============================================================================
// MarketDataService Tests
// =============================================================================

describe('MarketDataService', () => {
  let service: MarketDataService;
  let mockClient: YahooFinanceClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Yahoo Finance client
    mockClient = {
      getQuote: vi.fn(),
      getHistoricalData: vi.fn(),
      searchSymbols: vi.fn(),
    } as unknown as YahooFinanceClient;

    service = new MarketDataService(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // refreshTickerData Tests
  // ===========================================================================

  describe('refreshTickerData', () => {
    it('should fetch quote and historical data and upsert to database', async () => {
      vi.mocked(mockClient.getQuote).mockResolvedValue(mockQuote);
      vi.mocked(mockClient.getHistoricalData).mockResolvedValue(
        mockHistoricalData,
      );
      vi.mocked(prisma.marketData.upsert).mockResolvedValue({} as never);

      const result = await service.refreshTickerData('AAPL');

      expect(result.success).toBe(true);
      expect(result.ticker).toBe('AAPL');
      expect(result.error).toBeUndefined();

      expect(mockClient.getQuote).toHaveBeenCalledWith('AAPL');
      expect(mockClient.getHistoricalData).toHaveBeenCalledWith('AAPL');

      expect(prisma.marketData.upsert).toHaveBeenCalledWith({
        where: { ticker: 'AAPL' },
        update: {
          price: 150.25,
          previousClose: 148.5,
          change: 1.75,
          changePercent: 1.18,
          historicalData: mockHistoricalData,
        },
        create: {
          ticker: 'AAPL',
          price: 150.25,
          previousClose: 148.5,
          change: 1.75,
          changePercent: 1.18,
          historicalData: mockHistoricalData,
        },
      });
    });

    it('should return failure when quote fetch fails', async () => {
      vi.mocked(mockClient.getQuote).mockResolvedValue(null);
      vi.mocked(mockClient.getHistoricalData).mockResolvedValue(
        mockHistoricalData,
      );

      const result = await service.refreshTickerData('AAPL');

      expect(result.success).toBe(false);
      expect(result.ticker).toBe('AAPL');
      expect(result.error).toBe('Failed to fetch quote data');
      expect(prisma.marketData.upsert).not.toHaveBeenCalled();
    });

    it('should return failure when historical data fetch fails', async () => {
      vi.mocked(mockClient.getQuote).mockResolvedValue(mockQuote);
      vi.mocked(mockClient.getHistoricalData).mockResolvedValue(null);

      const result = await service.refreshTickerData('AAPL');

      expect(result.success).toBe(false);
      expect(result.ticker).toBe('AAPL');
      expect(result.error).toBe('Failed to fetch historical data');
      expect(prisma.marketData.upsert).not.toHaveBeenCalled();
    });

    it('should return failure when database upsert fails', async () => {
      vi.mocked(mockClient.getQuote).mockResolvedValue(mockQuote);
      vi.mocked(mockClient.getHistoricalData).mockResolvedValue(
        mockHistoricalData,
      );
      vi.mocked(prisma.marketData.upsert).mockRejectedValue(
        new Error('DB write failed'),
      );

      const result = await service.refreshTickerData('AAPL');

      expect(result.success).toBe(false);
      expect(result.ticker).toBe('AAPL');
      expect(result.error).toBe('DB write failed');
    });

    it('should handle empty historical data array', async () => {
      vi.mocked(mockClient.getQuote).mockResolvedValue(mockQuote);
      vi.mocked(mockClient.getHistoricalData).mockResolvedValue([]);
      vi.mocked(prisma.marketData.upsert).mockResolvedValue({} as never);

      const result = await service.refreshTickerData('AAPL');

      expect(result.success).toBe(true);
      expect(prisma.marketData.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ historicalData: [] }),
          create: expect.objectContaining({ historicalData: [] }),
        }),
      );
    });
  });

  // ===========================================================================
  // refreshAllMarketData Tests
  // ===========================================================================

  describe('refreshAllMarketData', () => {
    it('should refresh all tickers and return aggregate results', async () => {
      vi.mocked(prisma.stock.findMany).mockResolvedValue([
        { ticker: 'AAPL' },
        { ticker: 'GOOGL' },
      ] as never);
      vi.mocked(mockClient.getQuote).mockResolvedValue(mockQuote);
      vi.mocked(mockClient.getHistoricalData).mockResolvedValue(
        mockHistoricalData,
      );
      vi.mocked(prisma.marketData.upsert).mockResolvedValue({} as never);

      const result = await service.refreshAllMarketData();

      expect(result.totalTickers).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should handle partial failures gracefully', async () => {
      vi.mocked(prisma.stock.findMany).mockResolvedValue([
        { ticker: 'AAPL' },
        { ticker: 'INVALID' },
        { ticker: 'MSFT' },
      ] as never);

      // AAPL and MSFT succeed, INVALID fails
      vi.mocked(mockClient.getQuote)
        .mockResolvedValueOnce(mockQuote)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockQuote, symbol: 'MSFT' });
      vi.mocked(mockClient.getHistoricalData).mockResolvedValue(
        mockHistoricalData,
      );
      vi.mocked(prisma.marketData.upsert).mockResolvedValue({} as never);

      const result = await service.refreshAllMarketData();

      expect(result.totalTickers).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results.find((r) => r.ticker === 'INVALID')?.success).toBe(
        false,
      );
    });

    it('should return empty results when no tickers exist', async () => {
      vi.mocked(prisma.stock.findMany).mockResolvedValue([]);

      const result = await service.refreshAllMarketData();

      expect(result.totalTickers).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should process all tickers without artificial delays', async () => {
      vi.mocked(prisma.stock.findMany).mockResolvedValue([
        { ticker: 'AAPL' },
        { ticker: 'GOOGL' },
        { ticker: 'MSFT' },
      ] as never);
      vi.mocked(mockClient.getQuote).mockResolvedValue(mockQuote);
      vi.mocked(mockClient.getHistoricalData).mockResolvedValue(
        mockHistoricalData,
      );
      vi.mocked(prisma.marketData.upsert).mockResolvedValue({} as never);

      // All calls should complete immediately without rate limiting
      const result = await service.refreshAllMarketData();

      // Verify all tickers were processed
      expect(mockClient.getQuote).toHaveBeenCalledTimes(3);
      expect(result.successCount).toBe(3);
    });

    it('should handle getUniqueTickers failure', async () => {
      vi.mocked(prisma.stock.findMany).mockRejectedValue(new Error('DB error'));

      const result = await service.refreshAllMarketData();

      expect(result.totalTickers).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.results).toEqual([]);
    });
  });
});
