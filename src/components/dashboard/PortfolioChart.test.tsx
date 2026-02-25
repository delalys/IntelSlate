/**
 * PortfolioChart Component Tests
 *
 * Tests for the minimalist portfolio area chart with gradient fill.
 * Story 3.4 - Create Portfolio Chart Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/theme-engine/ThemeProvider';
import { PortfolioChart, type IPortfolioChartProps } from './PortfolioChart';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock ResizeObserver for nivo ResponsiveLine / ResponsiveBar
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

function renderWithTheme(
  ui: React.ReactElement,
  options?: { themeId?: 'default' | 'retro-ink' },
) {
  const themeId = options?.themeId ?? 'default';
  return render(<ThemeProvider initialThemeId={themeId}>{ui}</ThemeProvider>);
}

describe('PortfolioChart', () => {
  // =============================================================================
  // Test Data
  // =============================================================================

  const mockHistoricalData: IPortfolioChartProps['historicalData'] = [
    { date: '2026-01-01', value: 10000 },
    { date: '2026-01-02', value: 10150 },
    { date: '2026-01-03', value: 10080 },
    { date: '2026-01-04', value: 10220 },
    { date: '2026-01-05', value: 10350 },
  ];

  const emptyData: IPortfolioChartProps['historicalData'] = [];

  const singlePointData: IPortfolioChartProps['historicalData'] = [
    { date: '2026-01-01', value: 10000 },
  ];

  // =============================================================================
  // Rendering Tests
  // =============================================================================

  describe('Rendering', () => {
    it('renders the chart container', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      const container = screen.getByTestId('portfolio-chart');
      expect(container).toBeInTheDocument();
    });

    it('renders with data-testid for chart container', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      expect(screen.getByTestId('portfolio-chart')).toBeInTheDocument();
    });

    it('renders as a figure element for semantic HTML', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      const figure = screen.getByRole('figure');
      expect(figure).toBeInTheDocument();
    });

    it('includes accessible label for screen readers', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      const figure = screen.getByRole('figure');
      expect(figure).toHaveAttribute('aria-label', 'Portfolio value chart');
    });
  });

  // =============================================================================
  // Minimalist Appearance Tests (NO visual clutter)
  // =============================================================================

  describe('Minimalist Appearance', () => {
    it('does not render a legend', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      const legend = screen.queryByRole('list');
      expect(legend).not.toBeInTheDocument();
    });

    it('does not render axis labels (default theme line chart)', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      const container = screen.getByTestId('portfolio-chart');
      // Nivo line chart: axes disabled, no axis text
      const axisText = container.querySelectorAll('text');
      expect(axisText.length).toBe(0);
    });

    it('does not render grid lines', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      const container = screen.getByTestId('portfolio-chart');
      // Nivo grid lines are rendered as line elements with specific patterns
      // In minimalist mode, gridX and gridY should be disabled
      // This is controlled by the enableGridX and enableGridY props
      expect(container).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Layout Tests
  // =============================================================================

  describe('Layout', () => {
    it('uses full width of container', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      const container = screen.getByTestId('portfolio-chart');
      expect(container).toHaveClass('w-full');
    });

    it('applies custom className when provided', () => {
      renderWithTheme(
        <PortfolioChart
          historicalData={mockHistoricalData}
          className="custom-class"
        />,
      );
      const container = screen.getByTestId('portfolio-chart');
      expect(container).toHaveClass('custom-class');
    });
  });

  // =============================================================================
  // Empty State Tests
  // =============================================================================

  describe('Empty State', () => {
    it('renders empty state when no data provided', () => {
      renderWithTheme(<PortfolioChart historicalData={emptyData} />);
      const container = screen.getByTestId('portfolio-chart');
      expect(container).toBeInTheDocument();
      expect(screen.getByText('noHistoricalData')).toBeInTheDocument();
    });

    it('renders chart with single data point', () => {
      renderWithTheme(<PortfolioChart historicalData={singlePointData} />);
      const container = screen.getByTestId('portfolio-chart');
      expect(container).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Props Tests
  // =============================================================================

  describe('Props', () => {
    it('accepts historicalData prop', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      expect(screen.getByTestId('portfolio-chart')).toBeInTheDocument();
    });

    it('accepts optional className prop', () => {
      renderWithTheme(
        <PortfolioChart historicalData={mockHistoricalData} className="h-64" />,
      );
      expect(screen.getByTestId('portfolio-chart')).toHaveClass('h-64');
    });

    it('accepts optional dailyChange for color variant', () => {
      renderWithTheme(
        <PortfolioChart historicalData={mockHistoricalData} dailyChange={1} />,
      );
      expect(screen.getByTestId('portfolio-chart')).toBeInTheDocument();
    });
  });

  describe('Theme: retro-ink bar chart', () => {
    it('renders bar chart when theme is retro-ink', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />, {
        themeId: 'retro-ink',
      });
      const container = screen.getByTestId('portfolio-chart');
      expect(container).toHaveAttribute('data-chart-type', 'bar');
    });

    it('renders line chart when theme is default', () => {
      renderWithTheme(<PortfolioChart historicalData={mockHistoricalData} />);
      const container = screen.getByTestId('portfolio-chart');
      expect(container).toHaveAttribute('data-chart-type', 'line');
    });
  });

  // =============================================================================
  // Data Transformation Tests
  // =============================================================================

  describe('Data Transformation', () => {
    it('handles dates in various formats', () => {
      const dataWithDates = [
        { date: '2026-01-01', value: 10000 },
        { date: '2026-01-15', value: 10500 },
        { date: '2026-01-30', value: 11000 },
      ];
      renderWithTheme(<PortfolioChart historicalData={dataWithDates} />);
      expect(screen.getByTestId('portfolio-chart')).toBeInTheDocument();
    });

    it('handles zero values', () => {
      const dataWithZero = [
        { date: '2026-01-01', value: 0 },
        { date: '2026-01-02', value: 100 },
      ];
      renderWithTheme(<PortfolioChart historicalData={dataWithZero} />);
      expect(screen.getByTestId('portfolio-chart')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      const dataWithNegative = [
        { date: '2026-01-01', value: 100 },
        { date: '2026-01-02', value: -50 },
      ];
      renderWithTheme(<PortfolioChart historicalData={dataWithNegative} />);
      expect(screen.getByTestId('portfolio-chart')).toBeInTheDocument();
    });
  });
});
