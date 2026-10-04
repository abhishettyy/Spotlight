// Ported from spotlight_flutter/lib/models/models.dart

export interface EventClubInfo {
  id?: string;
  name?: string;
  logoUrl?: string | null;
  upiId?: string | null;
}

export interface EventModel {
  id: string;
  title: string;
  venue: string;
  imageUrl?: string | null;
  category: string;
  price: number;
  description?: string | null;
  date?: string | null;
  qrUrl?: string | null;
  eventType?: string | null;
  teamSizeLimit?: number | null;
  minTeamSize?: number | null;
  upiId?: string | null;
  clubId?: string | null;
  clubName?: string | null;
  clubLogoUrl?: string | null;
  registrationCount: number;
  registrationLimit?: number | null;
  registrationDeadline?: Date | null;
  eventDate?: Date | null;
  eventEndDate?: Date | null;
}

// Computed helpers — ported from Dart getters
export function getEventStartDate(event: EventModel): Date | null {
  if (event.eventDate) return event.eventDate;
  if (!event.date) return null;
  return parseDate(event.date);
}

export function getEventEndDate(event: EventModel): Date | null {
  if (event.eventEndDate) return event.eventEndDate;
  const start = getEventStartDate(event);
  if (!start) return null;
  return new Date(start.getTime() + 3 * 60 * 60 * 1000);
}

export function isEventLive(event: EventModel): boolean {
  const start = getEventStartDate(event);
  const end = getEventEndDate(event);
  if (!start || !end) return false;
  const now = new Date();
  return now >= start && now <= end;
}

export function isEventUpcoming(event: EventModel): boolean {
  const end = getEventEndDate(event);
  if (!end) return true;
  return new Date() < end;
}

export function isEventPast(event: EventModel): boolean {
  const end = getEventEndDate(event);
  if (!end) return false;
  return new Date() > end;
}

export function isEventFull(event: EventModel): boolean {
  if (!event.registrationLimit || event.registrationLimit <= 0) return false;
  return event.registrationCount >= event.registrationLimit;
}

export function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const [, year, month, day, hour = '0', min = '0', sec = '0'] = match;
    return new Date(
      parseInt(year), parseInt(month) - 1, parseInt(day),
      parseInt(hour), parseInt(min), parseInt(sec)
    );
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function eventFromJson(json: Record<string, unknown>): EventModel {
  const club = json['club'] as Record<string, unknown> | null;
  let category = (json['category'] ?? 'Other') as string;
  if (category === 'Individual') category = 'Solo';
  let eventType = (json['eventType'] ?? json['event_type'] ?? null) as string | null;
  if (eventType === 'Individual') eventType = 'Solo';

  return {
    id: json['id'] as string,
    title: (json['title'] ?? 'No Title') as string,
    venue: (json['venue'] ?? 'No Venue') as string,
    imageUrl: (json['bannerUrl'] ?? json['banner_url'] ?? json['image_url'] ?? json['imageUrl'] ?? null) as string | null,
    category,
    price: ((json['price'] ?? 0) as number),
    description: (json['description'] ?? null) as string | null,
    date: (json['date'] ?? null) as string | null,
    qrUrl: (json['qrUrl'] ?? json['qr_url'] ?? null) as string | null,
    eventType,
    minTeamSize: (json['minTeamSize'] ?? json['min_team_size'] ?? (eventType === 'Team' ? 1 : null)) as number | null,
    teamSizeLimit: (json['teamSizeLimit'] ?? json['team_size_limit'] ?? null) as number | null,
    upiId: (json['upiId'] ?? json['upi_id'] ?? club?.['upiId'] ?? club?.['upi_id'] ?? null) as string | null,
    clubId: (club?.['id'] ?? null) as string | null,
    clubName: (club?.['name'] ?? null) as string | null,
    clubLogoUrl: (club?.['logoUrl'] ?? club?.['logo_url'] ?? club?.['logo'] ?? json['clubLogoUrl'] ?? json['club_logo_url'] ?? null) as string | null,
    registrationCount: (json['registrationCount'] ?? json['registration_count'] ?? 0) as number,
    registrationLimit: (json['registrationLimit'] ?? json['registration_limit'] ?? null) as number | null,
    registrationDeadline: parseDate(json['registration_deadline'] ?? json['registrationDeadline']),
    eventDate: parseDate(json['eventDate'] ?? json['event_date'] ?? json['date']),
    eventEndDate: parseDate(json['eventEndDate'] ?? json['event_end_date']),
  };
}

// Ticket types
export interface TicketEventInfo {
  id: string;
  title: string;
  venue: string;
  date?: string | null;
  price: number;
  qrUrl?: string | null;
  upiId?: string | null;
  teamSizeLimit?: number | null;
  minTeamSize?: number | null;
  clubId?: string | null;
  clubName?: string | null;
  clubLogoUrl?: string | null;
  imageUrl?: string | null;
  eventDate?: Date | null;
  eventEndDate?: Date | null;
}

export interface TicketTeamMember {
  id: string;
  name: string;
  isLeader: boolean;
  status: string;
}

export interface TicketTeamInfo {
  id: string;
  name: string;
  passkey: string;
  leaderId: string;
  members: TicketTeamMember[];
}

export interface TicketModel {
  id: string;
  status: string;
  paymentProofUrl?: string | null;
  transactionId?: string | null;
  createdAt?: Date | null;
  event?: TicketEventInfo | null;
  team?: TicketTeamInfo | null;
}

export function ticketEventInfoFromJson(json: Record<string, unknown>): TicketEventInfo {
  const club = json['club'] as Record<string, unknown> | null;
  return {
    id: (json['id'] ?? '') as string,
    title: (json['title'] ?? 'No Title') as string,
    venue: (json['venue'] ?? 'TBD') as string,
    date: (json['date'] ?? null) as string | null,
    price: ((json['price'] ?? 0) as number),
    qrUrl: (json['qr_url'] ?? json['qrUrl'] ?? null) as string | null,
    upiId: (json['upi_id'] ?? json['upiId'] ?? club?.['upiId'] ?? club?.['upi_id'] ?? null) as string | null,
    teamSizeLimit: (json['team_size_limit'] ?? json['teamSizeLimit'] ?? null) as number | null,
    minTeamSize: ((json['min_team_size'] ?? json['minTeamSize'] ?? 1) as number),
    clubId: (club?.['id'] ?? null) as string | null,
    clubName: (club?.['name'] ?? null) as string | null,
    clubLogoUrl: (club?.['logoUrl'] ?? club?.['logo_url'] ?? null) as string | null,
    imageUrl: (json['bannerUrl'] ?? json['banner_url'] ?? json['image_url'] ?? json['imageUrl'] ?? null) as string | null,
    eventDate: parseDate(json['eventDate'] ?? json['event_date'] ?? json['date']),
    eventEndDate: parseDate(json['eventEndDate'] ?? json['event_end_date']),
  };
}

export function ticketTeamInfoFromJson(json: Record<string, unknown>): TicketTeamInfo {
  return {
    id: (json['id'] ?? '') as string,
    name: (json['name'] ?? '') as string,
    passkey: (json['passkey'] ?? '') as string,
    leaderId: (json['leaderId'] ?? '') as string,
    members: ((json['members'] as unknown[]) ?? []).map((m) => {
      const member = m as Record<string, unknown>;
      return {
        id: (member['id'] ?? '') as string,
        name: (member['name'] ?? '') as string,
        isLeader: (member['isLeader'] ?? false) as boolean,
        status: (member['status'] ?? 'PENDING') as string,
      };
    }),
  };
}

export function ticketFromJson(json: Record<string, unknown>): TicketModel {
  return {
    id: (json['id'] ?? '') as string,
    status: (json['status'] ?? 'pending') as string,
    paymentProofUrl: (json['payment_proof_url'] ?? null) as string | null,
    transactionId: (json['transaction_id'] ?? json['transactionId'] ?? null) as string | null,
    createdAt: json['created_at'] ? new Date(json['created_at'] as string) : null,
    event: json['event'] ? ticketEventInfoFromJson(json['event'] as Record<string, unknown>) : null,
    team: json['team'] ? ticketTeamInfoFromJson(json['team'] as Record<string, unknown>) : null,
  };
}

export function isTicketUpcoming(ticket: TicketModel): boolean {
  if (!ticket.event?.eventDate) return true;
  const end = ticket.event.eventEndDate
    ? ticket.event.eventEndDate
    : new Date(ticket.event.eventDate.getTime() + 3 * 60 * 60 * 1000);
  return new Date() < end;
}

export function isTicketConfirmed(ticket: TicketModel): boolean {
  return ticket.status.toUpperCase() === 'CONFIRMED';
}

export function ticketHasPaid(ticket: TicketModel): boolean {
  return !!(ticket.transactionId?.trim()) || !!(ticket.paymentProofUrl?.trim());
}
