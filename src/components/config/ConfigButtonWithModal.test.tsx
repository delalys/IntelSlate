/**
 * ConfigButtonWithModal Component Tests
 *
 * Tests for the wrapper component that connects ConfigButton with ConfigModal.
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigButtonWithModal } from './ConfigButtonWithModal';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

// Mock ThemeProvider
vi.mock('@/theme-engine/ThemeProvider', () => ({
  useTheme: () => ({ themeId: 'default', setTheme: vi.fn() }),
}));

// Mock next-intl (used by child components)
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the stock actions
vi.mock('@/actions/stocks', () => ({
  getStocks: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getMarketData: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

// Mock chart settings action
vi.mock('@/actions/chart-settings', () => ({
  getChartSettings: vi.fn().mockResolvedValue({}),
}));

// Mock theme actions
vi.mock('@/actions/theme', () => ({
  getTheme: vi.fn().mockResolvedValue('default'),
  updateTheme: vi.fn().mockResolvedValue(undefined),
}));

// Mock Claude API key action
vi.mock('@/actions/claude-api-key', () => ({
  getClaudeApiKeyStatus: vi.fn().mockResolvedValue({ isSet: false }),
}));

const mockUseSearchParams = useSearchParams as Mock;

describe('ConfigButtonWithModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.matchMedia (used by ConfigModal)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
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
    it('renders the config button', () => {
      render(<ConfigButtonWithModal />);

      const button = screen.getByRole('button', {
        name: /openConfiguration/i,
      });
      expect(button).toBeInTheDocument();
    });

    it('does not render the modal initially', () => {
      render(<ConfigButtonWithModal />);

      const modal = screen.queryByRole('dialog');
      expect(modal).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Modal Opening Tests
  // ==========================================================================

  describe('Modal Opening', () => {
    it('opens the modal when button is clicked', async () => {
      render(<ConfigButtonWithModal />);

      const button = screen.getByRole('button', {
        name: /openConfiguration/i,
      });
      fireEvent.click(button);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
      });
    });

    it('shows modal title when opened', async () => {
      render(<ConfigButtonWithModal />);

      const button = screen.getByRole('button', {
        name: /openConfiguration/i,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Configure Portfolio')).toBeInTheDocument();
      });
    });

    it('handles failed stock fetch without crashing', async () => {
      const { getStocks } = await import('@/actions/stocks');
      (getStocks as Mock).mockResolvedValueOnce({
        success: false,
        error: 'Fetch failed',
      });

      render(<ConfigButtonWithModal />);

      const button = screen.getByRole('button', {
        name: /openConfiguration/i,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Modal Closing Tests
  // ==========================================================================

  describe('Modal Closing', () => {
    it('closes the modal when close button is clicked', async () => {
      render(<ConfigButtonWithModal />);

      // Open modal
      const configButton = screen.getByRole('button', {
        name: /openConfiguration/i,
      });
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes the modal when Cancel button is clicked', async () => {
      render(<ConfigButtonWithModal />);

      // Open modal
      const configButton = screen.getByRole('button', {
        name: /openConfiguration/i,
      });
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes the modal when Save button is clicked', async () => {
      render(<ConfigButtonWithModal />);

      // Open modal
      const configButton = screen.getByRole('button', {
        name: /openConfiguration/i,
      });
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click Save (use testid to avoid matching the Claude API key save button)
      const saveButton = screen.getByTestId('modal-save-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes the modal when Escape key is pressed', async () => {
      render(<ConfigButtonWithModal />);

      // Open modal
      const configButton = screen.getByRole('button', {
        name: /openConfiguration/i,
      });
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Screenshot Hiding Tests
  // ==========================================================================

  describe('Screenshot Hiding', () => {
    it('hides both button and modal during screenshot capture', () => {
      mockUseSearchParams.mockReturnValue({
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'screenshot') return 'true';
          return null;
        }),
      });

      render(<ConfigButtonWithModal />);

      const button = screen.queryByRole('button', {
        name: /openConfiguration/i,
      });
      expect(button).not.toBeInTheDocument();
    });
  });
});
