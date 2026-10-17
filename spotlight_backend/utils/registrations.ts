import { Registration, Profile, Team } from '@prisma/client';

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
