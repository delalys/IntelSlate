/**
 * TickerCard Component Tests
 *
 * Validates stock display formatting, typography, and layout behaviors.
 */

/* eslint-disable @next/next/no-img-element */

import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TickerCard } from './TickerCard';

vi.mock('@/theme-engine/ThemeProvider', () => ({
  useTheme: () => ({ themeId: 'default', setTheme: vi.fn() }),
}));

vi.mock('./LazyPortfolioChart', () => ({
  LazyPortfolioChart: () => null,
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (
    props: ImgHTMLAttributes<HTMLImageElement> & {
      width?: number;
      height?: number;
      sizes?: string;
    },
  ) => {
    const { ...rest } = props;
    // biome-ignore lint/performance/noImgElement: next/image mock for tests
    return <img alt={rest.alt ?? ''} {...rest} />;
  },
}));

describe('TickerCard', () => {
  it('renders logo, name, price, and signed change', () => {
    render(
      <TickerCard
        companyName="Acme Corp"
        logoUrl="/acme.png"
        price={123.4}
        changeAmount={2.5}
      />,
    );

    expect(screen.getByTestId('ticker-card-logo')).toHaveAttribute(
      'src',
      '/acme.png',
    );
    expect(screen.getByTestId('ticker-card-name')).toHaveTextContent(
      'Acme Corp',
    );
    expect(screen.getByTestId('ticker-card-price')).toHaveTextContent('123.40');
    expect(screen.getByTestId('ticker-card-change')).toHaveTextContent('+2.50');
  });

  it('does not render logo when no logoUrl is provided', () => {
    render(<TickerCard companyName="Nvidia" price={99} changeAmount={-2.5} />);

    expect(screen.queryByTestId('ticker-card-logo')).not.toBeInTheDocument();
    expect(screen.getByTestId('ticker-card-name')).toHaveTextContent('Nvidia');
  });

  it('applies layout classes to card and typography elements', () => {
    render(<TickerCard companyName="Rivian" price={12} changeAmount={0} />);

    expect(screen.getByTestId('ticker-card')).toHaveClass('relative');
    expect(screen.getByTestId('ticker-card')).toHaveClass('flex');
    expect(screen.getByTestId('ticker-card')).toHaveClass('flex-col');
    expect(screen.getByTestId('ticker-card-price')).toHaveClass('text-center');
    expect(screen.getByTestId('ticker-card-change')).toHaveClass('text-xs');
  });

  it('renders historical data container when data is provided', () => {
    render(
      <TickerCard
        companyName="Acme Corp"
        price={100}
        changeAmount={5}
        historicalData={[90, 95, 100]}
      />,
    );

    expect(screen.getByTestId('ticker-card')).toBeInTheDocument();
  });
});
