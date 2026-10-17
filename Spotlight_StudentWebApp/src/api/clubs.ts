// Ported from spotlight_flutter/lib/core/api_service.dart — clubs methods
// GET /clubs

import apiClient, { formatApiError } from './client';
import { clubFromJson, ClubModel } from '@/types/club';

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
    localStorage.setItem(CLUBS_CACHE_KEY, JSON.stringify(clubsJson));
    return clubsJson.map((e) => clubFromJson(e as Record<string, unknown>));
  } catch (e) {
    const cached = localStorage.getItem(CLUBS_CACHE_KEY);
    if (cached) {
      try {
        const raw = JSON.parse(cached) as unknown[];
        return raw.map((c) => clubFromJson(c as Record<string, unknown>));
      } catch {
        // fall through to the error
      }
    }
    throw new Error(formatApiError(e, 'Failed to fetch clubs.'));
  }
}
