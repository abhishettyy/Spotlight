
import { create } from 'zustand';
import { NotificationModel } from '@student/types/notification';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markSingleNotificationRead,
  deleteNotification,
} from '@student/api/notifications';

interface NotificationsState {
  notifications: NotificationModel[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await fetchNotifications();
      set({
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        isLoading: false,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), isLoading: false });
    }
  },

  markAllRead: async () => {
    await markAllNotificationsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  markOneRead: async (id: string) => {
    await markSingleNotificationRead(id);
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      if (!target || target.isRead) return state;
      return {
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    });
  },

  remove: async (id: string) => {
    await deleteNotification(id);
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id);
      return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length };
    });
  },
}));
