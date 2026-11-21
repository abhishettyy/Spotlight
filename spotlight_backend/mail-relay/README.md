# Mail relay (Google Apps Script)

`Code.gs` is a small Google Apps Script web app that sends Spotlight's emails (club approval, new-club
alerts to the admins, password reset codes) from the Spotlight Gmail account. The backend posts to it,
which works even on hosts that block SMTP (such as Render's free plan).

## Setup (once, signed in as the Spotlight Gmail account)

1. Go to **script.google.com → New project**, paste `Code.gs` over the default file and save.
2. **Project Settings (gear) → Script properties → Add property:**
   `RELAY_SECRET` = a long random string. Put the same value in the backend as `MAIL_RELAY_SECRET`.
3. **Deploy → New deployment**, type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Authorize when asked (Advanced → Go to project → Allow).
4. Copy the Web app URL (ends in `/exec`) into the backend as `MAIL_RELAY_URL`.

After editing `Code.gs` later: **Deploy → Manage deployments → Edit → Version: New version**, so the URL stays the same.

If the relay isn't set, the backend falls back to Brevo (`BREVO_API_KEY`) or SMTP (`SMTP_USER` + `SMTP_PASS`).
