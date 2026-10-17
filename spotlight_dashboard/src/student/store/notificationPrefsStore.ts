// Replaces Flutter NotificationPrefsProvider

import { create } from 'zustand';

const KEY = 'notifications_enabled';

function loadEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'false';
  } catch {
    return true;
  }
}

interface NotificationPrefsState {
  enabled: boolean;
  toggle: () => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  enabled: loadEnabled(),

  toggle: () => {
    const enabled = !get().enabled;
    try {
      localStorage.setItem(KEY, String(enabled));
    } catch {
      // preference just won't persist
    }
    set({ enabled });
  },
}));
