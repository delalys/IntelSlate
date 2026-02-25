/**
 * Stock Server Actions Tests
 *
 * Tests for stock CRUD operations via Server Actions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStock, getStocks, removeStock, updateStock } from './stocks';

// =============================================================================
// Mocks
// =============================================================================

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    stock: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    stock: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock market data service
vi.mock('@/lib/services/marketDataService', () => ({
  getDefaultMarketDataService: vi.fn().mockReturnValue(null),
}));

// Mock Logo.dev client
vi.mock('@/lib/api/logodev', () => ({
  getDefaultLogoDevClient: vi.fn(),
}));

import { getDefaultLogoDevClient } from '@/lib/api/logodev';
// Import mocked modules
import prisma from '@/lib/prisma';

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  stock: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const mockGetDefaultLogoDevClient = getDefaultLogoDevClient as ReturnType<
  typeof vi.fn
>;

// =============================================================================
// Test Data
// =============================================================================

const TEST_USER_ID = 'test-user-id-123';
const TEST_USER = {
  id: TEST_USER_ID,
  email: 'thomas@intelslate.local',
  createdAt: new Date(),
};

const MOCK_STOCK = {
  id: 'stock-id-1',
  userId: TEST_USER_ID,
  ticker: 'AAPL',
  buyPrice: 150.0,
  quantity: 10,
  logoUrl: 'https://img.logo.dev/apple.com?token=test',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =============================================================================
// Tests: addStock
// =============================================================================

describe('addStock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);
    mockPrisma.stock.findFirst.mockResolvedValue(null);
    mockPrisma.stock.count.mockResolvedValue(0);
  });

  it('should add a stock with valid input', async () => {
    const mockLogoClient = {
      fetchLogo: vi.fn().mockResolvedValue({
        success: true,
        logoUrl: 'https://img.logo.dev/apple.com?token=test',
        domain: 'apple.com',
      }),
    };
    mockGetDefaultLogoDevClient.mockReturnValue(mockLogoClient);
    mockPrisma.stock.create.mockResolvedValue(MOCK_STOCK);

    const result = await addStock({
      ticker: 'AAPL',
      buyPrice: 150.0,
      quantity: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(MOCK_STOCK);
    expect(mockPrisma.stock.create).toHaveBeenCalled();
  }, 20000);

  it('should validate ticker length', async () => {
    const result = await addStock({
      ticker: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      buyPrice: 150.0,
      quantity: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Ticker');
  });

  it('should validate positive buy price', async () => {
    const result = await addStock({
      ticker: 'AAPL',
      buyPrice: -50.0,
      quantity: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('should validate positive integer quantity', async () => {
    const result = await addStock({
      ticker: 'AAPL',
      buyPrice: 150.0,
      quantity: -5,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('should enforce 5 stock limit', async () => {
    mockPrisma.stock.count.mockResolvedValue(5);

    const result = await addStock({
      ticker: 'AAPL',
      buyPrice: 150.0,
      quantity: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('maximum');
  });

  it('should fetch logo from Logo.dev', async () => {
    const mockLogoClient = {
      fetchLogo: vi.fn().mockResolvedValue({
        success: true,
        logoUrl: 'https://img.logo.dev/apple.com?token=test',
        domain: 'apple.com',
      }),
    };
    mockGetDefaultLogoDevClient.mockReturnValue(mockLogoClient);
    mockPrisma.stock.create.mockResolvedValue(MOCK_STOCK);

    await addStock({
      ticker: 'AAPL',
      buyPrice: 150.0,
      quantity: 10,
    });

    // Implementation uses domain mapping: AAPL -> apple.com
    expect(mockLogoClient.fetchLogo).toHaveBeenCalledWith('apple.com');
  });

  it('should handle missing Logo.dev client gracefully', async () => {
    mockGetDefaultLogoDevClient.mockReturnValue(null);
    mockPrisma.stock.create.mockResolvedValue({
      ...MOCK_STOCK,
      logoUrl: null,
    });

    const result = await addStock({
      ticker: 'AAPL',
      buyPrice: 150.0,
      quantity: 10,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.stock.create).toHaveBeenCalled();
  });

  it('should handle Logo.dev fetch failure gracefully', async () => {
    const mockLogoClient = {
      fetchLogo: vi.fn().mockResolvedValue({
        success: false,
        logoUrl: null,
        domain: 'apple.com',
        error: 'Not found',
      }),
    };
    mockGetDefaultLogoDevClient.mockReturnValue(mockLogoClient);
    mockPrisma.stock.create.mockResolvedValue({
      ...MOCK_STOCK,
      logoUrl: null,
    });

    const result = await addStock({
      ticker: 'AAPL',
      buyPrice: 150.0,
      quantity: 10,
    });

    expect(result.success).toBe(true);
    // Stock should still be created even if logo fetch fails
    expect(mockPrisma.stock.create).toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    mockGetDefaultLogoDevClient.mockReturnValue({
      fetchLogo: vi.fn().mockResolvedValue({ success: true, logoUrl: 'url' }),
    });
    mockPrisma.stock.create.mockRejectedValue(new Error('Database error'));

    const result = await addStock({
      ticker: 'AAPL',
      buyPrice: 150.0,
      quantity: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should transform ticker to uppercase', async () => {
    const mockLogoClient = {
      fetchLogo: vi.fn().mockResolvedValue({
        success: true,
        logoUrl: 'https://img.logo.dev/apple.com?token=test',
        domain: 'apple.com',
      }),
    };
    mockGetDefaultLogoDevClient.mockReturnValue(mockLogoClient);
    mockPrisma.stock.create.mockResolvedValue(MOCK_STOCK);

    await addStock({
      ticker: 'aapl',
      buyPrice: 150.0,
      quantity: 10,
    });

    expect(mockPrisma.stock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticker: 'AAPL',
        }),
      }),
    );
  }, 20000);
});

// =============================================================================
// Tests: updateStock
// =============================================================================

describe('updateStock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);
  });

  it('should update buy price', async () => {
    mockPrisma.stock.update.mockResolvedValue({
      ...MOCK_STOCK,
      buyPrice: 175.0,
    });

    const result = await updateStock(MOCK_STOCK.id, { buyPrice: 175.0 });

    expect(result.success).toBe(true);
    expect(result.data?.buyPrice).toBe(175.0);
  });

  it('should update quantity', async () => {
    mockPrisma.stock.update.mockResolvedValue({
      ...MOCK_STOCK,
      quantity: 20,
    });

    const result = await updateStock(MOCK_STOCK.id, { quantity: 20 });

    expect(result.success).toBe(true);
    expect(result.data?.quantity).toBe(20);
  });

  it('should update both buy price and quantity', async () => {
    mockPrisma.stock.update.mockResolvedValue({
      ...MOCK_STOCK,
      buyPrice: 175.0,
      quantity: 20,
    });

    const result = await updateStock(MOCK_STOCK.id, {
      buyPrice: 175.0,
      quantity: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data?.buyPrice).toBe(175.0);
    expect(result.data?.quantity).toBe(20);
  });

  it('should validate positive buy price', async () => {
    const result = await updateStock(MOCK_STOCK.id, { buyPrice: -50.0 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('should validate positive integer quantity', async () => {
    const result = await updateStock(MOCK_STOCK.id, { quantity: -5 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('should handle database errors', async () => {
    mockPrisma.stock.update.mockRejectedValue(new Error('Database error'));

    const result = await updateStock(MOCK_STOCK.id, { buyPrice: 175.0 });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should validate stock id is provided', async () => {
    const result = await updateStock('', { buyPrice: 175.0 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('id');
  });
});

// =============================================================================
// Tests: removeStock
// =============================================================================

describe('removeStock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);
  });

  it('should delete a stock', async () => {
    mockPrisma.stock.delete.mockResolvedValue(MOCK_STOCK);

    const result = await removeStock(MOCK_STOCK.id);

    expect(result.success).toBe(true);
    expect(mockPrisma.stock.delete).toHaveBeenCalledWith({
      where: {
        id: MOCK_STOCK.id,
        userId: TEST_USER_ID,
      },
    });
  });

  it('should handle non-existent stock', async () => {
    mockPrisma.stock.delete.mockRejectedValue(
      new Error('Record to delete does not exist'),
    );

    const result = await removeStock('non-existent-id');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should validate stock id is provided', async () => {
    const result = await removeStock('');

    expect(result.success).toBe(false);
    expect(result.error).toContain('id');
  });
});

// =============================================================================
// Tests: getStocks
// =============================================================================

describe('getStocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);
  });

  it('should return all stocks for the user', async () => {
    const mockStocks = [
      MOCK_STOCK,
      { ...MOCK_STOCK, id: 'stock-2', ticker: 'GOOGL' },
    ];
    mockPrisma.stock.findMany.mockResolvedValue(mockStocks);

    const result = await getStocks();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should return empty array when user has no stocks', async () => {
    mockPrisma.stock.findMany.mockResolvedValue([]);

    const result = await getStocks();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should handle database errors', async () => {
    mockPrisma.stock.findMany.mockRejectedValue(new Error('Database error'));

    const result = await getStocks();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// =============================================================================
// Tests: Logging
// =============================================================================

describe('Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log with [StockActions] prefix on success', async () => {
    mockPrisma.stock.findMany.mockResolvedValue([]);

    await getStocks();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[StockActions]'),
      expect.anything(),
    );
  });

  it('should log errors with [StockActions] prefix', async () => {
    mockPrisma.stock.findMany.mockRejectedValue(new Error('Test error'));

    await getStocks();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[StockActions]'),
      expect.anything(),
    );
  });
});
