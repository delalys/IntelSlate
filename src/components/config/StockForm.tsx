'use client';

/**
 * StockForm Component
 *
 * Form component for entering buy price and quantity when adding a stock.
 * Calculates position value in real-time and validates input.
 *
 * @module components/config/StockForm
 */

import { useTranslations } from 'next-intl';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { addStock } from '@/actions/stocks';
import { getStockQuote } from '@/actions/stock-quote';
import type { ISymbolSearchResult } from '@/lib/api/yahooFinanceClient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

// =============================================================================
// Constants
// =============================================================================

const MAX_STOCKS = 5;

// =============================================================================
// Types
// =============================================================================

export interface IStockFormProps {
  /** The selected stock from StockSearch, or null if none selected */
  selectedStock: ISymbolSearchResult | null;
  /** Current count of stocks in the portfolio */
  stockCount: number;
  /** Callback when stock is successfully added */
  onSuccess: () => void;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format a number as USD currency
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Check if a number is a valid positive integer
 */
function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Check if a number is a valid positive number
 */
function isPositiveNumber(value: number): boolean {
  return !Number.isNaN(value) && value > 0;
}

// =============================================================================
// Component
// =============================================================================

export function StockForm({
  selectedStock,
  stockCount,
  onSuccess,
}: IStockFormProps) {
  const t = useTranslations('config');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning';
    message: string;
  } | null>(null);

  // Computed values
  const buyPriceNum = parseFloat(buyPrice) || 0;
  const quantityNum = parseFloat(quantity) || 0;

  const positionValue = useMemo(() => {
    if (buyPriceNum > 0 && quantityNum > 0) {
      return buyPriceNum * quantityNum;
    }
    return 0;
  }, [buyPriceNum, quantityNum]);

  const isMaxStocksReached = stockCount >= MAX_STOCKS;

  const isFormValid = useMemo(() => {
    if (!selectedStock) return false;
    if (isMaxStocksReached) return false;
    if (!isPositiveNumber(buyPriceNum)) return false;
    if (!isPositiveInteger(quantityNum)) return false;
    return true;
  }, [selectedStock, isMaxStocksReached, buyPriceNum, quantityNum]);

  // Auto-dismiss feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Auto-fill buy price when stock is selected
  useEffect(() => {
    if (!selectedStock) {
      setBuyPrice('');
      return;
    }

    // Fetch current market price when stock is selected
    const fetchQuote = async () => {
      setIsFetchingQuote(true);
      try {
        const quote = await getStockQuote(selectedStock.symbol);
        if (quote?.price) {
          setBuyPrice(quote.price.toFixed(2));
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
        // Don't set error state - let user enter price manually
      } finally {
        setIsFetchingQuote(false);
      }
    };

    fetchQuote();
  }, [selectedStock]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isFormValid || !selectedStock) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await addStock({
          ticker: selectedStock.symbol,
          buyPrice: buyPriceNum,
          quantity: quantityNum,
        });

        if (result.success) {
          // Clear form
          setBuyPrice('');
          setQuantity('');
          setError(null);

          setFeedback({
            type: 'success',
            message:
              'Stock added successfully. News will appear tomorrow morning.',
          });

          onSuccess();
        } else {
          setError(result.error || 'Failed to add stock');
        }
      } catch {
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [isFormValid, selectedStock, buyPriceNum, quantityNum, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Selected Stock Display */}
      {selectedStock && (
        <GlassCard className="flex items-center gap-2 p-3 rounded-lg border border-primary/30">
          <span className="font-semibold text-primary">
            {selectedStock.symbol}
          </span>
          <span className="text-sm text-primary">{selectedStock.name}</span>
        </GlassCard>
      )}

      {/* Buy Price Input */}
      <div>
        <label htmlFor="buyPrice" className="field-label">
          Buy Price ($)
          {isFetchingQuote && (
            <span className="ml-2 text-xs text-primary">
              Fetching current price...
            </span>
          )}
        </label>
        <Input
          id="buyPrice"
          type="number"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
          placeholder={isFetchingQuote ? 'Fetching current price...' : '0.00'}
          step="0.01"
          min="0"
          disabled={isLoading || isFetchingQuote}
        />
      </div>

      {/* Quantity Input */}
      <div>
        <label htmlFor="quantity" className="field-label">
          Quantity
        </label>
        <Input
          id="quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={t('quantityPlaceholder')}
          step="1"
          min="0"
          disabled={isLoading}
        />
      </div>

      {/* Position Value Display */}
      <GlassCard className="p-3 rounded-lg border border-primary/30">
        <div className="text-sm text-primary">Position Value</div>
        <div className="text-xl font-semibold text-blue-600">
          {formatCurrency(positionValue)}
        </div>
      </GlassCard>

      {/* Error Message */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Feedback Message */}
      {feedback && (
        <Alert variant={feedback.type === 'success' ? 'success' : 'warning'}>
          {feedback.message}
        </Alert>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner data-testid="form-loading" />
            Adding stock...
          </span>
        ) : (
          'Add Stock'
        )}
      </button>

      {/* Max Stocks Message */}
      {isMaxStocksReached && (
        <Alert variant="warning">
          Max 5 stocks reached. Remove a stock to add a new one.
        </Alert>
      )}
    </form>
  );
}
