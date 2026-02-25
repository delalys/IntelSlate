/**
 * ChangeIndicator Component
 *
 * Shared styled indicator for displaying change values (percentage, currency)
 * with appropriate color coding and a hidden arrow for theme overrides.
 */

import { getChangeColorClass } from '@/lib/colors';
import { ThemeDecor } from '@/components/ui/ThemeDecor';

export interface IChangeIndicatorProps {
  /** The numeric value used to determine color (positive/negative/zero) */
  value: number;
  /** The formatted text to display (e.g., "+5.2%", "-€10.00 (-1.5%)") */
  children: React.ReactNode;
  /** Optional data-testid for testing */
  testId?: string;
  /** Optional additional className */
  className?: string;
}

export function ChangeIndicator({
  value,
  children,
  testId,
  className,
}: IChangeIndicatorProps) {
  const changeColorClass = getChangeColorClass(value);

  return (
    <div
      data-testid={testId}
      className={`text-s font-medium ${changeColorClass} ${className ?? ''}`}
    >
      {children}
      <ThemeDecor
        showFor="retro-ink"
        as="span"
        aria-hidden="true"
        className="change-arrow hidden md:inline ml-1"
      >
        {value >= 0 ? ' \u25B2' : ' \u25BC'}
      </ThemeDecor>
    </div>
  );
}
