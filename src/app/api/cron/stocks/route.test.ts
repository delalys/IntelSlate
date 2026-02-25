/**
 * Stock Price Refresh Cron Endpoint Tests
 *
 * Tests for the POST /api/cron/stocks endpoint that triggers
 * market data refresh for all tracked stocks.
 *
 * @module app/api/cron/stocks/route.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import type { IRefreshResult } from '@/lib/services/marketDataService';

// =============================================================================
// Mocks
// =============================================================================

// Mock the market data service
vi.mock('@/lib/services/marketDataService', () => ({
  getDefaultMarketDataService: vi.fn(),
}));

import { getDefaultMarketDataService } from '@/lib/services/marketDataService';

// =============================================================================
// Test Data
// =============================================================================

const mockSuccessResult: IRefreshResult = {
  totalTickers: 3,
  successCount: 3,
  failureCount: 0,
  results: [
    { ticker: 'AAPL', success: true },
    { ticker: 'GOOGL', success: true },
    { ticker: 'MSFT', success: true },
  ],
};

const mockPartialFailureResult: IRefreshResult = {
  totalTickers: 3,
  successCount: 2,
  failureCount: 1,
  results: [
    { ticker: 'AAPL', success: true },
    { ticker: 'INVALID', success: false, error: 'Failed to fetch quote data' },
    { ticker: 'MSFT', success: true },
  ],
};

const mockEmptyResult: IRefreshResult = {
  totalTickers: 0,
  successCount: 0,
  failureCount: 0,
  results: [],
};

// =============================================================================
// POST /api/cron/stocks Tests
// =============================================================================

describe('POST /api/cron/stocks', () => {
  let mockService: {
    refreshAllMarketData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock service
    mockService = {
      refreshAllMarketData: vi.fn(),
    };
  });

  // ===========================================================================
  // Success Cases
  // ===========================================================================

  it('should refresh market data and return success response', async () => {
    vi.mocked(getDefaultMarketDataService).mockReturnValue(
      mockService as never,
    );
    mockService.refreshAllMarketData.mockResolvedValue(mockSuccessResult);

    const request = new Request('http://localhost:3000/api/cron/stocks', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      stocksUpdated: 3,
      totalStocks: 3,
      failures: 0,
      snapshotCreated: expect.any(Boolean),
      timestamp: expect.any(String),
    });
    expect(mockService.refreshAllMarketData).toHaveBeenCalledOnce();
  });

  it('should handle partial failures and return success with failure count', async () => {
    vi.mocked(getDefaultMarketDataService).mockReturnValue(
      mockService as never,
    );
    mockService.refreshAllMarketData.mockResolvedValue(
      mockPartialFailureResult,
    );

    const request = new Request('http://localhost:3000/api/cron/stocks', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      stocksUpdated: 2,
      totalStocks: 3,
      failures: 1,
      snapshotCreated: expect.any(Boolean),
      timestamp: expect.any(String),
    });
  });

  it('should handle empty ticker list', async () => {
    vi.mocked(getDefaultMarketDataService).mockReturnValue(
      mockService as never,
    );
    mockService.refreshAllMarketData.mockResolvedValue(mockEmptyResult);

    const request = new Request('http://localhost:3000/api/cron/stocks', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      stocksUpdated: 0,
      totalStocks: 0,
      failures: 0,
      snapshotCreated: expect.any(Boolean),
      timestamp: expect.any(String),
    });
  });

  // ===========================================================================
  // Error Cases
  // ===========================================================================

  it('should return 500 when market data service is not available', async () => {
    vi.mocked(getDefaultMarketDataService).mockReturnValue(null);

    const request = new Request('http://localhost:3000/api/cron/stocks', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Market data service not available',
    });
  });

  it('should handle service errors gracefully', async () => {
    vi.mocked(getDefaultMarketDataService).mockReturnValue(
      mockService as never,
    );
    mockService.refreshAllMarketData.mockRejectedValue(
      new Error('Database connection failed'),
    );

    const request = new Request('http://localhost:3000/api/cron/stocks', {
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
    vi.mocked(getDefaultMarketDataService).mockReturnValue(
      mockService as never,
    );
    mockService.refreshAllMarketData.mockRejectedValue('Unknown error');

    const request = new Request('http://localhost:3000/api/cron/stocks', {
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
      vi.mocked(getDefaultMarketDataService).mockReturnValue(
        mockService as never,
      );
      mockService.refreshAllMarketData.mockResolvedValue(mockSuccessResult);

      const request = new Request('http://localhost:3000/api/cron/stocks', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret-token',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockService.refreshAllMarketData).toHaveBeenCalledOnce();
    });

    it('should reject request with invalid auth token', async () => {
      const request = new Request('http://localhost:3000/api/cron/stocks', {
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
      expect(mockService.refreshAllMarketData).not.toHaveBeenCalled();
    });

    it('should reject request without auth token', async () => {
      const request = new Request('http://localhost:3000/api/cron/stocks', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(mockService.refreshAllMarketData).not.toHaveBeenCalled();
    });
  });
});
