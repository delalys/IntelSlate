'use client';

/**
 * ThemeDecor — renders children only when the active theme matches `showFor`.
 *
 * Use this for per-theme decorative elements (titles, labels, ornaments)
 * that should not exist in the DOM for other themes.
 */

import type { ElementType, ReactNode } from 'react';
import { useTheme } from '@/theme-engine/ThemeProvider';
import type { TThemeId } from '@/theme-engine/types';

interface IThemeDecorProps {
  showFor: TThemeId;
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

export function ThemeDecor({
  showFor,
  children,
  as: Tag = 'div',
  className,
}: IThemeDecorProps) {
  const { themeId } = useTheme();
  if (themeId !== showFor) return null;
  return <Tag className={className}>{children}</Tag>;
}
