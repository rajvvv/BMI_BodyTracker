import React, { createContext, useContext } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

const darkColors = {
  bg: '#09090b',
  surface: '#18181b',
  surfaceAlt: '#27272a',
  glass: 'rgba(30, 30, 35, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  border: '#27272a',
  text: '#fafafa',
  textDim: '#a1a1aa',
  primary: '#10b981',
  primaryDark: '#059669',
  danger: '#ef4444',
  accent: '#38bdf8',
  good: '#10b981',
  bad: '#f59e0b',
  chartGrid: 'rgba(161, 161, 170, 0.15)',
};

const lightColors = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  glass: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(0, 0, 0, 0.05)',
  border: '#e2e8f0',
  text: '#0f172a',
  textDim: '#64748b',
  primary: '#059669',
  primaryDark: '#047857',
  danger: '#dc2626',
  accent: '#0284c7',
  good: '#10b981',
  bad: '#d97706',
  chartGrid: 'rgba(100, 116, 139, 0.15)',
};

const gradients = {
  primary: ['#10b981', '#06b6d4'] as const,
  violet: ['#8b5cf6', '#d946ef'] as const,
  orange: ['#f59e0b', '#ef4444'] as const,
  dark: ['#18181b', '#09090b'] as const,
  light: ['#ffffff', '#f8fafc'] as const,
};

const typography = {
  h1: 32,
  h2: 24,
  h3: 20,
  body: 16,
  small: 14,
  tiny: 12,
};

type ThemeContextType = {
  isDark: boolean;
  colors: typeof darkColors;
  gradients: typeof gradients;
  typography: typeof typography;
  radius: number;
  radiusLg: number;
  space: (n: number) => number;
};

const defaultTheme: ThemeContextType = {
  isDark: true,
  colors: darkColors,
  gradients,
  typography,
  radius: 14,
  radiusLg: 24,
  space: (n: number) => n * 4,
};

const ThemeContext = createContext<ThemeContextType>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const isDark = systemScheme === 'dark' || systemScheme === null; // Defaults to dark if system is null

  const value: ThemeContextType = {
    isDark,
    colors: isDark ? darkColors : lightColors,
    gradients,
    typography,
    radius: 14,
    radiusLg: 24,
    space: (n: number) => n * 4,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);

// Fallback export so older files using `import { theme } from '../theme'` don't crash immediately.
// They will just default to Dark mode until you convert them to useAppTheme().
export const theme = defaultTheme;