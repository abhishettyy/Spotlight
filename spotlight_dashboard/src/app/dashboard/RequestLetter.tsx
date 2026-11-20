import { useEffect, useMemo, useState } from "react";
import { FileText, X, Download, Sparkles } from "lucide-react";
import { fetchMyClub } from "../api";
import { FC, FM, FB, parseLocalDate, ClubEvent } from "./shared";

/**
 * Pre-event request letter (the college's permission template). Details Spotlight already has —
 * the event, the club and its coordinator — are filled in; the rest is asked. "Download PDF"
 * opens the browser's print dialog with the finished letter (choose "Save as PDF").
 */

type Field = { key: string; label: string; placeholder?: string; multiline?: boolean; half?: boolean; rows?: number };
type Section = { title: string; hint?: string; fields: Field[] };

// What the club is asked (event and club details are listed separately, as "From your event")
const ASKED: Section[] = [
  {
    title: "Letter",
    fields: [
      { key: "reference_no", label: "Reference No.", placeholder: "e.g. RIT/CLUB/2026/014", half: true },
      { key: "letter_date", label: "Letter Date", half: true },
      { key: "college_name", label: "College Name" },
      { key: "college_address", label: "College Address" },
      { key: "college_email", label: "College / Department Email", half: true },
      { key: "college_phone", label: "College / Department Phone", half: true },
    ],
  },
  {
    title: "To (Recipient)",
    fields: [
      { key: "recipient_name", label: "Recipient Name", placeholder: "e.g. Dr. A. B. Kumar" },
      { key: "recipient_designation", label: "Designation", placeholder: "e.g. Principal / Dean of Student Affairs", half: true },
      { key: "salutation_title", label: "Salutation", placeholder: "Sir / Madam", half: true },
      { key: "recipient_institution", label: "Institution / Office" },
    ],
  },
  {
    title: "From (Sender)",
    fields: [
      { key: "sender_name", label: "Sender Name", half: true },
      { key: "sender_designation", label: "Sender Designation", placeholder: "e.g. Club Coordinator", half: true },
      { key: "sender_contact", label: "Sender Contact", half: true },
      { key: "faculty_coordinator", label: "Faculty Coordinator", placeholder: "e.g. Prof. R. Sharma", half: true },
      { key: "hod_name", label: "Head of Department", placeholder: "e.g. Dr. S. Rao" },
    ],
  },
  {
    title: "About the Event",
    fields: [
      { key: "event_purpose_summary", label: "Purpose (one or two lines for the opening paragraph)", multiline: true, placeholder: "e.g. The event aims to give students hands-on experience with…" },
      { key: "guests_and_speakers", label: "Chief Guest / Speakers" },
    ],
  },
  {
    title: "Proposed Schedule",
    hint: "Leave a row empty to skip it.",
    fields: [
      { key: "time_1", label: "Time 1", placeholder: "10:00 AM", half: true }, { key: "activity_1", label: "Activity 1", half: true },
      { key: "incharge_1", label: "In-charge 1" },
      { key: "time_2", label: "Time 2", half: true }, { key: "activity_2", label: "Activity 2", half: true },
      { key: "incharge_2", label: "In-charge 2" },
      { key: "time_3", label: "Time 3", half: true }, { key: "activity_3", label: "Activity 3", half: true },
      { key: "incharge_3", label: "In-charge 3" },
    ],
  },
  {
    title: "Logistics and Requirements",
    fields: [
      { key: "logistics", label: "Describe what you need", multiline: true, rows: 6, placeholder: "e.g. Apex Auditorium from 11 AM, 120 chairs and a stage, projector and two mics, Wi-Fi for 30 laptops, water for participants, security at the entrance…" },
    ],
  },
  {
    title: "Budget and Permissions",
    fields: [
      { key: "budget_permissions", label: "Budget, funding and any other permissions", multiline: true, rows: 5, placeholder: "e.g. Estimated budget ₹15,000 from club funds. Permission to use the auditorium until 7 PM and to put up posters in the main block…" },
    ],
  },
  {
    title: "Closing",
    fields: [
      { key: "enclosures", label: "Enclosures", placeholder: "e.g. Event poster, schedule", half: true },
      { key: "copy_to", label: "Copy to", placeholder: "e.g. HOD, Security Office", half: true },
    ],
  },
];

// Filled from the event and the club (still editable)
const FROM_EVENT: Field[] = [
  { key: "event_title", label: "Event Name" },
  { key: "event_type", label: "Event Type", half: true },
  { key: "event_date", label: "Date", half: true },
  { key: "start_time", label: "Start Time", half: true },
  { key: "end_time", label: "End Time", half: true },
  { key: "venue", label: "Venue" },
  { key: "department_or_club_name", label: "Department / Club", half: true },
  { key: "organizer", label: "Organised By", half: true },
  { key: "student_coordinator", label: "Student Coordinator", half: true },
  { key: "coordinator_contact", label: "Coordinator Contact", half: true },
  { key: "expected_participants", label: "Expected Participants", half: true },
  { key: "expected_teams", label: "Expected Teams", half: true },
  { key: "event_description", label: "Event Description", multiline: true },
];
const EVENT_KEYS = new Set(FROM_EVENT.map(f => f.key));

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const fmtTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

function eventDefaults(ev: ClubEvent, club: { name?: string; department?: string | null; coordinatorName?: string | null; coordinatorPhone?: string | null } | null) {
  const start = parseLocalDate(ev.eventDate || ev.date);
  const end = parseLocalDate(ev.eventEndDate);
  const isTeam = ev.eventType === "Team" || ev.type === "Team";
  let date = start ? fmtDate(start) : "";
  if (start && end && end.toDateString() !== start.toDateString()) date = `${fmtDate(start)} to ${fmtDate(end)}`;
  const clubName = club?.name || ev.club || "";
  const maxTeam = ev.teamSizeLimit ?? null;
  return {
    event_title: ev.title || "",
    event_type: isTeam ? `Team event${maxTeam ? ` (up to ${maxTeam} members per team)` : ""}` : "Individual event",
    event_date: date,
    start_time: start ? fmtTime(start) : "",
    end_time: end ? fmtTime(end) : "",
    venue: ev.venue || "",
    department_or_club_name: club?.department ? `${clubName}, ${club.department}` : clubName,
    organizer: clubName,
    student_coordinator: club?.coordinatorName || "",
    coordinator_contact: club?.coordinatorPhone || "",
    expected_participants: ev.capacity
      ? (isTeam ? (maxTeam ? `Up to ${ev.capacity * maxTeam}` : "As per teams") : `Up to ${ev.capacity}`)
      : "",
    expected_teams: isTeam ? (ev.capacity ? `Up to ${ev.capacity}` : "") : "Not applicable",
    event_description: ev.description || "",
  } as Record<string, string>;
}

function askedDefaults(club: { name?: string; coordinatorName?: string | null; coordinatorPhone?: string | null } | null): Record<string, string> {
  return {
    letter_date: fmtDate(new Date()),
    college_name: "Ramaiah Institute of Technology",
    college_address: "MSR Nagar, MSRIT Post, Bengaluru 560054",
    recipient_institution: "Ramaiah Institute of Technology",
    salutation_title: "Sir/Madam",
    sender_name: club?.coordinatorName || "",
    sender_designation: "Student Coordinator",
    sender_contact: club?.coordinatorPhone || "",
  };
}

const storageKey = (eventId: string) => `spotlight_request_letter_${eventId}`;

// ── Printable letter ─────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildLetterHtml(v: Record<string, string>): string {
  const f = (k: string) => {
    const s = (v[k] ?? "").trim();
    return s ? esc(s).replace(/\n/g, "<br>") : "—";
  };
  const opt = (k: string) => esc((v[k] ?? "").trim()).replace(/\n/g, "<br>");
  const row = (label: string, value: string) => `<p class="row"><b>${label}:</b> ${value}</p>`;
  const schedule = [1, 2, 3]
    .filter(i => (v[`time_${i}`] ?? "").trim() || (v[`activity_${i}`] ?? "").trim())
    .map(i => `<p class="row">${f(`time_${i}`)} – ${f(`activity_${i}`)}${(v[`incharge_${i}`] ?? "").trim() ? ` (${opt(`incharge_${i}`)})` : ""}</p>`)
    .join("") || `<p class="row">To be shared.</p>`;
  const purpose = opt("event_purpose_summary");
  const footer = `Ref: ${f("reference_no")} | ${f("event_title")}`;

  return `<!doctype html><html><head><meta charset="utf-8">
<title>Request Letter - ${esc((v.event_title || "Event").trim())}</title>
<style>
  @page { size: A4; margin: 18mm 18mm 20mm;
    @bottom-left { content: "${footer.replace(/"/g, "'")}"; font: 8.5pt Arial, sans-serif; color: #666; }
    @bottom-right { content: "Page " counter(page); font: 8.5pt Arial, sans-serif; color: #666; } }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11pt/1.5 "Times New Roman", Times, serif; color: #111; }
  .head { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
  .head h1 { font-size: 20pt; margin: 0 0 2px; }
  .head p { margin: 0; font: 9.5pt Arial, sans-serif; color: #444; }
  p { margin: 0 0 6px; }
  .row { margin: 0 0 4px; }
  .subject { font-weight: bold; margin: 12px 0 10px; }
  .body { text-align: justify; }
  h3 { font-size: 12pt; margin: 16px 0 8px; padding-bottom: 3px; border-bottom: 1px solid #ccc; }
  .sign { margin-top: 18px; }
  .small { font: 9pt Arial, sans-serif; color: #444; }
  .office { margin-top: 16px; padding-top: 8px; border-top: 1px solid #ccc; }
  .keep { break-inside: avoid; }
</style></head><body>
  <div class="head">
    <h1>${f("college_name")}</h1>
    <p>${f("department_or_club_name")} | ${f("college_address")}</p>
    <p>${f("college_email")} | ${f("college_phone")}</p>
  </div>
  <p><b>Ref. No.:</b> ${f("reference_no")}</p>
  <p><b>Date:</b> ${f("letter_date")}</p>
  <p style="margin-top:12px">To,<br><b>${f("recipient_name")}</b><br>${f("recipient_designation")}<br>${f("recipient_institution")}</p>
  <p class="subject">Subject: Request for permission and logistical support for “${f("event_title")}” scheduled on ${f("event_date")}</p>
  <p>Respected ${f("salutation_title")},</p>
  <p class="body">I, ${f("sender_name")}, ${f("sender_designation")} of ${f("department_or_club_name")}, write to formally request your kind permission to organise <b>${f("event_title")}</b> on <b>${f("event_date")}</b> at <b>${f("venue")}</b>. ${purpose ? purpose + " " : ""}We also seek your approval and support for the venue, resources and arrangements listed below.</p>

  <h3>1. Event Details</h3>
  ${row("Event Name", f("event_title"))}
  ${row("Event Type", f("event_type"))}
  ${row("Date", f("event_date"))}
  ${row("Time", `${f("start_time")} to ${f("end_time")}`)}
  ${row("Venue", f("venue"))}
  ${row("Organised By", f("organizer"))}
  ${row("Faculty Coordinator", f("faculty_coordinator"))}
  ${row("Student Coordinator", `${f("student_coordinator")} (${f("coordinator_contact")})`)}
  ${row("Expected Participants", f("expected_participants"))}
  ${row("Expected Teams", f("expected_teams"))}
  ${row("Chief Guest / Speakers", f("guests_and_speakers"))}

  <h3>2. Event Overview</h3>
  <p class="body">${f("event_description")}</p>

  <h3>3. Proposed Schedule</h3>
  ${schedule}

  <h3>4. Logistics and Requirements</h3>
  <p>We kindly request the following arrangements and support for the event.</p>
  <p class="body">${f("logistics")}</p>

  <h3>5. Budget and Additional Permissions</h3>
  <p class="body">${f("budget_permissions")}</p>
  <p class="body" style="margin-top:10px">We assure you that the event will be conducted with full discipline, and that the venue and all borrowed equipment will be handed back in good condition. We kindly request your approval and support at the earliest, and would be glad to provide any further details you need.</p>

  <div class="sign keep">
    <p>Thanking you,<br>Yours sincerely,</p>
    <p style="margin-top:28px"><b>${f("sender_name")}</b>, ${f("sender_designation")}<br>${f("department_or_club_name")} | Contact: ${f("sender_contact")}</p>
    <p style="margin-top:14px"><b>Forwarded / Recommended by:</b> ${f("faculty_coordinator")}, Faculty Coordinator</p>
    <p style="margin-top:14px"><b>Head of Department:</b> ${f("hod_name")} (Signature and Seal)</p>
    <p class="small" style="margin-top:10px"><b>Enclosures:</b> ${f("enclosures")}<br><b>Copy to:</b> ${f("copy_to")}</p>
  </div>

  <div class="office keep">
    <p><b>FOR OFFICE USE</b></p>
    <p>Decision: [&nbsp;&nbsp;] Approved &nbsp;&nbsp; [&nbsp;&nbsp;] Approved with conditions &nbsp;&nbsp; [&nbsp;&nbsp;] Not approved</p>
    <p>Remarks: ______________________________________________________________</p>
    <p>Authority name and signature: ____________________ &nbsp; Date: ____________</p>
  </div>
</body></html>`;
}

/** Prints the letter from a hidden frame (no pop-up), so the browser offers "Save as PDF". */
function printLetter(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const done = () => setTimeout(() => frame.remove(), 1000);
  setTimeout(() => {
    const win = frame.contentWindow!;
    win.addEventListener("afterprint", done);
    win.focus();
    win.print();
    setTimeout(done, 60000); // in case afterprint never fires
  }, 250);
}

// ── Form ─────────────────────────────────────────────────────────────────────

export function RequestLetterModal({ event, getToken, onClose }: {
  event: ClubEvent; getToken: () => Promise<string | null>; onClose: () => void;
}) {
  const [club, setClub] = useState<any>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  // Club details (coordinator) for the prefill, then the club's earlier answers for this event
  useEffect(() => {
    let alive = true;
    (async () => {
      let c: any = null;
      try {
        const token = await getToken();
        c = (await fetchMyClub(token ?? undefined))?.club ?? null;
      } catch { /* prefill what we can without it */ }
      if (!alive) return;
      let saved: Record<string, string> = {};
      try { saved = JSON.parse(localStorage.getItem(storageKey(event.id)) || "{}"); } catch { /* none */ }
      setClub(c);
      // Event details always come fresh from the event; answers the club typed before are kept
      setValues({ ...askedDefaults(c), ...saved, ...eventDefaults(event, c) });
      setReady(true);
    })();
    return () => { alive = false; };
  }, [event.id]);

  // Remember the answers (not the event details) for next time
  useEffect(() => {
    if (!ready) return;
    const answers = Object.fromEntries(Object.entries(values).filter(([k]) => !EVENT_KEYS.has(k)));
    try { localStorage.setItem(storageKey(event.id), JSON.stringify(answers)); } catch { /* storage unavailable */ }
  }, [values, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues(v => ({ ...v, [k]: e.target.value }));
  const required = ["recipient_name", "recipient_designation", "sender_name"];
  const missing = useMemo(() => required.filter(k => !(values[k] ?? "").trim()), [values]);
  const [triedDownload, setTriedDownload] = useState(false);

  const download = () => {
    setTriedDownload(true);
    if (missing.length) {
      document.getElementById(`rl-${missing[0]}`)?.focus();
      return;
    }
    printLetter(buildLetterHtml(values));
  };

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all text-[color:var(--sk-fg)] focus:border-[color:var(--sk-brand)]";
  const inputStyle = (k: string) => ({
    background: "var(--sk-surface)",
    border: `1px solid ${triedDownload && missing.includes(k) ? "var(--sk-danger)" : "var(--sk-line)"}`,
    fontFamily: FB,
  });

  const renderField = (fl: Field, fromEvent = false) => (
    <div key={fl.key} className={fl.half ? "" : "sm:col-span-2"}>
      <label htmlFor={`rl-${fl.key}`} className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[color:var(--sk-muted)] mb-1.5" style={{ fontFamily: FM }}>
        {fl.label}{required.includes(fl.key) && <span className="text-[color:var(--sk-brand)]">*</span>}
        {fromEvent && <Sparkles size={11} className="text-[color:var(--sk-brand)]" aria-label="Filled from your event" />}
      </label>
      {fl.multiline ? (
        <textarea id={`rl-${fl.key}`} rows={fl.rows ?? 3} value={values[fl.key] ?? ""} onChange={set(fl.key)} placeholder={fl.placeholder}
          className={`${inputCls} resize-y`} style={inputStyle(fl.key)} />
      ) : (
        <input id={`rl-${fl.key}`} value={values[fl.key] ?? ""} onChange={set(fl.key)} placeholder={fl.placeholder}
          className={inputCls} style={inputStyle(fl.key)} />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center bg-black/55 sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rl-title" onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-3xl max-h-full sm:max-h-[92vh] flex flex-col sm:rounded-3xl overflow-hidden"
        style={{ background: "var(--sk-canvas)", border: "1px solid var(--sk-line)" }}>
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: "var(--sk-line)" }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--sk-raised)" }}>
              <FileText size={18} className="text-[color:var(--sk-fg)]" />
            </div>
            <div>
              <h2 id="rl-title" className="text-lg font-semibold text-[color:var(--sk-fg)]" style={{ fontFamily: FC }}>Pre-Event Request Letter</h2>
              <p className="text-xs text-[color:var(--sk-muted)] mt-0.5" style={{ fontFamily: FB }}>
                Details marked <Sparkles size={10} className="inline text-[color:var(--sk-brand)]" /> come from your event. Fill in the rest, then download.
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] cursor-pointer"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {!ready ? (
            <p className="text-sm text-[color:var(--sk-muted)] text-center py-10" style={{ fontFamily: FB }}>Preparing your letter…</p>
          ) : (
            <>
              <section>
                <h3 className="text-sm font-semibold text-[color:var(--sk-fg)] mb-1" style={{ fontFamily: FB }}>From your event</h3>
                <p className="text-xs text-[color:var(--sk-muted)] mb-4" style={{ fontFamily: FB }}>Filled in automatically{club ? "" : " (club coordinator details couldn't be loaded)"}. You can still edit them for the letter.</p>
                <div className="grid sm:grid-cols-2 gap-4">{FROM_EVENT.map(fl => renderField(fl, true))}</div>
              </section>
              {ASKED.map(sec => (
                <section key={sec.title}>
                  <h3 className="text-sm font-semibold text-[color:var(--sk-fg)] mb-1" style={{ fontFamily: FB }}>{sec.title}</h3>
                  {sec.hint && <p className="text-xs text-[color:var(--sk-muted)] mb-3" style={{ fontFamily: FB }}>{sec.hint}</p>}
                  <div className="grid sm:grid-cols-2 gap-4 mt-3">{sec.fields.map(fl => renderField(fl))}</div>
                </section>
              ))}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--sk-line)", background: "var(--sk-surface)" }}>
          <p className="text-[11px] text-[color:var(--sk-muted)]" style={{ fontFamily: FM }}>
            {triedDownload && missing.length ? <span className="text-[color:var(--sk-danger)]">Fill in the fields marked *.</span> : "Your answers are saved on this device. Empty fields print as —."}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[color:var(--sk-line)] text-[color:var(--sk-fg)] hover:bg-[color:var(--sk-raised)] cursor-pointer" style={{ fontFamily: FB }}>Close</button>
            <button onClick={download} disabled={!ready}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] cursor-pointer disabled:opacity-50 inline-flex items-center gap-2" style={{ fontFamily: FB }}>
              <Download size={15} /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
