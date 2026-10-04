// Ported from spotlight_flutter/lib/core/api_service.dart — events methods
// GET /events

import apiClient, { formatApiError } from './client';
import { eventFromJson, EventModel } from '@/types/event';
import { DEMO_EVENTS, DEMO_CLUBS } from '@/utils/demoData';

export async function fetchEvents(): Promise<EventModel[]> {
  try {
    const res = await apiClient.get('/events');
    const data = res.data;
    let eventsJson: unknown[] = [];
    if (Array.isArray(data)) {
      eventsJson = data;
    } else if (data?.events && Array.isArray(data.events)) {
      eventsJson = data.events;
    }
    return eventsJson.map((e) => eventFromJson(e as Record<string, unknown>));
  } catch (e) {
    console.warn('Backend unavailable, falling back to demo events:', e);
    return DEMO_EVENTS;
  }
}

export async function fetchPublicStats(): Promise<{
  totalEvents: number;
  clubs: number;
  totalStudents: number;
}> {
  try {
    const res = await apiClient.get('/public/stats');
    return res.data;
  } catch (e) {
    console.warn('Backend unavailable, falling back to demo stats:', e);
    return {
      totalEvents: DEMO_EVENTS.length,
      clubs: DEMO_CLUBS.length,
      totalStudents: 150,
    };
  }
}
