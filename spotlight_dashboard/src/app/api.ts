/// <reference types="vite/client" />
// ─── Spotlight Dashboard API Service ─────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store', ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export async function fetchPublicStats() {
  return request('/public/stats');
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function clubLogin(email: string, password: string) {
  return request('/auth/club-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function syncProfile(
  clerkUserId: string,
  email: string,
  name: string,
  token?: string
) {
  return request('/auth/sync', {
    method: 'POST',
    body: JSON.stringify({ clerkUserId, email, name }),
  }, token);
}

export async function getProfile(userId: string) {
  return request(`/profiles/${userId}`);
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function fetchEvents() {
  return request('/events');
}

export async function createEvent(data: {
  name: string;
  description?: string;
  venue?: string;
  eventDate?: string;
  registrationDeadline?: string;
  fee?: number;
  registrationLimit?: number;
  eventType?: string;
  teamSizeLimit?: number;
  clubId?: string;
  bannerUrl?: string;
  qrUrl?: string;
}, token?: string) {
  return request('/events/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

// ── Clubs ─────────────────────────────────────────────────────────────────────

export async function fetchClubs() {
  return request('/clubs');
}

export async function createClub(data: {
  name: string;
  email: string;
  logoUrl?: string;
  clerkUserId: string;
  password?: string;
}, token?: string) {
  return request('/clubs', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

export async function updateClub(clubId: string, data: {
  name?: string;
  email?: string;
  logoUrl?: string;
  upiId?: string;
  qrUrl?: string;
  password?: string;
}, token?: string) {
  return request(`/clubs/${clubId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
}

// ── Registrations ─────────────────────────────────────────────────────────────

export async function fetchEventRegistrations(eventId: string, token?: string) {
  return request(`/events/${eventId}/registrations`, {}, token);
}

export async function approveRegistration(registrationId: string, token?: string) {
  return request(`/registrations/${registrationId}/approve`, {
    method: 'PUT',
  }, token);
}

/**
 * Fetches registrations for every event in the provided list in parallel.
 * Returns a flat array of registration objects, each augmented with eventTitle.
 */
export async function fetchAllRegistrationsForEvents(
  events: { id: string; title: string }[],
  token?: string
): Promise<any[]> {
  if (events.length === 0) return [];
  const results = await Promise.allSettled(
    events.map(ev =>
      fetchEventRegistrations(ev.id, token).then(d =>
        (d.registrations ?? []).map((r: any) => ({ ...r, eventTitle: ev.title, eventId: ev.id }))
      )
    )
  );
  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}

export async function fetchClubDashboardStats(clubId: string, token?: string) {
  return request(`/clubs/${clubId}/dashboard-stats`, {}, token);
}

