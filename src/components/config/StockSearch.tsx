'use client';

/**
 * StockSearch Component
 *
 * Autocomplete search component for finding stocks by ticker symbol.
 * Uses debounced search (300ms) to avoid excessive API calls.
 * Server-side API calls via Yahoo Finance.
 *
 * @module components/config/StockSearch
 */

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { searchStocks } from '@/actions/stock-search';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { ISymbolSearchResult } from '@/lib/api/yahooFinanceClient';

// =============================================================================
// Constants
// =============================================================================

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

// =============================================================================
// Types
// =============================================================================

export interface IStockSearchProps {
  /** Callback when a stock is selected from the dropdown */
  onSelect: (stock: ISymbolSearchResult) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional initial value */
  initialValue?: string;
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function StockSearch({
  onSelect,
  placeholder = 'Search by ticker symbol...',
  initialValue = '',
  className = '',
}: IStockSearchProps) {
  const t = useTranslations('config');
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<ISymbolSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Refs for debouncing
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Perform the search after debounce
   */
  const performSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();

      // Don't search if query is too short
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setIsOpen(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchStocks(trimmed);

        if (response.success) {
          setResults(response.data || []);
          setIsOpen(true);
        } else {
          setError(response.error || t('searchFailed'));
          setResults([]);
        }
      } catch {
        setError('An unexpected error occurred');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  /**
   * Handle input changes with debouncing
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      // Clear any existing timeout
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      // If query is cleared, clear results immediately
      if (!value.trim()) {
        setResults([]);
        setIsOpen(false);
        setError(null);
        return;
      }

      // Set new debounced search
      debounceTimeout.current = setTimeout(() => {
        performSearch(value);
      }, DEBOUNCE_MS);
    },
    [performSearch],
  );

  /**
   * Handle stock selection
   */
  const handleSelect = useCallback(
    (stock: ISymbolSearchResult) => {
      setQuery(stock.symbol);
      setResults([]);
      setIsOpen(false);
      setError(null);
      onSelect(stock);
    },
    [onSelect],
  );

  /**
   * Clean up timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Label */}
      <label htmlFor="stock-search-input" className="field-label">
        {t('stockSearch')}
      </label>

      {/* Search Input */}
      <div className="relative">
        <Input
          id="stock-search-input"
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="stock-search-listbox"
          autoComplete="off"
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div
            data-testid="search-loading"
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <Spinner className="text-gray-400" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="error" role="alert" className="mt-1">
          Error: {error}
        </Alert>
      )}

      {/* Dropdown Results */}
      {isOpen && !isLoading && (
        <div
          id="stock-search-listbox"
          className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              No matching stocks found
            </div>
          ) : (
            results.map((stock) => (
              <button
                key={`${stock.symbol}-${stock.region}`}
                type="button"
                onClick={() => handleSelect(stock)}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none border-b border-gray-700 last:border-b-0"
                role="option"
                aria-selected="false"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-100">
                      {stock.symbol}
                    </span>
                    <span className="ml-2 text-sm text-gray-400">
                      {stock.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{stock.region}</span>
                </div>
                <div className="text-xs text-gray-200 mt-1">
                  {stock.type} • {stock.currency}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
