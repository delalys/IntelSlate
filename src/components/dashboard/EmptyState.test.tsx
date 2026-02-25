import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('renders the empty state message', () => {
      render(<EmptyState onConfigClick={vi.fn()} />);

      expect(
        screen.getByText('Add your stocks to get started'),
      ).toBeInTheDocument();
    });

    it('renders with centered layout', () => {
      render(<EmptyState onConfigClick={vi.fn()} />);

      const container = screen.getByRole('region', {
        name: 'Empty state - no stocks configured',
      });

      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
    });

    it('renders the config icon button', () => {
      render(<EmptyState onConfigClick={vi.fn()} />);

      const button = screen.getByRole('button', {
        name: /add stocks|configure|settings/i,
      });

      expect(button).toBeInTheDocument();
    });

    it('renders svg icon within the button', () => {
      render(<EmptyState onConfigClick={vi.fn()} />);

      const button = screen.getByRole('button', {
        name: /add stocks|configure|settings/i,
      });

      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      render(<EmptyState onConfigClick={vi.fn()} className="custom-class" />);

      const container = screen.getByRole('region', {
        name: 'Empty state - no stocks configured',
      });

      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('has accessible region landmark', () => {
      render(<EmptyState onConfigClick={vi.fn()} />);

      expect(
        screen.getByRole('region', {
          name: 'Empty state - no stocks configured',
        }),
      ).toBeInTheDocument();
    });

    it('button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<EmptyState onConfigClick={handleClick} />);

      const button = screen.getByRole('button', {
        name: /add stocks|configure|settings/i,
      });

      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('button has appropriate aria-label', () => {
      render(<EmptyState onConfigClick={vi.fn()} />);

      const button = screen.getByRole('button', {
        name: /add stocks|configure|settings/i,
      });

      expect(button).toHaveAttribute('aria-label');
    });
  });

  describe('Interactions', () => {
    it('calls onConfigClick when config button is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<EmptyState onConfigClick={handleClick} />);

      const button = screen.getByRole('button', {
        name: /add stocks|configure|settings/i,
      });

      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfigClick on render', () => {
      const handleClick = vi.fn();

      render(<EmptyState onConfigClick={handleClick} />);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Typography', () => {
    it('uses rem-based typography for message', () => {
      render(<EmptyState onConfigClick={vi.fn()} />);

      const message = screen.getByText('Add your stocks to get started');

      // Check that the message has appropriate text styling classes
      expect(message).toHaveClass('text-xl');
    });
  });

  describe('Visual Design', () => {
    it('applies clean visual styling', () => {
      render(<EmptyState onConfigClick={vi.fn()} />);

      const container = screen.getByRole('region', {
        name: 'Empty state - no stocks configured',
      });

      // Should have flex column layout for stacking message and button
      expect(container).toHaveClass('flex-col');
    });

    it('button has hover state styling', () => {
      render(<EmptyState onConfigClick={vi.fn()} />);

      const button = screen.getByRole('button', {
        name: /add stocks|configure|settings/i,
      });

      // Button should have hover transition classes
      expect(button).toHaveClass('transition-colors');
    });
  });
});
