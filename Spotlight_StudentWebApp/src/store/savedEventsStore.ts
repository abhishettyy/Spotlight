// Replaces Flutter SavedEventsProvider
// Saves event IDs to localStorage

import { create } from 'zustand';

const SAVED_KEY = 'saved_event_ids';

function loadSaved(): Set<string> {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

interface SavedEventsState {
  savedIds: Set<string>;
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
}

export const useSavedEventsStore = create<SavedEventsState>((set, get) => ({
  savedIds: loadSaved(),

  isSaved: (id: string) => get().savedIds.has(id),

  toggle: (id: string) => {
    const newSet = new Set(get().savedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    localStorage.setItem(SAVED_KEY, JSON.stringify([...newSet]));
    set({ savedIds: newSet });
  },
}));
