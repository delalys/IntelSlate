'use client';

/**
 * StockListItem Component
 *
 * Individual stock item with inline editing for buy price and quantity,
 * and single-click delete functionality.
 *
 * @module components/config/StockListItem
 */

import { useTranslations } from 'next-intl';
import { useState, useCallback, useRef, useEffect } from 'react';
import { updateStock, removeStock } from '@/actions/stocks';
import type { Stock } from '@/generated/prisma/client';
import { Tag } from '@/components/ui/Tag';
import { Spinner } from '@/components/ui/Spinner';
import { StatColumn } from '@/components/ui/StatColumn';

// =============================================================================
// Types
// =============================================================================

export interface IStockListItemProps {
  /** The stock to display */
  stock: Stock;
  /** Current market price (optional - falls back to buyPrice if not provided) */
  currentPrice?: number;
  /** Callback when stock is successfully updated */
  onUpdate: () => void;
  /** Callback when stock is successfully deleted */
  onDelete: (stockId: string) => void;
}

type TEditField = 'buyPrice' | 'quantity' | null;

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

// =============================================================================
// Component
// =============================================================================

export function StockListItem({
  stock,
  currentPrice,
  onUpdate,
  onDelete,
}: IStockListItemProps) {
  const t = useTranslations('config');
  const [editField, setEditField] = useState<TEditField>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editField]);

  // Calculated position values
  const positionValue = stock.buyPrice * stock.quantity; // Cost basis
  const currentValue = (currentPrice ?? stock.buyPrice) * stock.quantity; // Current market value

  /**
   * Enter edit mode for a field
   */
  const handleStartEdit = useCallback(
    (field: TEditField) => {
      if (field === 'buyPrice') {
        setEditValue(String(stock.buyPrice));
      } else if (field === 'quantity') {
        setEditValue(String(stock.quantity));
      }
      setEditField(field);
    },
    [stock.buyPrice, stock.quantity],
  );

  /**
   * Save edited value
   */
  const handleSave = useCallback(async () => {
    if (!editField || isSaving) return;

    const numValue = parseFloat(editValue);
    const originalValue =
      editField === 'buyPrice' ? stock.buyPrice : stock.quantity;

    // Exit edit mode immediately
    const currentField = editField;
    setEditField(null);

    // Don't save if value unchanged
    if (numValue === originalValue) {
      return;
    }

    // Validate value
    if (Number.isNaN(numValue) || numValue <= 0) {
      return;
    }

    // For quantity, check if it's an integer
    if (currentField === 'quantity' && !Number.isInteger(numValue)) {
      return;
    }

    setIsSaving(true);

    try {
      const updateData =
        currentField === 'buyPrice'
          ? { buyPrice: numValue }
          : { quantity: numValue };

      const result = await updateStock(stock.id, updateData);

      if (result.success) {
        onUpdate();
      } else {
        console.error('Failed to update stock:', result.error);
      }
    } catch (error) {
      console.error('Error updating stock:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    editField,
    editValue,
    isSaving,
    stock.id,
    stock.buyPrice,
    stock.quantity,
    onUpdate,
  ]);

  /**
   * Cancel edit mode
   */
  const handleCancel = useCallback(() => {
    setEditField(null);
    setEditValue('');
  }, []);

  /**
   * Handle key press in input
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  /**
   * Handle delete stock
   */
  const handleDelete = useCallback(async () => {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      const result = await removeStock(stock.id);

      if (result.success) {
        onDelete(stock.id);
      } else {
        console.error('Failed to delete stock:', result.error);
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      setIsDeleting(false);
    }
  }, [isDeleting, stock.id, onDelete]);

  return (
    <div
      data-testid={`stock-item-${stock.id}`}
      className="p-4 rounded-xl bg-gray-700"
    >
      {/* Top row: Logo, Ticker, and Delete button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {stock.logoUrl ? (
            <img
              src={stock.logoUrl}
              alt={`${stock.ticker} logo`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div
              data-testid="stock-icon-fallback"
              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
            >
              <span className="text-xs font-bold text-white">
                {stock.ticker.slice(0, 2)}
              </span>
            </div>
          )}
          <Tag className="!text-white">{stock.ticker}</Tag>
        </div>
        <div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={t('deleteStock')}
            className="btn-icon text-white hover:text-red-600 hover:bg-red-50"
          >
            {isDeleting ? (
              <Spinner />
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <title>Delete</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Bottom row: Buy Price, Quantity, and Value */}
      <div className="flex items-center justify-between">
        {/* Buy Price */}
        <StatColumn label="Buy Price">
          {editField === 'buyPrice' ? (
            <input
              ref={inputRef}
              data-testid="buy-price-input"
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              step="0.01"
              min="0"
              className="w-24 px-2 py-1 text-center border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <button
              type="button"
              data-testid="buy-price-display"
              onClick={() => handleStartEdit('buyPrice')}
              className="text-white hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded cursor-pointer transition-colors"
            >
              {formatCurrency(stock.buyPrice)}
            </button>
          )}
        </StatColumn>

        {/* Quantity */}
        <StatColumn label="Qty">
          {editField === 'quantity' ? (
            <input
              ref={inputRef}
              data-testid="quantity-input"
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              step="1"
              min="0"
              className="w-20 px-2 py-1 text-center border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <button
              type="button"
              data-testid="quantity-display"
              onClick={() => handleStartEdit('quantity')}
              className="text-white hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded cursor-pointer transition-colors"
            >
              {stock.quantity}
            </button>
          )}
        </StatColumn>

        {/* Position Value: Cost */}
        <StatColumn label="Cost">
          <div className="text-white font-medium px-2 py-1">
            {formatCurrency(positionValue)}
          </div>
        </StatColumn>

        {/* Position Value: Current */}
        <StatColumn label="Current">
          <div className="text-white font-medium px-2 py-1">
            {formatCurrency(currentValue)}
          </div>
        </StatColumn>
      </div>
    </div>
  );
}
