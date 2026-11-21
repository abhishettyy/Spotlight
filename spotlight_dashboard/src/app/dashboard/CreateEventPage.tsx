import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, Upload } from "lucide-react";
import { createEvent } from "../api";
import { FC, FM, FB, fileToBase64 } from "./shared";
import { GlassDatePicker, GlassSelect } from "./GlassFields";
import { BRANCHES } from "../../student/branches";

type EventForm = {
  title: string; desc: string; date: string; endDate: string; deadline: string; type: string; capacity: string;
  venue: string; amount: string; qrCode: string; useDefaultQr: boolean; customUpiId: string;
  eventType: string; minTeamSize: string; teamSizeLimit: string; qrFile: File | null;
  eligibility: string; allowedBranches: string[];
};

function validateEventForm(formData: EventForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const now = new Date();
  if (!formData.title.trim()) errors.title = "Event name is required.";
  if (!formData.date) errors.date = "Event start date & time is required.";
  else if (new Date(formData.date) <= now) errors.date = "Event start date must be in the future.";
  if (!formData.endDate) errors.endDate = "Event end date & time is required.";
  else if (formData.date && new Date(formData.endDate) < new Date(formData.date)) errors.endDate = "End date & time must be at or after start date & time.";
  if (!formData.deadline) errors.deadline = "Registration deadline is required.";
  else if (new Date(formData.deadline) <= now) errors.deadline = "Registration deadline must be in the future.";
  else if (formData.date && new Date(formData.deadline) >= new Date(formData.date)) errors.deadline = "Deadline must be before the event start date.";
  if (!formData.desc.trim()) errors.desc = "Description is required.";
  if (!formData.venue.trim()) errors.venue = "Venue is required.";
  if (!formData.capacity) errors.capacity = formData.eventType === "Team" ? "Number of teams is required." : "Venue capacity is required.";
  else if (parseInt(formData.capacity) < 1) errors.capacity = formData.eventType === "Team" ? "Allow at least 1 team." : "Venue capacity must be at least 1.";
  if (formData.type === "paid") {
    if (!formData.amount) errors.amount = "Amount is required for paid events.";
    else if (parseInt(formData.amount) < 1) errors.amount = "Amount must be at least ₹1.";

    if (!formData.useDefaultQr) {
      if (!formData.customUpiId.trim()) errors.customUpiId = "Custom UPI ID is required for custom payment setup.";
      if (!formData.qrFile && !formData.qrCode) errors.qrCode = "Custom QR code image is required.";
    }
  }
  if (formData.eligibility === "selected" && formData.allowedBranches.length === 0) {
    errors.allowedBranches = "Select at least one branch.";
  }
  if (formData.eventType === "Team") {
    if (!formData.minTeamSize) errors.minTeamSize = "Min team size is required.";
    else if (parseInt(formData.minTeamSize) < 1) errors.minTeamSize = "Min team size must be at least 1.";
    else if (formData.teamSizeLimit && parseInt(formData.minTeamSize) > parseInt(formData.teamSizeLimit)) {
      errors.minTeamSize = `Min team size cannot exceed max team size (${formData.teamSizeLimit}).`;
    }

    if (!formData.teamSizeLimit) errors.teamSizeLimit = "Max team size is required.";
    else if (parseInt(formData.teamSizeLimit) < parseInt(formData.minTeamSize || "1")) {
      errors.teamSizeLimit = `Max team size must be at least ${formData.minTeamSize || "1"}.`;
    }
  }
  return errors;
}

export function CreateEventPage({ clubId, onCreated, getToken, clubQrUrl, clubUpiId, refreshProfile }: { clubId: string; onCreated: (asDraft: boolean) => void; getToken: () => Promise<string | null>; clubQrUrl?: string | null; clubUpiId?: string | null; refreshProfile?: () => Promise<any> }) {
  const [formData, setFormData] = useState({
    title: "", desc: "", date: "", endDate: "", deadline: "", type: "free", capacity: "", venue: "", amount: "", qrCode: "", banner: "", useDefaultQr: true, customUpiId: "",
    eventType: "Solo", minTeamSize: "1", teamSizeLimit: "",
    eligibility: "all", allowedBranches: [] as string[],
    bannerFile: null as File | null, qrFile: null as File | null
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const touch = (field: string) => setTouched(t => (t[field] ? t : { ...t, [field]: true }));
  const allErrors = validateEventForm(formData);
  const fieldErrors: Record<string, string> = submitAttempted
    ? allErrors
    : Object.fromEntries(Object.entries(allErrors).filter(([field]) => touched[field]));

  const [savingDraft, setSavingDraft] = useState(false);

  const handleSubmit = async (asDraft = false) => {
    if (submitting) return;
    setSubmitting(true);
    setSavingDraft(asDraft);
    setError(null);

    const errors = validateEventForm(formData);
    setSubmitAttempted(true);
    if (formData.type === "paid" && formData.useDefaultQr) {
      if (!clubQrUrl && !clubUpiId) {
        setError("Default payment QR code and UPI ID are not configured in Club Settings. Please update Settings or choose Custom QR & UPI.");
        setSubmitting(false);
        return;
      } else if (!clubQrUrl) {
        setError("Default payment QR code is not uploaded in Club Settings. Please update Settings or choose Custom QR & UPI.");
        setSubmitting(false);
        return;
      } else if (!clubUpiId) {
        setError("Default payment UPI ID is not added in Club Settings. Please update Settings or choose Custom QR & UPI.");
        setSubmitting(false);
        return;
      }
    }
    if (Object.keys(errors).length > 0) {
      setSubmitting(false);
      return;
    }

    try {
      const token = await getToken();

      let resolvedClubId = clubId;
      if (!resolvedClubId || resolvedClubId.trim() === '') {
        const freshProfile = refreshProfile ? await refreshProfile() : null;
        resolvedClubId = freshProfile?.clubId ?? '';
        if (!resolvedClubId) {
          setError("Your account is not linked to a club yet. Please refresh the page and try again.");
          setSubmitting(false);
          return;
        }
      }

      let bannerUrl: string | undefined = undefined;
      if (formData.bannerFile) {
        bannerUrl = await fileToBase64(formData.bannerFile);
      }

      let qrUrl: string | undefined = undefined;
      if (formData.qrFile) {
        qrUrl = await fileToBase64(formData.qrFile);
      }

      await createEvent({
        name: formData.title,
        description: formData.desc || undefined,
        venue: formData.venue || undefined,
        eventDate: formData.date || undefined,
        eventEndDate: formData.endDate || undefined,
        fee: 0,
        registrationLimit: formData.capacity ? parseInt(formData.capacity) : undefined,
        eventType: formData.eventType,
        teamSizeLimit: formData.eventType === "Team" && formData.teamSizeLimit ? parseInt(formData.teamSizeLimit) : undefined,
        minTeamSize: formData.eventType === "Team" && formData.minTeamSize ? parseInt(formData.minTeamSize) : 1,
        allowedBranches: formData.eligibility === "selected" ? formData.allowedBranches : undefined,
        clubId: resolvedClubId,
        bannerUrl,
        qrUrl,
        upiId: (!formData.useDefaultQr && formData.customUpiId.trim()) ? formData.customUpiId.trim() : undefined,
        registrationDeadline: formData.deadline || undefined,
        draft: asDraft,
      }, token ?? undefined);
      onCreated(asDraft);
    } catch (e: any) {
      setError(e.message ?? "Failed to create event.");
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>Create New Event</h1>
      </div>

      <div className="space-y-6 p-6 md:p-8 rounded-3xl" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Event Banner</label>
          <input type="file" accept="image/*" className="hidden" id="banner-upload" onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              setFormData(p => ({...p, bannerFile: file, banner: URL.createObjectURL(file)}));
            }
          }} />
          {formData.banner ? (
            <div className="relative w-full h-48 rounded-xl overflow-hidden group" style={{ border: "1px solid var(--sk-line)" }}>
              <img src={formData.banner} alt="Event Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => setFormData(p => ({...p, banner: "", bannerFile: null}))} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors" style={{ fontFamily: FB, border: "1px solid var(--sk-line)" }}>Remove Banner</button>
              </div>
            </div>
          ) : (
            <label htmlFor="banner-upload" className="w-full h-32 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "var(--sk-surface)", border: "1px dashed var(--sk-line)", fontFamily: FB }}>
              <Upload size={20} className="text-[color:var(--sk-muted)]" />
              <span className="text-sm text-[color:var(--sk-muted)]">Click to upload banner image</span>
            </label>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Event Name</label>
          <input type="text" placeholder="e.g. CodeFest 2026" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.title ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }} value={formData.title} onChange={e => { setFormData(p => ({...p, title: e.target.value})); touch("title"); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.title ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.title ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"} />
          {fieldErrors.title && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.title}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Start Date &amp; Time</label>
            <GlassDatePicker value={formData.date} onChange={v => {
              setFormData(p => ({...p, date: v}));
              touch("date");
            }} />
            {fieldErrors.date && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.date}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>End Date &amp; Time</label>
            <GlassDatePicker value={formData.endDate} onChange={v => { setFormData(p => ({...p, endDate: v})); touch("endDate"); }} defaultTime="23:59" />
            {fieldErrors.endDate && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.endDate}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Registration Deadline</label>
            <GlassDatePicker value={formData.deadline} onChange={v => { setFormData(p => ({...p, deadline: v})); touch("deadline"); }} defaultTime="23:59" />
            {fieldErrors.deadline && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.deadline}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Description</label>
          <textarea placeholder="Describe your event..." className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all min-h-[100px]" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.desc ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }} value={formData.desc} onChange={e => { setFormData(p => ({...p, desc: e.target.value})); touch("desc"); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.desc ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.desc ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"} />
          {fieldErrors.desc && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.desc}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Venue</label>
            <input type="text" placeholder="Main Auditorium" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.venue ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }} value={formData.venue} onChange={e => { setFormData(p => ({...p, venue: e.target.value})); touch("venue"); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.venue ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.venue ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"} />
            {fieldErrors.venue && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.venue}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>{formData.eventType === "Team" ? "Number of Teams" : "Venue Capacity"}</label>
            <input type="number" placeholder={formData.eventType === "Team" ? "e.g. 20" : "e.g. 200"} min={1} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.capacity ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }} value={formData.capacity} onChange={e => { setFormData(p => ({...p, capacity: e.target.value})); touch("capacity"); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.capacity ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.capacity ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"} />
            {formData.eventType === "Team" && (
              <p className="text-[10px] text-[color:var(--sk-muted)] mt-0.5" style={{ fontFamily: FM }}>Registration closes once this many teams have registered.</p>
            )}
            {fieldErrors.capacity && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.capacity}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5 relative">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Participation Type</label>
            <GlassSelect
              value={formData.eventType}
              onChange={val => setFormData(p => ({...p, eventType: val, minTeamSize: val === "Team" ? (p.minTeamSize || "1") : "", teamSizeLimit: ""}))}
              options={[
                { value: "Solo", label: "Solo" },
                { value: "Team", label: "Team" },
              ]}
            />
          </div>
          <AnimatePresence>
            {formData.eventType === "Team" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Min Team Size</label>
                  <input
                    type="number"
                    placeholder="Min (e.g. 1)"
                    min={1}
                    max={formData.teamSizeLimit ? parseInt(formData.teamSizeLimit) : undefined}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                    style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.minTeamSize ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }}
                    value={formData.minTeamSize}
                    onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData(p => ({ ...p, minTeamSize: v }));
                      touch("minTeamSize");
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = fieldErrors.minTeamSize ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"}
                    onBlur={e => e.currentTarget.style.borderColor = fieldErrors.minTeamSize ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}
                  />
                  {fieldErrors.minTeamSize && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.minTeamSize}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Max Team Size</label>
                  <input
                    type="number"
                    placeholder="Max (e.g. 4)"
                    min={parseInt(formData.minTeamSize || '1')}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                    style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.teamSizeLimit ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }}
                    value={formData.teamSizeLimit}
                    onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData(p => ({ ...p, teamSizeLimit: v }));
                      touch("teamSizeLimit");
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = fieldErrors.teamSizeLimit ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"}
                    onBlur={e => e.currentTarget.style.borderColor = fieldErrors.teamSizeLimit ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}
                  />
                  {fieldErrors.teamSizeLimit && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.teamSizeLimit}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5 relative">
              <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Who Can Register</label>
              <GlassSelect
                value={formData.eligibility}
                onChange={val => { setFormData(p => ({ ...p, eligibility: val, allowedBranches: val === "all" ? [] : p.allowedBranches })); touch("allowedBranches"); }}
                options={[
                  { value: "all", label: "Open to all branches" },
                  { value: "selected", label: "Selected branches only" },
                ]}
              />
            </div>
          </div>
          <AnimatePresence>
            {formData.eligibility === "selected" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 pt-1 pb-2">
                  <p className="text-[11px] text-[color:var(--sk-muted)]" style={{ fontFamily: FM }}>
                    {formData.allowedBranches.length === 0 ? "Pick the branches whose students can register." : `${formData.allowedBranches.length} of ${BRANCHES.length} branches selected`}
                  </p>
                  {formData.allowedBranches.length > 0 && (
                    <button type="button" onClick={() => { setFormData(p => ({ ...p, allowedBranches: [] })); touch("allowedBranches"); }}
                      className="text-[11px] text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] transition-colors cursor-pointer" style={{ fontFamily: FM }}>Clear</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {BRANCHES.map(b => {
                    const on = formData.allowedBranches.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setFormData(p => ({
                            ...p,
                            allowedBranches: on ? p.allowedBranches.filter(x => x !== b) : BRANCHES.filter(x => x === b || p.allowedBranches.includes(x)),
                          }));
                          touch("allowedBranches");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer"
                        style={{
                          fontFamily: FB,
                          background: on ? "color-mix(in srgb, var(--sk-brand) 14%, transparent)" : "var(--sk-surface)",
                          border: `1px solid ${on ? "var(--sk-brand)" : "var(--sk-line)"}`,
                          color: on ? "var(--sk-brand)" : "var(--sk-fg)",
                          fontWeight: on ? 600 : 400,
                        }}
                      >
                        {on && <CheckCircle size={12} />}
                        {b}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.allowedBranches && <p className="text-[11px] text-[color:var(--sk-danger)] mt-2" style={{ fontFamily: FB }}>{fieldErrors.allowedBranches}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <p className="text-xs text-[color:var(--sk-danger)] px-1" style={{ fontFamily: FM }}>{error}</p>
        )}
        <div className="pt-4 mt-8 flex flex-wrap items-center gap-3">
          <motion.button 
            whileHover={submitting ? undefined : { scale: 1.02 }} 
            whileTap={submitting ? undefined : { scale: 0.98 }} 
            onClick={() => handleSubmit(false)} 
            disabled={submitting} 
            className={`px-8 py-3.5 bg-[color:var(--sk-brand)] text-white text-sm font-semibold rounded-xl transition-all ${submitting ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`} 
            style={{ fontFamily: FB }} 
            onMouseEnter={e => !submitting && (e.currentTarget.style.boxShadow = "none")} 
            onMouseLeave={e => !submitting && (e.currentTarget.style.boxShadow = "none")}
          >
            {submitting && !savingDraft ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Publishing...</span>
              </div>
            ) : (
              "Publish Event"
            )}
          </motion.button>
          <motion.button
            whileHover={submitting ? undefined : { scale: 1.02 }}
            whileTap={submitting ? undefined : { scale: 0.98 }}
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className={`px-8 py-3.5 text-sm font-semibold rounded-xl transition-all border border-[color:var(--sk-line)] bg-[color:var(--sk-surface)] text-[color:var(--sk-fg)] hover:bg-[color:var(--sk-raised)] ${submitting ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
            style={{ fontFamily: FB }}
          >
            {submitting && savingDraft ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-[color:var(--sk-fg)] border-t-transparent animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              "Save as Draft"
            )}
          </motion.button>
          <p className="w-full text-[11px] text-[color:var(--sk-muted)]" style={{ fontFamily: FM }}>
            Drafts are visible only to your club. Publish them later from the Events page.
          </p>
        </div>
      </div>
    </div>
  );
}
