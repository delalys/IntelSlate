import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PortfolioGauge } from './PortfolioGauge';

// Mock ThemeProvider (used by ChangeIndicator → ThemeDecor)
vi.mock('@/theme-engine/ThemeProvider', () => ({
  useTheme: () => ({ themeId: 'default', setTheme: vi.fn() }),
}));

const INACTIVE_COLOR = '#dbdbd8';

const SECTION_COLORS = [
  '#7e7e7c',
  '#626260',
  '#474745',
  '#2d2d2c',
  '#161615',
  '#030303',
];

describe('PortfolioGauge', () => {
  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe('Rendering', () => {
    it('should render an SVG container with data-testid', () => {
      render(<PortfolioGauge changePercent={0} />);
      expect(screen.getByTestId('portfolio-gauge')).toBeInTheDocument();
    });

    it('should render as a figure element', () => {
      render(<PortfolioGauge changePercent={0} />);
      const gauge = screen.getByTestId('portfolio-gauge');
      expect(gauge.tagName.toLowerCase()).toBe('figure');
    });

    it('should have an accessible aria-label', () => {
      render(<PortfolioGauge changePercent={0} />);
      const gauge = screen.getByTestId('portfolio-gauge');
      expect(gauge).toHaveAttribute('aria-label', 'Portfolio change gauge');
    });

    it('should render exactly 6 gauge section paths', () => {
      render(<PortfolioGauge changePercent={0} />);
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toBeInTheDocument();
      }
    });
  });

  // ===========================================================================
  // Active Section Logic
  // ===========================================================================

  describe('Active section highlighting', () => {
    it('given changePercent = -5, only section 0 has its color; rest are inactive', () => {
      render(<PortfolioGauge changePercent={-5} />);
      expect(screen.getByTestId('gauge-section-0')).toHaveAttribute(
        'fill',
        SECTION_COLORS[0],
      );
      for (let i = 1; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          INACTIVE_COLOR,
        );
      }
    });

    it('given changePercent = -1, sections 0-1 have their colors', () => {
      render(<PortfolioGauge changePercent={-1} />);
      for (let i = 0; i <= 1; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          SECTION_COLORS[i],
        );
      }
      for (let i = 2; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          INACTIVE_COLOR,
        );
      }
    });

    it('given changePercent = 2, sections 0-2 have their colors', () => {
      render(<PortfolioGauge changePercent={2} />);
      for (let i = 0; i <= 2; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          SECTION_COLORS[i],
        );
      }
      for (let i = 3; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          INACTIVE_COLOR,
        );
      }
    });

    it('given changePercent = 4, sections 0-3 have their colors', () => {
      render(<PortfolioGauge changePercent={4} />);
      for (let i = 0; i <= 3; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          SECTION_COLORS[i],
        );
      }
      for (let i = 4; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          INACTIVE_COLOR,
        );
      }
    });

    it('given changePercent = 7, sections 0-4 have their colors', () => {
      render(<PortfolioGauge changePercent={7} />);
      for (let i = 0; i <= 4; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          SECTION_COLORS[i],
        );
      }
      expect(screen.getByTestId('gauge-section-5')).toHaveAttribute(
        'fill',
        INACTIVE_COLOR,
      );
    });

    it('given changePercent = 15, all 6 sections have their colors', () => {
      render(<PortfolioGauge changePercent={15} />);
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          SECTION_COLORS[i],
        );
      }
    });
  });

  // ===========================================================================
  // Section Styles
  // ===========================================================================

  describe('Section styles', () => {
    it('all active sections use progressive fill colors', () => {
      render(<PortfolioGauge changePercent={15} />);
      for (let i = 0; i < 6; i++) {
        const section = screen.getByTestId(`gauge-section-${i}`);
        expect(section.getAttribute('fill')).toBe(SECTION_COLORS[i]);
      }
    });

    it('inactive sections use the inactive color', () => {
      render(<PortfolioGauge changePercent={-5} />);
      for (let i = 1; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          INACTIVE_COLOR,
        );
      }
    });
  });

  // ===========================================================================
  // Center Content (percentage label with change color)
  // ===========================================================================

  describe('Center content', () => {
    it('displays formatted positive percentage with + prefix', () => {
      render(<PortfolioGauge changePercent={5.23} />);
      expect(screen.getByTestId('gauge-indicator-value')).toHaveTextContent(
        '+5.2%',
      );
    });

    it('displays formatted negative percentage with - prefix', () => {
      render(<PortfolioGauge changePercent={-2.78} />);
      expect(screen.getByTestId('gauge-indicator-value')).toHaveTextContent(
        '-2.8%',
      );
    });

    it('displays zero without sign prefix', () => {
      render(<PortfolioGauge changePercent={0} />);
      expect(screen.getByTestId('gauge-indicator-value')).toHaveTextContent(
        '0.0%',
      );
    });

    it('applies text-emerald-500 class when positive', () => {
      render(<PortfolioGauge changePercent={3} />);
      expect(screen.getByTestId('gauge-indicator-value')).toHaveClass(
        'text-emerald-500',
      );
    });

    it('applies text-red-500 class when negative', () => {
      render(<PortfolioGauge changePercent={-3} />);
      expect(screen.getByTestId('gauge-indicator-value')).toHaveClass(
        'text-red-500',
      );
    });

    it('applies text-gray-500 class when zero', () => {
      render(<PortfolioGauge changePercent={0} />);
      expect(screen.getByTestId('gauge-indicator-value')).toHaveClass(
        'text-gray-500',
      );
    });

    it('uses text-s font-medium matching daily-change-amount style', () => {
      render(<PortfolioGauge changePercent={5} />);
      const el = screen.getByTestId('gauge-indicator-value');
      expect(el).toHaveClass('text-s');
      expect(el).toHaveClass('font-medium');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge cases', () => {
    it('changePercent = 0 activates sections 0-2 (0% is in the 0-3% band)', () => {
      render(<PortfolioGauge changePercent={0} />);
      for (let i = 0; i <= 2; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          SECTION_COLORS[i],
        );
      }
      for (let i = 3; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          INACTIVE_COLOR,
        );
      }
    });

    it('changePercent = NaN is treated as 0', () => {
      render(<PortfolioGauge changePercent={Number.NaN} />);
      for (let i = 0; i <= 2; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          SECTION_COLORS[i],
        );
      }
    });

    it('changePercent = Infinity is treated as 0', () => {
      render(<PortfolioGauge changePercent={Number.POSITIVE_INFINITY} />);
      for (let i = 0; i <= 2; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          SECTION_COLORS[i],
        );
      }
    });

    it('extremely negative changePercent activates only section 0', () => {
      render(<PortfolioGauge changePercent={-100} />);
      expect(screen.getByTestId('gauge-section-0')).toHaveAttribute(
        'fill',
        SECTION_COLORS[0],
      );
      for (let i = 1; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          INACTIVE_COLOR,
        );
      }
    });

    it('extremely positive changePercent activates all sections', () => {
      render(<PortfolioGauge changePercent={500} />);
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`gauge-section-${i}`)).toHaveAttribute(
          'fill',
          SECTION_COLORS[i],
        );
      }
    });
  });

  // ===========================================================================
  // Props
  // ===========================================================================

  describe('Props', () => {
    it('accepts and applies optional className to container', () => {
      render(
        <PortfolioGauge changePercent={0} className="custom-gauge-class" />,
      );
      const gauge = screen.getByTestId('portfolio-gauge');
      expect(gauge).toHaveClass('custom-gauge-class');
    });

    it('renders without className prop', () => {
      render(<PortfolioGauge changePercent={0} />);
      const gauge = screen.getByTestId('portfolio-gauge');
      expect(gauge).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Timeframe Tag
  // ===========================================================================

  describe('Timeframe tag', () => {
    it('renders timeframe tag when timeframe prop is provided', () => {
      render(<PortfolioGauge changePercent={0} timeframe="1mo" />);
      const tag = screen.getByTestId('gauge-timeframe-tag');
      expect(tag).toBeInTheDocument();
      expect(tag).toHaveTextContent('1mo');
    });

    it('does not render timeframe tag when timeframe prop is omitted', () => {
      render(<PortfolioGauge changePercent={0} />);
      expect(
        screen.queryByTestId('gauge-timeframe-tag'),
      ).not.toBeInTheDocument();
    });

    it('applies chart-timeframe CSS class to the tag', () => {
      render(<PortfolioGauge changePercent={0} timeframe="5d" />);
      const tag = screen.getByTestId('gauge-timeframe-tag');
      expect(tag).toHaveClass('chart-timeframe');
    });

    it('displays the raw timeframe value', () => {
      render(<PortfolioGauge changePercent={0} timeframe="ytd" />);
      expect(screen.getByTestId('gauge-timeframe-tag')).toHaveTextContent(
        'ytd',
      );
    });
  });
});
