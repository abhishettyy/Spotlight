
import { create } from 'zustand';
import { ClubModel, clubFromJson } from '@student/types/club';
import { fetchClubs } from '@student/api/clubs';

function loadFromCache(): ClubModel[] {
  try {
    const cached = localStorage.getItem('cached_clubs_json');
    if (!cached) return [];
    return (JSON.parse(cached) as unknown[]).map((c) => clubFromJson(c as Record<string, unknown>));
  } catch {
    return [];
  }
}

interface ClubsState {
  clubs: ClubModel[];
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useClubsStore = create<ClubsState>((set, get) => ({
  clubs: loadFromCache(),
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: get().clubs.length === 0, error: null });
    try {
      const clubs = await fetchClubs();
      set({ clubs, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), isLoading: false });
    }
  },
}));
