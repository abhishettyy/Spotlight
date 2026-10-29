// Ported from spotlight_flutter/lib/core/api_service.dart — registration methods
// POST /register, /teams/create, /teams/join
// PUT /registrations/:id/payment
// GET /user/tickets

import apiClient, { formatApiError } from './client';
import { ticketFromJson, TicketModel } from '@student/types/event';

export const TICKETS_CACHE_KEY = 'cached_user_tickets_json';

export async function registerSolo(params: {
  eventId: string;
  name: string;
  usn: string;
}): Promise<string> {
  try {
    const res = await apiClient.post('/register', {
      eventId: params.eventId,
      name: params.name,
      usn: params.usn,
    });
    return res.data.registration.id as string;
  } catch (e) {
    throw new Error(formatApiError(e, 'Registration failed. Please check your connection.'));
  }
}

export async function createTeam(params: {
  eventId: string;
  teamName: string;
  leaderUsn: string;
}): Promise<{ passkey: string; registrationId: string }> {
  try {
    const res = await apiClient.post('/teams/create', {
      eventId: params.eventId,
      teamName: params.teamName,
      leaderUsn: params.leaderUsn,
    });
    return {
      passkey: (res.data.passkey as string | null) ?? '',
      registrationId: res.data.registrationId as string,
    };
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to create team. Please check your connection.'));
  }
}

export async function joinTeam(params: {
  eventId: string;
  passkey: string;
}): Promise<void> {
  try {
    await apiClient.post('/teams/join', {
      eventId: params.eventId,
      passkey: params.passkey,
    });
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to join team. Please check your connection.'));
  }
}

/** Submits the UPI transaction ID. For a paid team, the response carries the team passkey. */
export async function submitPayment(params: {
  registrationId: string;
  transactionId: string;
}): Promise<{ passkey?: string | null }> {
  try {
    const res = await apiClient.put(`/registrations/${params.registrationId}/payment`, {
      transactionId: params.transactionId,
    });
    return res.data as { passkey?: string | null };
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to upload payment proof. Please check your connection.'));
  }
}

export function loadCachedTickets(): TicketModel[] {
  try {
    const cached = localStorage.getItem(TICKETS_CACHE_KEY);
    if (!cached) return [];
    const raw = JSON.parse(cached) as unknown[];
    return raw.map((t) => ticketFromJson(t as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function fetchUserTickets(): Promise<TicketModel[]> {
  try {
    const res = await apiClient.get('/user/tickets');
    const data = res.data;
    let raw: unknown[] = [];
    if (Array.isArray(data)) {
      raw = data;
    } else if (data?.tickets && Array.isArray(data.tickets)) {
      raw = data.tickets;
    }
    localStorage.setItem(TICKETS_CACHE_KEY, JSON.stringify(raw));
    return raw.map((t) => ticketFromJson(t as Record<string, unknown>));
  } catch (e) {
    const cached = loadCachedTickets();
    if (cached.length > 0) return cached;
    throw new Error(formatApiError(e, 'Failed to fetch tickets.'));
  }
}
