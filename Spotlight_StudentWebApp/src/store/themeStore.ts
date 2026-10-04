// Replaces Flutter ThemeProvider

import { create } from 'zustand';

const THEME_KEY = 'spotlight_theme';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

const initialDark = localStorage.getItem(THEME_KEY) !== 'light';

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: initialDark,

  toggle: () => {
    set((state) => {
      const newDark = !state.isDark;
      localStorage.setItem(THEME_KEY, newDark ? 'dark' : 'light');
      if (newDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { isDark: newDark };
    });
  },
}));

// Initialize theme class on DOM
if (initialDark) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
