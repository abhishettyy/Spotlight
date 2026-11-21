
import { create } from 'zustand';

const THEME_KEY = 'spotlight_theme';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
}

function readInitialDark(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) !== 'light';
  } catch {
    return true;
  }
}

const initialDark = readInitialDark();

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: initialDark,

  toggle: () => {
    set((state) => {
      const newDark = !state.isDark;
      try {
        localStorage.setItem(THEME_KEY, newDark ? 'dark' : 'light');
      } catch {
      }
      applyTheme(newDark);
      return { isDark: newDark };
    });
  },
}));

applyTheme(initialDark);
