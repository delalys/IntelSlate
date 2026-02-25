/**
 * StockForm Component Tests
 *
 * Tests for the stock form component that handles buy price and quantity input
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ISymbolSearchResult } from '@/lib/api/yahooFinanceClient';
import { StockForm } from './StockForm';

// =============================================================================
// Mocks
// =============================================================================

// Mock the addStock server action
vi.mock('@/actions/stocks', () => ({
  addStock: vi.fn(),
}));

// Mock the stock quote action (return null to avoid overwriting manual price inputs in tests)
vi.mock('@/actions/stock-quote', () => ({
  getStockQuote: vi.fn().mockResolvedValue(null),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { addStock } from '@/actions/stocks';

const mockAddStock = addStock as ReturnType<typeof vi.fn>;

// =============================================================================
// Test Data
// =============================================================================

const MOCK_SELECTED_STOCK: ISymbolSearchResult = {
  symbol: 'AAPL',
  name: 'Apple Inc',
  type: 'Equity',
  region: 'United States',
  currency: 'USD',
  matchScore: 1.0,
};

// =============================================================================
// Tests
// =============================================================================

describe('StockForm', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render buy price and quantity inputs', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByLabelText(/buy price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    });

    it('should render Add Stock button', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(
        screen.getByRole('button', { name: /add stock/i }),
      ).toBeInTheDocument();
    });

    it('should display selected stock ticker', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByText(/AAPL/)).toBeInTheDocument();
    });

    it('should show position value display area', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByText(/position value/i)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should disable Add Stock button when no stock is selected', () => {
      render(
        <StockForm
          selectedStock={null}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
    });

    it('should disable Add Stock button when buy price is empty', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const quantityInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(quantityInput, { target: { value: '10' } });

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
    });

    it('should disable Add Stock button when quantity is empty', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      fireEvent.change(priceInput, { target: { value: '150.50' } });

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
    });

    it('should disable Add Stock button when buy price is 0 or negative', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '0' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
    });

    it('should disable Add Stock button when quantity is 0 or negative', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '0' } });

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
    });

    it('should disable Add Stock button when quantity is not an integer', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10.5' } });

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
    });

    it('should enable Add Stock button when form is valid', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });

      expect(
        screen.getByRole('button', { name: /add stock/i }),
      ).not.toBeDisabled();
    });
  });

  describe('Max Stocks Limit', () => {
    it('should disable Add Stock button when stock count is 5', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={5}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
    });

    it('should show Max 5 stocks message when limit is reached', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={5}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByText(/max 5 stocks/i)).toBeInTheDocument();
    });

    it('should not show Max 5 stocks message when under limit', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={4}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.queryByText(/max 5 stocks/i)).not.toBeInTheDocument();
    });
  });

  describe('Position Value Calculation', () => {
    it('should calculate and display position value (quantity × buyPrice)', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });

      // 150.50 * 10 = 1505.00
      expect(screen.getByText(/\$1,505\.00/)).toBeInTheDocument();
    });

    it('should update position value in real-time', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      // First calculation
      fireEvent.change(priceInput, { target: { value: '100' } });
      fireEvent.change(quantityInput, { target: { value: '5' } });
      expect(screen.getByText(/\$500\.00/)).toBeInTheDocument();

      // Update quantity
      fireEvent.change(quantityInput, { target: { value: '10' } });
      expect(screen.getByText(/\$1,000\.00/)).toBeInTheDocument();
    });

    it('should show $0.00 when values are invalid', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call addStock with correct data on submit', async () => {
      mockAddStock.mockResolvedValue({
        success: true,
        data: { id: 'stock-1', ticker: 'AAPL' },
      });

      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);
      const submitButton = screen.getByRole('button', { name: /add stock/i });

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAddStock).toHaveBeenCalledWith({
          ticker: 'AAPL',
          buyPrice: 150.5,
          quantity: 10,
        });
      });
    });

    it('should show loading state during submission', async () => {
      let resolveSubmit!: (value: unknown) => void;
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve;
      });
      mockAddStock.mockReturnValue(submitPromise);

      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);
      const submitButton = screen.getByRole('button', { name: /add stock/i });

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('form-loading')).toBeInTheDocument();
      });

      resolveSubmit({ success: true, data: { id: 'stock-1' } });

      await waitFor(() => {
        expect(screen.queryByTestId('form-loading')).not.toBeInTheDocument();
      });
    });

    it('should call onSuccess callback after successful submission', async () => {
      mockAddStock.mockResolvedValue({
        success: true,
        data: { id: 'stock-1', ticker: 'AAPL' },
      });

      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);
      const submitButton = screen.getByRole('button', { name: /add stock/i });

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should clear form after successful submission', async () => {
      mockAddStock.mockResolvedValue({
        success: true,
        data: { id: 'stock-1', ticker: 'AAPL' },
      });

      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(
        /buy price/i,
      ) as HTMLInputElement;
      const quantityInput = screen.getByLabelText(
        /quantity/i,
      ) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /add stock/i });

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(priceInput.value).toBe('');
        expect(quantityInput.value).toBe('');
      });
    });

    it('should display error message on submission failure', async () => {
      mockAddStock.mockResolvedValue({
        success: false,
        error: 'Failed to add stock',
      });

      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);
      const submitButton = screen.getByRole('button', { name: /add stock/i });

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to add stock/i)).toBeInTheDocument();
      });
    });
  });

  describe('Input Attributes', () => {
    it('should have step=0.01 for buy price input', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      expect(priceInput).toHaveAttribute('step', '0.01');
    });

    it('should have step=1 for quantity input', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const quantityInput = screen.getByLabelText(/quantity/i);
      expect(quantityInput).toHaveAttribute('step', '1');
    });

    it('should have min=0 for both inputs', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      expect(priceInput).toHaveAttribute('min', '0');
      expect(quantityInput).toHaveAttribute('min', '0');
    });
  });

  describe('Edge Cases', () => {
    it('should disable inputs during loading', async () => {
      let resolveSubmit!: (value: unknown) => void;
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve;
      });
      mockAddStock.mockReturnValue(submitPromise);

      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);
      const submitButton = screen.getByRole('button', { name: /add stock/i });

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(priceInput).toBeDisabled();
        expect(quantityInput).toBeDisabled();
      });

      resolveSubmit({ success: true, data: { id: 'stock-1' } });

      await waitFor(() => {
        expect(priceInput).not.toBeDisabled();
        expect(quantityInput).not.toBeDisabled();
      });
    });

    it('should handle negative buy price values', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '-50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
    });

    it('should handle negative quantity values', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '100' } });
      fireEvent.change(quantityInput, { target: { value: '-5' } });

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
    });

    it('should display stock name alongside ticker', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByText('Apple Inc')).toBeInTheDocument();
    });

    it('should not display stock info when no stock selected', () => {
      render(
        <StockForm
          selectedStock={null}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      expect(screen.queryByText('Apple Inc')).not.toBeInTheDocument();
    });

    it('should handle unexpected errors during submission', async () => {
      mockAddStock.mockRejectedValue(new Error('Network error'));

      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);
      const submitButton = screen.getByRole('button', { name: /add stock/i });

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
      });
    });

    it('should not call onSuccess on submission failure', async () => {
      mockAddStock.mockResolvedValue({
        success: false,
        error: 'Failed to add stock',
      });

      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);
      const submitButton = screen.getByRole('button', { name: /add stock/i });

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to add stock/i)).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should not clear form on submission failure', async () => {
      mockAddStock.mockResolvedValue({
        success: false,
        error: 'Failed to add stock',
      });

      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(
        /buy price/i,
      ) as HTMLInputElement;
      const quantityInput = screen.getByLabelText(
        /quantity/i,
      ) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /add stock/i });

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to add stock/i)).toBeInTheDocument();
      });

      // Form values should be preserved
      expect(priceInput.value).toBe('150.50');
      expect(quantityInput.value).toBe('10');
    });

    it('should handle large position values correctly', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '1000000' } });
      fireEvent.change(quantityInput, { target: { value: '1000' } });

      // 1,000,000 * 1,000 = 1,000,000,000
      expect(screen.getByText(/\$1,000,000,000\.00/)).toBeInTheDocument();
    });

    it('should handle decimal precision in position value', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '33.33' } });
      fireEvent.change(quantityInput, { target: { value: '3' } });

      // 33.33 * 3 = 99.99
      expect(screen.getByText(/\$99\.99/)).toBeInTheDocument();
    });

    it('should prevent form submission when invalid', async () => {
      render(
        <StockForm
          selectedStock={null}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const form = screen
        .getByRole('button', { name: /add stock/i })
        .closest('form');
      if (form) fireEvent.submit(form);

      // addStock should not be called
      expect(mockAddStock).not.toHaveBeenCalled();
    });

    it('should show position value as $0.00 when only price is entered', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      fireEvent.change(priceInput, { target: { value: '150.50' } });

      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('should show position value as $0.00 when only quantity is entered', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={0}
          onSuccess={mockOnSuccess}
        />,
      );

      const quantityInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(quantityInput, { target: { value: '10' } });

      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('should disable button when stockCount is greater than 5', () => {
      render(
        <StockForm
          selectedStock={MOCK_SELECTED_STOCK}
          stockCount={10}
          onSuccess={mockOnSuccess}
        />,
      );

      const priceInput = screen.getByLabelText(/buy price/i);
      const quantityInput = screen.getByLabelText(/quantity/i);

      fireEvent.change(priceInput, { target: { value: '150.50' } });
      fireEvent.change(quantityInput, { target: { value: '10' } });

      expect(screen.getByRole('button', { name: /add stock/i })).toBeDisabled();
      expect(screen.getByText(/max 5 stocks/i)).toBeInTheDocument();
    });
  });
});
