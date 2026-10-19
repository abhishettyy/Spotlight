import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, Upload } from "lucide-react";
import { createEvent } from "../api";
import { FC, FM, FB, fileToBase64 } from "./shared";
import { GlassDatePicker, GlassSelect } from "./GlassFields";

export function CreateEventPage({ clubId, onCreated, getToken, clubQrUrl, clubUpiId, refreshProfile }: { clubId: string; onCreated: () => void; getToken: () => Promise<string | null>; clubQrUrl?: string | null; clubUpiId?: string | null; refreshProfile?: () => Promise<any> }) {
  const [formData, setFormData] = useState({
    title: "", desc: "", date: "", endDate: "", deadline: "", type: "free", capacity: "", venue: "", amount: "", qrCode: "", banner: "", useDefaultQr: true, customUpiId: "",
    eventType: "Solo", minTeamSize: "1", teamSizeLimit: "",
    bannerFile: null as File | null, qrFile: null as File | null
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

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
    if (!formData.capacity) errors.capacity = "Venue capacity is required.";
    else if (formData.eventType === "Team" && formData.teamSizeLimit && parseInt(formData.capacity) < parseInt(formData.teamSizeLimit)) {
      errors.capacity = `Venue capacity cannot be less than max team size (${formData.teamSizeLimit}).`;
    } else if (parseInt(formData.capacity) < 2) errors.capacity = "Venue capacity must be at least 2.";
    if (formData.type === "paid") {
      if (!formData.amount) errors.amount = "Amount is required for paid events.";
      else if (parseInt(formData.amount) < 1) errors.amount = "Amount must be at least ₹1.";

      if (!formData.useDefaultQr) {
        if (!formData.customUpiId.trim()) errors.customUpiId = "Custom UPI ID is required for custom payment setup.";
        if (!formData.qrFile && !formData.qrCode) errors.qrCode = "Custom QR code image is required.";
      }
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
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }
    setFieldErrors({});

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
        fee: formData.type === "paid" ? parseInt(formData.amount) || 0 : 0,
        registrationLimit: formData.capacity ? parseInt(formData.capacity) : undefined,
        eventType: formData.eventType,
        teamSizeLimit: formData.eventType === "Team" && formData.teamSizeLimit ? parseInt(formData.teamSizeLimit) : undefined,
        minTeamSize: formData.eventType === "Team" && formData.minTeamSize ? parseInt(formData.minTeamSize) : 1,
        clubId: resolvedClubId,
        bannerUrl,
        qrUrl,
        upiId: (!formData.useDefaultQr && formData.customUpiId.trim()) ? formData.customUpiId.trim() : undefined,
        registrationDeadline: formData.deadline || undefined,
      }, token ?? undefined);
      onCreated();
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
          <input type="text" placeholder="e.g. CodeFest 2026" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.title ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }} value={formData.title} onChange={e => { setFormData(p => ({...p, title: e.target.value})); setFieldErrors(fe => ({...fe, title: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.title ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.title ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"} />
          {fieldErrors.title && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.title}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Start Date &amp; Time</label>
            <GlassDatePicker value={formData.date} onChange={v => {
              setFormData(p => ({...p, date: v}));
              setFieldErrors(fe => ({...fe, date: ""}));
            }} />
            {fieldErrors.date && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.date}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>End Date &amp; Time</label>
            <GlassDatePicker value={formData.endDate} onChange={v => { setFormData(p => ({...p, endDate: v})); setFieldErrors(fe => ({...fe, endDate: ""})); }} defaultTime="23:59" />
            {fieldErrors.endDate && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.endDate}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Registration Deadline</label>
            <GlassDatePicker value={formData.deadline} onChange={v => { setFormData(p => ({...p, deadline: v})); setFieldErrors(fe => ({...fe, deadline: ""})); }} defaultTime="23:59" />
            {fieldErrors.deadline && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.deadline}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Description</label>
          <textarea placeholder="Describe your event..." className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all min-h-[100px]" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.desc ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }} value={formData.desc} onChange={e => { setFormData(p => ({...p, desc: e.target.value})); setFieldErrors(fe => ({...fe, desc: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.desc ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.desc ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"} />
          {fieldErrors.desc && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.desc}</p>}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Venue</label>
            <input type="text" placeholder="Main Auditorium" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.venue ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }} value={formData.venue} onChange={e => { setFormData(p => ({...p, venue: e.target.value})); setFieldErrors(fe => ({...fe, venue: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.venue ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.venue ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"} />
            {fieldErrors.venue && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.venue}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Venue Capacity</label>
            <input type="number" placeholder="e.g. 200" min={formData.eventType === "Team" && formData.teamSizeLimit ? parseInt(formData.teamSizeLimit) : 2} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.capacity ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }} value={formData.capacity} onChange={e => { setFormData(p => ({...p, capacity: e.target.value})); setFieldErrors(fe => ({...fe, capacity: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.capacity ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.capacity ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"} />
            {formData.eventType === "Team" && formData.teamSizeLimit && (
              <p className="text-[10px] text-[color:var(--sk-muted)] mt-0.5" style={{ fontFamily: FM }}>Minimum venue capacity is {formData.teamSizeLimit} (Max Team Size).</p>
            )}
            {fieldErrors.capacity && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.capacity}</p>}
          </div>
          <div className="space-y-1.5 relative">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Pricing</label>
            <GlassSelect
              value={formData.type}
              onChange={val => setFormData(p => ({...p, type: val, amount: "", qrCode: "", customUpiId: ""}))}
              options={[
                { value: "free", label: "Free" },
                { value: "paid", label: "Paid" },
              ]}
            />
            {formData.type === "free" && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -bottom-5 left-1 text-[11px] text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>
                FCFS. No approval needed.
              </motion.p>
            )}
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
                      setFieldErrors(fe => ({ ...fe, minTeamSize: "" }));
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
                      setFieldErrors(fe => ({ ...fe, teamSizeLimit: "" }));
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

        <AnimatePresence>
          {formData.type === "paid" && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 rounded-2xl grid md:grid-cols-2 gap-6" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Amount (INR)</label>
                  <input type="number" placeholder="e.g. 500" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.amount ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }} value={formData.amount} onChange={e => { setFormData(p => ({...p, amount: e.target.value})); setFieldErrors(fe => ({...fe, amount: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.amount ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.amount ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"} />
                  {fieldErrors.amount && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.amount}</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Payment Setup</label>
                  <div className="flex gap-2 p-1 rounded-xl" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
                    <button onClick={() => setFormData(p => ({...p, useDefaultQr: true, customUpiId: ""}))} className={`flex-1 py-2 text-xs rounded-lg transition-all ${formData.useDefaultQr ? "bg-white/10 text-white" : "text-[color:var(--sk-muted)] hover:text-[#ccc]"}`} style={{ fontFamily: FB }}>Default QR &amp; UPI</button>
                    <button onClick={() => setFormData(p => ({...p, useDefaultQr: false}))} className={`flex-1 py-2 text-xs rounded-lg transition-all ${!formData.useDefaultQr ? "bg-white/10 text-white" : "text-[color:var(--sk-muted)] hover:text-[#ccc]"}`} style={{ fontFamily: FB }}>Custom QR &amp; UPI</button>
                  </div>

                  {!formData.useDefaultQr && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block mb-1" style={{ fontFamily: FM }}>Upload Custom QR Image</label>
                        <input type="file" accept="image/*" className="hidden" id="qr-upload" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData(p => ({...p, qrFile: file, qrCode: file.name}));
                            setFieldErrors(fe => ({...fe, qrCode: ""}));
                          }
                        }} />
                        <label htmlFor="qr-upload" className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-muted)] flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.qrCode ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }}>
                          <span>{formData.qrFile ? formData.qrFile.name : "Upload Custom QR Image..."}</span>
                          <Upload size={14} className={formData.qrFile ? "text-green-400" : ""} />
                        </label>
                        {fieldErrors.qrCode && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.qrCode}</p>}
                      </div>

                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block mb-1" style={{ fontFamily: FM }}>Custom UPI ID (for this event)</label>
                        <input
                          type="text"
                          placeholder="e.g. event@upi"
                          className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                          style={{ background: "var(--sk-surface)", border: `1px solid ${fieldErrors.customUpiId ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}`, fontFamily: FB }}
                          value={formData.customUpiId}
                          onChange={e => { setFormData(p => ({...p, customUpiId: e.target.value})); setFieldErrors(fe => ({...fe, customUpiId: ""})); }}
                          onFocus={e => e.currentTarget.style.borderColor = fieldErrors.customUpiId ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "rgba(255,255,255,0.3)"}
                          onBlur={e => e.currentTarget.style.borderColor = fieldErrors.customUpiId ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : "var(--sk-raised)"}
                        />
                        {fieldErrors.customUpiId && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{fieldErrors.customUpiId}</p>}
                      </div>
                    </div>
                  )}

                  {formData.useDefaultQr && (
                    <div className="space-y-2 pt-1">
                      {clubQrUrl && clubUpiId ? (
                        <div className="text-xs text-emerald-400 font-medium px-2 flex items-center gap-1.5" style={{ fontFamily: FB }}>
                          <CheckCircle size={13} /> Default UPI ID: {clubUpiId}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-1.5" style={{ fontFamily: FB }}>
                          {!clubQrUrl && (
                            <p className="text-[color:var(--sk-brand)] font-medium flex items-center gap-1.5">
                              ⚠️ Default Payment QR Code is not uploaded in Settings.
                            </p>
                          )}
                          {!clubUpiId && (
                            <p className="text-[color:var(--sk-brand)] font-medium flex items-center gap-1.5">
                              ⚠️ Default Payment UPI ID is not added in Settings.
                            </p>
                          )}
                          <p className="text-[color:var(--sk-muted)] text-[11px] pt-0.5">
                            Please configure payment details in <strong>Club Settings</strong> or select <strong>Custom QR &amp; UPI</strong> above.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-xs text-[color:var(--sk-danger)] px-1" style={{ fontFamily: FM }}>{error}</p>
        )}
        <div className="pt-4 mt-8">
          <motion.button 
            whileHover={submitting ? undefined : { scale: 1.02 }} 
            whileTap={submitting ? undefined : { scale: 0.98 }} 
            onClick={handleSubmit} 
            disabled={submitting} 
            className={`px-8 py-3.5 bg-[color:var(--sk-brand)] text-white text-sm font-semibold rounded-xl transition-all ${submitting ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`} 
            style={{ fontFamily: FB }} 
            onMouseEnter={e => !submitting && (e.currentTarget.style.boxShadow = "none")} 
            onMouseLeave={e => !submitting && (e.currentTarget.style.boxShadow = "none")}
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Publishing...</span>
              </div>
            ) : (
              "Publish Event"
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
