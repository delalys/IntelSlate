/**
 * ErrorState Component
 *
 * Displays a calm, dignified error message when market data is unavailable.
 * Designed to be non-alarming while clearly communicating the issue.
 *
 * Features:
 * - Calm, muted color palette (no red/alarming colors)
 * - Relative time display for last successful update
 * - Supports per-component or full-page variants
 * - rem-based typography
 * - Visually clean design
 *
 * @module components/dashboard/ErrorState
 */

// =============================================================================
// Types
// =============================================================================

export type TErrorStateVariant = 'full' | 'compact';

export interface IErrorStateProps {
  /** Custom error message (defaults to "Data unavailable") */
  message?: string;
  /** Last successful data update timestamp */
  lastUpdate?: Date;
  /** Display variant: "full" for full-page, "compact" for per-component */
  variant?: TErrorStateVariant;
  /** Optional additional CSS classes */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Formats a date as relative time (e.g., "2 hours ago", "yesterday")
 * Uses calm language appropriate for a dignified error state
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 15) {
    return 'a few minutes ago';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  }

  if (diffHours === 1) {
    return '1 hour ago';
  }

  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }

  if (diffDays === 1) {
    return 'yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString();
}

// =============================================================================
// Component
// =============================================================================

export function ErrorState({
  message = 'Data unavailable',
  lastUpdate,
  variant = 'full',
  className,
}: IErrorStateProps) {
  const isCompact = variant === 'compact';

  const containerClassName = [
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'gap-4',
    'w-full',
    isCompact ? 'py-4' : 'h-full',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={containerClassName}
      aria-label="Error state - data unavailable"
    >
      {/* Information Icon - calm, muted style */}
      <svg
        className="h-10 w-10 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Error Message - calm, dignified presentation */}
      <p className="text-lg font-medium text-gray-600">{message}</p>

      {/* Last Update Timestamp */}
      {lastUpdate && (
        <p className="text-sm text-gray-500">
          Last updated {formatRelativeTime(lastUpdate)}
        </p>
      )}
    </section>
  );
}
