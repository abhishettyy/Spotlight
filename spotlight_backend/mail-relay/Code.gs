
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

function doGet() {
  return reply_(true, 'Spotlight mail relay is running');
}

function reply_(ok, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, message: message || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}
