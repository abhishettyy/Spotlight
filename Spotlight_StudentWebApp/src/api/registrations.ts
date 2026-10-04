// Ported from spotlight_flutter/lib/core/api_service.dart — registration methods
// POST /register, /teams/create, /teams/join
// PUT /registrations/:id/payment
// GET /user/tickets

import apiClient, { formatApiError } from './client';
import { ticketFromJson, TicketModel } from '@/types/event';
import { DEMO_TICKETS } from '@/utils/demoData';

const TICKETS_CACHE_KEY = 'cached_user_tickets_json';

export async function registerSolo(params: {
  eventId: string;
  name: string;
  usn: string;
}): Promise<string> {
  try {
    const userId = localStorage.getItem('userId') ?? '';
    const res = await apiClient.post('/register', {
      eventId: params.eventId,
      name: params.name,
      usn: params.usn,
      clerkUserId: userId,
    });
    return res.data.registration.id as string;
  } catch (e) {
    throw new Error(formatApiError(e, 'Registration failed. Please try again.'));
  }
}

export async function createTeam(params: {
  eventId: string;
  teamName: string;
  leaderUsn: string;
}): Promise<{ passkey: string; registrationId: string }> {
  try {
    const userId = localStorage.getItem('userId') ?? '';
    const res = await apiClient.post('/teams/create', {
      eventId: params.eventId,
      teamName: params.teamName,
      leaderUsn: params.leaderUsn,
      clerkUserId: userId,
    });
    return {
      passkey: (res.data.passkey as string) ?? '',
      registrationId: res.data.registrationId as string,
    };
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to create team. Please try again.'));
  }
}

export async function joinTeam(params: {
  eventId: string;
  passkey: string;
}): Promise<void> {
  try {
    const userId = localStorage.getItem('userId') ?? '';
    await apiClient.post('/teams/join', {
      eventId: params.eventId,
      passkey: params.passkey,
      clerkUserId: userId,
    });
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to join team. Please verify the passkey.'));
  }
}

export async function submitPayment(params: {
  registrationId: string;
  base64Image?: string;
  transactionId: string;
}): Promise<Record<string, unknown>> {
  try {
    const body: Record<string, string> = { transactionId: params.transactionId };
    if (params.base64Image) body['paymentProof'] = params.base64Image;
    const res = await apiClient.put(`/registrations/${params.registrationId}/payment`, body);
    return res.data as Record<string, unknown>;
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to upload payment proof. Please try again.'));
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
    const cached = localStorage.getItem(TICKETS_CACHE_KEY);
    if (cached) {
      try {
        const raw = JSON.parse(cached) as unknown[];
        return raw.map((t) => ticketFromJson(t as Record<string, unknown>));
      } catch {
        // ignore
      }
    }
    throw new Error(formatApiError(e, 'Failed to fetch tickets.'));
  }
}
