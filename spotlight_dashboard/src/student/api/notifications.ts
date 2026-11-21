
import apiClient, { formatApiError } from './client';
import { notificationFromJson, NotificationModel } from '@student/types/notification';

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
    throw new Error(formatApiError(e, 'Failed to fetch notifications.'));
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    const userId = localStorage.getItem('userId') ?? '';
    await apiClient.put('/notifications/read', { userId });
  } catch {
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
