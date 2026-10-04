// Ported from spotlight_flutter/lib/core/api_service.dart — notification methods

import apiClient, { formatApiError } from './client';
import { notificationFromJson, NotificationModel } from '@/types/notification';
import { DEMO_NOTIFICATIONS } from '@/utils/demoData';

export async function fetchNotifications(): Promise<{
  notifications: NotificationModel[];
  unreadCount: number;
}> {
  try {
    const res = await apiClient.get('/notifications');
    const data = res.data;
    const raw: unknown[] = data?.notifications ?? [];
    return {
      notifications: raw.map((n) => notificationFromJson(n as Record<string, unknown>)),
      unreadCount: (data?.unreadCount as number) ?? 0,
    };
  } catch (e) {
    console.warn('Backend unavailable, falling back to demo notifications:', e);
    return {
      notifications: DEMO_NOTIFICATIONS,
      unreadCount: DEMO_NOTIFICATIONS.filter((n) => !n.isRead).length,
    };
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    const userId = localStorage.getItem('userId') ?? '';
    await apiClient.put('/notifications/read', { userId });
  } catch {
    // silently fail like Flutter
  }
}

export async function markSingleNotificationRead(id: string): Promise<void> {
  try {
    await apiClient.put(`/notifications/${id}/read`);
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to mark notification as read.'));
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await apiClient.delete(`/notifications/${id}`);
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to delete notification.'));
  }
}
