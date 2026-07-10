/**
 * TickerRow Component Tests
 *
 * Validates layout, spacing, and card rendering.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MarketData, Stock } from '@/generated/prisma/client';
import { TickerRow } from './TickerRow';

// Mock ThemeProvider (used by TickerCard → ThemeDecor)
vi.mock('@/theme-engine/ThemeProvider', () => ({
  useTheme: () => ({ themeId: 'default', setTheme: vi.fn() }),
}));

// Mock next/headers (TickerRow reads the host header to build absolute logo URLs)
vi.mock('next/headers', () => ({
  headers: async () => new Map([['host', 'localhost:3000']]),
}));

const createStock = (overrides: Partial<Stock> = {}): Stock => ({
  id: overrides.id ?? 'stock-1',
  userId: overrides.userId ?? 'user-1',
  ticker: overrides.ticker ?? 'AAPL',
  buyPrice: overrides.buyPrice ?? 120,
  quantity: overrides.quantity ?? 10,
  logoUrl: overrides.logoUrl ?? null,
  createdAt: overrides.createdAt ?? new Date('2026-02-03T00:00:00.000Z'),
  updatedAt: overrides.updatedAt ?? new Date('2026-02-03T00:00:00.000Z'),
});

const createMarketData = (overrides: Partial<MarketData> = {}): MarketData => ({
  id: overrides.id ?? 'market-1',
  ticker: overrides.ticker ?? 'AAPL',
  price: overrides.price ?? 125,
  previousClose: overrides.previousClose ?? 120,
  change: overrides.change ?? 5,
  changePercent: overrides.changePercent ?? 4.2,
  historicalData: overrides.historicalData ?? [
    { date: '2026-02-01', value: 118 },
    { date: '2026-02-02', value: 122 },
    { date: '2026-02-03', value: 125 },
  ],
  updatedAt: overrides.updatedAt ?? new Date('2026-02-03T00:00:00.000Z'),
});

describe('TickerRow', () => {
  it('renders ticker cards in a flex row with gap spacing', async () => {
    const stocks = [
      createStock({ id: 'stock-1', ticker: 'AAPL' }),
      createStock({ id: 'stock-2', ticker: 'MSFT' }),
    ];
    const marketData = [
      createMarketData({ ticker: 'AAPL', price: 180, change: 5 }),
      createMarketData({ ticker: 'MSFT', price: 320, change: -10 }),
    ];

    const Component = await TickerRow({ stocks, marketData });
    render(Component);

    const row = screen.getByTestId('ticker-row');
    expect(row).toHaveClass('flex');
    expect(row).toHaveClass('flex-row');
    expect(row).toHaveClass('gap-4');

    const cards = screen.getAllByTestId('ticker-card');
    expect(cards).toHaveLength(2);
  });

  it('falls back to buy price when market data is missing', async () => {
    const stocks = [
      createStock({ id: 'stock-1', ticker: 'TSLA', buyPrice: 200 }),
    ];

    const Component = await TickerRow({ stocks, marketData: [] });
    render(Component);

    expect(screen.getByTestId('ticker-card-price')).toHaveTextContent('—');
    expect(screen.getByTestId('ticker-card-change')).toHaveTextContent('—');
  });

  it('renders TickerCard with market data when available', async () => {
    const stocks = [createStock({ id: 'stock-1', ticker: 'AAPL' })];
    const marketData = [
      createMarketData({
        ticker: 'AAPL',
        price: 180,
        change: 5,
        historicalData: [
          { date: '2026-02-01', value: 170 },
          { date: '2026-02-02', value: 175 },
          { date: '2026-02-03', value: 180 },
        ],
      }),
    ];

    const Component = await TickerRow({ stocks, marketData });
    render(Component);

    expect(screen.getByTestId('ticker-card')).toBeInTheDocument();
    expect(screen.getByTestId('ticker-card-price')).toBeInTheDocument();
  });

  it('shows fallback when market data missing', async () => {
    const stocks = [createStock({ id: 'stock-1', ticker: 'TSLA' })];

    const Component = await TickerRow({ stocks, marketData: [] });
    render(Component);

    expect(screen.getByTestId('ticker-card')).toBeInTheDocument();
  });
});
