// Replaces Flutter ClubsProvider

import { create } from 'zustand';
import { ClubModel } from '@/types/club';
import { fetchClubs } from '@/api/clubs';

interface ClubsState {
  clubs: ClubModel[];
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useClubsStore = create<ClubsState>((set) => ({
  clubs: [],
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const clubs = await fetchClubs();
      set({ clubs, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },
}));
