import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): 'light' | 'dark' {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  return dark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (user) {
      setThemeState(user.theme);
      setResolved(applyTheme(user.theme));
    }
  }, [user]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(applyTheme(theme));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setResolved(applyTheme(t));
    api.put('/settings', { theme: t }).catch(() => undefined);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
