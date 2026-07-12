/**
 * PortfolioZone Component Tests
 *
 * Validates portfolio total, change calculations, and typography styling.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PortfolioZone } from './PortfolioZone';

// Mock ThemeProvider (used by ChangeIndicator → ThemeDecor)
vi.mock('@/theme-engine/ThemeProvider', () => ({
  useTheme: () => ({ themeId: 'default', setTheme: vi.fn() }),
}));

describe('PortfolioZone', () => {
  it('should render totals and daily change with formatting', () => {
    render(
      <PortfolioZone
        positions={[
          { quantity: 10, currentPrice: 12.5, previousClose: 10 },
          { quantity: 2, currentPrice: 100, previousClose: 110 },
        ]}
      />,
    );

    // Source uses formatNumber (no currency symbol, truncated to integer)
    expect(screen.getByTestId('portfolio-total')).toHaveTextContent('325');
    expect(screen.getByTestId('daily-change-amount')).toHaveTextContent(
      '+$5.00',
    );
    expect(screen.getByTestId('daily-change-amount')).toHaveTextContent(
      '+1.6%',
    );
  });

  it('should show down trend when change is negative', () => {
    render(
      <PortfolioZone
        positions={[{ quantity: 1, currentPrice: 90, previousClose: 100 }]}
      />,
    );

    expect(screen.getByTestId('daily-change-amount')).toHaveTextContent(
      '-$10.00',
    );
    expect(screen.getByTestId('daily-change-amount')).toHaveTextContent(
      '-10.0%',
    );
  });

  it('should show flat trend when change is zero', () => {
    render(
      <PortfolioZone
        positions={[{ quantity: 2, currentPrice: 100, previousClose: 100 }]}
      />,
    );

    expect(screen.getByTestId('daily-change-amount')).toHaveTextContent(
      '$0.00',
    );
    expect(screen.getByTestId('daily-change-amount')).toHaveTextContent('0.0%');
  });

  it('should apply responsive typography styles', () => {
    render(
      <PortfolioZone
        positions={[{ quantity: 2, currentPrice: 100, previousClose: 100 }]}
      />,
    );

    // Responsive class chain: text-xl sm:text-3xl md:text-4xl lg:text-6xl
    expect(screen.getByTestId('portfolio-total')).toHaveClass('lg:text-6xl');
    expect(screen.getByTestId('portfolio-total')).toHaveClass('font-semibold');
  });

  it('should handle invalid numeric values without NaN output', () => {
    render(
      <PortfolioZone
        positions={[
          {
            quantity: Number.NaN,
            currentPrice: Number.NaN,
            previousClose: Number.NaN,
          },
        ]}
      />,
    );

    // Source uses formatNumber (no currency symbol, truncated to integer) for total
    expect(screen.getByTestId('portfolio-total')).toHaveTextContent('0');
    expect(screen.getByTestId('daily-change-amount')).toHaveTextContent(
      '$0.00',
    );
  });
});
