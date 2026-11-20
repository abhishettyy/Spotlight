import { prisma } from '../config/db';

/** Emails told about each new club sign-up, so an admin can review it. Edited in the admin console. */
export const CLUB_SIGNUP_ALERT_KEY = 'club_signup_alert_emails';
export const MAX_ALERT_EMAILS = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The saved alert emails. Before the admin saves any, falls back to the ADMIN_ALERT_EMAILS
 * environment variable (comma-separated), so a fresh setup can still be alerted.
 */
export async function getClubSignupAlertEmails(): Promise<string[]> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: CLUB_SIGNUP_ALERT_KEY } });
    if (row) {
      const list = JSON.parse(row.value);
      if (Array.isArray(list)) return list.filter((e): e is string => typeof e === 'string' && EMAIL_RE.test(e));
    }
  } catch (err: any) {
    console.error('[Settings] Could not read the sign-up alert emails:', err.message);
  }
  return (process.env.ADMIN_ALERT_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_RE.test(e));
}

/** Checks and tidies a list sent from the admin console. Returns an error message or the clean list. */
export function cleanAlertEmails(input: unknown): { emails: string[] } | { error: string } {
  if (!Array.isArray(input)) return { error: 'Send a list of email addresses.' };
  const emails: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') return { error: 'Every entry must be an email address.' };
    const e = raw.trim().toLowerCase();
    if (!e) continue;
    if (!EMAIL_RE.test(e)) return { error: `"${raw.trim()}" is not a valid email address.` };
    if (!emails.includes(e)) emails.push(e);
  }
  if (emails.length > MAX_ALERT_EMAILS) return { error: `Add at most ${MAX_ALERT_EMAILS} email addresses.` };
  return { emails };
}

export async function saveClubSignupAlertEmails(emails: string[]): Promise<void> {
  const value = JSON.stringify(emails);
  await prisma.appSetting.upsert({
    where: { key: CLUB_SIGNUP_ALERT_KEY },
    create: { key: CLUB_SIGNUP_ALERT_KEY, value },
    update: { value },
  });
}
