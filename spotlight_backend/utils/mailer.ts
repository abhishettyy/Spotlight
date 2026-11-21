import nodemailer, { Transporter } from 'nodemailer';


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

async function sendWithRelay(url: string, secret: string, mail: Mail): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      fromName: process.env.MAIL_FROM_NAME || 'Spotlight',
    }),
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.text().catch(() => '');
  let result: { ok?: boolean; message?: string } = {};
  try { result = JSON.parse(body); } catch {}
  if (!res.ok || result.ok !== true) {
    throw new Error(`Mail relay answered ${res.status}: ${result.message || body.slice(0, 200)}`);
  }
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

async function deliverMail(mail: Mail, what: string): Promise<boolean> {
  const relayUrl = process.env.MAIL_RELAY_URL;
  const relaySecret = process.env.MAIL_RELAY_SECRET;
  const useRelay = Boolean(relayUrl && relaySecret);
  const brevoKey = useRelay ? undefined : process.env.BREVO_API_KEY;
  const mailer = useRelay || brevoKey ? null : getTransporter();
  const via = useRelay ? 'Gmail relay' : brevoKey ? 'Brevo' : 'SMTP';
  if (!useRelay && !brevoKey && !mailer) {
    console.warn(`[Mail] No mail service configured (MAIL_RELAY_URL + MAIL_RELAY_SECRET, BREVO_API_KEY, or SMTP_USER + SMTP_PASS); ${what} not sent to`, mail.to);
    return false;
  }
  try {
    if (useRelay) await sendWithRelay(relayUrl!, relaySecret!, mail);
    else if (brevoKey) await sendWithBrevo(brevoKey, mail);
    else await sendWithSmtp(mailer!, mail);
    console.log(`[Mail] ${what} sent to ${mail.to} via ${via}`);
    return true;
  } catch (err: any) {
    console.error(`[Mail] Could not send ${what} to ${mail.to} via ${via}:`, err.message);
    return false;
  }
}

export async function sendClubApprovedEmail(club: { name: string; email: string }): Promise<boolean> {
  const name = escapeHtml(club.name);
  return deliverMail({
    to: club.email,
    toName: club.name,
    subject: 'Your club is approved on Spotlight',
    text:
      `Hi ${club.name},

` +
      `Your club registration on Spotlight has been approved. You can now sign in to your club dashboard ` +
      `with the email and password (or Google account) you registered with.

` +
      `- Team Spotlight`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="margin:0 0 16px">Your club is approved</h2>
        <p>Hi ${name},</p>
        <p>Your club registration on Spotlight has been approved. You can now sign in to your club dashboard
           with the email and password (or Google account) you registered with.</p>
        <p style="color:#666;font-size:13px">- Team Spotlight</p>
      </div>`,
  }, 'Approval email');
}

export async function sendPasswordResetCode(to: { email: string; name: string }, code: string, minutes: number): Promise<boolean> {
  const name = escapeHtml(to.name);
  return deliverMail({
    to: to.email,
    toName: to.name,
    subject: `${code} is your Spotlight password reset code`,
    text:
      `Hi ${to.name},

` +
      `Your Spotlight password reset code is: ${code}

` +
      `It expires in ${minutes} minutes and can be used once. If you didn't ask to reset your password, ` +
      `you can ignore this email; your password stays the same.

- Team Spotlight`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="margin:0 0 16px">Reset your password</h2>
        <p>Hi ${name},</p>
        <p>Use this code to reset your Spotlight password:</p>
        <p style="margin:24px 0;font-size:32px;font-weight:700;letter-spacing:8px;color:#e63946">${code}</p>
        <p>It expires in ${minutes} minutes and can be used once.</p>
        <p style="color:#666;font-size:13px">If you didn't ask to reset your password, you can ignore this email; your password stays the same.</p>
        <p style="color:#666;font-size:13px">- Team Spotlight</p>
      </div>`,
  }, 'Password reset code');
}

export async function sendPasswordChangedEmail(to: { email: string; name: string }, kind: 'club' | 'student' | 'admin'): Promise<boolean> {
  const name = escapeHtml(to.name);
  const what = kind === 'club' ? 'club login password' : kind === 'admin' ? 'admin login password' : 'login password';
  const when = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  return deliverMail({
    to: to.email,
    toName: to.name,
    subject: `Your ${what} has been changed`,
    text:
      `Hi ${to.name},\n\n` +
      `Your ${what} (${to.email}) has been changed on ${when} IST. ` +
      `You can now sign in with your new password.\n\n` +
      `If you didn't do this, reset your password again right away from the sign-in page using ` +
      `"Forgot password?", and contact us at spotlightapp.help@gmail.com.\n\n- Team Spotlight`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="margin:0 0 16px">Your ${what} has been changed</h2>
        <p>Hi ${name},</p>
        <p>Your ${what} (<strong>${escapeHtml(to.email)}</strong>) has been changed on
           ${escapeHtml(when)} IST. You can now sign in with your new password.</p>
        <p style="margin:20px 0;padding:12px 14px;border-radius:10px;background:#fdecee;color:#9f1c28;font-size:14px">
          If you didn't do this, reset your password again right away from the sign-in page using
          <strong>Forgot password?</strong>, and contact us at
          <a href="mailto:spotlightapp.help@gmail.com" style="color:#9f1c28">spotlightapp.help@gmail.com</a>.
        </p>
        <p style="color:#666;font-size:13px">- Team Spotlight</p>
      </div>`,
  }, 'Password changed email');
}

export async function sendClubSignupAlert(
  recipients: string[],
  club: { name: string; email: string; department?: string | null; coordinatorName?: string | null; coordinatorPhone?: string | null },
  reapplied: boolean,
): Promise<number> {
  if (recipients.length === 0) return 0;
  const rows: Array<[string, string | null | undefined]> = [
    ['Club', club.name],
    ['Email', club.email],
    ['Department', club.department],
    ['Coordinator', club.coordinatorName],
    ['Phone', club.coordinatorPhone],
  ];
  const heading = reapplied ? 'A club has applied again' : 'New club waiting for approval';
  const text =
    `${heading}\n\n` +
    rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nYou can approve or reject it from the Spotlight admin console.\n\n- Spotlight`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="margin:0 0 16px">${escapeHtml(heading)}</h2>
      <table style="border-collapse:collapse;font-size:14px;margin-bottom:24px">
        ${rows.filter(([, v]) => v).map(([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#666">${k}</td><td style="padding:4px 0"><strong>${escapeHtml(String(v))}</strong></td></tr>`).join('')}
      </table>
      <p style="margin:0 0 24px">You can approve or reject it from the Spotlight admin console.</p>
      <p style="color:#666;font-size:13px">You're getting this because your email is on the Spotlight sign-up alert list. The admin can change the list in the admin console.</p>
    </div>`;

  let sent = 0;
  for (const to of recipients) {
    const ok = await deliverMail({ to, toName: 'Spotlight admin', subject: `Approval needed: ${club.name} signed up on Spotlight`, text, html }, 'Club sign-up alert');
    if (ok) sent++;
  }
  return sent;
}
