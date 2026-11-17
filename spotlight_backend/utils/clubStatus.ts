import { ClubStatus } from '@prisma/client';

/**
 * Why a club can't sign in yet, or null once it is approved. Sign-in answers 403 with this message,
 * and `code` lets the dashboard show the matching screen.
 */
export function clubSignInBlock(club: { status: ClubStatus; rejectionReason: string | null }):
  { code: 'CLUB_PENDING' | 'CLUB_REJECTED'; error: string } | null {
  if (club.status === 'PENDING') {
    return {
      code: 'CLUB_PENDING',
      error: 'Your club registration is awaiting admin approval. You will get an email once it is approved.',
    };
  }
  if (club.status === 'REJECTED') {
    const reason = club.rejectionReason?.trim();
    return {
      code: 'CLUB_REJECTED',
      error: `Your club registration was not approved${reason ? `: ${reason}` : '.'} You can sign up again with updated details.`,
    };
  }
  return null;
}
