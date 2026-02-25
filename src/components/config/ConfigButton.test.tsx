/**
 * ConfigButton Component Tests
 *
 * Tests for the ConfigButton component that provides access to the
 * configuration modal while hiding during TRMNL screenshot capture.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { NextIntlWrapper } from '@/test/utils';
import { ConfigButton } from './ConfigButton';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

const mockUseSearchParams = useSearchParams as Mock;

const renderWithIntl = (ui: React.ReactElement) =>
  render(ui, {
    wrapper: ({ children }) => <NextIntlWrapper>{children}</NextIntlWrapper>,
  });

describe('ConfigButton', () => {
  const defaultProps = {
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('renders the config button when screenshot param is not present', () => {
      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      expect(button).toBeInTheDocument();
    });

    it('renders a gear/cog icon', () => {
      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has fixed positioning in bottom-right corner', () => {
      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      expect(button).toHaveClass('fixed');
      expect(button).toHaveClass('bottom-4');
      expect(button).toHaveClass('right-4');
    });

    it('has subtle, unobtrusive styling', () => {
      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      // Should have low visual weight styling
      expect(button).toHaveClass('text-gray-400');
      expect(button).toHaveClass('hover:text-gray-600');
    });

    it('has print:hidden class for print media hiding', () => {
      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      expect(button).toHaveClass('print:hidden');
    });
  });

  // ==========================================================================
  // Screenshot Hiding Tests
  // ==========================================================================

  describe('Screenshot Hiding', () => {
    it('hides the button when screenshot=true param is present', () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'screenshot') return 'true';
          return null;
        }),
      });

      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.queryByRole('button', {
        name: /open configuration/i,
      });
      expect(button).not.toBeInTheDocument();
    });

    it("shows the button when screenshot param is not 'true'", () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'screenshot') return 'false';
          return null;
        }),
      });

      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      expect(button).toBeInTheDocument();
    });

    it('shows the button when screenshot param is empty string', () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'screenshot') return '';
          return null;
        }),
      });

      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe('Interactions', () => {
    it('calls onClick when button is clicked', () => {
      const onClick = vi.fn();
      renderWithIntl(<ConfigButton onClick={onClick} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('has hover effect for better discoverability', () => {
      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      // Should have hover styles
      expect(button).toHaveClass('hover:bg-gray-100');
    });

    it('is keyboard accessible', () => {
      const onClick = vi.fn();
      renderWithIntl(<ConfigButton onClick={onClick} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      button.focus();
      expect(document.activeElement).toBe(button);

      // Trigger click via keyboard
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('has accessible aria-label', () => {
      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      expect(button).toHaveAttribute('aria-label', 'Open configuration');
    });

    it('icon is hidden from screen readers', () => {
      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      const svg = button.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ==========================================================================
  // Z-Index Tests
  // ==========================================================================

  describe('Z-Index', () => {
    it('has appropriate z-index to stay above content but below modal', () => {
      renderWithIntl(<ConfigButton {...defaultProps} />);

      const button = screen.getByRole('button', {
        name: /open configuration/i,
      });
      // z-40 is below modal (z-50) but above regular content
      expect(button).toHaveClass('z-40');
    });
  });
});
