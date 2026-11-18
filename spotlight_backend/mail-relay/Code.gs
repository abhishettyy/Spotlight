/**
 * Spotlight mail relay: Google Apps Script web app.
 *
 * Runs inside the spotlightapp.help@gmail.com Google account and sends mail with that account's Gmail.
 * The Spotlight backend POSTs here when the admin approves a club, so the email goes out from the
 * admin Gmail even though Render's free plan blocks SMTP.
 *
 * Setup (once, signed in as spotlightapp.help@gmail.com):
 *  1. script.google.com > New project. Paste this file over Code.gs and save.
 *  2. Project Settings (gear) > Script properties > Add property:
 *       RELAY_SECRET = a long random string (the same value goes in Render as MAIL_RELAY_SECRET).
 *  3. Deploy > New deployment > type "Web app":
 *       Execute as: Me    Who has access: Anyone
 *     Authorize when asked (Advanced > Go to project > Allow).
 *  4. Copy the Web app URL (ends in /exec) into Render as MAIL_RELAY_URL.
 * After editing this file later: Deploy > Manage deployments > Edit > Version: New version, so the URL stays the same.
 */

var MAX_SUBJECT = 200;
var MAX_BODY = 20000;

function doPost(e) {
  try {
    var secret = PropertiesService.getScriptProperties().getProperty('RELAY_SECRET');
    if (!secret) return reply_(false, 'RELAY_SECRET is not set in Script properties');

    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.secret !== secret) return reply_(false, 'unauthorized');

    var to = String(data.to || '').trim();
    var subject = String(data.subject || '').trim();
    var text = String(data.text || '');
    var html = String(data.html || '');

    if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to)) return reply_(false, 'invalid recipient');
    if (!subject || subject.length > MAX_SUBJECT) return reply_(false, 'invalid subject');
    if (!text || text.length > MAX_BODY || html.length > MAX_BODY) return reply_(false, 'invalid body');

    var options = { name: String(data.fromName || 'Spotlight').slice(0, 80) };
    if (html) options.htmlBody = html;
    GmailApp.sendEmail(to, subject, text, options);

    return reply_(true);
  } catch (err) {
    return reply_(false, String(err && err.message ? err.message : err));
  }
}

/** Opening the URL in a browser just shows that the relay is deployed. */
function doGet() {
  return reply_(true, 'Spotlight mail relay is running');
}

function reply_(ok, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, message: message || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}
