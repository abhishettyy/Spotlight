// Ported from spotlight_flutter/lib/core/api_service.dart — clubs methods
// GET /clubs

import apiClient, { formatApiError } from './client';
import { clubFromJson, ClubModel } from '@/types/club';
import { DEMO_CLUBS } from '@/utils/demoData';

const CLUBS_CACHE_KEY = 'cached_clubs_json';

export async function fetchClubs(): Promise<ClubModel[]> {
  try {
    const res = await apiClient.get('/clubs');
    const data = res.data;
    let clubsJson: unknown[] = [];
    if (Array.isArray(data)) {
      clubsJson = data;
    } else if (data?.clubs && Array.isArray(data.clubs)) {
      clubsJson = data.clubs;
    }
    const clubs = clubsJson.map((e) => clubFromJson(e as Record<string, unknown>));
    // Cache like Flutter does
    localStorage.setItem(CLUBS_CACHE_KEY, JSON.stringify(clubsJson));
    return clubs;
  } catch (e) {
    // Fallback to cache
    const cached = localStorage.getItem(CLUBS_CACHE_KEY);
    if (cached) {
      try {
        const raw = JSON.parse(cached) as unknown[];
        return raw.map((e) => clubFromJson(e as Record<string, unknown>));
      } catch {
        // ignore
      }
    }
    console.warn('Backend unavailable, using demo clubs:', e);
    return DEMO_CLUBS;
  }
}
