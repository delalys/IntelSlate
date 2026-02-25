/**
 * StockListItem Component Tests
 *
 * Tests for the individual stock item component with inline editing and delete functionality
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stock } from '@/generated/prisma/client';
import { StockListItem } from './StockListItem';

// =============================================================================
// Mocks
// =============================================================================

// Mock the server actions
vi.mock('@/actions/stocks', () => ({
  updateStock: vi.fn(),
  removeStock: vi.fn(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { removeStock, updateStock } from '@/actions/stocks';

const mockUpdateStock = updateStock as ReturnType<typeof vi.fn>;
const mockRemoveStock = removeStock as ReturnType<typeof vi.fn>;

// =============================================================================
// Test Data
// =============================================================================

const MOCK_STOCK: Stock = {
  id: 'stock-1',
  userId: 'user-1',
  ticker: 'AAPL',
  buyPrice: 150.5,
  quantity: 10,
  logoUrl: 'https://logo.dev/aapl.png',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const MOCK_STOCK_NO_LOGO: Stock = {
  ...MOCK_STOCK,
  id: 'stock-2',
  ticker: 'MSFT',
  logoUrl: null,
};

// =============================================================================
// Tests
// =============================================================================

describe('StockListItem', () => {
  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render stock ticker', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('should render buy price', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText(/\$150\.50/)).toBeInTheDocument();
    });

    it('should render quantity', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText(/10/)).toBeInTheDocument();
    });

    it('should render calculated position value', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      // 150.50 * 10 = 1505.00 (shown in both Cost and Current columns)
      const values = screen.getAllByText(/\$1,505\.00/);
      expect(values.length).toBeGreaterThanOrEqual(1);
    });

    it('should render logo when logoUrl is provided', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const logo = screen.getByRole('img', { name: /aapl logo/i });
      expect(logo).toBeInTheDocument();
      // Next.js Image component wraps src in /_next/image optimization URL
      expect(logo.getAttribute('src')).toContain('logo.dev');
    });

    it('should render fallback icon when logoUrl is null', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK_NO_LOGO}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      expect(
        screen.queryByRole('img', { name: /msft logo/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('stock-icon-fallback')).toBeInTheDocument();
    });

    it('should render delete button', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      expect(
        screen.getByRole('button', { name: /delete/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Inline Editing - Buy Price', () => {
    it('should enter edit mode when clicking buy price', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      expect(screen.getByTestId('buy-price-input')).toBeInTheDocument();
    });

    it('should show current value in buy price input', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input') as HTMLInputElement;
      expect(input.value).toBe('150.5');
    });

    it('should call updateStock on blur', async () => {
      mockUpdateStock.mockResolvedValue({
        success: true,
        data: { ...MOCK_STOCK, buyPrice: 160 },
      });

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.change(input, { target: { value: '160' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockUpdateStock).toHaveBeenCalledWith('stock-1', {
          buyPrice: 160,
        });
      });
    });

    it('should call onUpdate callback after successful edit', async () => {
      mockUpdateStock.mockResolvedValue({
        success: true,
        data: { ...MOCK_STOCK, buyPrice: 160 },
      });

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.change(input, { target: { value: '160' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });

    it('should not call updateStock if value unchanged', async () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockUpdateStock).not.toHaveBeenCalled();
      });
    });

    it('should exit edit mode after blur', async () => {
      mockUpdateStock.mockResolvedValue({ success: true, data: MOCK_STOCK });

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.queryByTestId('buy-price-input')).not.toBeInTheDocument();
        expect(screen.getByTestId('buy-price-display')).toBeInTheDocument();
      });
    });

    it('should save on Enter key press', async () => {
      mockUpdateStock.mockResolvedValue({
        success: true,
        data: { ...MOCK_STOCK, buyPrice: 175 },
      });

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.change(input, { target: { value: '175' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockUpdateStock).toHaveBeenCalledWith('stock-1', {
          buyPrice: 175,
        });
      });
    });

    it('should cancel on Escape key press without saving', async () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.change(input, { target: { value: '999' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(mockUpdateStock).not.toHaveBeenCalled();
        expect(screen.queryByTestId('buy-price-input')).not.toBeInTheDocument();
      });
    });
  });

  describe('Inline Editing - Quantity', () => {
    it('should enter edit mode when clicking quantity', () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const quantityDisplay = screen.getByTestId('quantity-display');
      fireEvent.click(quantityDisplay);

      expect(screen.getByTestId('quantity-input')).toBeInTheDocument();
    });

    it('should call updateStock with quantity on blur', async () => {
      mockUpdateStock.mockResolvedValue({
        success: true,
        data: { ...MOCK_STOCK, quantity: 20 },
      });

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const quantityDisplay = screen.getByTestId('quantity-display');
      fireEvent.click(quantityDisplay);

      const input = screen.getByTestId('quantity-input');
      fireEvent.change(input, { target: { value: '20' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockUpdateStock).toHaveBeenCalledWith('stock-1', {
          quantity: 20,
        });
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should call removeStock when delete button is clicked', async () => {
      mockRemoveStock.mockResolvedValue({ success: true, data: MOCK_STOCK });

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockRemoveStock).toHaveBeenCalledWith('stock-1');
      });
    });

    it('should call onDelete callback after successful deletion', async () => {
      mockRemoveStock.mockResolvedValue({ success: true, data: MOCK_STOCK });

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('stock-1');
      });
    });

    it('should disable delete button while deleting', async () => {
      let resolveDelete!: (value: unknown) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      mockRemoveStock.mockReturnValue(deletePromise);

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(deleteButton).toBeDisabled();
      });

      resolveDelete({ success: true, data: MOCK_STOCK });
    });
  });

  describe('Error Handling', () => {
    it('should handle update error gracefully', async () => {
      mockUpdateStock.mockResolvedValue({
        success: false,
        error: 'Update failed',
      });
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.change(input, { target: { value: '999' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockOnUpdate).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should handle delete error gracefully', async () => {
      mockRemoveStock.mockResolvedValue({
        success: false,
        error: 'Delete failed',
      });
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDelete).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should not update if buy price is invalid', async () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const priceDisplay = screen.getByTestId('buy-price-display');
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.change(input, { target: { value: '-50' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockUpdateStock).not.toHaveBeenCalled();
      });
    });

    it('should not update if quantity is invalid', async () => {
      render(
        <StockListItem
          stock={MOCK_STOCK}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const quantityDisplay = screen.getByTestId('quantity-display');
      fireEvent.click(quantityDisplay);

      const input = screen.getByTestId('quantity-input');
      fireEvent.change(input, { target: { value: '-5' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockUpdateStock).not.toHaveBeenCalled();
      });
    });
  });

  describe('Position Value Calculation', () => {
    it('should display correct position value for various prices', () => {
      const stock = { ...MOCK_STOCK, buyPrice: 250.75, quantity: 4 };
      render(
        <StockListItem
          stock={stock}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      // 250.75 * 4 = 1003.00 (shown in both Cost and Current columns)
      const values = screen.getAllByText(/\$1,003\.00/);
      expect(values.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle decimal quantities correctly', () => {
      const stock = { ...MOCK_STOCK, buyPrice: 100, quantity: 2.5 };
      render(
        <StockListItem
          stock={stock}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      // 100 * 2.5 = 250.00 (shown in both Cost and Current columns)
      const values = screen.getAllByText(/\$250\.00/);
      expect(values.length).toBeGreaterThanOrEqual(1);
    });
  });
});
