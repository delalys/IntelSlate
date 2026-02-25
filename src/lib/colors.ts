/**
 * Color Utilities
 *
 * Provides consistent color handling across the application for
 * positive/negative value changes.
 */

// Theme colors for positive/negative changes
export const COLORS = {
  positive: '#10b981', // emerald-500
  negative: '#ef4444', // red-500
  neutral: '#6b7280', // gray-500
} as const;

/**
 * Returns appropriate color based on value (positive, negative, or neutral)
 *
 * @param value - The numeric value to evaluate
 * @returns Hex color string
 */
export function getChangeColor(value: number): string {
  if (value > 0) return COLORS.positive;
  if (value < 0) return COLORS.negative;
  return COLORS.neutral;
}

/**
 * Returns Tailwind CSS class for text color based on value
 *
 * @param value - The numeric value to evaluate
 * @returns Tailwind text color class
 */
export function getChangeColorClass(value: number): string {
  if (value > 0) return 'text-emerald-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-500';
}
