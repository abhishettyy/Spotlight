// Replaces Flutter AuthProvider
// Token persistence in localStorage (equivalent to SharedPreferences)

import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  /** Set by logout; the page is leaving for the landing page, so route guards must not redirect. */
  signingOut: boolean;
  setSession: (token: string, userId: string) => void;
  logout: () => void;
  tryAutoLogin: () => boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  isAuthenticated: false,
  signingOut: false,

  setSession: (token: string, userId: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('userId', userId);
    set({ token, userId, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userId');
    localStorage.removeItem('cached_user_profile_json');
    localStorage.removeItem('cached_user_tickets_json');
    set({ token: null, userId: null, isAuthenticated: false, signingOut: true });
  },

  tryAutoLogin: () => {
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('userId');
    if (token && userId) {
      set({ token, userId, isAuthenticated: true });
      return true;
    }
    return false;
  },
}));
