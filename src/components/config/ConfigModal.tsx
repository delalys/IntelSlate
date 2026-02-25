'use client';

/**
 * ConfigModal Component
 *
 * A responsive modal for configuring the stock portfolio.
 * Integrates StockSearch, StockForm, and StockList components.
 * Features: keyboard navigation, focus trapping, scroll lock, responsive layout.
 *
 * @module components/config/ConfigModal
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import { StockSearch } from './StockSearch';
import { StockForm } from './StockForm';
import { StockList } from './StockList';
import { PipelineTriggers } from './PipelineTriggers';
import { ClaudeApiKeySettings } from './ClaudeApiKeySettings';
import { ChartSettings } from './ChartSettings';
import { ThemeSettings } from './ThemeSettings';
import type { Stock, MarketData } from '@/generated/prisma/client';
import type { TThemeId } from '@/theme-engine/types';
import type { ISymbolSearchResult } from '@/lib/api/yahooFinanceClient';
import type { IChartTimeframeSettings } from '@/lib/constants';

// =============================================================================
// Types
// =============================================================================

export interface IConfigModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when Save button is clicked */
  onSave: () => void;
  /** Array of stocks to display in the list */
  stocks: Stock[];
  /** Market data for the stocks (optional) */
  marketData?: MarketData[];
  /** Callback when stocks change (add/update/delete) */
  onStockChange: () => void;
  /** Whether the stock list is loading */
  isLoading?: boolean;
  /** Chart timeframe settings */
  chartSettings: IChartTimeframeSettings;
  /** Callback when settings change */
  onSettingsChange?: () => void;
  /** Current theme id (for Theme section) */
  themeId?: TThemeId;
  /** Callback when theme is changed on Save */
  onThemeChange?: (id: TThemeId) => void;
  /** Claude API key status */
  claudeApiKeyStatus?: { isSet: boolean };
  /** Callback when Claude API key status changes */
  onClaudeKeyStatusChange?: () => void;
  /** When true, hides pipeline and Claude API key sections */
  isDemoMode?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ConfigModal({
  isOpen,
  onClose,
  onSave,
  stocks,
  marketData,
  onStockChange,
  isLoading = false,
  chartSettings,
  onSettingsChange,
  themeId: themeIdProp,
  onThemeChange,
  claudeApiKeyStatus = { isSet: false },
  onClaudeKeyStatusChange,
  isDemoMode = false,
}: IConfigModalProps) {
  const t = useTranslations('config');

  const [localThemeId, setLocalThemeId] = useState<TThemeId>(
    themeIdProp ?? 'default',
  );

  useEffect(() => {
    if (isOpen && themeIdProp !== undefined) {
      setLocalThemeId(themeIdProp);
    }
  }, [isOpen, themeIdProp]);

  // Convert marketData array to Map for StockList
  const marketDataMap = marketData
    ? new Map(marketData.map((entry) => [entry.ticker, { price: entry.price }]))
    : undefined;
  // Refs for focus management
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // State for selected stock from search
  const [selectedStock, setSelectedStock] =
    useState<ISymbolSearchResult | null>(null);

  // Store original body overflow for restoration
  const originalOverflowRef = useRef<string>('');

  const [isMobile, setIsMobile] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /**
   * Handle Save button click
   */
  const handleSave = useCallback(() => {
    if (onThemeChange) {
      onThemeChange(localThemeId);
    }
    onSave();
    if (!isMobile) {
      onClose();
    } else {
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }
  }, [onSave, onClose, onThemeChange, localThemeId, isMobile]);

  /**
   * Handle stock selection from search
   */
  const handleStockSelect = useCallback((stock: ISymbolSearchResult) => {
    setSelectedStock(stock);
  }, []);

  /**
   * Handle successful stock addition
   */
  const handleAddSuccess = useCallback(() => {
    setSelectedStock(null);
    onStockChange();
  }, [onStockChange]);

  /**
   * Handle backdrop click - close modal
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking the backdrop itself, not its children
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  /**
   * Handle content click - stop propagation to prevent backdrop close
   */
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Lock body scroll when modal is open
   */
  useEffect(() => {
    if (isOpen) {
      // Store original overflow
      originalOverflowRef.current = document.body.style.overflow;
      // Lock scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      // Restore original overflow on unmount or when closed
      document.body.style.overflow = originalOverflowRef.current;
    };
  }, [isOpen]);

  /**
   * Handle Escape key to close modal
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  /**
   * Focus close button when modal opens
   */
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 10);

      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  /**
   * Trap focus inside modal
   */
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modalElement = modalRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Get all focusable elements in the modal
      const focusableElements = modalElement.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element -> focus last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab on last element -> focus first
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    modalElement.addEventListener('keydown', handleKeyDown);

    return () => {
      modalElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // ==========================================================================
  // Render
  // ==========================================================================

  if (!isOpen) {
    return null;
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close is a standard modal UX pattern
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key is handled via the document keydown listener above
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop-propagation only, keyboard is handled by the dialog role */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        data-testid="modal-content"
        onClick={handleContentClick}
        className="flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg bg-surface sm:rounded-lg shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-primary">
            Configure Portfolio
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="md:flex btn-icon text-primary hover:bg-gray-800 hidden"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Mobile notice - only visible below md breakpoint */}
          <Alert variant="warning" className="md:hidden">
            {t('mobileNotice')}
          </Alert>

          {/* Stock Search Section */}
          <div className="space-y-4">
            <h3 className="section-heading">Add Stock</h3>
            <StockSearch onSelect={handleStockSelect} />
            <StockForm
              selectedStock={selectedStock}
              stockCount={stocks.length}
              onSuccess={handleAddSuccess}
            />
          </div>

          <div className="modal-divider" />

          {/* Stock List Section */}
          <div className="space-y-4">
            <h3 className="section-heading">Your Stocks</h3>
            <StockList
              stocks={stocks}
              marketData={marketDataMap}
              onStockChange={onStockChange}
              isLoading={isLoading}
            />
          </div>

          <div className="modal-divider" />

          {!isDemoMode && (
            <>
              {/* Pipeline Triggers */}
              <PipelineTriggers />

              <div className="modal-divider" />

              {/* Claude API Key Section */}
              <div className="space-y-4">
                <ClaudeApiKeySettings
                  isSet={claudeApiKeyStatus.isSet}
                  onSaved={onClaudeKeyStatusChange}
                />
              </div>

              <div className="modal-divider" />
            </>
          )}

          {/* Chart Settings Section */}
          <div className="space-y-4">
            <h3 className="section-heading">Chart Settings</h3>
            <ChartSettings
              settings={chartSettings}
              onSettingsChange={onSettingsChange}
            />
          </div>

          {/* Theme Section */}
          {themeIdProp !== undefined && (
            <>
              <div className="modal-divider" />
              <div className="space-y-4" data-testid="config-theme-section">
                <h3 className="section-heading">Theme</h3>
                <ThemeSettings
                  themeId={localThemeId}
                  onChange={setLocalThemeId}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700 bg-surface">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary hidden md:block"
          >
            Cancel
          </button>
          {showSaved && (
            <span className="text-sm font-medium text-green-500">Saved</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="btn-primary"
            data-testid="modal-save-button"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
