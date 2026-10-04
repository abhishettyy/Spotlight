// Replaces Flutter UserProvider
// Caches user in localStorage (equivalent to SharedPreferences)

import { create } from 'zustand';
import { UserModel, userFromJson } from '@/types/user';

const CACHE_KEY = 'cached_user_profile_json';

interface UserState {
  currentUser: UserModel | null;
  setCurrentUser: (user: UserModel | null) => void;
  clearUser: () => void;
  loadFromCache: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,

  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
    set({ currentUser: user });
  },

  clearUser: () => {
    localStorage.removeItem(CACHE_KEY);
    set({ currentUser: null });
  },

  loadFromCache: () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const user = userFromJson(JSON.parse(cached) as Record<string, unknown>);
        set({ currentUser: user });
      }
    } catch {
      // ignore
    }
  },
}));
