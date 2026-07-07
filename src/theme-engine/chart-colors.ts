import { getChangeColor } from '@/lib/colors';
import type { TThemeId } from './types';

/**
 * Server-side mirror of --chart-line-color per theme.
 *
 * Charts rendered during SSR (screenshot mode) need a literal color because
 * CSS variables can only be resolved in the browser. At runtime the CSS
 * cascade still wins: resolveChartColor in PortfolioChart re-reads
 * --chart-line-color from the DOM after mount.
 *
 * `null` means the theme colors charts by daily change (the
 * [data-chart-line] rules in globals.css, mirrored by getChangeColor).
 */
const THEME_CHART_LINE_COLORS: Record<TThemeId, string | null> = {
  default: null,
  // --primary in styles/themes/retro-ink.css
  'retro-ink': '#161615',
};

/**
 * Returns the chart line color the CSS cascade would resolve for the
 * current theme and daily change.
 */
export function getThemeChartColor(themeId: TThemeId, change: number): string {
  return THEME_CHART_LINE_COLORS[themeId] ?? getChangeColor(change);
}
