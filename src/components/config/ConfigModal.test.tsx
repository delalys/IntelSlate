/**
 * ConfigModal Component Tests
 *
 * Tests for the stock configuration modal with responsive layout.
 *
 * @module components/config/ConfigModal.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigModal } from './ConfigModal';

// =============================================================================
// Mocks
// =============================================================================

// Mock the stock server actions
vi.mock('@/actions/stocks', () => ({
  getStocks: vi.fn(),
  addStock: vi.fn(),
  removeStock: vi.fn(),
}));

// Mock the stock search action
vi.mock('@/actions/stock-search', () => ({
  searchStocks: vi.fn(),
}));

// Mock next-intl for ClaudeApiKeySettings
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Claude API key action
vi.mock('@/actions/claude-api-key', () => ({
  saveClaudeApiKey: vi.fn(),
  getClaudeApiKeyStatus: vi.fn(),
}));

// Mock theme actions
vi.mock('@/actions/theme', () => ({
  getTheme: vi.fn(),
  updateTheme: vi.fn(),
}));

import { DEFAULT_TIMEFRAMES } from '@/lib/constants';
import { DEFAULT_THEME_ID } from '@/theme-engine/types';

// Mock ResizeObserver for responsive tests
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Store original body overflow for cleanup
let originalBodyOverflow: string;

// =============================================================================
// Test Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  originalBodyOverflow = document.body.style.overflow;
  global.ResizeObserver = mockResizeObserver;
});

afterEach(() => {
  document.body.style.overflow = originalBodyOverflow;
});

// =============================================================================
// Helper Functions
// =============================================================================

const mockStocks = [
  {
    id: 'stock-1',
    userId: 'user-1',
    ticker: 'AAPL',
    buyPrice: 150.0,
    quantity: 10,
    logoUrl: 'https://logo.dev/aapl.png',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'stock-2',
    userId: 'user-1',
    ticker: 'GOOGL',
    buyPrice: 140.0,
    quantity: 5,
    logoUrl: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  stocks: mockStocks,
  onStockChange: vi.fn(),
  isLoading: false,
  chartSettings: DEFAULT_TIMEFRAMES,
  themeId: DEFAULT_THEME_ID as 'default',
  onThemeChange: vi.fn(),
};

// =============================================================================
// Tests: Rendering
// =============================================================================

describe('ConfigModal', () => {
  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<ConfigModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Configure Portfolio')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      render(<ConfigModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders header with title and close button', () => {
      render(<ConfigModal {...defaultProps} />);

      expect(screen.getByText('Configure Portfolio')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /close/i }),
      ).toBeInTheDocument();
    });

    it('renders footer with Cancel and Save buttons', () => {
      render(<ConfigModal {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /cancel/i }),
      ).toBeInTheDocument();
      expect(screen.getByTestId('modal-save-button')).toBeInTheDocument();
    });

    it('renders StockList component with stocks', () => {
      render(<ConfigModal {...defaultProps} />);

      // StockList should show stock count and value
      expect(screen.getByText('2 stocks')).toBeInTheDocument();
    });

    it('renders StockSearch and StockForm for adding stocks', () => {
      render(<ConfigModal {...defaultProps} />);

      // StockSearch input (mock returns key "stockSearch" for t('stockSearch'))
      expect(
        screen.getByRole('combobox', { name: /stockSearch/i }),
      ).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Tests: Modal Interactions
  // =============================================================================

  describe('Modal Interactions', () => {
    it('calls onClose when close button (X) is clicked', async () => {
      const onClose = vi.fn();
      render(<ConfigModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      render(<ConfigModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSave and onClose when Save button is clicked', async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();
      render(
        <ConfigModal {...defaultProps} onSave={onSave} onClose={onClose} />,
      );

      const saveButton = screen.getByTestId('modal-save-button');
      await userEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      render(<ConfigModal {...defaultProps} onClose={onClose} />);

      const backdrop = screen.getByTestId('modal-backdrop');
      await userEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when modal content is clicked', async () => {
      const onClose = vi.fn();
      render(<ConfigModal {...defaultProps} onClose={onClose} />);

      const modalContent = screen.getByTestId('modal-content');
      await userEvent.click(modalContent);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Tests: Keyboard Navigation
  // =============================================================================

  describe('Keyboard Navigation', () => {
    it('closes modal when Escape key is pressed', async () => {
      const onClose = vi.fn();
      render(<ConfigModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when other keys are pressed', async () => {
      const onClose = vi.fn();
      render(<ConfigModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Tab' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Tests: Body Scroll Lock
  // =============================================================================

  describe('Body Scroll Lock', () => {
    it('locks body scroll when modal opens', () => {
      render(<ConfigModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when modal closes', () => {
      const { rerender } = render(<ConfigModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<ConfigModal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).not.toBe('hidden');
    });

    it('restores original overflow on unmount', () => {
      document.body.style.overflow = 'auto';

      const { unmount } = render(<ConfigModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('auto');
    });
  });

  // =============================================================================
  // Tests: Focus Management
  // =============================================================================

  describe('Focus Management', () => {
    it('traps focus inside modal', async () => {
      render(<ConfigModal {...defaultProps} />);

      // Modal should have focus trap attributes
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('focuses close button on open for accessibility', async () => {
      render(<ConfigModal {...defaultProps} />);

      // Wait for focus to be set
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveFocus();
      });
    });
  });

  // =============================================================================
  // Tests: Responsive Layout
  // =============================================================================

  describe('Responsive Layout', () => {
    it('applies full-width class on mobile', () => {
      render(<ConfigModal {...defaultProps} />);

      const modalContent = screen.getByTestId('modal-content');
      // Should have w-full for mobile and sm:max-w-md for desktop
      expect(modalContent).toHaveClass('w-full');
    });

    it('applies max-width class for desktop', () => {
      render(<ConfigModal {...defaultProps} />);

      const modalContent = screen.getByTestId('modal-content');
      // Should have sm:max-w-md for desktop
      expect(modalContent).toHaveClass('sm:max-w-md');
    });

    it('applies full-screen height on mobile', () => {
      render(<ConfigModal {...defaultProps} />);

      const modalContent = screen.getByTestId('modal-content');
      // Should have h-full for mobile and sm:h-auto for desktop
      expect(modalContent).toHaveClass('h-full');
      expect(modalContent).toHaveClass('sm:h-auto');
    });
  });

  // =============================================================================
  // Tests: Loading State
  // =============================================================================

  describe('Loading State', () => {
    it('shows loading state in StockList when isLoading is true', () => {
      render(<ConfigModal {...defaultProps} isLoading={true} stocks={[]} />);

      expect(screen.getByTestId('stock-list-loading')).toBeInTheDocument();
    });

    it('disables Save button when loading', () => {
      render(<ConfigModal {...defaultProps} isLoading={true} />);

      const saveButton = screen.getByTestId('modal-save-button');
      expect(saveButton).toBeDisabled();
    });
  });

  // =============================================================================
  // Tests: Theme Section
  // =============================================================================

  describe('Theme Section', () => {
    it('renders Theme section when themeId is provided', () => {
      render(<ConfigModal {...defaultProps} />);

      expect(screen.getByTestId('config-theme-section')).toBeInTheDocument();
      expect(screen.getByTestId('theme-select')).toBeInTheDocument();
    });

    it('does not render Theme section when themeId is not provided', () => {
      const {
        themeId: _t,
        onThemeChange: _o,
        ...propsWithoutTheme
      } = defaultProps;
      render(<ConfigModal {...propsWithoutTheme} />);

      expect(
        screen.queryByTestId('config-theme-section'),
      ).not.toBeInTheDocument();
    });

    it('calls onThemeChange with selected theme id when user changes theme and clicks Save', async () => {
      const onThemeChange = vi.fn();
      render(
        <ConfigModal
          {...defaultProps}
          themeId="default"
          onThemeChange={onThemeChange}
        />,
      );

      const select = screen.getByTestId('theme-select');
      await userEvent.selectOptions(select, 'retro-ink');

      const saveButton = screen.getByTestId('modal-save-button');
      await userEvent.click(saveButton);

      expect(onThemeChange).toHaveBeenCalledTimes(1);
      expect(onThemeChange).toHaveBeenCalledWith('retro-ink');
    });
  });

  // =============================================================================
  // Tests: Accessibility
  // =============================================================================

  describe('Accessibility', () => {
    it('has role dialog', () => {
      render(<ConfigModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(<ConfigModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<ConfigModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

      const title = screen.getByText('Configure Portfolio');
      expect(title).toHaveAttribute('id', 'modal-title');
    });
  });
});
