/**
 * Stock Search Server Action Tests
 *
 * Tests for the searchStocks server action
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchStocks } from './stock-search';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('@/lib/api/yahooFinanceClient', () => ({
  getDefaultYahooFinanceClient: vi.fn(),
}));

import { getDefaultYahooFinanceClient } from '@/lib/api/yahooFinanceClient';

const mockGetDefaultYahooFinanceClient =
  getDefaultYahooFinanceClient as ReturnType<typeof vi.fn>;

// =============================================================================
// Test Data
// =============================================================================

const MOCK_SEARCH_RESULTS = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc',
    type: 'Equity',
    region: 'United States',
    currency: 'USD',
    matchScore: 1.0,
  },
  {
    symbol: 'APLE',
    name: 'Apple Hospitality REIT Inc',
    type: 'Equity',
    region: 'United States',
    currency: 'USD',
    matchScore: 0.8,
  },
];

// =============================================================================
// Tests: searchStocks
// =============================================================================

describe('searchStocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return search results for valid query', async () => {
    const mockClient = {
      searchSymbols: vi.fn().mockResolvedValue({
        success: true,
        results: MOCK_SEARCH_RESULTS,
      }),
    };
    mockGetDefaultYahooFinanceClient.mockReturnValue(mockClient);

    const result = await searchStocks('AAPL');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(MOCK_SEARCH_RESULTS);
    expect(mockClient.searchSymbols).toHaveBeenCalledWith('AAPL');
  });

  it('should validate minimum query length (2 characters)', async () => {
    const result = await searchStocks('A');

    expect(result.success).toBe(false);
    expect(result.error).toContain('at least 2 characters');
  });

  it('should handle API errors', async () => {
    const mockClient = {
      searchSymbols: vi.fn().mockResolvedValue({
        success: false,
        results: [],
        error: 'API error occurred',
      }),
    };
    mockGetDefaultYahooFinanceClient.mockReturnValue(mockClient);

    const result = await searchStocks('AAPL');

    expect(result.success).toBe(false);
    expect(result.error).toBe('API error occurred');
  });

  it('should return empty array when no matches found', async () => {
    const mockClient = {
      searchSymbols: vi.fn().mockResolvedValue({
        success: true,
        results: [],
      }),
    };
    mockGetDefaultYahooFinanceClient.mockReturnValue(mockClient);

    const result = await searchStocks('XYZNOTEXIST');

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should trim whitespace from query', async () => {
    const mockClient = {
      searchSymbols: vi.fn().mockResolvedValue({
        success: true,
        results: MOCK_SEARCH_RESULTS,
      }),
    };
    mockGetDefaultYahooFinanceClient.mockReturnValue(mockClient);

    await searchStocks('  AAPL  ');

    expect(mockClient.searchSymbols).toHaveBeenCalledWith('AAPL');
  });

  it('should log search operations', async () => {
    const mockClient = {
      searchSymbols: vi.fn().mockResolvedValue({
        success: true,
        results: MOCK_SEARCH_RESULTS,
      }),
    };
    mockGetDefaultYahooFinanceClient.mockReturnValue(mockClient);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await searchStocks('AAPL');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[StockSearch]'),
      expect.anything(),
    );

    consoleSpy.mockRestore();
  });
});
