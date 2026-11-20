import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { JWT_SECRET } from '../middlewares/auth';
import { ADMIN_PROFILE_ID } from './admin';
import { sendPasswordResetCode, sendPasswordChangedEmail } from './mailer';

/** How long a code works, and how many wrong tries it allows before it's thrown away. */
export const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/** Requests allowed per hour: per email (so nobody can flood an inbox) and per visitor IP. */
const PER_EMAIL_PER_HOUR = 3;
const PER_IP_PER_HOUR = 10;
const HOUR = 60 * 60 * 1000;
const sentByEmail = new Map<string, number[]>();
const sentByIp = new Map<string, number[]>();

function underLimit(map: Map<string, number[]>, key: string, limit: number): boolean {
  const now = Date.now();
  const recent = (map.get(key) ?? []).filter((t) => now - t < HOUR);
  if (recent.length >= limit) {
    map.set(key, recent);
    return false;
  }
  recent.push(now);
  map.set(key, recent);
  return true;
}

/** Keyed hash of a code: the database never holds the code itself. */
function hashCode(email: string, code: string): string {
  return crypto.createHmac('sha256', JWT_SECRET).update(`${email}:${code}`).digest('hex');
}

/** Same rules as club sign-up, now for everyone who sets a password this way. */
export function passwordProblem(pass: unknown): string | null {
  if (typeof pass !== 'string') return 'Please enter a new password.';
  const missing: string[] = [];
  if (pass.length < 8) missing.push('at least 8 characters');
  if (!/[A-Z]/.test(pass)) missing.push('at least one uppercase letter');
  if (!/[0-9]/.test(pass)) missing.push('at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) missing.push('at least one special character');
  return missing.length ? `Password must contain ${missing.join(', ')}.` : null;
}

/**
 * The account a reset email belongs to: a club (club sign-in uses the club's password) or a
 * student. The admin is never reset this way; it has Google sign-in and Change Password.
 */
async function findAccount(email: string): Promise<{ kind: 'club'; clubId: string; name: string } | { kind: 'student'; profileId: string; name: string } | null> {
  const club = await prisma.club.findUnique({ where: { email } });
  if (club) return { kind: 'club', clubId: club.id, name: club.name };
  const profile = await prisma.profile.findFirst({
    where: { email, clubId: null, NOT: { id: ADMIN_PROFILE_ID } },
  });
  if (profile) return { kind: 'student', profileId: profile.id, name: profile.fullName || 'there' };
  return null;
}

export type ResetResult = { status: number; body: Record<string, unknown> };

/** Answer shown whether or not the email has an account, so the form can't reveal who is registered. */
const SENT_MESSAGE = "If an account exists for this email, we've sent a 6-digit code to it. Check your inbox and spam folder.";

export async function requestResetCode(rawEmail: unknown, ip: string): Promise<ResetResult> {
  if (typeof rawEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) {
    return { status: 400, body: { error: 'Please enter a valid email address.' } };
  }
  const email = rawEmail.trim().toLowerCase();

  if (!underLimit(sentByIp, ip, PER_IP_PER_HOUR) || !underLimit(sentByEmail, email, PER_EMAIL_PER_HOUR)) {
    return { status: 429, body: { error: 'Too many codes requested. Please wait an hour and try again.' } };
  }

  const account = await findAccount(email);
  if (!account) return { status: 200, body: { message: SENT_MESSAGE } };

  // A new code replaces any earlier one for this email
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60 * 1000);
  await prisma.passwordReset.upsert({
    where: { email },
    create: { email, codeHash: hashCode(email, code), expiresAt, attempts: 0 },
    update: { codeHash: hashCode(email, code), expiresAt, attempts: 0, createdAt: new Date() },
  });

  const sent = await sendPasswordResetCode({ email, name: account.name }, code, CODE_MINUTES);
  if (!sent) {
    return { status: 503, body: { error: "We couldn't send the email right now. Please try again in a few minutes." } };
  }
  return { status: 200, body: { message: SENT_MESSAGE } };
}

export async function resetPasswordWithCode(rawEmail: unknown, rawCode: unknown, newPassword: unknown): Promise<ResetResult> {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const code = typeof rawCode === 'string' ? rawCode.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) {
    return { status: 400, body: { error: 'Please enter the 6-digit code from the email.' } };
  }
  const problem = passwordProblem(newPassword);
  if (problem) return { status: 400, body: { error: problem } };

  const invalid: ResetResult = { status: 400, body: { error: 'This code is invalid or has expired. Please request a new one.' } };
  const reset = await prisma.passwordReset.findUnique({ where: { email } });
  if (!reset) return invalid;
  if (reset.expiresAt.getTime() < Date.now()) {
    await prisma.passwordReset.delete({ where: { email } }).catch(() => {});
    return invalid;
  }

  const expected = Buffer.from(reset.codeHash, 'hex');
  const given = Buffer.from(hashCode(email, code), 'hex');
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    const attempts = reset.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await prisma.passwordReset.delete({ where: { email } }).catch(() => {});
      return { status: 400, body: { error: 'Too many wrong codes. Please request a new one.' } };
    }
    await prisma.passwordReset.update({ where: { email }, data: { attempts } });
    const left = MAX_ATTEMPTS - attempts;
    return { status: 400, body: { error: `Incorrect code. ${left} ${left === 1 ? 'try' : 'tries'} left.` } };
  }

  const account = await findAccount(email);
  if (!account) {
    await prisma.passwordReset.delete({ where: { email } }).catch(() => {});
    return invalid;
  }

  // The new password replaces the old one; the code can't be used again
  const hash = await bcrypt.hash(newPassword as string, 10);
  await prisma.$transaction(async (tx) => {
    if (account.kind === 'club') {
      await tx.club.update({ where: { id: account.clubId }, data: { password: hash } });
      await tx.profile.updateMany({ where: { clubId: account.clubId }, data: { password: hash } });
    } else {
      await tx.profile.update({ where: { id: account.profileId }, data: { password: hash } });
    }
    await tx.passwordReset.delete({ where: { email } });
  });
  console.log(`[Auth] Password reset with an email code for ${email}`);
  // Confirmation email, sent in the background so the user isn't kept waiting. The reset has
  // already succeeded, so a mail failure is only logged (deliverMail never throws).
  void sendPasswordChangedEmail({ email, name: account.name }, account.kind);
  return { status: 200, body: { message: 'Your password has been reset. You can now sign in with your new password.' } };
}
