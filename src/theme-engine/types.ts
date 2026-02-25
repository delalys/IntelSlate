/**
 * Theme engine types and constants
 */

export const THEME_IDS = ['default', 'retro-ink'] as const;
export type TThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: TThemeId = 'default';
