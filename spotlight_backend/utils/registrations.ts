import { Registration, Profile, Team, Prisma } from '@prisma/client';

const ACTIVE_STATUSES: Array<'PENDING' | 'CONFIRMED'> = ['PENDING', 'CONFIRMED'];

/**
 * Places taken at an event, which is what venue capacity limits: each solo registration is one
 * place and each team is one place, however many members it has. Rejected registrations free
 * their place; a team stops counting once none of its members is pending or confirmed.
 */
export async function countTakenPlaces(db: Prisma.TransactionClient, eventId: string): Promise<number> {
  const solo = await db.registration.count({
    where: { eventId, teamId: null, status: { in: ACTIVE_STATUSES } },
  });
  const teams = await db.team.count({
    where: { eventId, registrations: { some: { status: { in: ACTIVE_STATUSES } } } },
  });
  return solo + teams;
}

/** The same count for many events at once, from their pending and confirmed registrations. */
export function placesByEvent(rows: Array<{ eventId: string; teamId: string | null }>): Map<string, number> {
  const solo = new Map<string, number>();
  const teams = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.teamId === null) solo.set(r.eventId, (solo.get(r.eventId) ?? 0) + 1);
    else {
      if (!teams.has(r.eventId)) teams.set(r.eventId, new Set());
      teams.get(r.eventId)!.add(r.teamId);
    }
  }
  const places = new Map<string, number>();
  for (const id of new Set([...solo.keys(), ...teams.keys()])) {
    places.set(id, (solo.get(id) ?? 0) + (teams.get(id)?.size ?? 0));
  }
  return places;
}

export { ACTIVE_STATUSES };

type RegistrationWithEventFee = Registration & { event: { fee: number } };

/**
 * Registrations a club should see. Unpaid registrations for paid events stay hidden until the
 * student (or their team) submits payment details. Team ids are per event, so this gives the same
 * result for one event's registrations or for a whole club's.
 */
export function filterVisibleRegistrations<T extends RegistrationWithEventFee>(registrations: T[]): T[] {
  const teamIdsWithPayment = new Set(
    registrations.filter(r => r.teamId && r.transactionId !== null).map(r => r.teamId)
  );
  const confirmedTeamIds = new Set(
    registrations.filter(r => r.teamId && r.status === 'CONFIRMED').map(r => r.teamId)
  );

  return registrations.filter(r => {
    if (r.event.fee === 0) return true;
    if (r.status === 'CONFIRMED' || r.status === 'REJECTED') return true;
    if (r.transactionId !== null) return true;
    if (r.teamId && teamIdsWithPayment.has(r.teamId)) return true;
    if (r.teamId && confirmedTeamIds.has(r.teamId)) return true;
    return false;
  });
}

/** Shape the club dashboard expects for a registration row. */
export function mapClubRegistration(r: Registration & { profile: Profile | null; team: Team | null }) {
  return {
    id: r.id,
    status: r.status,
    checkedInAt: r.checkedInAt,
    payment_proof_url: r.paymentProofUrl,
    transaction_id: r.transactionId,
    created_at: r.createdAt,
    user: r.profile ? {
      id: r.profile.id,
      name: r.profile.fullName,
      email: r.profile.email,
      usn: r.profile.usn,
      branch: r.profile.branch,
      phone: r.profile.phone,
      year: r.profile.year,
      sem: r.profile.sem,
    } : null,
    team: r.team ? {
      id: r.team.id,
      name: r.team.teamName,
      passkey: r.team.passkey,
      leaderId: r.team.leaderId,
    } : null,
  };
}
