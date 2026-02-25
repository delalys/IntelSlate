/**
 * Yahoo Finance API Client Tests
 *
 * Tests for stock symbol search, quote data, and historical data
 * via yahoo-finance2 library
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IHistoricalDataPoint,
  IStockQuote,
  ISymbolSearchResult,
} from './yahooFinanceClient';
import { YahooFinanceClient } from './yahooFinanceClient';

// =============================================================================
// Mocks
// =============================================================================

// Mock yahoo-finance2 v3 which exports a class that needs instantiation
vi.mock('yahoo-finance2', () => {
  // All mocks must be defined inside the factory since vi.mock is hoisted
  const mockSearch = vi.fn();
  const mockQuote = vi.fn();
  const mockHistorical = vi.fn();

  return {
    default: class MockYahooFinance {
      static mockSearch = mockSearch;
      static mockQuote = mockQuote;
      static mockHistorical = mockHistorical;
      search = mockSearch;
      quote = mockQuote;
      historical = mockHistorical;
    },
  };
});

// Import the mocked module to access the static mock functions
import YahooFinance from 'yahoo-finance2';

const mockSearch = (
  YahooFinance as unknown as { mockSearch: ReturnType<typeof vi.fn> }
).mockSearch;
const mockQuote = (
  YahooFinance as unknown as { mockQuote: ReturnType<typeof vi.fn> }
).mockQuote;
const mockHistorical = (
  YahooFinance as unknown as { mockHistorical: ReturnType<typeof vi.fn> }
).mockHistorical;

// =============================================================================
// Test Data
// =============================================================================

const MOCK_SEARCH_RESPONSE = {
  quotes: [
    {
      symbol: 'AAPL',
      shortname: 'Apple Inc',
      quoteType: 'EQUITY',
      exchDisp: 'NASDAQ',
    },
    {
      symbol: 'APLE',
      shortname: 'Apple Hospitality REIT Inc',
      quoteType: 'EQUITY',
      exchDisp: 'NYSE',
    },
  ],
};

const EXPECTED_SEARCH_RESULTS: ISymbolSearchResult[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc',
    type: 'EQUITY',
    region: 'NASDAQ',
    currency: 'USD',
    matchScore: 1.0,
  },
  {
    symbol: 'APLE',
    name: 'Apple Hospitality REIT Inc',
    type: 'EQUITY',
    region: 'NYSE',
    currency: 'USD',
    matchScore: 0.9,
  },
];

// =============================================================================
// Quote Test Data
// =============================================================================

const MOCK_QUOTE_RESPONSE = {
  symbol: 'AAPL',
  regularMarketPrice: 184.25,
  regularMarketPreviousClose: 181.42,
  regularMarketChange: 2.83,
  regularMarketChangePercent: 1.56,
};

const EXPECTED_QUOTE: IStockQuote = {
  symbol: 'AAPL',
  price: 184.25,
  previousClose: 181.42,
  change: 2.83,
  changePercent: 1.56,
};

// =============================================================================
// Historical Data Test Data
// =============================================================================

const MOCK_HISTORICAL_RESPONSE = [
  {
    date: new Date('2026-02-03'),
    open: 182.63,
    high: 184.95,
    low: 182.46,
    close: 184.25,
    volume: 48654209,
  },
  {
    date: new Date('2026-02-02'),
    open: 180.15,
    high: 182.0,
    low: 179.8,
    close: 181.42,
    volume: 52341000,
  },
  {
    date: new Date('2026-02-01'),
    open: 178.5,
    high: 180.5,
    low: 177.9,
    close: 180.15,
    volume: 45123000,
  },
];

const EXPECTED_HISTORICAL: IHistoricalDataPoint[] = [
  {
    date: '2026-02-01',
    open: 178.5,
    high: 180.5,
    low: 177.9,
    close: 180.15,
    volume: 45123000,
  },
  {
    date: '2026-02-02',
    open: 180.15,
    high: 182.0,
    low: 179.8,
    close: 181.42,
    volume: 52341000,
  },
  {
    date: '2026-02-03',
    open: 182.63,
    high: 184.95,
    low: 182.46,
    close: 184.25,
    volume: 48654209,
  },
];

// =============================================================================
// Tests: YahooFinanceClient
// =============================================================================

describe('YahooFinanceClient', () => {
  let client: YahooFinanceClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new YahooFinanceClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchSymbols', () => {
    it('should return matching symbols for a valid query', async () => {
      mockSearch.mockResolvedValueOnce(MOCK_SEARCH_RESPONSE as never);

      const result = await client.searchSymbols('AAPL');

      expect(result.success).toBe(true);
      expect(result.results).toEqual(EXPECTED_SEARCH_RESULTS);
      expect(result.error).toBeUndefined();
    });

    it('should call yahoo-finance2 search with correct parameters', async () => {
      mockSearch.mockResolvedValueOnce(MOCK_SEARCH_RESPONSE as never);

      await client.searchSymbols('AAPL');

      expect(mockSearch).toHaveBeenCalledWith('AAPL', {
        quotesCount: 10,
        newsCount: 0,
      });
    });

    it('should return empty array for no matches', async () => {
      mockSearch.mockResolvedValueOnce({ quotes: [] } as never);

      const result = await client.searchSymbols('XYZNOTEXIST');

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockSearch.mockRejectedValueOnce(new Error('API error'));

      const result = await client.searchSymbols('AAPL');

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it('should validate minimum query length (2 characters)', async () => {
      const result = await client.searchSymbols('A');

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 2 characters');
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should trim whitespace from query', async () => {
      mockSearch.mockResolvedValueOnce(MOCK_SEARCH_RESPONSE as never);

      await client.searchSymbols('  AAPL  ');

      expect(mockSearch).toHaveBeenCalledWith('AAPL', expect.any(Object));
    });

    it('should handle malformed API response', async () => {
      mockSearch.mockResolvedValueOnce({ quotes: undefined } as never);

      const result = await client.searchSymbols('AAPL');

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('should filter out results without symbol or name', async () => {
      mockSearch.mockResolvedValueOnce({
        quotes: [
          {
            symbol: 'AAPL',
            shortname: 'Apple Inc',
            quoteType: 'EQUITY',
            exchDisp: 'NASDAQ',
          },
          {
            symbol: '',
            shortname: 'No Symbol',
            quoteType: 'EQUITY',
            exchDisp: 'NYSE',
          },
          {
            symbol: 'MSFT',
            shortname: '',
            quoteType: 'EQUITY',
            exchDisp: 'NASDAQ',
          },
        ],
      } as never);

      const result = await client.searchSymbols('test');

      expect(result.success).toBe(true);
      expect(result.results.length).toBe(1);
      expect(result.results[0].symbol).toBe('AAPL');
    });
  });

  // ===========================================================================
  // Tests: getQuote
  // ===========================================================================

  describe('getQuote', () => {
    it('should return quote data for a valid ticker', async () => {
      mockQuote.mockResolvedValueOnce(MOCK_QUOTE_RESPONSE as never);

      const result = await client.getQuote('AAPL');

      expect(result).not.toBeNull();
      expect(result).toEqual(EXPECTED_QUOTE);
    });

    it('should call yahoo-finance2 quote with uppercased ticker', async () => {
      mockQuote.mockResolvedValueOnce(MOCK_QUOTE_RESPONSE as never);

      await client.getQuote('aapl');

      expect(mockQuote).toHaveBeenCalledWith('AAPL');
    });

    it('should return null for API errors', async () => {
      mockQuote.mockRejectedValueOnce(new Error('API error'));

      const result = await client.getQuote('AAPL');

      expect(result).toBeNull();
    });

    it('should return null for empty response', async () => {
      mockQuote.mockResolvedValueOnce(null as never);

      const result = await client.getQuote('INVALID');

      expect(result).toBeNull();
    });

    it('should return null when regularMarketPrice is undefined', async () => {
      mockQuote.mockResolvedValueOnce({
        symbol: 'AAPL',
        regularMarketPrice: undefined,
      } as never);

      const result = await client.getQuote('AAPL');

      expect(result).toBeNull();
    });

    it('should trim whitespace from ticker', async () => {
      mockQuote.mockResolvedValueOnce(MOCK_QUOTE_RESPONSE as never);

      await client.getQuote('  AAPL  ');

      expect(mockQuote).toHaveBeenCalledWith('AAPL');
    });

    it('should handle missing optional fields with defaults', async () => {
      mockQuote.mockResolvedValueOnce({
        symbol: 'AAPL',
        regularMarketPrice: 150.0,
        // Missing: regularMarketPreviousClose, regularMarketChange, regularMarketChangePercent
      } as never);

      const result = await client.getQuote('AAPL');

      expect(result).not.toBeNull();
      expect(result?.price).toBe(150.0);
      expect(result?.previousClose).toBe(150.0); // Defaults to price
      expect(result?.change).toBe(0);
      expect(result?.changePercent).toBe(0);
    });
  });

  // ===========================================================================
  // Tests: getHistoricalData
  // ===========================================================================

  describe('getHistoricalData', () => {
    it('should return historical data for a valid ticker', async () => {
      mockHistorical.mockResolvedValueOnce(MOCK_HISTORICAL_RESPONSE as never);

      const result = await client.getHistoricalData('AAPL');

      expect(result).not.toBeNull();
      expect(result).toEqual(EXPECTED_HISTORICAL);
    });

    it('should call yahoo-finance2 historical with correct date range', async () => {
      mockHistorical.mockResolvedValueOnce(MOCK_HISTORICAL_RESPONSE as never);

      await client.getHistoricalData('AAPL');

      expect(mockHistorical).toHaveBeenCalledWith(
        'AAPL',
        expect.objectContaining({
          period1: expect.any(Date),
          period2: expect.any(Date),
          interval: '1d',
        }),
      );
    });

    it('should return all data points from API response', async () => {
      // Create mock response with 40 days of data
      const manyDaysData = [];
      for (let i = 0; i < 40; i++) {
        const date = new Date('2026-02-03');
        date.setDate(date.getDate() - i);
        manyDaysData.push({
          date,
          open: 100.0,
          high: 101.0,
          low: 99.0,
          close: 100.5,
          volume: 1000000,
        });
      }

      mockHistorical.mockResolvedValueOnce(manyDaysData as never);

      const result = await client.getHistoricalData('AAPL');

      expect(result).not.toBeNull();
      if (result === null) throw new Error('Result should not be null');
      expect(result.length).toBe(40);
    });

    it('should return data sorted by date ascending (oldest first) for chart display', async () => {
      // Return data in descending order to test sorting
      mockHistorical.mockResolvedValueOnce(MOCK_HISTORICAL_RESPONSE as never);

      const result = await client.getHistoricalData('AAPL');

      expect(result).not.toBeNull();
      if (result === null) throw new Error('Result should not be null');
      expect(result[0].date).toBe('2026-02-01');
      expect(result[1].date).toBe('2026-02-02');
      expect(result[2].date).toBe('2026-02-03');
    });

    it('should return null for API errors', async () => {
      mockHistorical.mockRejectedValueOnce(new Error('API error'));

      const result = await client.getHistoricalData('AAPL');

      expect(result).toBeNull();
    });

    it('should return null for empty response', async () => {
      mockHistorical.mockResolvedValueOnce([] as never);

      const result = await client.getHistoricalData('INVALID');

      expect(result).toBeNull();
    });

    it('should return null for null response', async () => {
      mockHistorical.mockResolvedValueOnce(null as never);

      const result = await client.getHistoricalData('INVALID');

      expect(result).toBeNull();
    });

    it('should trim whitespace from ticker', async () => {
      mockHistorical.mockResolvedValueOnce(MOCK_HISTORICAL_RESPONSE as never);

      await client.getHistoricalData('  AAPL  ');

      expect(mockHistorical).toHaveBeenCalledWith('AAPL', expect.any(Object));
    });
  });
});

// =============================================================================
// Tests: getDefaultYahooFinanceClient
// =============================================================================

describe('getDefaultYahooFinanceClient', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should always return a valid client (no API key needed)', async () => {
    const { getDefaultYahooFinanceClient: getClient } = await import(
      './yahooFinanceClient'
    );
    const client = getClient();

    expect(client).not.toBeNull();
    expect(typeof client.searchSymbols).toBe('function');
    expect(typeof client.getQuote).toBe('function');
    expect(typeof client.getHistoricalData).toBe('function');
  });

  it('should return the same instance on subsequent calls', async () => {
    const { getDefaultYahooFinanceClient: getClient } = await import(
      './yahooFinanceClient'
    );

    const client1 = getClient();
    const client2 = getClient();

    expect(client1).toBe(client2);
  });
});
