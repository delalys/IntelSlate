'use client';

/**
 * ThemeProvider — provides theme context and syncs theme id to body
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { TThemeId } from '@/theme-engine/types';

// =============================================================================
// Context
// =============================================================================

interface IThemeContextValue {
  themeId: TThemeId;
  setTheme: (id: TThemeId) => void;
}

const ThemeContext = createContext<IThemeContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface IThemeProviderProps {
  initialThemeId: TThemeId;
  children: React.ReactNode;
}

export function ThemeProvider({
  initialThemeId,
  children,
}: IThemeProviderProps) {
  const [themeId, setThemeIdState] = useState<TThemeId>(initialThemeId);

  const setTheme = useCallback((id: TThemeId) => {
    setThemeIdState(id);
  }, []);

  useEffect(() => {
    document.body.dataset.theme = themeId;
  }, [themeId]);

  const value: IThemeContextValue = { themeId, setTheme };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useTheme(): IThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
