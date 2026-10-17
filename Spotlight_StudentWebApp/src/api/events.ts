// Ported from spotlight_flutter/lib/core/api_service.dart — events methods
// GET /events, GET /public/stats

import apiClient, { formatApiError } from './client';
import { eventFromJson, EventModel } from '@/types/event';

export async function fetchEvents(): Promise<{ events: EventModel[]; raw: unknown[] }> {
  try {
    const res = await apiClient.get('/events');
    const data = res.data;
    let eventsJson: unknown[] = [];
    if (Array.isArray(data)) {
      eventsJson = data;
    } else if (data?.events && Array.isArray(data.events)) {
      eventsJson = data.events;
    }
    return {
      events: eventsJson.map((e) => eventFromJson(e as Record<string, unknown>)),
      raw: eventsJson,
    };
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to fetch events.'));
  }
}

export interface PublicStats {
  totalEvents?: number;
  liveEvents?: number;
  clubs?: number;
  totalStudents?: number;
}

export async function fetchPublicStats(): Promise<PublicStats> {
  try {
    const res = await apiClient.get('/public/stats');
    return res.data as PublicStats;
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to fetch public stats.'));
  }
}
