// Replaces Flutter NotificationsProvider

import { create } from 'zustand';
import { NotificationModel } from '@/types/notification';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markSingleNotificationRead,
  deleteNotification,
} from '@/api/notifications';

interface NotificationsState {
  notifications: NotificationModel[];
  unreadCount: number;
  isLoading: boolean;
  load: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    try {
      const result = await fetchNotifications();
      set({
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
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
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  remove: async (id: string) => {
    const wasUnread = get().notifications.find((n) => n.id === id)?.isRead === false;
    await deleteNotification(id);
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));
  },
}));
