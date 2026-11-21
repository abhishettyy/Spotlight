import { useEffect, useMemo, useState } from "react";
import { FileText, X, Download, Sparkles } from "lucide-react";
import { fetchMyClub } from "../api";
import { FC, FM, FB, parseLocalDate, ClubEvent } from "./shared";


type Field = { key: string; label: string; placeholder?: string; multiline?: boolean; half?: boolean; rows?: number };
type Section = { title: string; hint?: string; fields: Field[] };

const ASKED: Section[] = [
  {
    title: "Letter",
    fields: [
      { key: "reference_no", label: "Reference No.", placeholder: "e.g. RIT/CLUB/2026/014", half: true },
      { key: "letter_date", label: "Letter Date", half: true },
      { key: "college_name", label: "College Name" },
      { key: "college_address", label: "College Address" },
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
];

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
  { key: "expected_participants", label: "Expected Participants", half: true },
  { key: "expected_teams", label: "Expected Teams", half: true },
  { key: "event_description", label: "Event Description", multiline: true },
];
const EVENT_KEYS = new Set(FROM_EVENT.map(f => f.key));

const FILLER = /^(other|others|n\/?a|na|nil|none|null|not applicable|not required|-+|—|\.+)$/i;
const dropFillerParts = (s: string) =>
  s.split(/\s*,\s*/).filter(part => part && !FILLER.test(part)).join(", ");

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
    department_or_club_name: club?.department && !FILLER.test(club.department.trim()) ? `${clubName}, ${club.department.trim()}` : clubName,
    organizer: clubName,
    student_coordinator: club?.coordinatorName || "",
    expected_participants: ev.capacity
      ? (isTeam ? (maxTeam ? `Up to ${ev.capacity * maxTeam}` : "As per teams") : `Up to ${ev.capacity}`)
      : "",
    expected_teams: isTeam && ev.capacity ? `Up to ${ev.capacity}` : "",
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


const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildLetterHtml(v: Record<string, string>): string {
  const t = (k: string) => {
    let s = (v[k] ?? "").trim();
    if (s && !s.includes("\n")) s = dropFillerParts(s);
    return s && !FILLER.test(s) ? esc(s).replace(/\n/g, "<br>") : "";
  };
  const row = (label: string, value: string) => (value ? `<p class="row"><b>${label}:</b> ${value}</p>` : "");
  const lines = (...parts: string[]) => parts.filter(Boolean).join("<br>");
  const para = (html: string, cls = "") => (html ? `<p${cls ? ` class="${cls}"` : ""}>${html}</p>` : "");

  const title = t("event_title"), date = t("event_date"), venue = t("venue");
  const dept = t("department_or_club_name"), purpose = t("event_purpose_summary");
  const senderName = t("sender_name"), senderDesignation = t("sender_designation");

  const role = senderDesignation ? (dept ? `${senderDesignation} of ${dept}` : senderDesignation) : (dept ? `of ${dept}` : "");
  const who = [senderName, role].filter(Boolean).join(", ");
  const opening =
    `I${who ? `, ${who},` : ""} write to formally request your kind permission to organise ${title ? `<b>${title}</b>` : "the event"}` +
    `${date ? ` on <b>${date}</b>` : ""}${venue ? ` at <b>${venue}</b>` : ""}. ` +
    `${purpose ? purpose + " " : ""}We also seek your approval and support for the venue, resources and arrangements listed below.`;

  const time = [t("start_time"), t("end_time")].filter(Boolean).join(" to ");

  const detailRows = [
    row("Event Name", title),
    row("Event Type", t("event_type")),
    row("Date", date),
    row("Time", time),
    row("Venue", venue),
    row("Organised By", t("organizer")),
    row("Faculty Coordinator", t("faculty_coordinator")),
    row("Student Coordinator", t("student_coordinator")),
    row("Expected Participants", t("expected_participants")),
    row("Expected Teams", t("expected_teams")),
    row("Chief Guest / Speakers", t("guests_and_speakers")),
  ].join("");

  const sections: Array<[string, string]> = [];
  if (detailRows) sections.push(["Event Details", detailRows]);
  if (t("event_description")) sections.push(["Event Overview", para(t("event_description"), "body")]);
  if (t("logistics")) sections.push(["Logistics and Requirements", `<p>We kindly request the following arrangements and support for the event.</p>${para(t("logistics"), "body")}`]);
  if (t("budget_permissions")) sections.push(["Budget and Additional Permissions", para(t("budget_permissions"), "body")]);
  const sectionsHtml = sections.map(([h, body], i) => `<h3>${i + 1}. ${h}</h3>${body}`).join("\n");

  const recipient = lines(t("recipient_name") ? `<b>${t("recipient_name")}</b>` : "", t("recipient_designation"), t("recipient_institution"));
  const senderLine = [senderName ? `<b>${senderName}</b>` : "", senderDesignation].filter(Boolean).join(", ");
  const clubLine = [dept, t("sender_contact") ? `Contact: ${t("sender_contact")}` : ""].filter(Boolean).join(" | ");

  return `<!doctype html><html><head><meta charset="utf-8">
<title>Request Letter - ${esc((v.event_title || "Event").trim())}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0 18mm; font: 11pt/1.5 "Times New Roman", Times, serif; color: #111; }
  table.page { width: 100%; border-collapse: collapse; }
  table.page td { padding: 0; }
  .space-top { height: 16mm; }
  .space-bottom { height: 16mm; }
  .head { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
  .head h1 { font-size: 20pt; margin: 0 0 2px; }
  .head p { margin: 0; font: 9.5pt Arial, sans-serif; color: #444; }
  .head .club { margin: 2px 0 3px; font: bold 14pt "Times New Roman", Times, serif; color: #111; }
  p { margin: 0 0 6px; }
  .row { margin: 0 0 4px; }
  .subject { font-weight: bold; margin: 12px 0 10px; }
  .body { text-align: justify; }
  h3 { font-size: 12pt; margin: 16px 0 8px; padding-bottom: 3px; border-bottom: 1px solid #ccc; }
  .sign { margin-top: 18px; }
  .small { font: 9pt Arial, sans-serif; color: #444; }
  .keep { break-inside: avoid; }
</style></head><body>
<table class="page">
  <thead><tr><td><div class="space-top"></div></td></tr></thead>
  <tfoot><tr><td><div class="space-bottom"></div></td></tr></tfoot>
  <tbody><tr><td>
  <div class="head">
    ${t("college_name") ? `<h1>${t("college_name")}</h1>` : ""}
    ${para(t("organizer"), "club")}
    ${para(t("college_address"))}
  </div>
  ${row("Ref. No.", t("reference_no"))}
  ${row("Date", t("letter_date"))}
  ${recipient ? `<p style="margin-top:12px">To,<br>${recipient}</p>` : ""}
  <p class="subject">Subject: Request for permission and logistical support for “${title || "the event"}”${date ? ` scheduled on ${date}` : ""}</p>
  <p>Respected ${t("salutation_title") || "Sir/Madam"},</p>
  <p class="body">${opening}</p>

  ${sectionsHtml}

  <p class="body" style="margin-top:14px">We assure you that the event will be conducted with full discipline, and that the venue and all borrowed equipment will be handed back in good condition. We kindly request your approval and support at the earliest, and would be glad to provide any further details you need.</p>

  <div class="sign keep">
    <p>Thanking you,<br>Yours sincerely,</p>
    ${senderLine || clubLine ? `<p style="margin-top:28px">${lines(senderLine, clubLine)}</p>` : ""}
    ${t("faculty_coordinator") ? `<p style="margin-top:14px"><b>Forwarded / Recommended by:</b> ${t("faculty_coordinator")}, Faculty Coordinator</p>` : ""}
    ${t("hod_name") ? `<p style="margin-top:14px"><b>Head of Department:</b> ${t("hod_name")} (Signature and Seal)</p>` : ""}
  </div>
  </td></tr></tbody>
</table>
</body></html>`;
}

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
    setTimeout(done, 60000);
  }, 250);
}


export function RequestLetterModal({ event, getToken, onClose }: {
  event: ClubEvent; getToken: () => Promise<string | null>; onClose: () => void;
}) {
  const [club, setClub] = useState<any>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let c: any = null;
      try {
        const token = await getToken();
        c = (await fetchMyClub(token ?? undefined))?.club ?? null;
      } catch {}
      if (!alive) return;
      let saved: Record<string, string> = {};
      try { saved = JSON.parse(localStorage.getItem(storageKey(event.id)) || "{}"); } catch {}
      setClub(c);
      setValues({ ...askedDefaults(c), ...saved, ...eventDefaults(event, c) });
      setReady(true);
    })();
    return () => { alive = false; };
  }, [event.id]);

  useEffect(() => {
    if (!ready) return;
    const answers = Object.fromEntries(Object.entries(values).filter(([k]) => !EVENT_KEYS.has(k)));
    try { localStorage.setItem(storageKey(event.id), JSON.stringify(answers)); } catch {}
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
            {triedDownload && missing.length ? <span className="text-[color:var(--sk-danger)]">Fill in the fields marked *.</span> : "Your answers are saved on this device. Fields you leave empty are left out of the letter."}
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
