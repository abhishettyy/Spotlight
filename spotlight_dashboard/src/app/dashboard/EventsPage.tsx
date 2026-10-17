import { useState, useEffect, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Users, MapPin, Eye, EyeOff, CheckCircle, ChevronLeft, Check, Upload, X, AlertTriangle, Image as ImageIcon, Camera } from "lucide-react";
import { fetchEventRegistrations, approveRegistration, rejectRegistration, updateEvent, sanitizeErrorMessage } from "../api";
import confetti from "canvas-confetti";
import { useTheme } from "../theme";
import { FC, FM, FB, parseLocalDate, formatDateTime12H, formatEventHeaderDate, LiveTag, getEventStatus, ClubEvent, Registration } from "./shared";
// The QR scanner library is large and only needed when a club opens the scanner
const TicketScannerModal = lazy(() => import("./TicketScannerModal").then(m => ({ default: m.TicketScannerModal })));
import { EventsTable } from "./EventsTable";
import { GlassDatePicker } from "./GlassFields";

export const checkScanStatus = (eventDateStr?: string | null, eventEndDateStr?: string | null) => {
  if (!eventDateStr) {
    return { enabled: false, reason: "Scan disabled", isUpcoming: false };
  }

  const eventStart = parseLocalDate(eventDateStr);
  if (!eventStart) {
    return { enabled: false, reason: "Scan disabled", isUpcoming: false };
  }

  const now = new Date();

  // 7:00 AM on the morning of event date
  const morningStart = new Date(
    eventStart.getFullYear(),
    eventStart.getMonth(),
    eventStart.getDate(),
    7, 0, 0, 0
  );
  // If event starts earlier than 7 AM (e.g. Midnight 00:00), windowStart opens 2 hours before start
  const windowStart = eventStart < morningStart 
    ? new Date(eventStart.getTime() - 2 * 60 * 60 * 1000)
    : morningStart;

  const eventEnd = eventEndDateStr ? parseLocalDate(eventEndDateStr) : null;
  const effectiveEnd = eventEnd ?? new Date(eventStart.getTime() + 6 * 60 * 60 * 1000);
  const windowEnd = new Date(effectiveEnd.getTime() + 6 * 60 * 60 * 1000);

  if (now < windowStart) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateFormatted = `${monthNames[eventStart.getMonth()]} ${eventStart.getDate()}`;
    return { enabled: false, reason: `Opens ${dateFormatted} at 7:00 AM`, isUpcoming: true };
  }

  if (now > windowEnd) {
    return { enabled: false, reason: "Event Concluded", isUpcoming: false };
  }

  return { enabled: true, reason: "Scanner Active", isUpcoming: false };
};


export function EventsPage({ 
  EVENTS, 
  allRegistrations, 
  onRegistrationsChange, 
  getToken,
  selectedEventId,
  setSelectedEventId,
  showTeams,
  setShowTeams,
  refreshEvents
}: {
  EVENTS: ClubEvent[];
  allRegistrations: Registration[];
  onRegistrationsChange: (updater: (prev: Registration[]) => Registration[]) => void;
  getToken: () => Promise<string | null>;
  selectedEventId: string | null;
  setSelectedEventId: (eventId: string | null, pushHistory?: boolean) => void;
  showTeams: boolean;
  setShowTeams: (val: boolean, pushHistory?: boolean) => void;
  refreshEvents: () => Promise<void>;
}) {
  const { isDark } = useTheme();
  const [regsLoading, setRegsLoading] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ date: "", endDate: "", deadline: "", venue: "", capacity: "", minTeamSize: "1", teamSizeLimit: "" });
  const [editOriginal, setEditOriginal] = useState({ date: "", endDate: "", deadline: "", venue: "", capacity: "", minTeamSize: "1", teamSizeLimit: "" });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPasswordText, setShowEditPasswordText] = useState(false);
  const [editPasswordError, setEditPasswordError] = useState<string | null>(null);
  const [updatingEvent, setUpdatingEvent] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerPendingBase64, setBannerPendingBase64] = useState<string | null>(null);
  const [showBannerPasswordModal, setShowBannerPasswordModal] = useState(false);
  const [bannerPassword, setBannerPassword] = useState("");
  const [bannerPasswordError, setBannerPasswordError] = useState<string | null>(null);
  const [showBannerPassword, setShowBannerPassword] = useState(false);
  const [showFullBannerModal, setShowFullBannerModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [scannedAttendees, setScannedAttendees] = useState<any[]>([]);

  useEffect(() => {
    setShowParticipants(false);
    setShowApprovals(false);
    setSearchQuery("");
    setShowEditModal(false);
    setBannerError(null);
    setBannerPendingBase64(null);
    setShowBannerPasswordModal(false);
    setBannerPassword("");
    setBannerPasswordError(null);
    setShowFullBannerModal(false);
    setShowScannerModal(false);
    setScannedAttendees([]);
  }, [selectedEventId]);

  useEffect(() => {
    if (showFullBannerModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showFullBannerModal]);

  const registrations = selectedEventId
    ? allRegistrations.filter(r => r.eventId === selectedEventId)
    : [];

  const activeEvent = EVENTS.find(e => e.id === selectedEventId);
  const isEventFinished = activeEvent 
    ? (getEventStatus(activeEvent) === "previous" || (() => {
        if (!activeEvent.date && !activeEvent.eventDate) return false;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = parseLocalDate(activeEvent.eventDate || activeEvent.date);
        return start ? start < todayStart : false;
      })())
    : false;
  const pending = registrations.filter(r => r.status?.toLowerCase() === "pending");
  const approved = registrations.filter(r => r.status?.toLowerCase() === "confirmed");
  const rejected = registrations.filter(r => {
    const s = r.status?.toLowerCase();
    return s === "rejected" || s === "cancelled";
  });

  useEffect(() => {
    if (!selectedEventId) return;

    let isMounted = true;

    const already = allRegistrations.some(r => r.eventId === selectedEventId);
    if (!already) {
      setRegsLoading(true);
    }

    let inFlight = false;
    const poll = async () => {
      // Skip while the tab is hidden, or while the previous request is still running on a slow server
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const token = await getToken();
        if (!token || !isMounted) return;
        const data = await fetchEventRegistrations(selectedEventId, token);
        if (!isMounted) return;

        const regs = (data.registrations ?? []).map((r: any) => ({
          ...r,
          eventId: selectedEventId,
          eventTitle: activeEvent?.title ?? '',
        }));

        onRegistrationsChange(prev => {
          const otherEventsRegs = prev.filter(r => r.eventId !== selectedEventId);
          return [...otherEventsRegs, ...regs];
        });
      } catch (e) {
        console.error("Poll registrations failed:", e);
      } finally {
        inFlight = false;
        if (isMounted) {
          setRegsLoading(false);
        }
      }
    };

    poll();

    const intervalId = setInterval(poll, 4000);
    // Catch up as soon as the club comes back to the tab
    const onVisible = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [selectedEventId]);

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    if (isEventFinished) return;
    try {
      const docW = document.documentElement.clientWidth || 1000;
      const docH = document.documentElement.clientHeight || 800;
      const x = e.clientX / docW;
      const y = e.clientY / docH;
      confetti({
        particleCount: 18,
        spread: 45,
        origin: { x, y },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
        gravity: 0.8,
        scalar: 0.65,
        ticks: 90
      });

      const token = await getToken();
      await approveRegistration(id, token ?? undefined);

      onRegistrationsChange(prev =>
        prev.map(r => {
          if (r.id === id) {
            return { ...r, status: 'CONFIRMED' };
          }
          return r;
        })
      );
    } catch (e) {
      console.error('Approve failed:', e);
    }
  };

  const handleReject = async (id: string) => {
    if (isEventFinished) return;
    try {
      const token = await getToken();
      const targetReg = allRegistrations.find(r2 => r2.id === id);
      const isLeader = targetReg?.team && targetReg.user?.id === targetReg.team.leaderId;
      const teamId = targetReg?.team?.id;

      onRegistrationsChange(prev =>
        prev.map(r => {
          if (r.id === id || (isLeader && teamId && r.team?.id === teamId)) {
            return { ...r, status: 'REJECTED' };
          }
          return r;
        })
      );
      await rejectRegistration(id, token ?? undefined);
    } catch (e) {
      console.error('Reject failed:', e);
    }
  };

  if (activeEvent) {
    const teamGroups = new Map<string, { id: string; name: string; passkey: string; members: Registration[] }>();
    registrations.forEach(r => {
      if (r.team && r.status?.toLowerCase() !== 'rejected') {
        if (!teamGroups.has(r.team.id)) {
          teamGroups.set(r.team.id, { ...r.team, members: [] });
        }
        const currentTeam = teamGroups.get(r.team.id)!;
        const exists = currentTeam.members.some(m => (m.user?.id && r.user?.id && m.user.id === r.user.id) || m.id === r.id);
        if (!exists) {
          currentTeam.members.push(r);
        }
      }
    });
    const teamsList = Array.from(teamGroups.values());

    return (
      <div className="p-5 md:p-8 lg:p-10 space-y-8 max-w-6xl">
        {(showParticipants || showTeams || showApprovals) ? (
          <button onClick={() => { setShowParticipants(false); setShowTeams(false); setShowApprovals(false); }}
            className="flex items-center gap-2 text-sm transition-all duration-300 cursor-pointer"
            style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-fg)", fontFamily: FB }}
            onMouseEnter={e => (e.currentTarget.style.color = isDark ? "#eeeeee" : "var(--sk-brand)")}
            onMouseLeave={e => (e.currentTarget.style.color = isDark ? "var(--sk-muted)" : "var(--sk-fg)")}
          ><ChevronLeft size={14} /> Return to Event</button>
        ) : (
          <button onClick={() => { setSelectedEventId(null); setShowTeams(false, false); }}
            className="flex items-center gap-2 text-sm transition-all duration-300 cursor-pointer"
            style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-fg)", fontFamily: FB }}
            onMouseEnter={e => (e.currentTarget.style.color = isDark ? "#eeeeee" : "var(--sk-brand)")}
            onMouseLeave={e => (e.currentTarget.style.color = isDark ? "var(--sk-muted)" : "var(--sk-fg)")}
          ><ChevronLeft size={14} /> Back to Events</button>
        )}

        {showTeams ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-[13px] tracking-[0.4em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Manage Teams ({teamsList.length})</h1>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teamsList.map(team => (
                <div key={team.id} className="p-6 rounded-2xl flex flex-col" style={{
                  background: isDark ? "var(--sk-surface)" : "#ffffff",
                  border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                  boxShadow: isDark ? "none" : "0 2px 10px var(--sk-surface)"
                }}>
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-lg leading-tight" style={{ fontFamily: FC }}>{team.name}</h3>
                      <p className="text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] font-mono mt-1 tracking-wider">PASSKEY: {team.passkey || 'Pending Payment'}</p>
                    </div>
                    <span className="text-[11px] bg-[color:var(--sk-raised)] dark:bg-white/5 border border-[color:var(--sk-line)] dark:border-transparent px-2 py-1 rounded text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>{team.members.length} MEMBERS</span>
                  </div>
                  <div className="space-y-3 mt-auto">
                    {team.members.map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-[color:var(--sk-surface)] dark:bg-black/20 p-2.5 rounded-lg border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]">
                        <div className="flex flex-col">
                          <span className="text-xs text-[color:var(--sk-fg)] dark:text-[#ddd]" style={{ fontFamily: FB }}>{m.user?.name || m.user?.usn || 'Unknown'}</span>
                          <span className="text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FM }}>{m.user?.usn || m.user?.email}</span>
                        </div>
                        <span className="text-[11px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm" style={{ 
                          color: m.status?.toLowerCase() === 'confirmed' ? '#10b981' : '#f59e0b',
                          background: m.status?.toLowerCase() === 'confirmed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          fontFamily: FM
                        }}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : showApprovals ? (
          <div className="mt-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-[13px] tracking-[0.4em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] mb-1" style={{ fontFamily: FM }}>Registration Approval</h1>
                <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>{pending.length} pending · {approved.length} approved · {rejected.length} rejected</p>
              </div>
            </div>

            {isEventFinished && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 text-xs flex items-center gap-2.5" style={{ fontFamily: FB }}>
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>This event has finished. Approving or rejecting pending registrations is disabled.</span>
              </div>
            )}

            {/* Pending requests table */}
            <div>
              <p className="text-[11px] tracking-[0.4em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] mb-4" style={{ fontFamily: FM }}>Pending Requests ({pending.length})</p>
              {pending.length === 0 ? (
                <div className="p-8 rounded-xl text-center text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ background: isDark ? "var(--sk-surface)" : "#ffffff", border: isDark ? "1px dashed var(--sk-line)" : "1px dashed var(--sk-raised)", fontFamily: FB }}>No pending requests — you're all caught up.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] bg-white dark:bg-white/[0.005] dark:shadow-none">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]" style={{ background: isDark ? "var(--sk-surface)" : "#f8fafc" }}>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Email</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Phone</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>USN</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Branch</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Team Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>UTR / Payment</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Date</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] text-left" style={{ fontFamily: FM }}>Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      <AnimatePresence>
                        {pending.map((req) => {
                          const isLeader = req.team ? req.team.leaderId === req.user?.id : false;
                          return (
                            <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }} className="hover:bg-[color:var(--sk-surface)] dark:hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 max-w-[180px]">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-[color:var(--sk-raised)] dark:bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-[color:var(--sk-muted)] dark:text-white/50">{(req.user?.name ?? '?').charAt(0)}</div>
                                  <p className="text-sm font-medium text-[color:var(--sk-fg)] dark:text-white/80 truncate" title={req.user?.name ?? 'Unknown'} style={{ fontFamily: FB }}>{req.user?.name ?? 'Unknown'}</p>
                                </div>
                              </td>
                              <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[200px] truncate" title={req.user?.email ?? '—'} style={{ fontFamily: FM }}>{req.user?.email ?? '—'}</td>
                              <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[130px] truncate" title={req.user?.phone ?? '—'}>{req.user?.phone ?? '—'}</td>
                              <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[120px] truncate" title={req.user?.usn ?? '—'}>{req.user?.usn ?? '—'}</td>
                              <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[90px] truncate" title={req.user?.branch ?? '—'}>{req.user?.branch ?? '—'}</td>
                              <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[180px]">
                                {req.team ? (
                                  <div>
                                    <span className="font-medium text-[color:var(--sk-fg)] dark:text-white/80 block truncate" title={req.team.name} style={{ fontFamily: FB }}>{req.team.name}</span>
                                    <p className="text-[10px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] font-mono">Passkey: {req.team.passkey || 'Pending Payment'}</p>
                                  </div>
                                ) : (
                                  <span className="text-[color:var(--sk-faint)] dark:text-[color:var(--sk-muted)] font-mono">—</span>
                                )}
                              </td>
                              <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[150px]">
                                {activeEvent.price === 0 ? (
                                  <span className="text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">Free</span>
                                ) : req.team ? (
                                  isLeader ? (
                                    req.transaction_id ? (
                                      <span className="select-all text-emerald-700 dark:text-[#a3e635] bg-emerald-500/10 dark:bg-white/5 px-2 py-0.5 rounded border border-emerald-500/20 dark:border-[color:var(--sk-line)] text-[11px] truncate block" title={req.transaction_id}>{req.transaction_id}</span>
                                    ) : (
                                      <span className="text-amber-600 dark:text-[#e59866] text-[10px] uppercase tracking-wider">Pending Upload</span>
                                    )
                                  ) : (
                                    <span className="text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] italic text-[11px]">Member</span>
                                  )
                                ) : (
                                  req.transaction_id ? (
                                    <span className="select-all text-emerald-700 dark:text-[#a3e635] bg-emerald-500/10 dark:bg-white/5 px-2 py-0.5 rounded border border-emerald-500/20 dark:border-[color:var(--sk-line)] text-[11px] truncate block" title={req.transaction_id}>{req.transaction_id}</span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-[#e59866] text-[10px] uppercase tracking-wider">Pending Upload</span>
                                  )
                                )}
                              </td>
                              <td className="p-4 text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] font-mono whitespace-nowrap">{req.created_at ? formatDateTime12H(req.created_at, false) : '—'}</td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    disabled={isEventFinished}
                                    onClick={(e) => !isEventFinished && handleApprove(req.id, e)}
                                    title="Approve Registration"
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                      isEventFinished 
                                        ? 'bg-[color:var(--sk-raised)] dark:bg-white/5 text-black/30 dark:text-white/30 border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] cursor-not-allowed opacity-50' 
                                        : 'bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/20 hover:scale-105 cursor-pointer'
                                    }`}
                                    style={{ fontFamily: FB }}
                                  >
                                    <Check size={14} /> Approve
                                  </button>
                                  <button
                                    disabled={isEventFinished}
                                    onClick={() => !isEventFinished && handleReject(req.id)}
                                    title="Reject Registration"
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                      isEventFinished 
                                        ? 'bg-[color:var(--sk-raised)] dark:bg-white/5 text-black/30 dark:text-white/30 border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] cursor-not-allowed opacity-50' 
                                        : 'bg-[color:var(--sk-brand)]/10 hover:bg-[color:var(--sk-brand)]/20 text-[color:var(--sk-brand)] border-[color:var(--sk-brand)]/20 hover:scale-105 cursor-pointer'
                                    }`}
                                    style={{ fontFamily: FB }}
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px] tracking-[0.4em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] mb-4" style={{ fontFamily: FM }}>Approved ({approved.length})</p>
              {approved.length === 0 ? (
                <div className="p-8 rounded-xl text-center text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ background: isDark ? "var(--sk-surface)" : "#ffffff", border: isDark ? "1px dashed var(--sk-line)" : "1px dashed var(--sk-raised)", fontFamily: FB }}>No approved registrations yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] bg-white dark:bg-white/[0.005] dark:shadow-none">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]" style={{ background: isDark ? "var(--sk-surface)" : "#f8fafc" }}>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Email</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Phone</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>USN</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Branch</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Team Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>UTR / Payment</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Date</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] text-left" style={{ fontFamily: FM }}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {approved.map((req) => {
                        const isLeader = req.team ? req.team.leaderId === req.user?.id : false;
                        return (
                          <tr key={req.id} className="hover:bg-[color:var(--sk-surface)] dark:hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 max-w-[180px]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[color:var(--sk-raised)] dark:bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-[color:var(--sk-muted)] dark:text-white/50">{(req.user?.name ?? '?').charAt(0)}</div>
                                <p className="text-sm font-medium text-[color:var(--sk-fg)] dark:text-white/80 truncate" title={req.user?.name ?? 'Unknown'} style={{ fontFamily: FB }}>{req.user?.name ?? 'Unknown'}</p>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[200px] truncate" title={req.user?.email ?? '—'} style={{ fontFamily: FM }}>{req.user?.email ?? '—'}</td>
                            <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[130px] truncate" title={req.user?.phone ?? '—'}>{req.user?.phone ?? '—'}</td>
                            <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[120px] truncate" title={req.user?.usn ?? '—'}>{req.user?.usn ?? '—'}</td>
                            <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[90px] truncate" title={req.user?.branch ?? '—'}>{req.user?.branch ?? '—'}</td>
                            <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[180px]">
                              {req.team?.name ? (
                                <span className="truncate block font-medium text-[color:var(--sk-fg)] dark:text-white/80" title={req.team.name}>{req.team.name}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[150px]">
                              {activeEvent.price === 0 ? (
                                <span className="text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">Free</span>
                              ) : req.team ? (
                                isLeader ? (
                                  <span className="truncate block text-[color:var(--sk-fg)] dark:text-white" title={req.transaction_id ?? '—'}>{req.transaction_id ?? '—'}</span>
                                ) : (
                                  <span className="italic text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">Member</span>
                                )
                              ) : (
                                <span className="truncate block text-[color:var(--sk-fg)] dark:text-white" title={req.transaction_id ?? '—'}>{req.transaction_id ?? '—'}</span>
                              )}
                            </td>
                            <td className="p-4 text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] font-mono whitespace-nowrap">{req.created_at ? formatDateTime12H(req.created_at, false) : '—'}</td>
                            <td className="p-4 text-center">
                              <span className="text-[11px] text-green-600 dark:text-green-500 uppercase tracking-widest font-bold" style={{ fontFamily: FM }}>Approved</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px] tracking-[0.4em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] mb-4" style={{ fontFamily: FM }}>Rejected ({rejected.length})</p>
              {rejected.length === 0 ? (
                <div className="p-8 rounded-xl text-center text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ background: isDark ? "var(--sk-surface)" : "#ffffff", border: isDark ? "1px dashed var(--sk-line)" : "1px dashed var(--sk-raised)", fontFamily: FB }}>No rejected registrations.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] bg-white dark:bg-white/[0.005] dark:shadow-none">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]" style={{ background: isDark ? "var(--sk-surface)" : "#f8fafc" }}>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Email</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Phone</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>USN</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Branch</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Team Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>UTR / Payment</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Date</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] text-left" style={{ fontFamily: FM }}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {rejected.map((req) => {
                        const isLeader = req.team ? req.team.leaderId === req.user?.id : false;
                        return (
                          <tr key={req.id} className="hover:bg-[color:var(--sk-surface)] dark:hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 max-w-[180px]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[color:var(--sk-raised)] dark:bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-[color:var(--sk-muted)] dark:text-white/50">{(req.user?.name ?? '?').charAt(0)}</div>
                                <p className="text-sm font-medium text-[color:var(--sk-fg)] dark:text-white/80 truncate" title={req.user?.name ?? 'Unknown'} style={{ fontFamily: FB }}>{req.user?.name ?? 'Unknown'}</p>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[200px] truncate" title={req.user?.email ?? '—'} style={{ fontFamily: FM }}>{req.user?.email ?? '—'}</td>
                            <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[130px] truncate" title={req.user?.phone ?? '—'}>{req.user?.phone ?? '—'}</td>
                            <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[120px] truncate" title={req.user?.usn ?? '—'}>{req.user?.usn ?? '—'}</td>
                            <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[90px] truncate" title={req.user?.branch ?? '—'}>{req.user?.branch ?? '—'}</td>
                            <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[180px]">
                              {req.team ? (
                                <div>
                                  <span className="font-medium text-[color:var(--sk-fg)] dark:text-white/80 block truncate" title={req.team.name} style={{ fontFamily: FB }}>{req.team.name}</span>
                                  <p className="text-[10px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] font-mono">Passkey: {req.team.passkey}</p>
                                </div>
                              ) : (
                                <span className="text-[color:var(--sk-faint)] dark:text-[color:var(--sk-muted)] font-mono">—</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-[150px]">
                              {activeEvent.price === 0 ? (
                                <span className="text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">Free</span>
                              ) : req.team ? (
                                isLeader ? (
                                  req.transaction_id ? (
                                    <span className="select-all text-red-600 dark:text-[#f87171] bg-red-500/10 dark:bg-white/5 px-2 py-0.5 rounded border border-red-500/20 dark:border-[color:var(--sk-line)] text-[11px] truncate block" title={req.transaction_id}>{req.transaction_id}</span>
                                  ) : (
                                    <span className="text-[color:var(--sk-faint)] dark:text-[color:var(--sk-muted)] text-[10px] uppercase tracking-wider">—</span>
                                  )
                                ) : (
                                  <span className="text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] italic text-[11px]">Member</span>
                                )
                              ) : (
                                req.transaction_id ? (
                                  <span className="select-all text-red-600 dark:text-[#f87171] bg-red-500/10 dark:bg-white/5 px-2 py-0.5 rounded border border-red-500/20 dark:border-[color:var(--sk-line)] text-[11px] truncate block" title={req.transaction_id}>{req.transaction_id}</span>
                                ) : (
                                  <span className="text-[color:var(--sk-faint)] dark:text-[color:var(--sk-muted)] text-[10px] uppercase tracking-wider">—</span>
                                )
                              )}
                            </td>
                            <td className="p-4 text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] font-mono whitespace-nowrap">{req.created_at ? formatDateTime12H(req.created_at, false) : '—'}</td>
                            <td className="p-4 text-center">
                              <span className="text-[11px] text-[color:var(--sk-danger)] uppercase tracking-widest font-bold" style={{ fontFamily: FM }}>Rejected</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : showParticipants ? (() => {
          const dbConfirmed = registrations.filter(r => !!r.checkedInAt).map(r => ({
            id: r.id,
            attendee: {
              name: r.user?.name ?? 'Unknown',
              email: r.user?.email ?? '',
              usn: r.user?.usn ?? '',
              branch: r.user?.branch ?? '',
              phone: r.user?.phone ?? '',
              year: r.user?.year,
              sem: r.user?.sem,
              status: r.status,
              isLeader: r.team?.leaderId === r.user?.id,
            },
            team: r.team ? {
              name: r.team.name,
              passkey: r.team.passkey,
            } : null,
            status: 'CONFIRMED',
          }));

          const combinedAttendanceMap = new Map<string, any>();
          [...dbConfirmed, ...scannedAttendees].forEach(item => {
            const key = item.attendee?.usn || item.attendee?.email || item.id;
            if (key && !combinedAttendanceMap.has(key)) {
              combinedAttendanceMap.set(key, item);
            }
          });
          const combinedAttendanceList = Array.from(combinedAttendanceMap.values());

          return (
            <div className="mt-4 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-[13px] tracking-[0.4em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] mb-1" style={{ fontFamily: FM }}>Manage Attendees</h1>
                  <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>
                    <span className="text-[#10b981] font-bold">{combinedAttendanceList.length} checked-in</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      const headers = ["Name", "Email", "USN", "Branch", "Year", "Semester", "Contact", "Type", "Team Name"];
                      const rows = combinedAttendanceList.map(s => {
                        const attendee = s.attendee || {};
                        const team = s.team || null;
                        const rawPhone = attendee.phone ? String(attendee.phone).trim() : '';
                        const phoneFormatted = rawPhone ? `\t${rawPhone}` : '';
                        return [
                          attendee.name ?? 'Unknown',
                          attendee.email ?? '',
                          attendee.usn ?? '',
                          attendee.branch ?? '',
                          attendee.year ? `Y${attendee.year}` : '',
                          attendee.sem ? `Sem ${attendee.sem}` : '',
                          phoneFormatted,
                          team ? 'TEAM' : 'SOLO',
                          team?.name ?? '-'
                        ];
                      });
                      const csvContent = [headers, ...rows]
                        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
                        .join("\n");
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", `${activeEvent.title.replace(/\s+/g, "_")}_scanned_attendance.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    disabled={combinedAttendanceList.length === 0}
                    className="text-xs px-4 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 border border-green-500/20 transition-all font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" 
                    style={{ fontFamily: FB }}
                  >
                    Export CSV
                  </button>
                  {(() => {
                    const scanInfo = checkScanStatus(activeEvent.eventDate || activeEvent.date, activeEvent.eventEndDate);
                    return (
                      <button
                        disabled={!scanInfo.enabled}
                        onClick={() => {
                          if (scanInfo.enabled) {
                            setShowScannerModal(true);
                            setScannerKey(k => k + 1);
                          }
                        }}
                        title={scanInfo.reason}
                        className={`text-xs px-4 py-2 rounded-lg border transition-all font-semibold flex items-center gap-2 ${
                          scanInfo.enabled
                            ? "bg-[color:var(--sk-brand)]/10 hover:bg-[color:var(--sk-brand)]/20 text-[color:var(--sk-brand)] border-[color:var(--sk-brand)]/30 cursor-pointer"
                            : "bg-[color:var(--sk-brand)]/10 text-[color:var(--sk-faint)] dark:text-white/30 border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] cursor-not-allowed opacity-50"
                        }`}
                        style={{ fontFamily: FB }}
                      >
                        <Camera size={14} /> Scan Ticket QR
                        {!scanInfo.enabled && (
                          <span className={`text-[10px] font-mono ${scanInfo.isUpcoming ? 'text-emerald-500 dark:text-emerald-400 font-semibold' : 'text-amber-500 dark:text-amber-400/80'}`}>{scanInfo.reason}</span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {showScannerModal && (
                <Suspense fallback={null}>
                <TicketScannerModal
                  activeEvent={activeEvent}
                  getToken={getToken}
                  scannerKey={scannerKey}
                  onClose={() => setShowScannerModal(false)}
                  onScanSuccess={async (scannedTicket) => {
                    await refreshEvents();
                    try {
                      const token = await getToken();
                      if (token && activeEvent?.id) {
                        const data = await fetchEventRegistrations(activeEvent.id, token);
                        const regs = (data.registrations ?? []).map((r: any) => ({
                          ...r,
                          eventId: activeEvent.id,
                          eventTitle: activeEvent?.title ?? '',
                        }));
                        onRegistrationsChange(prev => {
                          const otherEventsRegs = prev.filter(r => r.eventId !== activeEvent.id);
                          return [...otherEventsRegs, ...regs];
                        });
                      }
                    } catch (err) {
                      console.error("Failed to refresh registrations on scan:", err);
                    }
                    setScannedAttendees(prev => {
                      let newEntries: any[] = [];
                      if (scannedTicket.team && Array.isArray(scannedTicket.team.members) && scannedTicket.team.members.length > 0) {
                        newEntries = scannedTicket.team.members.map((m: any) => ({
                          id: m.id || `${scannedTicket.id}-${m.email || m.usn}`,
                          attendee: {
                            name: m.name,
                            email: m.email,
                            usn: m.usn,
                            branch: m.branch,
                            phone: m.phone,
                            year: m.year,
                            sem: m.sem,
                            status: 'CONFIRMED',
                            isLeader: m.isLeader,
                          },
                          team: {
                            name: scannedTicket.team.name,
                            passkey: scannedTicket.team.passkey,
                            leader: scannedTicket.team.leader,
                          },
                          status: 'CONFIRMED',
                        }));
                      } else {
                        newEntries = [scannedTicket];
                      }

                      const updated = [...prev];
                      for (const entry of newEntries) {
                        const entryKey = entry.attendee?.usn || entry.attendee?.email || entry.id;
                        const alreadyExists = updated.some(existing => {
                          const existingKey = existing.attendee?.usn || existing.attendee?.email || existing.id;
                          return existingKey === entryKey;
                        });
                        if (!alreadyExists) {
                          updated.push(entry);
                        }
                      }
                      return updated;
                    });
                  }}
                />
                </Suspense>
              )}

              <div className="relative max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search scanned attendees by name, USN, email, branch or team..."
                  className="w-full bg-white dark:bg-white/5 border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] rounded-xl px-4 py-2.5 text-xs text-[color:var(--sk-fg)] dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-[color:var(--sk-brand)]/40 focus:ring-1 focus:ring-[color:var(--sk-brand)]/40 transition-all dark:shadow-none"
                  style={{ fontFamily: FB }}
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] bg-white dark:bg-white/[0.005] dark:shadow-none">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]" style={{ background: isDark ? "var(--sk-surface)" : "#f8fafc" }}>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Name</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>USN</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Branch / Sem</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Contact</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Type</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Team Name</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] text-right" style={{ fontFamily: FM }}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {combinedAttendanceList.filter(s => {
                      const q = searchQuery.toLowerCase().trim();
                      if (!q) return true;
                      const a = s.attendee || {};
                      const t = s.team || {};
                      return (
                        (a.name ?? '').toLowerCase().includes(q) ||
                        (a.email ?? '').toLowerCase().includes(q) ||
                        (a.usn ?? '').toLowerCase().includes(q) ||
                        (a.branch ?? '').toLowerCase().includes(q) ||
                        (t.name ?? '').toLowerCase().includes(q)
                      );
                    }).map(s => {
                      const attendee = s.attendee || {};
                      const team = s.team || null;
                      return (
                        <tr key={s.id} className="hover:bg-[color:var(--sk-surface)] dark:hover:bg-white/[0.01] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {(attendee.name ?? '?').charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[color:var(--sk-fg)] dark:text-white/90 flex items-center gap-2" style={{ fontFamily: FB }}>
                                  {attendee.name ?? 'Unknown'}
                                  {attendee.isLeader && (
                                    <span className="text-[10px] text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">Leader</span>
                                  )}
                                </p>
                                <p className="text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mt-0.5" style={{ fontFamily: FM }}>{attendee.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">{attendee.usn ?? 'N/A'}</td>
                          <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">
                            {attendee.branch ? (
                              <div>
                                <p>{attendee.branch}</p>
                                <p className="text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mt-0.5 font-mono">
                                  {attendee.year ? `Y${attendee.year}` : ''}
                                  {attendee.year && attendee.sem ? ' · ' : ''}
                                  {attendee.sem ? `Sem ${attendee.sem}` : ''}
                                  {!attendee.year && !attendee.sem ? 'N/A' : ''}
                                </p>
                              </div>
                            ) : 'N/A'}
                          </td>
                          <td className="p-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] font-mono">{attendee.phone ?? 'N/A'}</td>
                          <td className="p-4">
                            {team ? (
                              <div>
                                <span className="text-[11px] bg-[color:var(--sk-raised)] text-[color:var(--sk-fg)] dark:bg-purple-500/10 dark:text-purple-400 border border-[color:var(--sk-line)] dark:border-purple-500/20 px-2 py-0.5 rounded font-bold" style={{ fontFamily: FM }}>TEAM</span>
                                <p className="text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mt-1 font-mono">Passkey: {team.passkey}</p>
                              </div>
                            ) : (
                              <span className="text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold" style={{ fontFamily: FM }}>SOLO</span>
                            )}
                          </td>
                          <td className="p-4 text-xs">
                            {team?.name ? (
                              <span className="font-medium text-[color:var(--sk-fg)] dark:text-white/90" style={{ fontFamily: FB }}>{team.name}</span>
                            ) : (
                              <span className="text-[color:var(--sk-faint)] dark:text-[color:var(--sk-muted)] font-mono">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-[11px] uppercase tracking-widest px-2.5 py-1 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" style={{ fontFamily: FM }}>
                              CHECKED IN
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {combinedAttendanceList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[color:var(--sk-brand)]/10 border border-[color:var(--sk-brand)]/20 flex items-center justify-center text-[color:var(--sk-brand)]">
                              <Camera size={24} />
                            </div>
                            <p className="text-sm font-semibold text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FB }}>No attendees scanned yet</p>
                            <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] max-w-sm" style={{ fontFamily: FB }}>
                              Click <span className="text-[color:var(--sk-brand)] font-semibold">"Scan Ticket QR"</span> above to start scanning.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })() : (
          <>
            {(() => {
              const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBannerError(null);
                try {
                  const base64: string = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = (ev) => {
                      if (!file.type.startsWith('image/')) { resolve(ev.target?.result as string); return; }
                      const img = new Image();
                      img.src = ev.target?.result as string;
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        const max = 1200;
                        if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/jpeg', 0.75));
                      };
                      img.onerror = reject;
                    };
                    reader.onerror = reject;
                  });
                  setBannerPendingBase64(base64);
                  setBannerPassword("");
                  setBannerPasswordError(null);
                  setShowBannerPasswordModal(true);
                } catch (err: any) {
                  setBannerError("Failed to read image. Please try again.");
                } finally {
                  e.target.value = "";
                }
              };

              const handleBannerPasswordConfirm = async () => {
                if (!bannerPassword) { setBannerPasswordError("Password is required."); return; }
                if (!bannerPendingBase64) return;
                setBannerUploading(true);
                setBannerPasswordError(null);
                try {
                  const token = await getToken();
                  await updateEvent(activeEvent.id, { bannerUrl: bannerPendingBase64, password: bannerPassword }, token ?? undefined);
                  setShowBannerPasswordModal(false);
                  setBannerPendingBase64(null);
                  setBannerPassword("");
                  await refreshEvents();
                } catch (err: any) {
                  setBannerPasswordError(sanitizeErrorMessage(err, "Incorrect password. Please try again."));
                } finally {
                  setBannerUploading(false);
                }
              };

              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl mb-6" style={{ background: isDark ? "var(--sk-surface)" : "#ffffff", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", boxShadow: isDark ? "none" : "0 2px 10px var(--sk-surface)" }}>
                    {activeEvent.bannerUrl ? (
                      <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => setShowFullBannerModal(true)}>
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]">
                          <img src={activeEvent.bannerUrl} alt="Banner thumbnail" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-[color:var(--sk-fg)] dark:text-white group-hover:text-[color:var(--sk-brand)] transition-colors flex items-center gap-2" style={{ fontFamily: FB }}>
                            <Eye size={15} className="text-[color:var(--sk-brand)]" /> Click to view full banner
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>
                        <ImageIcon size={16} className="text-[color:var(--sk-faint)] dark:text-white/40" /> No banner image uploaded for this event.
                      </div>
                    )}

                    <div className="flex items-center gap-3 ml-auto">
                      {bannerError && (
                        <p className="text-[11px] text-[color:var(--sk-danger)] font-medium truncate" style={{ fontFamily: FB }}>{bannerError}</p>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="banner-update-input"
                        className="hidden"
                        onChange={handleBannerChange}
                        disabled={bannerUploading || getEventStatus(activeEvent) === "previous"}
                      />
                      <label
                        htmlFor="banner-update-input"
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${getEventStatus(activeEvent) === "previous" ? "opacity-40 pointer-events-none" : "cursor-pointer text-[color:var(--sk-fg)] dark:text-white bg-[color:var(--sk-raised)] hover:bg-[color:var(--sk-raised)] dark:bg-white/5 dark:hover:bg-white/10"}`}
                        style={{ border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", fontFamily: FB }}
                      >
                        {bannerUploading ? (
                          <><div className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 dark:border-white/60 border-t-transparent animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload size={13} /> {activeEvent.bannerUrl ? "Update Banner" : "Upload Banner"}</>
                        )}
                      </label>
                    </div>
                  </div>

                  {showFullBannerModal && activeEvent.bannerUrl && typeof document !== "undefined" && createPortal(
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-8"
                        style={{
                          position: "fixed",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          width: "100vw",
                          height: "100dvh",
                          backgroundColor: "rgba(0, 0, 0, 0.95)",
                          backdropFilter: "blur(20px)",
                          WebkitBackdropFilter: "blur(20px)",
                        }}
                        onClick={() => setShowFullBannerModal(false)}
                      >
                        <button 
                          onClick={() => setShowFullBannerModal(false)}
                          className="banner-modal-close-btn fixed top-4 right-4 sm:top-6 sm:right-6 z-[100000] w-8 h-8 sm:w-9 sm:h-9 rounded-full cursor-pointer transition-all duration-200 flex items-center justify-center p-0"
                          style={{
                            color: "#ffffff",
                            backgroundColor: "var(--sk-raised)",
                            border: "none",
                            outline: "none",
                            boxShadow: "none",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
                            e.currentTarget.style.transform = "scale(1.06)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = "var(--sk-raised)";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          title="Close banner view"
                          aria-label="Close banner view"
                        >
                          <X size={18} color="#ffffff" strokeWidth={2.2} style={{ stroke: "#ffffff", color: "#ffffff" }} />
                        </button>
                        <div 
                          className="relative max-w-5xl max-h-[88vh] flex items-center justify-center p-2 rounded-2xl"
                          onClick={e => e.stopPropagation()}
                        >
                          <img 
                            src={activeEvent.bannerUrl} 
                            alt={activeEvent.title} 
                            className="w-auto h-auto max-w-full max-h-[82vh] object-contain rounded-xl border border-white/10" 
                          />
                        </div>
                      </motion.div>
                    </AnimatePresence>,
                    document.body
                  )}

                  <AnimatePresence>
                    {showBannerPasswordModal && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}>
                        <div className="w-full max-w-md p-8 rounded-3xl relative" style={{ background: isDark ? "#0c0c0c" : "var(--sk-canvas)", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", boxShadow: "none" }}>
                          <button onClick={() => { setShowBannerPasswordModal(false); setBannerPassword(""); setBannerPasswordError(null); }} className="absolute top-6 right-6 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
                          <h2 className="text-2xl font-bold text-[color:var(--sk-fg)] dark:text-white mb-2" style={{ fontFamily: FC }}>Confirm Banner Update</h2>
                          <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mb-6" style={{ fontFamily: FB }}>Enter your club password to save the new banner.</p>

                          <div className="space-y-1.5 mb-6">
                            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Password</label>
                            <input
                              autoFocus
                              type="password"
                              placeholder="Enter password"
                              value={bannerPassword}
                              onChange={e => { setBannerPassword(e.target.value); setBannerPasswordError(null); }}
                              onKeyDown={e => { if (e.key === "Enter" && !bannerUploading) handleBannerPasswordConfirm(); }}
                              className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all"
                              style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", fontFamily: FB }}
                              onFocus={e => e.currentTarget.style.borderColor = "var(--sk-line-strong)"}
                              onBlur={e => e.currentTarget.style.borderColor = isDark ? "var(--sk-line)" : "var(--sk-raised)"}
                            />
                          </div>

                          {bannerPasswordError && <p className="text-xs text-[color:var(--sk-danger)] font-medium mb-6 text-center" style={{ fontFamily: FB }}>{bannerPasswordError}</p>}

                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => { setShowBannerPasswordModal(false); setBannerPassword(""); setBannerPasswordError(null); }} className="px-6 py-2.5 text-xs text-[color:var(--sk-fg)] dark:text-white bg-[color:var(--sk-raised)] hover:bg-slate-300 dark:bg-white/[0.06] dark:hover:bg-white/10 rounded-full transition-all font-semibold cursor-pointer border border-[color:var(--sk-line)] dark:border-transparent" style={{ fontFamily: FB }}>Cancel</button>
                            <button
                              onClick={handleBannerPasswordConfirm}
                              disabled={bannerUploading}
                              className="px-6 py-2.5 text-xs text-white bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] rounded-full transition-all font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                              style={{ fontFamily: FB }}
                            >
                              {bannerUploading ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving...</> : "Confirm & Save"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              );
            })()}

            <div>
              <div className="flex items-center gap-3 mb-2">
                {getEventStatus(activeEvent) === "live" ? (
                  <LiveTag size="large" />
                ) : (
                  <span className="text-[11px] tracking-[0.3em] uppercase px-3 py-1 rounded-full"
                    style={{
                      background: isDark ? "var(--sk-raised)" : "var(--sk-raised)",
                      border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                      color: isDark ? "var(--sk-muted)" : "#475569",
                      fontFamily: FM
                    }}
                  >
                    {getEventStatus(activeEvent) === "previous" ? "Ended" : "Upcoming"}
                  </span>
                )}
                <span className="text-[11px] tracking-[0.2em] px-2 py-0.5 rounded-full"
                  style={{
                    background: isDark ? "var(--sk-raised)" : "var(--sk-raised)",
                    border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                    color: isDark ? "var(--sk-muted)" : "#475569",
                    fontFamily: FM
                  }}
                >{activeEvent.club}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FC }}>{activeEvent.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs" style={{ color: isDark ? "#cbd5e1" : "#475569", fontFamily: FB }}>
                 <span className="flex items-center gap-1.5"><Calendar size={12} className={isDark ? "text-[color:var(--sk-faint)]" : "text-[color:var(--sk-muted)]"} />{formatEventHeaderDate(activeEvent.eventDate || activeEvent.date, activeEvent.eventEndDate)}</span>
                 <span className="flex items-center gap-1.5"><MapPin size={12} className={isDark ? "text-[color:var(--sk-faint)]" : "text-[color:var(--sk-muted)]"} />{activeEvent.venue}</span>
                 {(() => {
                   const isTeam = activeEvent.eventType === 'Team' || (activeEvent.teamSizeLimit && activeEvent.teamSizeLimit > 1) || activeEvent.type === 'Team';
                   if (!isTeam) {
                     return (
                       <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20" style={{ fontFamily: FM }}>
                         <Users size={12} />Solo
                       </span>
                     );
                   }
                   const max = activeEvent.teamSizeLimit;
                   return (
                     <>
                       <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20" style={{ fontFamily: FM }}>
                         <Users size={12} />Team
                       </span>
                       {max ? (
                         <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-300 font-medium bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20" style={{ fontFamily: FM }}>
                           Size: {max}
                         </span>
                       ) : null}
                     </>
                   );
                 })()}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Venue Capacity", value: activeEvent.capacity || '∞' },
                { label: "Registered",     value: registrations.length },
                { label: "Pending Approval", value: pending.length },
              ].map((stat, i) => (
                 <div key={i} className="p-6 rounded-2xl" style={{
                   background: isDark ? "var(--sk-surface)" : "#ffffff",
                   border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                   boxShadow: isDark ? "none" : "0 2px 10px var(--sk-surface)"
                 }}>
                    <p className="text-[11px] tracking-[0.3em] uppercase mb-2 font-semibold" style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-muted)", fontFamily: FM }}>{stat.label}</p>
                    <p className="text-3xl font-semibold text-[color:var(--sk-fg)] dark:text-white">{stat.value}</p>
                 </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-8 mb-2">
               <div>
                 {activeEvent.registrationDeadline && (
                   <p className="text-xs" style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-muted)", fontFamily: FB }}>
                     Registration Deadline: <span className="font-semibold" style={{ color: isDark ? "#ffffff" : "var(--sk-fg)" }}>{formatDateTime12H(activeEvent.registrationDeadline)}</span>
                   </p>
                 )}
               </div>
               <motion.button
                 whileHover={getEventStatus(activeEvent) === "previous" ? undefined : { scale: 1.02 }}
                 whileTap={getEventStatus(activeEvent) === "previous" ? undefined : { scale: 0.97 }}
                 disabled={getEventStatus(activeEvent) === "previous"}
                 onClick={() => {
                   const formatLocalDateStr = (dStr?: string | null) => {
                     if (!dStr) return "";
                     const d = parseLocalDate(dStr);
                     if (!d) return "";
                     const year = d.getFullYear();
                     const month = String(d.getMonth() + 1).padStart(2, '0');
                     const day = String(d.getDate()).padStart(2, '0');
                     const hours = String(d.getHours()).padStart(2, '0');
                     const mins = String(d.getMinutes()).padStart(2, '0');
                     return `${year}-${month}-${day}T${hours}:${mins}`;
                   };

                   const startDateVal = formatLocalDateStr(activeEvent.eventDate || activeEvent.date);
                   const defaultEndDateVal = formatLocalDateStr(activeEvent.eventEndDate);

                   setEditForm({
                     date: startDateVal,
                     endDate: defaultEndDateVal,
                     deadline: formatLocalDateStr(activeEvent.registrationDeadline),
                     venue: activeEvent.venue || "",
                     capacity: activeEvent.capacity ? String(activeEvent.capacity) : "",
                     minTeamSize: activeEvent.minTeamSize ? String(activeEvent.minTeamSize) : "1",
                     teamSizeLimit: activeEvent.teamSizeLimit ? String(activeEvent.teamSizeLimit) : "",
                   });
                   setEditOriginal({
                     date: startDateVal,
                     endDate: defaultEndDateVal,
                     deadline: formatLocalDateStr(activeEvent.registrationDeadline),
                     venue: activeEvent.venue || "",
                     capacity: activeEvent.capacity ? String(activeEvent.capacity) : "",
                     minTeamSize: activeEvent.minTeamSize ? String(activeEvent.minTeamSize) : "1",
                     teamSizeLimit: activeEvent.teamSizeLimit ? String(activeEvent.teamSizeLimit) : "",
                   });
                   setEditErrors({});
                   setEditPassword("");
                   setEditPasswordError(null);
                   setShowEditPasswordModal(false);
                   setShowEditModal(true);
                 }}
                 className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[color:var(--sk-brand)] rounded-xl transition-all duration-300 ${getEventStatus(activeEvent) === "previous" ? "opacity-40 cursor-not-allowed" : ""}`}
                 onMouseEnter={e => {
                   if (getEventStatus(activeEvent) === "previous") return;
                   e.currentTarget.style.boxShadow = "none";
                 }}
                 onMouseLeave={e => {
                   e.currentTarget.style.boxShadow = "none";
                 }}
                 style={{ fontFamily: FB }}
               >
                 <Calendar size={14} /> Update Event
               </motion.button>
            </div>

            <div className="mt-8 pt-8 flex flex-wrap gap-5" style={{ borderTop: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)" }}>

              <div 
                onClick={() => {
                  if (!isEventFinished) setShowApprovals(true);
                }}
                className={`p-5 rounded-2xl flex items-center gap-5 transition-all duration-300 ${
                  isEventFinished ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
                style={{
                  background: isDark ? "var(--sk-surface)" : "#ffffff",
                  border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                  boxShadow: isDark ? "none" : "0 2px 10px var(--sk-surface)",
                  width: "fit-content",
                  minWidth: "280px"
                }}
                onMouseEnter={e => {
                  if (isEventFinished) return;
                  e.currentTarget.style.background = isDark ? "var(--sk-surface)" : "var(--sk-surface)";
                  e.currentTarget.style.borderColor = isDark ? "var(--sk-line)" : "var(--sk-raised)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  if (isEventFinished) return;
                  e.currentTarget.style.background = isDark ? "var(--sk-surface)" : "#ffffff";
                  e.currentTarget.style.borderColor = isDark ? "var(--sk-line)" : "var(--sk-raised)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isDark ? "var(--sk-surface)" : "var(--sk-surface)",
                    border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)"
                  }}
                >
                  <CheckCircle size={20} className={isEventFinished ? (isDark ? "text-white/30" : "text-black/30") : (isDark ? "text-white/80" : "text-[color:var(--sk-fg)]")} />
                  {!isEventFinished && pending.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[color:var(--sk-brand)] text-white text-[10px] font-bold flex items-center justify-center" style={{ fontFamily: FM }}>{pending.length}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-lg leading-tight ${isEventFinished ? (isDark ? 'text-white/40' : 'text-[color:var(--sk-faint)]') : (isDark ? 'text-white' : 'text-[color:var(--sk-fg)]')}`} style={{ fontFamily: FC }}>Registration Approval</h3>
                    {isEventFinished && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-wider" style={{ fontFamily: FM }}>Closed</span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: isEventFinished ? (isDark ? "var(--sk-faint)" : "var(--sk-muted)") : (isDark ? "var(--sk-muted)" : "var(--sk-muted)"), fontFamily: FB }}>
                    {isEventFinished ? "Disabled (Event has ended)" : "Review & approve pending requests"}
                  </p>
                </div>
              </div>

              <div 
                onClick={() => setShowParticipants(true)}
                className="p-5 rounded-2xl flex items-center gap-5 cursor-pointer transition-all duration-300" 
                style={{
                  background: isDark ? "var(--sk-surface)" : "#ffffff",
                  border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                  boxShadow: isDark ? "none" : "0 2px 10px var(--sk-surface)",
                  width: "fit-content",
                  minWidth: "280px"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDark ? "var(--sk-surface)" : "var(--sk-surface)";
                  e.currentTarget.style.borderColor = isDark ? "var(--sk-line)" : "var(--sk-raised)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isDark ? "var(--sk-surface)" : "#ffffff";
                  e.currentTarget.style.borderColor = isDark ? "var(--sk-line)" : "var(--sk-raised)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isDark ? "var(--sk-surface)" : "var(--sk-surface)",
                    border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)"
                  }}
                >
                  <Users size={20} className={isDark ? "text-white/80" : "text-[color:var(--sk-fg)]"} />
                </div>
                <div>
                  <h3 className={`font-medium text-lg leading-tight ${isDark ? 'text-white' : 'text-[color:var(--sk-fg)]'}`} style={{ fontFamily: FC }}>Manage Attendees</h3>
                  <p className="text-xs mt-1" style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-muted)", fontFamily: FB }}>View attendee list & attendance</p>
                </div>
              </div>

              {teamsList.length > 0 && (
                <div 
                  onClick={() => setShowTeams(true)}
                  className="p-5 rounded-2xl flex items-center gap-5 cursor-pointer transition-all duration-300" 
                  style={{
                    background: isDark ? "var(--sk-surface)" : "#ffffff",
                    border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                    boxShadow: isDark ? "none" : "0 2px 10px var(--sk-surface)",
                    width: "fit-content",
                    minWidth: "280px"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = isDark ? "var(--sk-surface)" : "var(--sk-surface)";
                    e.currentTarget.style.borderColor = isDark ? "var(--sk-line)" : "var(--sk-raised)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isDark ? "var(--sk-surface)" : "#ffffff";
                    e.currentTarget.style.borderColor = isDark ? "var(--sk-line)" : "var(--sk-raised)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isDark ? "var(--sk-surface)" : "var(--sk-surface)",
                      border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)"
                    }}
                  >
                    <Users size={20} className={isDark ? "text-white/80" : "text-[color:var(--sk-fg)]"} />
                  </div>
                  <div>
                    <h3 className={`font-medium text-lg leading-tight ${isDark ? 'text-white' : 'text-[color:var(--sk-fg)]'}`} style={{ fontFamily: FC }}>Manage Teams</h3>
                    <p className="text-xs mt-1" style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-muted)", fontFamily: FB }}>Oversee team slots per event</p>
                  </div>
                </div>
              )}

            </div>

            <AnimatePresence>
              {showEditModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start pt-16 justify-center p-6 overflow-y-auto" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}>
                  <div className="w-full max-w-lg p-8 rounded-3xl relative mb-24" style={{ background: isDark ? "#0c0c0c" : "var(--sk-canvas)", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", boxShadow: "none" }}>
                    <button onClick={() => setShowEditModal(false)} className="absolute top-6 right-6 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
                    <h2 className="text-2xl font-bold text-[color:var(--sk-fg)] dark:text-white mb-6" style={{ fontFamily: FC }}>Update Event</h2>

                    <div className="space-y-5">
                      
                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Event Start Date &amp; Time</label>
                        <GlassDatePicker value={editForm.date} onChange={v => {
                          setEditForm(p => ({...p, date: v}));
                          setEditErrors(e => ({...e, date: ""}));
                        }} />
                        {editErrors.date && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{editErrors.date}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Event End Date &amp; Time</label>
                        <GlassDatePicker value={editForm.endDate} onChange={v => { setEditForm(p => ({...p, endDate: v})); setEditErrors(e => ({...e, endDate: ""})); }} defaultTime="23:59" />
                        {editErrors.endDate && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{editErrors.endDate}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Registration Deadline</label>
                        <GlassDatePicker value={editForm.deadline} onChange={v => { setEditForm(p => ({...p, deadline: v})); setEditErrors(e => ({...e, deadline: ""})); }} defaultTime="23:59" />
                        {editErrors.deadline && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{editErrors.deadline}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Venue</label>
                        <input type="text" placeholder="Main Auditorium" className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: `1px solid ${editErrors.venue ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : (isDark ? "var(--sk-raised)" : "var(--sk-raised)")}`, fontFamily: FB }} value={editForm.venue} onChange={e => { setEditForm(p => ({...p, venue: e.target.value})); setEditErrors(er => ({...er, venue: ""})); }} onFocus={e => e.currentTarget.style.borderColor = editErrors.venue ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "var(--sk-danger)"} onBlur={e => e.currentTarget.style.borderColor = editErrors.venue ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : (isDark ? "var(--sk-raised)" : "var(--sk-raised)")} />
                        {editErrors.venue && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{editErrors.venue}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Venue Capacity</label>
                        <input type="number" placeholder="e.g. 200" min={1} className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: `1px solid ${editErrors.capacity ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : (isDark ? "var(--sk-raised)" : "var(--sk-raised)")}`, fontFamily: FB }} value={editForm.capacity} onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }} onChange={e => { const v = e.target.value; if (v === "" || parseInt(v) >= 1) { setEditForm(p => ({...p, capacity: v})); setEditErrors(er => ({...er, capacity: ""})); } }} onFocus={e => e.currentTarget.style.borderColor = editErrors.capacity ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "var(--sk-danger)"} onBlur={e => e.currentTarget.style.borderColor = editErrors.capacity ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : (isDark ? "var(--sk-raised)" : "var(--sk-raised)")} />
                        {editErrors.capacity && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{editErrors.capacity}</p>}
                      </div>

                      {activeEvent && (activeEvent.eventType === 'Team' || (activeEvent.teamSizeLimit && activeEvent.teamSizeLimit > 1) || activeEvent.type === 'Team') && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Min Team Size</label>
                            <input
                              type="number"
                              placeholder="1"
                              min={1}
                              max={editForm.teamSizeLimit ? parseInt(editForm.teamSizeLimit) : undefined}
                              className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all"
                              style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: `1px solid ${editErrors.minTeamSize ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : (isDark ? "var(--sk-raised)" : "var(--sk-raised)")}`, fontFamily: FB }}
                              value={editForm.minTeamSize}
                              onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }}
                              onChange={e => {
                                const v = e.target.value;
                                setEditForm(p => ({ ...p, minTeamSize: v }));
                                setEditErrors(er => ({ ...er, minTeamSize: "", teamSizeLimit: "" }));
                              }}
                              onFocus={e => e.currentTarget.style.borderColor = editErrors.minTeamSize ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "var(--sk-danger)"}
                              onBlur={e => e.currentTarget.style.borderColor = editErrors.minTeamSize ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : (isDark ? "var(--sk-raised)" : "var(--sk-raised)")}
                            />
                            {editErrors.minTeamSize && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{editErrors.minTeamSize}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Max Team Size</label>
                            <input
                              type="number"
                              placeholder="e.g. 4"
                              min={editForm.minTeamSize ? parseInt(editForm.minTeamSize) : 1}
                              className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all"
                              style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: `1px solid ${editErrors.teamSizeLimit ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : (isDark ? "var(--sk-raised)" : "var(--sk-raised)")}`, fontFamily: FB }}
                              value={editForm.teamSizeLimit}
                              onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }}
                              onChange={e => {
                                const v = e.target.value;
                                setEditForm(p => ({ ...p, teamSizeLimit: v }));
                                setEditErrors(er => ({ ...er, teamSizeLimit: "", minTeamSize: "", capacity: "" }));
                              }}
                              onFocus={e => e.currentTarget.style.borderColor = editErrors.teamSizeLimit ? "color-mix(in srgb, var(--sk-danger) 80%, transparent)" : "var(--sk-danger)"}
                              onBlur={e => e.currentTarget.style.borderColor = editErrors.teamSizeLimit ? "color-mix(in srgb, var(--sk-danger) 60%, transparent)" : (isDark ? "var(--sk-raised)" : "var(--sk-raised)")}
                            />
                            {editErrors.teamSizeLimit && <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{editErrors.teamSizeLimit}</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        const now = new Date();
                        const errs: Record<string, string> = {};
                        const isTeam = activeEvent && (activeEvent.eventType === 'Team' || (activeEvent.teamSizeLimit && activeEvent.teamSizeLimit > 1) || activeEvent.type === 'Team');

                        if (!editForm.date) errs.date = "Event start date is required.";
                        else if (editForm.date !== editOriginal.date && new Date(editForm.date) <= now) errs.date = "Event start date must be in the future.";
                        if (!editForm.endDate) errs.endDate = "Event end date is required.";
                        else if (editForm.date && new Date(editForm.endDate) < new Date(editForm.date)) errs.endDate = "End date & time must be at or after start date.";
                        if (!editForm.deadline) errs.deadline = "Registration deadline is required.";
                        else if (editForm.deadline !== editOriginal.deadline && new Date(editForm.deadline) <= now) errs.deadline = "Deadline must be in the future.";
                        else if (editForm.date && new Date(editForm.deadline) >= new Date(editForm.date)) errs.deadline = "Deadline must be before the event start date.";
                        if (!editForm.venue.trim()) errs.venue = "Venue is required.";
                        
                        if (isTeam) {
                          if (!editForm.minTeamSize || parseInt(editForm.minTeamSize) < 1) {
                            errs.minTeamSize = "Minimum team size must be at least 1.";
                          } else if (editForm.teamSizeLimit && parseInt(editForm.minTeamSize) > parseInt(editForm.teamSizeLimit)) {
                            errs.minTeamSize = `Min team size cannot exceed max team size (${editForm.teamSizeLimit}).`;
                          }

                          if (!editForm.teamSizeLimit) {
                            errs.teamSizeLimit = "Max team size is required.";
                          } else if (parseInt(editForm.teamSizeLimit) < parseInt(editForm.minTeamSize || "1")) {
                            errs.teamSizeLimit = `Max team size must be at least ${editForm.minTeamSize || "1"}.`;
                          }
                        }

                        if (!editForm.capacity) errs.capacity = "Venue capacity is required.";
                        else if (isTeam && editForm.teamSizeLimit && parseInt(editForm.capacity) < parseInt(editForm.teamSizeLimit)) {
                          errs.capacity = `Venue capacity cannot be less than max team size (${editForm.teamSizeLimit}).`;
                        } else if (parseInt(editForm.capacity) < 1) errs.capacity = "Venue capacity must be at least 1.";
                        
                        if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }

                        setEditErrors({});
                        setEditPassword("");
                        setEditPasswordError(null);
                        setShowEditPasswordModal(true);
                      }}
                      disabled={updatingEvent || (
                        editForm.date === editOriginal.date &&
                        editForm.endDate === editOriginal.endDate &&
                        editForm.deadline === editOriginal.deadline &&
                        editForm.venue.trim() === editOriginal.venue.trim() &&
                        editForm.capacity === editOriginal.capacity &&
                        editForm.minTeamSize === editOriginal.minTeamSize &&
                        editForm.teamSizeLimit === editOriginal.teamSizeLimit
                      )}
                      className="w-full mt-6 py-3.5 rounded-xl bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      style={{ fontFamily: FB }}
                    >
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showEditPasswordModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}>
                  <div className="w-full max-w-md p-8 rounded-3xl relative" style={{ background: isDark ? "#0c0c0c" : "var(--sk-canvas)", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", boxShadow: "none" }}>
                    <button onClick={() => { setShowEditPasswordModal(false); setEditPassword(""); setEditPasswordError(null); }} className="absolute top-6 right-6 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
                    <h2 className="text-2xl font-bold text-[color:var(--sk-fg)] dark:text-white mb-2" style={{ fontFamily: FC }}>Confirm Changes</h2>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mb-6" style={{ fontFamily: FB }}>Please enter your club login password to save these updates.</p>

                    <div className="space-y-1.5 mb-6">
                      <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Password</label>
                      <div className="relative">
                        <input
                          autoFocus
                          type={showEditPasswordText ? "text" : "password"}
                          placeholder="Enter password"
                          value={editPassword}
                          onChange={e => setEditPassword(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !updatingEvent) {
                              (async () => {
                                if (!editPassword) {
                                  setEditPasswordError("Password is required to save changes.");
                                  return;
                                }
                                setUpdatingEvent(true);
                                setEditPasswordError(null);
                                try {
                                  const token = await getToken();
                                  if (token && activeEvent) {
                                    const isTeam = activeEvent.eventType === 'Team' || (activeEvent.teamSizeLimit && activeEvent.teamSizeLimit > 1) || activeEvent.type === 'Team';
                                    await updateEvent(activeEvent.id, {
                                      eventDate: editForm.date || undefined,
                                      eventEndDate: editForm.endDate || undefined,
                                      registrationDeadline: editForm.deadline || undefined,
                                      venue: editForm.venue || undefined,
                                      registrationLimit: editForm.capacity ? parseInt(editForm.capacity) : undefined,
                                      teamSizeLimit: isTeam && editForm.teamSizeLimit ? parseInt(editForm.teamSizeLimit) : undefined,
                                      minTeamSize: isTeam && editForm.minTeamSize ? parseInt(editForm.minTeamSize) : undefined,
                                      password: editPassword,
                                    }, token);
                                    await refreshEvents();
                                    setShowEditPasswordModal(false);
                                    setShowEditModal(false);
                                    setEditPassword("");
                                    setShowEditPasswordText(false);
                                  }
                                } catch (err: any) {
                                  setEditPasswordError(sanitizeErrorMessage(err, "Incorrect password. Please try again."));
                                } finally {
                                  setUpdatingEvent(false);
                                }
                              })();
                            }
                          }}
                          className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all"
                          style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", fontFamily: FB }}
                          onFocus={e => e.currentTarget.style.borderColor = "var(--sk-line-strong)"}
                          onBlur={e => e.currentTarget.style.borderColor = isDark ? "var(--sk-line)" : "var(--sk-raised)"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPasswordText(!showEditPasswordText)}
                          className="password-toggle-btn absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-0 outline-none p-1 flex items-center justify-center"
                          style={{ background: "transparent", backgroundColor: "transparent", border: "none", boxShadow: "none" }}
                          aria-label={showEditPasswordText ? "Hide password" : "Show password"}
                        >
                          {showEditPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {editPasswordError && <p className="text-xs text-[color:var(--sk-danger)] font-medium mb-6 text-center" style={{ fontFamily: FB }}>{editPasswordError}</p>}

                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => { setShowEditPasswordModal(false); setEditPassword(""); setEditPasswordError(null); }} className="px-6 py-2.5 text-xs text-[color:var(--sk-fg)] dark:text-white bg-[color:var(--sk-raised)] hover:bg-slate-300 dark:bg-white/[0.06] dark:hover:bg-white/10 rounded-full transition-all font-semibold cursor-pointer border border-[color:var(--sk-line)] dark:border-transparent" style={{ fontFamily: FB }}>Cancel</button>
                      <button
                        onClick={async () => {
                          if (!editPassword) {
                            setEditPasswordError("Password is required to save changes.");
                            return;
                          }
                          setUpdatingEvent(true);
                          setEditPasswordError(null);
                          try {
                            const token = await getToken();
                            if (token && activeEvent) {
                              const isTeam = activeEvent.eventType === 'Team' || (activeEvent.teamSizeLimit && activeEvent.teamSizeLimit > 1) || activeEvent.type === 'Team';
                              await updateEvent(activeEvent.id, {
                                eventDate: editForm.date || undefined,
                                eventEndDate: editForm.endDate || undefined,
                                registrationDeadline: editForm.deadline || undefined,
                                venue: editForm.venue || undefined,
                                registrationLimit: editForm.capacity ? parseInt(editForm.capacity) : undefined,
                                teamSizeLimit: isTeam && editForm.teamSizeLimit ? parseInt(editForm.teamSizeLimit) : undefined,
                                minTeamSize: isTeam && editForm.minTeamSize ? parseInt(editForm.minTeamSize) : undefined,
                                password: editPassword,
                              }, token);
                              await refreshEvents();
                              setShowEditPasswordModal(false);
                              setShowEditModal(false);
                              setEditPassword("");
                            }
                          } catch (err: any) {
                            setEditPasswordError(sanitizeErrorMessage(err, "Incorrect password. Please try again."));
                          } finally {
                            setUpdatingEvent(false);
                          }
                        }}
                        disabled={updatingEvent}
                        className="px-6 py-2.5 text-xs text-white bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand)]/80 rounded-full transition-all font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        style={{ fontFamily: FB }}
                      >
                        {updatingEvent ? "Saving..." : "Confirm Save"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    );
  }

  return (
    <EventsTable
      EVENTS={EVENTS}
      allRegistrations={allRegistrations}
      onSelect={(id) => setSelectedEventId(id)}
    />
  );
}
