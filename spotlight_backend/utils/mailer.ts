import nodemailer, { Transporter } from 'nodemailer';

// Outgoing mail, used only to tell a club its registration was approved. Two ways to send:
//  - BREVO_API_KEY: Brevo's HTTPS API. Works on hosts that block mail ports (e.g. Render's free plan).
//    The sender (MAIL_FROM_EMAIL) must be verified in Brevo under Senders.
//  - SMTP_USER + SMTP_PASS: plain SMTP, e.g. Gmail with an App Password (not the account password).
// Brevo is used when its key is set. With neither, mail is skipped and the approval still goes through.

const DEFAULT_SENDER = 'spotlightapp.help@gmail.com';

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
      connectionTimeout: 15000,
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

interface Mail {
  to: string;
  toName: string;
  subject: string;
  text: string;
  html: string;
}

async function sendWithBrevo(apiKey: string, mail: Mail): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: {
        name: process.env.MAIL_FROM_NAME || 'Spotlight',
        email: process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || DEFAULT_SENDER,
      },
      to: [{ email: mail.to, name: mail.toName }],
      subject: mail.subject,
      textContent: mail.text,
      htmlContent: mail.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo answered ${res.status}: ${body.slice(0, 300)}`);
  }
}

async function sendWithSmtp(mailer: Transporter, mail: Mail): Promise<void> {
  await mailer.sendMail({
    from: process.env.MAIL_FROM || `Spotlight <${process.env.SMTP_USER}>`,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

/** Emails the club that it can now sign in. Returns whether the mail was sent; never throws. */
export async function sendClubApprovedEmail(club: { name: string; email: string }): Promise<boolean> {
  const brevoKey = process.env.BREVO_API_KEY;
  const mailer = brevoKey ? null : getTransporter();
  if (!brevoKey && !mailer) {
    console.warn('[Mail] No mail service configured (BREVO_API_KEY, or SMTP_USER and SMTP_PASS); approval email not sent to', club.email);
    return false;
  }

  const loginUrl = process.env.CLUB_LOGIN_URL || 'https://spotlight.msritise.in/?view=auth&authTab=login';
  const name = escapeHtml(club.name);
  const mail: Mail = {
    to: club.email,
    toName: club.name,
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
  };

  try {
    if (brevoKey) await sendWithBrevo(brevoKey, mail);
    else await sendWithSmtp(mailer!, mail);
    console.log(`[Mail] Approval email sent to ${club.email} via ${brevoKey ? 'Brevo' : 'SMTP'}`);
    return true;
  } catch (err: any) {
    console.error(`[Mail] Could not send approval email to ${club.email} via ${brevoKey ? 'Brevo' : 'SMTP'}:`, err.message);
    return false;
  }
}
