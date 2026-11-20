import crypto from 'crypto';
import { Club } from '@prisma/client';
import { prisma } from '../config/db';
import { uploadBase64Image } from './storage';
import { getClubSignupAlertEmails } from './settings';
import { sendClubSignupAlert } from './mailer';

/** The details a club fills in on the sign-up page. */
export interface ClubApplicationDetails {
  name: string;
  description: string;
  department: string;
  coordinatorName: string;
  coordinatorPhone: string;
  logoUrl?: string | null;
}

/** A sign-up the API refuses, with the message to show. */
export class ClubApplicationError extends Error {}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Reads and checks the sign-up details from a request body; throws ClubApplicationError if any are missing. */
export function readApplicationDetails(body: any): ClubApplicationDetails {
  const details = {
    name: clean(body?.name),
    description: clean(body?.description),
    department: clean(body?.department),
    coordinatorName: clean(body?.coordinatorName),
    coordinatorPhone: clean(body?.coordinatorPhone),
    logoUrl: typeof body?.logoUrl === 'string' && body.logoUrl ? body.logoUrl : null,
  };
  const missing = ([
    ['club name', details.name],
    ['department', details.department],
    ['description', details.description],
    ['coordinator name', details.coordinatorName],
    ['coordinator phone', details.coordinatorPhone],
  ] as const).filter(([, value]) => !value).map(([label]) => label);
  if (missing.length > 0) {
    throw new ClubApplicationError(`Please fill in the ${missing.join(', ')}.`);
  }
  if (details.name.length > 120) throw new ClubApplicationError('Club name is too long.');
  if (details.description.length > 2000) throw new ClubApplicationError('Description must be under 2000 characters.');
  const digits = details.coordinatorPhone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) {
    throw new ClubApplicationError('Please enter a valid coordinator phone number.');
  }
  return details;
}

/**
 * Files a club sign-up as PENDING for the admin to review. A new email creates the club and its
 * club-admin profile; an email whose earlier sign-up was rejected re-applies with the new details.
 * An email that already belongs to a pending or approved club, or to any other account, is refused,
 * so a sign-up can never reset an existing club's password or take over someone's account.
 */
export async function submitClubApplication(input: {
  email: string;
  passwordHash: string | null;
  details: ClubApplicationDetails;
  /** Profile id for a new club-admin profile (Google sign-ups pass their google_ id). */
  profileId?: string;
}): Promise<Club> {
  const email = input.email.trim().toLowerCase();
  const { details } = input;

  const [existingClub, existingProfile] = await Promise.all([
    prisma.club.findUnique({ where: { email } }),
    prisma.profile.findUnique({ where: { email } }),
  ]);

  if (existingClub && existingClub.status === 'PENDING') {
    throw new ClubApplicationError('A registration for this email is already awaiting admin approval.');
  }
  if (existingClub && existingClub.status === 'APPROVED') {
    throw new ClubApplicationError('This email address is already registered to a club. Please sign in instead.');
  }
  if (!existingClub && existingProfile) {
    throw new ClubApplicationError(existingProfile.clubId === null
      ? 'This email address is already registered to a student account. Please use a different email for the club.'
      : 'This email address is already registered to another account.');
  }
  if (existingClub && existingProfile && existingProfile.clubId !== existingClub.id) {
    throw new ClubApplicationError('This email address is already registered to another account.');
  }

  const logoUrl = details.logoUrl ? await uploadBase64Image(details.logoUrl, 'clubs/logos') : null;

  const clubData = {
    name: details.name,
    description: details.description,
    department: details.department,
    coordinatorName: details.coordinatorName,
    coordinatorPhone: details.coordinatorPhone,
    status: 'PENDING' as const,
    rejectionReason: null,
    reviewedAt: null,
  };

  try {
    const club = await saveApplication();
    // Let the admins know a club is waiting for approval. In the background: the club's sign-up
    // doesn't wait for (or fail because of) these emails.
    void alertAdmins(club, Boolean(existingClub));
    return club;
  } catch (err: any) {
    // Two sign-ups with the same email at the same moment: the second hits the unique email index
    if (err?.code === 'P2002') {
      throw new ClubApplicationError('This email address is already registered.');
    }
    throw err;
  }

  async function saveApplication(): Promise<Club> {
    // Re-application after a rejection: same club row, fresh details, back in the queue
    if (existingClub) {
      return prisma.$transaction(async (tx) => {
        const club = await tx.club.update({
          where: { id: existingClub.id },
          data: {
            ...clubData,
            createdAt: new Date(),
            ...(logoUrl && { logoUrl }),
            ...(input.passwordHash && { password: input.passwordHash }),
          },
        });
        if (existingProfile) {
          await tx.profile.update({
            where: { id: existingProfile.id },
            data: { fullName: details.name, ...(input.passwordHash && { password: input.passwordHash }) },
          });
        } else {
          await tx.profile.create({
            data: {
              id: input.profileId || `user_${crypto.randomBytes(6).toString('hex')}`,
              fullName: details.name,
              email,
              password: input.passwordHash,
              clubId: club.id,
            },
          });
        }
        return club;
      });
    }

    return prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: { ...clubData, email, logoUrl, password: input.passwordHash },
      });
      await tx.profile.create({
        data: {
          id: input.profileId || `user_${crypto.randomBytes(6).toString('hex')}`,
          fullName: details.name,
          email,
          password: input.passwordHash,
          clubId: club.id,
        },
      });
      return club;
    });
  }
}

/** Emails the sign-up alert list about a club waiting for approval. Never throws. */
async function alertAdmins(club: Club, reapplied: boolean): Promise<void> {
  try {
    const recipients = await getClubSignupAlertEmails();
    if (recipients.length === 0) {
      console.warn('[Mail] No sign-up alert emails set; nobody was told about the new club', club.email);
      return;
    }
    await sendClubSignupAlert(recipients, club, reapplied);
  } catch (err: any) {
    console.error('[Mail] Club sign-up alert failed:', err.message);
  }
}
