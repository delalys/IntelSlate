import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { EmptyStateWithModal } from './EmptyStateWithModal';

// Mock the getStocks action
vi.mock('@/actions/stocks', () => ({
  getStocks: vi.fn(),
}));

// Import the mocked module
import { getStocks } from '@/actions/stocks';

// Mock next/navigation for ConfigModal (which may use it internally)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('EmptyStateWithModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getStocks as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  describe('Rendering', () => {
    it('renders the empty state', () => {
      render(<EmptyStateWithModal />);

      expect(
        screen.getByText('Add your stocks to get started'),
      ).toBeInTheDocument();
    });

    it('renders the add stocks button', () => {
      render(<EmptyStateWithModal />);

      const button = screen.getByRole('button', {
        name: /add stocks/i,
      });

      expect(button).toBeInTheDocument();
    });

    it('modal is initially closed', () => {
      render(<EmptyStateWithModal />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<EmptyStateWithModal className="custom-class" />);

      const region = screen.getByRole('region', {
        name: 'Empty state - no stocks configured',
      });

      expect(region).toHaveClass('custom-class');
    });
  });

  describe('Modal Integration', () => {
    it('opens modal when add stocks button is clicked', async () => {
      const user = userEvent.setup();

      render(<EmptyStateWithModal />);

      const button = screen.getByRole('button', {
        name: /add stocks/i,
      });

      await user.click(button);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('fetches stocks when modal opens', async () => {
      const user = userEvent.setup();

      render(<EmptyStateWithModal />);

      const button = screen.getByRole('button', {
        name: /add stocks/i,
      });

      await user.click(button);

      await waitFor(() => {
        expect(getStocks).toHaveBeenCalledTimes(1);
      });
    });

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup();

      render(<EmptyStateWithModal />);

      // Open modal
      const addButton = screen.getByRole('button', {
        name: /add stocks/i,
      });
      await user.click(addButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByRole('button', {
        name: /close/i,
      });
      await user.click(closeButton);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles getStocks failure gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (getStocks as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Failed to fetch',
      });

      render(<EmptyStateWithModal />);

      const button = screen.getByRole('button', {
        name: /add stocks/i,
      });

      await user.click(button);

      // Modal should still open even if fetch fails
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('handles getStocks exception gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (getStocks as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error'),
      );

      render(<EmptyStateWithModal />);

      const button = screen.getByRole('button', {
        name: /add stocks/i,
      });

      await user.click(button);

      // Modal should still open even if fetch throws
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });
});
