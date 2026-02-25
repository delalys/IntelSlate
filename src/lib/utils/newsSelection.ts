/**
 * Shared news selection logic.
 *
 * Rules:
 * - Prefer stocks with absolute daily change >= threshold (default 3%).
 * - If NONE qualify, fall back to the top N movers by absolute change (default 3).
 * - Always sort by absolute change (biggest movers first).
 * - Cap the result length (default 4).
 */

export interface IWithChangePercent {
  changePercent: number;
}

export interface ISelectByAbsChangeOptions {
  /** Minimum absolute change percent to qualify (default: 3) */
  minAbsChangePercent?: number;
  /** Fallback count when no stocks qualify (default: 3) */
  fallbackCount?: number;
  /** Maximum number of items returned (default: 4) */
  maxCount?: number;
}

export function selectByAbsChange<T extends IWithChangePercent>(
  items: T[],
  options: ISelectByAbsChangeOptions = {},
): T[] {
  const { minAbsChangePercent = 3, fallbackCount = 3, maxCount = 4 } = options;

  if (items.length === 0) {
    return [];
  }

  const sortedByAbsChange = [...items].sort(
    (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent),
  );

  const qualifying = sortedByAbsChange.filter(
    (item) => Math.abs(item.changePercent) >= minAbsChangePercent,
  );

  const selected =
    qualifying.length > 0
      ? qualifying
      : sortedByAbsChange.slice(
          0,
          Math.min(fallbackCount, sortedByAbsChange.length),
        );

  return selected.slice(0, maxCount);
}
