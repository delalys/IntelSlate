/**
 * TickerRow Component Tests
 *
 * Validates layout, spacing, and card rendering.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { MarketData, Stock } from '@/generated/prisma/client';
import { TickerRow } from './TickerRow';

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
    expect(cards[0]).toHaveClass('border-r');
    expect(cards[1]).not.toHaveClass('border-r');
    expect(screen.getAllByTestId('ticker-card-change')[0]).toHaveTextContent(
      '+$5.00',
    );
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

  it('passes historicalData to TickerCard when available', async () => {
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

    expect(screen.getByTestId('mini-chart-container')).toBeInTheDocument();
    expect(screen.getByTestId('mini-chart')).toBeInTheDocument();
  });

  it('passes empty historicalData when market data missing', async () => {
    const stocks = [createStock({ id: 'stock-1', ticker: 'TSLA' })];

    const Component = await TickerRow({ stocks, marketData: [] });
    render(Component);

    expect(
      screen.queryByTestId('mini-chart-container'),
    ).not.toBeInTheDocument();
  });
});
