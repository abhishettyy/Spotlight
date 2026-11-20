import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calendar, Users, Plus, MapPin, ChevronRight, Settings } from "lucide-react";
import { FC, FM, FB, parseLocalDate, formatEventHeaderDate, LiveTag, getEventStatus, ClubEvent, Registration } from "./shared";

export const QUICK_ACTIONS = [
  { id: "create",   icon: Plus,     label: "Create Event",        desc: "Launch a new event in minutes" },
  { id: "settings", icon: Settings, label: "Update Club Profile", desc: "Edit club info, logo & security" },
  { id: "events",   icon: Users,    label: "Manage Teams",        desc: "Oversee team registrations per event" },
];

export function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let frame = 0;
    const total = 60;
    const id = setInterval(() => {
      frame++;
      setCount(Math.round(target * Math.min(frame / total, 1)));
      if (frame >= total) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return <>{count}{suffix}</>;
}


export function OverviewPage({
  name,
  onNavigate,
  totalEvents,
  totalRegistrations,
  pendingCount,
  recentActivity,
  clubEvents,
}: {
  name: string;
  onNavigate: (tab: string, eventId?: string) => void;

  totalEvents: number;
  totalRegistrations: number;
  pendingCount: number;
  recentActivity: Registration[];
  clubEvents: ClubEvent[];
}) {

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-6 sm:space-y-8 md:space-y-10 max-w-7xl pb-28 md:pb-12">
      
      <motion.div
        initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative p-5 sm:p-7 md:p-8 rounded-xl overflow-hidden"
        style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}
      >
        <p className="text-[10px] sm:text-[11px] tracking-[0.4em] sm:tracking-[0.5em] uppercase mb-2 sm:mb-3 text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Dashboard</p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FC }}>
          Welcome Back, {name}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>Manage your club's events, registrations, and track performance in real-time.</p>
      </motion.div>

      {/* Key metrics — single divided strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl overflow-hidden" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
        {[
          { label: "Total Events",        value: totalEvents,        sub: `${clubEvents.filter(e => getEventStatus(e) !== 'previous').length} active`, tab: "events", warn: false },
          { label: "Total Registrations", value: totalRegistrations, sub: "Across all events",                                                        tab: "events", warn: false },
          { label: "Live Now",            value: clubEvents.filter(e => getEventStatus(e) === 'live').length, sub: "Happening right now",                     tab: "events", warn: false },
        ].map((k, i) => (
          <div key={k.label} className={`px-6 py-5 ${i === 0 ? "" : "border-t sm:border-t-0 sm:border-l"}`}
            style={{ borderColor: "var(--sk-line)" }}>
            <div className="flex items-center gap-2 mb-2">
              {k.warn && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }} />}
              <p className="text-xs font-medium" style={{ color: "var(--sk-muted)", fontFamily: FB }}>{k.label}</p>
            </div>
            <p className="text-3xl font-semibold tabular-nums leading-none" style={{ color: "var(--sk-fg)", fontFamily: FB }}>
              <AnimatedCounter target={k.value} suffix="" />
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--sk-faint)", fontFamily: FB }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Upcoming & Live Events strip — live */}
      <div>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[11px] tracking-[0.5em] uppercase mb-1 text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Upcoming & Live</p>
            <h2 className="text-xl font-semibold text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FC }}>Events</h2>
          </div>
          <button className="group flex items-center gap-1.5 text-sm font-medium transition-all duration-300 text-[color:var(--sk-muted)] dark:text-white/70 hover:text-black dark:hover:text-white cursor-pointer" style={{ fontFamily: FB }}
            onClick={() => onNavigate("events")}
          >
            <span>View all</span>
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>

        {clubEvents.filter(e => { const st = getEventStatus(e); return st === 'upcoming' || st === 'live'; }).length === 0 ? (
          <div className="p-8 rounded-2xl text-center text-sm text-[color:var(--sk-muted)]" style={{ border: "1px dashed var(--sk-line)", fontFamily: FB }}>
            No upcoming events yet. <button onClick={() => onNavigate("create")} className="text-[color:var(--sk-brand)] hover:underline">Create one →</button>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
            {[...clubEvents.filter(e => getEventStatus(e) !== 'previous')]
              .sort((x, y) => {
                const r = (e: ClubEvent) => (getEventStatus(e) === 'live' ? 0 : 1);
                if (r(x) !== r(y)) return r(x) - r(y);
                return (parseLocalDate(x.eventDate || x.date)?.getTime() ?? 0) - (parseLocalDate(y.eventDate || y.date)?.getTime() ?? 0);
              })
              .slice(0, 5)
              .map((ev, i) => (
                <div key={ev.id} onClick={() => onNavigate("events", ev.id)} role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter") onNavigate("events", ev.id); }}
                  className="group flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-[color:var(--sk-raised)]"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--sk-line)" }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--sk-fg)", fontFamily: FB }} title={ev.title}>{ev.title}</p>
                    <p className="text-xs mt-0.5 flex items-center gap-3 flex-wrap" style={{ color: "var(--sk-muted)", fontFamily: FM }}>
                      <span className="flex items-center gap-1"><Calendar size={11} />{formatEventHeaderDate(ev.eventDate || ev.date, ev.eventEndDate)}</span>
                      {ev.venue && <span className="flex items-center gap-1 min-w-0"><MapPin size={11} /><span className="truncate">{ev.venue}</span></span>}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap" style={{ color: "var(--sk-muted)", borderColor: "var(--sk-line)", fontFamily: FM }}>
                    {(ev.type ?? '').toLowerCase() === "team" ? "Team" : "Solo"} · {ev.capacity > 0 ? `${ev.capacity} ${(ev.type ?? '').toLowerCase() === "team" ? 'teams' : 'cap'}` : 'Open'}
                  </span>
                  {getEventStatus(ev) === 'live' ? (
                    <LiveTag />
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap" style={{ color: "var(--sk-brand)", borderColor: "color-mix(in srgb, var(--sk-brand) 30%, transparent)", background: "color-mix(in srgb, var(--sk-brand) 10%, transparent)", fontFamily: FM }}>Upcoming</span>
                  )}
                  <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" style={{ color: "var(--sk-faint)" }} />
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Quick Actions + Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        <div className="lg:col-span-2">
          <p className="text-[10px] sm:text-[11px] tracking-[0.4em] sm:tracking-[0.5em] uppercase mb-3 sm:mb-5 text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Quick Actions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((qa, i) => (
              <motion.button key={qa.label} onClick={() => onNavigate(qa.id)}
                initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="p-5 rounded-xl text-left group"
                style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", transition: "all 0.4s ease" }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background  = "var(--sk-surface)";
                  el.style.borderColor = "var(--sk-line)";
                  el.style.boxShadow   = "none";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background  = "var(--sk-surface)";
                  el.style.borderColor = "var(--sk-line)";
                  el.style.transform   = "none";
                  el.style.boxShadow   = "none";
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ border: "1px solid var(--sk-line)" }}>
                  <qa.icon size={14} className="text-muted-foreground group-hover:text-white/65 transition-colors duration-300" />
                </div>
                <p className="text-[color:var(--sk-fg)] dark:text-white text-sm font-medium mb-0.5" style={{ fontFamily: FB }}>{qa.label}</p>
                <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>{qa.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="activity-feed-container">
          <p className="text-[11px] tracking-[0.5em] uppercase mb-4 text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Recent Activity</p>
          <div className="space-y-1">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>No activity yet.</p>
            ) : (
              recentActivity.map((a, i) => (
                <motion.div key={a.id}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="flex items-start gap-2.5 py-2.5 px-0.5 border-b border-[color:var(--sk-line)] dark:border-white/[0.04] last:border-b-0"
                >
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-slate-400 dark:bg-white/40" />
                  <div>
                    <p className="text-xs leading-snug text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FB }}>
                      <span className="text-[color:var(--sk-fg)] dark:text-white/80 font-medium">{a.user?.name ?? a.team?.name ?? 'Someone'}</span>
                      {" signed up for "}
                      <span className="text-[color:var(--sk-fg)] dark:text-white/80 font-medium">{a.eventTitle}</span>
                    </p>
                    <p className="text-[11px] mt-0.5 text-[color:var(--sk-faint)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FM }}>{timeAgo(a.created_at)}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
