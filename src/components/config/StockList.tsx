'use client';

/**
 * StockList Component
 *
 * Container component that displays a list of configured stocks with
 * optimistic updates for immediate UI feedback.
 *
 * @module components/config/StockList
 */

import { useOptimistic, useCallback, useMemo, startTransition } from 'react';
import { StockListItem } from './StockListItem';
import type { Stock } from '@/generated/prisma/client';

// =============================================================================
// Types
// =============================================================================

export interface IStockListProps {
  /** Array of stocks to display */
  stocks: Stock[];
  /** Market data map with current prices (optional - falls back to buyPrice if not provided) */
  marketData?: Map<string, { price: number }>;
  /** Callback when stocks change (add/update/delete) */
  onStockChange: () => void;
  /** Whether the list is loading */
  isLoading?: boolean;
}

type TOptimisticAction =
  | { type: 'delete'; stockId: string }
  | { type: 'update'; stockId: string; data: Partial<Stock> };

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
 * Reducer for optimistic state updates
 */
function optimisticReducer(state: Stock[], action: TOptimisticAction): Stock[] {
  switch (action.type) {
    case 'delete':
      return state.filter((stock) => stock.id !== action.stockId);
    case 'update':
      return state.map((stock) =>
        stock.id === action.stockId ? { ...stock, ...action.data } : stock,
      );
    default:
      return state;
  }
}

// =============================================================================
// Component
// =============================================================================

export function StockList({
  stocks,
  marketData,
  onStockChange,
  isLoading = false,
}: IStockListProps) {
  // Optimistic state for immediate UI updates
  const [optimisticStocks, addOptimistic] = useOptimistic(
    stocks,
    optimisticReducer,
  );

  // Calculate total cost basis (buyPrice * quantity)
  const totalCostBasis = useMemo(() => {
    return optimisticStocks.reduce((sum, stock) => {
      return sum + stock.buyPrice * stock.quantity;
    }, 0);
  }, [optimisticStocks]);

  // Calculate total current value (using market price, fallback to buyPrice)
  const totalCurrentValue = useMemo(() => {
    return optimisticStocks.reduce((sum, stock) => {
      const currentPrice =
        marketData?.get(stock.ticker)?.price ?? stock.buyPrice;
      return sum + currentPrice * stock.quantity;
    }, 0);
  }, [optimisticStocks, marketData]);

  // Stock count text
  const stockCountText = useMemo(() => {
    const count = optimisticStocks.length;
    return count === 1 ? '1 stock' : `${count} stocks`;
  }, [optimisticStocks.length]);

  /**
   * Handle delete callback from StockListItem
   * Note: StockListItem already calls removeStock, so we only need to
   * update the optimistic UI and trigger a refetch here.
   */
  const handleDelete = useCallback(
    (stockId: string) => {
      // Optimistically remove the stock within a transition
      startTransition(() => {
        addOptimistic({ type: 'delete', stockId });
      });

      // Refetch to sync with server state
      onStockChange();
    },
    [addOptimistic, onStockChange],
  );

  /**
   * Handle stock update
   */
  const handleUpdate = useCallback(() => {
    onStockChange();
  }, [onStockChange]);

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="stock-list-loading" className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty state
  if (optimisticStocks.length === 0) {
    return (
      <div data-testid="empty-state" className="text-center py-12">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-labelledby="empty-portfolio-icon"
            role="img"
          >
            <title id="empty-portfolio-icon">Empty portfolio</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No stocks configured
        </h3>
        <p className="text-gray-500">
          Add stocks to your portfolio to get started.
        </p>
        <div className="mt-4 text-2xl font-semibold text-gray-400">
          {formatCurrency(0)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count and total values */}
      <div className="flex justify-between items-center px-2">
        <span className="text-sm text-primary">{stockCountText}</span>
        <div className="text-right">
          <div className="flex gap-4">
            <div>
              <span className="text-xs text-primary/60">Total Cost</span>
              <div className="text-lg font-semibold text-primary">
                {formatCurrency(totalCostBasis)}
              </div>
            </div>
            <div>
              <span className="text-xs text-primary/60">Total Current</span>
              <div className="text-lg font-semibold text-primary">
                {formatCurrency(totalCurrentValue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock list */}
      <ul className="space-y-3">
        {optimisticStocks.map((stock) => (
          <li key={stock.id}>
            <StockListItem
              stock={stock}
              currentPrice={marketData?.get(stock.ticker)?.price}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
