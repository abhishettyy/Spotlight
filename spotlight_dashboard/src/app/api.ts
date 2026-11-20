export function sanitizeErrorMessage(err: any, fallback: string = "Something went wrong. Please try again."): string {
  if (!err) return fallback;

  let msg = typeof err === 'string' ? err : (err.message || err.error || "");
  if (err.errors && err.errors.length > 0) {
    msg = err.errors[0].longMessage || err.errors[0].message || msg;
  }

  if (!msg || typeof msg !== 'string') return fallback;

  const lower = msg.toLowerCase();

  if (
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    lower.includes("load failed") ||
    lower.includes("econnrefused") ||
    lower.includes("socket") ||
    lower.includes("offline") ||
    lower.includes("networkerror")
  ) {
    return "Connection error. Please check your internet connection and try again.";
  }

  if (
    lower.includes("no account exists") ||
    lower.includes("no club exists") ||
    lower.includes("incorrect password") ||
    lower.includes("social sign-in")
  ) {
    return msg;
  }

  if (lower.includes("user_not_found") || lower.includes("invalid_credentials") || lower.includes("invalid password") || lower.includes("wrong password") || lower.includes("invalid email or password")) {
    return "Invalid email address or password. Please try again.";
  }
  if (
    lower.includes("already_exists") ||
    lower.includes("email already in use") ||
    lower.includes("already registered") ||
    lower.includes("user already exists") ||
    lower.includes("club already exists") ||
    lower.includes("is taken") ||
    lower.includes("already taken") ||
    lower.includes("address is taken")
  ) {
    return "An account or club with this email address already exists.";
  }
  if (lower.includes("password_too_short") || lower.includes("password is too short")) {
    return "Password is too short. Please choose a stronger password.";
  }
  if (lower.includes("session_expired") || lower.includes("token_expired") || lower.includes("unauthorized") || lower.includes("401") || lower.includes("403")) {
    return "Your session has expired. Please sign in again.";
  }

  if (
    lower.includes("prisma") ||
    lower.includes("p2002") ||
    lower.includes("p2003") ||
    lower.includes("p2025") ||
    lower.includes("constraint") ||
    lower.includes("syntaxerror") ||
    lower.includes("typeerror") ||
    lower.includes("referenceerror") ||
    lower.includes("postgres") ||
    lower.includes("sqlite") ||
    lower.includes("database") ||
    lower.includes("internal server error") ||
    lower.includes("500") ||
    lower.includes("   at ") ||
    lower.includes("eval") ||
    lower.includes("[object object]")
  ) {
    return "An unexpected server error occurred. Please try again later.";
  }

  const cleanMsg = msg.replace(/^Error:\s*/i, '').replace(/^Exception:\s*/i, '').trim();
  return cleanMsg || fallback;
}

let rawBase = String((import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api')
  .replace(/\s+/g, '')
  .trim()
  .replace(/\/+$/, '');
if (!rawBase.endsWith('/api')) {
  rawBase += '/api';
}
export const BASE_URL = rawBase;

function sanitizeImageUrls(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeImageUrls);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    let val = obj[key];
    if (typeof val === 'string' && val.includes('spotlight.msritise.in/uploads/')) {
      val = val.replace(/^https?:\/\/spotlight\.msritise\.in\/uploads\//, 'https://msritise.in/spotlight.msritise.in/uploads/');
    } else if (typeof val === 'object' && val !== null) {
      val = sanitizeImageUrls(val);
    }
    result[key] = val;
  }
  return result;
}

async function request(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store', ...options, headers });
    let data: any = {};
    try {
      data = await res.json();
    } catch (_) {
      data = {};
    }
    if (!res.ok) {
      const rawError = data.error || data.message || `Request failed (${res.status})`;
      const apiErr: any = new Error(sanitizeErrorMessage(rawError));
      apiErr.code = data.code;
      apiErr.status = res.status;
      throw apiErr;
    }
    return sanitizeImageUrls(data);
  } catch (err: any) {
    // Keep the server's error code (e.g. CLUB_PENDING) so pages can show the matching screen
    const wrapped: any = new Error(sanitizeErrorMessage(err));
    wrapped.code = err?.code;
    wrapped.status = err?.status;
    throw wrapped;
  }
}

export async function fetchPublicStats() {
  return request('/public/stats');
}

export async function clubLogin(email: string, password: string) {
  return request('/auth/club-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** The signed-in club's own details, including the coordinator (for prefilling letters) */
export async function fetchMyClub(token?: string) {
  return request('/clubs/mine', {}, token);
}

// Drafts: publish one (students can see it and register), or delete one that's no longer needed
export async function publishEvent(id: string, token?: string) {
  return request(`/events/${encodeURIComponent(id)}/publish`, { method: 'POST' }, token);
}

export async function deleteDraftEvent(id: string, token?: string) {
  return request(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
}

// Forgot password: email a 6-digit code, then set a new password with it (replaces the old one)
export async function requestPasswordReset(email: string) {
  return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPasswordWithCode(data: { email: string; code: string; newPassword: string }) {
  return request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) });
}

export async function changePassword(data: {
  oldPassword?: string;
  newPassword?: string;
}, token?: string) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

export async function fetchEvents() {
  return request('/events');
}

export async function createEvent(data: {
  name: string;
  description?: string;
  venue?: string;
  eventDate?: string;
  eventEndDate?: string;
  registrationDeadline?: string;
  fee?: number;
  registrationLimit?: number;
  eventType?: string;
  teamSizeLimit?: number;
  minTeamSize?: number;
  clubId?: string;
  /** Branches allowed to register; leave out for open to all */
  allowedBranches?: string[];
  /** Save without publishing: hidden from students until published */
  draft?: boolean;
  bannerUrl?: string;
  qrUrl?: string;
  upiId?: string;
}, token?: string) {
  return request('/events/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

export async function updateEventDeadline(eventId: string, deadline: string, token?: string) {
  return request(`/events/${eventId}/deadline`, {
    method: 'PUT',
    body: JSON.stringify({ registrationDeadline: deadline }),
  }, token);
}

export async function updateEvent(eventId: string, data: {
  eventDate?: string;
  eventEndDate?: string;
  registrationDeadline?: string;
  venue?: string;
  registrationLimit?: number;
  teamSizeLimit?: number;
  minTeamSize?: number;
  bannerUrl?: string;
  password?: string;
}, token?: string) {
  return request(`/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token);
}

export async function fetchClubs() {
  return request('/clubs');
}

export async function checkClubEmail(email: string) {
  return request('/clubs/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** The details a club fills in on the sign-up page; the admin reviews them before the club can sign in. */
export interface ClubSignupDetails {
  name: string;
  description: string;
  department: string;
  coordinatorName: string;
  coordinatorPhone: string;
  logoUrl?: string;
}

/** Club Google sign-in; with `signup`, files a pending registration instead (answers { pending: true }). */
export async function googleAuth(authPayload: { credential?: string; access_token?: string; signup?: ClubSignupDetails }) {
  return request('/auth/google', {
    method: 'POST',
    body: JSON.stringify(authPayload),
  });
}

export async function createClub(data: ClubSignupDetails & {
  email: string;
  password: string;
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

export async function fetchEventRegistrations(eventId: string, token?: string) {
  return request(`/events/${eventId}/registrations`, {}, token);
} 

export async function approveRegistration(registrationId: string, token?: string) {
  return request(`/registrations/${registrationId}/approve`, {
    method: 'PUT',
  }, token);
}

export async function rejectRegistration(registrationId: string, token?: string) {
  return request(`/registrations/${registrationId}/reject`, {
    method: 'DELETE',
  }, token);
}

/** All visible registrations for a club's events, fetched in a single request. */
export async function fetchAllRegistrationsForEvents(
  clubId: string,
  events: { id: string; title: string }[],
  token?: string
): Promise<any[]> {
  if (events.length === 0) return [];
  try {
    const data = await request(`/clubs/${clubId}/registrations`, {}, token);
    return data.registrations ?? [];
  } catch {
    // Older backend without the club-wide endpoint: fall back to one request per event
  }
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

export async function verifyTicketQR(ticketId: string, eventId: string, token?: string) {
  return request(`/registrations/verify-ticket`, {
    method: 'POST',
    body: JSON.stringify({ ticketId, eventId }),
  }, token);
}
