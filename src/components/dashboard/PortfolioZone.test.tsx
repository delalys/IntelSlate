/**
 * PortfolioZone Component Tests
 *
 * Validates portfolio total, change calculations, and typography styling.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PortfolioZone } from './PortfolioZone';

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

    expect(screen.getByTestId('portfolio-total')).toHaveTextContent('$325.00');
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

  it('should apply rem-based typography styles', () => {
    render(
      <PortfolioZone
        positions={[{ quantity: 2, currentPrice: 100, previousClose: 100 }]}
      />,
    );

    expect(screen.getByTestId('portfolio-total')).toHaveClass('text-6xl');
    expect(screen.getByTestId('daily-change-amount')).toHaveClass('text-s');
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

    expect(screen.getByTestId('portfolio-total')).toHaveTextContent('$0.00');
    expect(screen.getByTestId('daily-change-amount')).toHaveTextContent(
      '$0.00',
    );
  });
});
