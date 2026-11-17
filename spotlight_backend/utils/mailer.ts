import nodemailer, { Transporter } from 'nodemailer';

// Outgoing mail, used only to tell a club its registration was approved.
// Configure SMTP_USER and SMTP_PASS (for Gmail, an App Password, not the account password).
// Without them, mail is skipped and the approval still goes through.

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Emails the club that it can now sign in. Returns whether the mail was sent; never throws. */
export async function sendClubApprovedEmail(club: { name: string; email: string }): Promise<boolean> {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn('[Mail] SMTP_USER / SMTP_PASS not set; approval email not sent to', club.email);
    return false;
  }

  const loginUrl = process.env.CLUB_LOGIN_URL || 'https://spotlight.msritise.in/?view=auth&authTab=login';
  const from = process.env.MAIL_FROM || `Spotlight <${process.env.SMTP_USER}>`;
  const name = escapeHtml(club.name);

  try {
    await mailer.sendMail({
      from,
      to: club.email,
      subject: 'Your club is approved on Spotlight',
      text:
        `Hi ${club.name},\n\n` +
        `Your club registration on Spotlight has been approved. You can now sign in to your club dashboard ` +
        `with the email and password (or Google account) you registered with:\n\n${loginUrl}\n\n` +
        `- Team Spotlight`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111">
          <h2 style="margin:0 0 16px">Your club is approved</h2>
          <p>Hi ${name},</p>
          <p>Your club registration on Spotlight has been approved. You can now sign in to your club dashboard
             with the email and password (or Google account) you registered with.</p>
          <p style="margin:28px 0">
            <a href="${escapeHtml(loginUrl)}" style="background:#10B981;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Sign in to Spotlight</a>
          </p>
          <p style="color:#666;font-size:13px">- Team Spotlight</p>
        </div>`,
    });
    console.log(`[Mail] Approval email sent to ${club.email}`);
    return true;
  } catch (err: any) {
    console.error(`[Mail] Could not send approval email to ${club.email}:`, err.message);
    return false;
  }
}
