import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it("renders 'Data unavailable' message", () => {
      render(<ErrorState />);
      expect(screen.getByText(/data unavailable/i)).toBeInTheDocument();
    });

    it('renders with calm, dignified presentation (no alarming colors)', () => {
      render(<ErrorState />);

      const container = screen.getByRole('region', {
        name: /error state/i,
      });

      expect(container).not.toHaveClass('bg-red-500');
      expect(container).not.toHaveClass('text-red-500');
      expect(container).not.toHaveClass('border-red-500');
    });

    it('renders with centered layout', () => {
      render(<ErrorState />);
      const container = screen.getByRole('region', {
        name: /error state/i,
      });
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
    });

    it('renders visually clean with flex column layout', () => {
      render(<ErrorState />);
      const container = screen.getByRole('region', {
        name: /error state/i,
      });
      expect(container).toHaveClass('flex-col');
    });

    it('applies custom className when provided', () => {
      render(<ErrorState className="custom-class" />);
      const container = screen.getByRole('region', {
        name: /error state/i,
      });
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Last Update Timestamp', () => {
    it('shows last update timestamp when provided', () => {
      const lastUpdate = new Date('2026-02-03T10:00:00.000Z');
      render(<ErrorState lastUpdate={lastUpdate} />);
      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });

    it("displays relative time: '2 hours ago'", () => {
      const lastUpdate = new Date('2026-02-03T10:00:00.000Z');
      render(<ErrorState lastUpdate={lastUpdate} />);
      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
    });

    it("displays relative time: 'a few minutes ago' for recent updates", () => {
      const lastUpdate = new Date('2026-02-03T11:55:00.000Z');
      render(<ErrorState lastUpdate={lastUpdate} />);
      expect(screen.getByText(/a few minutes ago/i)).toBeInTheDocument();
    });

    it("displays relative time: 'yesterday' for day-old updates", () => {
      const lastUpdate = new Date('2026-02-02T12:00:00.000Z');
      render(<ErrorState lastUpdate={lastUpdate} />);
      expect(screen.getByText(/yesterday/i)).toBeInTheDocument();
    });

    it('does not show timestamp when lastUpdate is not provided', () => {
      render(<ErrorState />);
      expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument();
    });
  });

  describe('Partial Rendering Support', () => {
    it('can be used as per-component error state with small variant', () => {
      render(<ErrorState variant="compact" />);
      const container = screen.getByRole('region', {
        name: /error state/i,
      });
      expect(container).toBeInTheDocument();
    });

    it('can be used as full-page error state with default variant', () => {
      render(<ErrorState variant="full" />);
      const container = screen.getByRole('region', {
        name: /error state/i,
      });
      expect(container).toHaveClass('h-full');
    });

    it('defaults to full variant when not specified', () => {
      render(<ErrorState />);
      const container = screen.getByRole('region', {
        name: /error state/i,
      });
      expect(container).toHaveClass('h-full');
    });
  });

  describe('Accessibility', () => {
    it('has accessible region landmark', () => {
      render(<ErrorState />);
      expect(
        screen.getByRole('region', { name: /error state/i }),
      ).toBeInTheDocument();
    });

    it('uses appropriate text contrast for readability', () => {
      render(<ErrorState />);
      const message = screen.getByText(/data unavailable/i);
      expect(message).toHaveClass('text-gray-600');
    });

    it('uses muted icon colors (not alarming)', () => {
      render(<ErrorState />);
      const container = screen.getByRole('region', {
        name: /error state/i,
      });
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-gray-400');
    });
  });

  describe('Custom Message Support', () => {
    it('allows custom message override', () => {
      render(<ErrorState message="Unable to load portfolio data" />);
      expect(
        screen.getByText('Unable to load portfolio data'),
      ).toBeInTheDocument();
    });

    it('uses default message when not provided', () => {
      render(<ErrorState />);
      expect(screen.getByText(/data unavailable/i)).toBeInTheDocument();
    });
  });

  describe('Visual Design', () => {
    it('renders with information icon (not warning/error icon)', () => {
      render(<ErrorState />);
      const container = screen.getByRole('region', {
        name: /error state/i,
      });
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('has appropriate gap between elements', () => {
      render(<ErrorState />);
      const container = screen.getByRole('region', {
        name: /error state/i,
      });
      expect(container).toHaveClass('gap-4');
    });

    it('uses rem-based typography', () => {
      render(<ErrorState />);
      const message = screen.getByText(/data unavailable/i);
      expect(message).toHaveClass('text-lg');
    });
  });
});
