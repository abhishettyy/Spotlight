// Ported from spotlight_flutter/lib/models/models.dart NotificationModel

export interface NotificationModel {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt?: Date | null;
}

function cleanEmoji(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function notificationFromJson(json: Record<string, unknown>): NotificationModel {
  return {
    id: (json['id'] ?? '') as string,
    type: (json['type'] ?? '') as string,
    title: cleanEmoji((json['title'] ?? '') as string),
    body: cleanEmoji((json['body'] ?? '') as string),
    isRead: (json['is_read'] ?? json['isRead'] ?? false) as boolean,
    createdAt: json['created_at'] ? new Date(json['created_at'] as string) : null,
  };
}

export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'event_reminder': return 'calendar';
    case 'registration_approved': return 'check-circle';
    case 'registration_pending': return 'clock';
    default: return 'bell';
  }
}
