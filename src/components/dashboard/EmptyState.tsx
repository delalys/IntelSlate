/**
 * EmptyState Component
 *
 * Displays a clear prompt when no stocks are configured,
 * guiding users to get started with the configuration.
 *
 * Features:
 * - Centered layout (vertically and horizontally)
 * - Prominent config icon/button
 * - Clean, on-brand design
 * - rem-based typography
 * - Keyboard accessible
 *
 * @module components/dashboard/EmptyState
 */

// =============================================================================
// Types
// =============================================================================

export interface IEmptyStateProps {
  /** Callback when the config button is clicked */
  onConfigClick: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function EmptyState({ onConfigClick, className }: IEmptyStateProps) {
  const containerClassName = [
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'gap-6',
    'h-full',
    'w-full',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={containerClassName}
      aria-label="Empty state - no stocks configured"
    >
      {/* Message */}
      <p className="text-xl font-medium text-gray-600 ">
        Add your stocks to get started
      </p>

      {/* Config Button */}
      <button
        type="button"
        onClick={onConfigClick}
        aria-label="Add stocks - open configuration"
        className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-6 py-4 text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
      >
        {/* Plus Icon */}
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span className="text-base font-medium">Add Stocks</span>
      </button>
    </section>
  );
}
