'use server';

/**
 * Server actions for theme
 */

import { revalidatePath } from 'next/cache';
import { getThemeId, setThemeId } from '@/lib/settings';
import type { TThemeId } from '@/theme-engine/types';

/**
 * Get current theme id
 */
export async function getTheme(): Promise<TThemeId> {
  return await getThemeId();
}

/**
 * Update theme and revalidate
 */
export async function updateTheme(themeId: TThemeId): Promise<void> {
  try {
    await setThemeId(themeId);
    revalidatePath('/');
  } catch (error) {
    console.error('[Action] Failed to update theme:', error);
    throw new Error('Failed to update theme');
  }
}
