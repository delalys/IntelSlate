'use client';

/**
 * ConfigButton Component
 *
 * A subtle, unobtrusive button for accessing the configuration modal.
 * The button is positioned in the bottom-right corner and automatically
 * hides when the TRMNL device captures screenshots (via ?screenshot=true param).
 *
 * Features:
 * - Fixed position bottom-right corner
 * - Hidden during TRMNL screenshot capture
 * - Hidden in print media
 * - Subtle styling with hover reveal
 * - Keyboard accessible
 *
 * @module components/config/ConfigButton
 */

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

// =============================================================================
// Types
// =============================================================================

export interface IConfigButtonProps {
  /** Callback when button is clicked */
  onClick: () => void;
  /** Highlight the button in demo mode */
  isDemoMode?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ConfigButton({
  onClick,
  isDemoMode = false,
}: IConfigButtonProps) {
  const t = useTranslations('dashboard');
  const searchParams = useSearchParams();

  const isScreenshot = searchParams.get('screenshot') === 'true';

  if (isScreenshot) {
    return null;
  }

  const baseClasses =
    'fixed bottom-4 right-4 z-40 rounded-lg transition-all print:hidden';
  const demoClasses = isDemoMode
    ? 'p-2.5 bg-white text-primary/70 hover:bg-primary/20 hover:text-primary ring-1 ring-primary/20'
    : 'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('openConfiguration')}
      className={`${baseClasses} ${demoClasses}`}
    >
      {/* Gear/Cog Icon */}
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
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>
  );
}
