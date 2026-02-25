/**
 * StockList Component Tests
 *
 * Tests for the stock list container component with optimistic updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StockList } from './StockList';
import type { Stock } from '@/generated/prisma/client';

// =============================================================================
// Mocks
// =============================================================================

// Mock the server actions
vi.mock('@/actions/stocks', () => ({
  getStocks: vi.fn(),
  updateStock: vi.fn(),
  removeStock: vi.fn(),
}));

import { getStocks, updateStock, removeStock } from '@/actions/stocks';

const mockGetStocks = getStocks as ReturnType<typeof vi.fn>;
const mockUpdateStock = updateStock as ReturnType<typeof vi.fn>;
const mockRemoveStock = removeStock as ReturnType<typeof vi.fn>;

// =============================================================================
// Test Data
// =============================================================================

const MOCK_STOCKS: Stock[] = [
  {
    id: 'stock-1',
    userId: 'user-1',
    ticker: 'AAPL',
    buyPrice: 150.5,
    quantity: 10,
    logoUrl: 'https://logo.dev/aapl.png',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'stock-2',
    userId: 'user-1',
    ticker: 'GOOGL',
    buyPrice: 140.25,
    quantity: 5,
    logoUrl: 'https://logo.dev/google.png',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: 'stock-3',
    userId: 'user-1',
    ticker: 'MSFT',
    buyPrice: 380.0,
    quantity: 8,
    logoUrl: null,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('StockList', () => {
  const mockOnStockChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all stocks in the list', () => {
      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    it('should render stock count header', () => {
      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      expect(screen.getByText(/3 stocks/i)).toBeInTheDocument();
    });

    it('should render each stock with correct key', () => {
      const { container } = render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      const stockItems = container.querySelectorAll(
        '[data-testid^="stock-item-"]',
      );
      expect(stockItems).toHaveLength(3);
    });
  });

  describe('Empty State', () => {
    it("should show 'No stocks configured' when list is empty", () => {
      render(<StockList stocks={[]} onStockChange={mockOnStockChange} />);

      expect(screen.getByText(/no stocks configured/i)).toBeInTheDocument();
    });

    it('should show empty state icon or illustration', () => {
      render(<StockList stocks={[]} onStockChange={mockOnStockChange} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  describe('Optimistic Delete', () => {
    it('should immediately remove stock from list on delete', async () => {
      mockRemoveStock.mockResolvedValue({
        success: true,
        data: MOCK_STOCKS[0],
      });

      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      // Find the first delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      // Stock should be removed optimistically (immediately)
      await waitFor(() => {
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      });
    });

    it('should call onStockChange after successful delete', async () => {
      mockRemoveStock.mockResolvedValue({
        success: true,
        data: MOCK_STOCKS[0],
      });

      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockOnStockChange).toHaveBeenCalled();
      });
    });

    it('should restore stock if delete fails', async () => {
      mockRemoveStock.mockResolvedValue({
        success: false,
        error: 'Delete failed',
      });
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      // Stock should be restored after failed delete
      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Optimistic Update', () => {
    it('should immediately update stock values on edit', async () => {
      mockUpdateStock.mockResolvedValue({
        success: true,
        data: { ...MOCK_STOCKS[0], buyPrice: 200 },
      });

      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      // Click on buy price to edit
      const priceDisplay = screen.getAllByTestId('buy-price-display')[0];
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.change(input, { target: { value: '200' } });
      fireEvent.blur(input);

      // Wait for update to complete
      await waitFor(() => {
        expect(mockUpdateStock).toHaveBeenCalled();
      });
    });

    it('should call onStockChange after successful update', async () => {
      mockUpdateStock.mockResolvedValue({
        success: true,
        data: { ...MOCK_STOCKS[0], buyPrice: 200 },
      });

      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      const priceDisplay = screen.getAllByTestId('buy-price-display')[0];
      fireEvent.click(priceDisplay);

      const input = screen.getByTestId('buy-price-input');
      fireEvent.change(input, { target: { value: '200' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockOnStockChange).toHaveBeenCalled();
      });
    });
  });

  describe('Stock Order', () => {
    it('should display stocks in the order provided', () => {
      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      const stockItems = screen.getAllByTestId(/^stock-item-/);
      expect(stockItems[0]).toHaveTextContent('AAPL');
      expect(stockItems[1]).toHaveTextContent('GOOGL');
      expect(stockItems[2]).toHaveTextContent('MSFT');
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(
        <StockList
          stocks={MOCK_STOCKS}
          onStockChange={mockOnStockChange}
          isLoading={true}
        />,
      );

      expect(screen.getByTestId('stock-list-loading')).toBeInTheDocument();
    });

    it('should not show loading indicator when isLoading is false', () => {
      render(
        <StockList
          stocks={MOCK_STOCKS}
          onStockChange={mockOnStockChange}
          isLoading={false}
        />,
      );

      expect(
        screen.queryByTestId('stock-list-loading'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Total Portfolio Value', () => {
    it('should display total cost and total current values', () => {
      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      // AAPL: 150.50 * 10 = 1505.00
      // GOOGL: 140.25 * 5 = 701.25
      // MSFT: 380.00 * 8 = 3040.00
      // Total: 5246.25
      // Without market data, both Total Cost and Total Current show the same value
      const totalValues = screen.getAllByText(/\$5,246\.25/);
      expect(totalValues.length).toBe(2); // Total Cost and Total Current
    });

    it('should show $0.00 for empty portfolio', () => {
      render(<StockList stocks={[]} onStockChange={mockOnStockChange} />);

      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });
  });

  describe('Stock Count Display', () => {
    it("should show singular 'stock' for one stock", () => {
      render(
        <StockList
          stocks={[MOCK_STOCKS[0]]}
          onStockChange={mockOnStockChange}
        />,
      );

      expect(screen.getByText(/1 stock$/i)).toBeInTheDocument();
    });

    it("should show plural 'stocks' for multiple stocks", () => {
      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      expect(screen.getByText(/3 stocks/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible list structure', () => {
      render(
        <StockList stocks={MOCK_STOCKS} onStockChange={mockOnStockChange} />,
      );

      // ul and li elements have implicit list/listitem roles
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list.tagName).toBe('UL');
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
  });
});
