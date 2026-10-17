// Replaces Flutter EventsProvider: shows cached events first, then refreshes from the API

import { create } from 'zustand';
import { EventModel, eventFromJson } from '@/types/event';
import { fetchEvents } from '@/api/events';

const CACHE_KEY = 'cached_events_json';

function loadFromCache(): EventModel[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];
    return (JSON.parse(cached) as unknown[]).map((e) => eventFromJson(e as Record<string, unknown>));
  } catch {
    return [];
  }
}

interface EventsState {
  events: EventModel[];
  isLoading: boolean;
  error: string | null;
  loadEvents: () => Promise<void>;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: loadFromCache(),
  isLoading: false,
  error: null,

  loadEvents: async () => {
    // Only show a spinner when there is nothing cached to display
    set({ isLoading: get().events.length === 0, error: null });
    try {
      const { events, raw } = await fetchEvents();
      localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
      set({ events, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), isLoading: false });
    }
  },
}));
