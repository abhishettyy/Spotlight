import { useState } from "react";
import { Calendar, ChevronRight, ChevronLeft } from "lucide-react";
import { FC, FM, FB, parseLocalDate, formatEventHeaderDate, LiveTag, getEventStatus, ClubEvent, Registration, countPlaces } from "./shared";

export type EventsFilter = "all" | "active" | "past";

export function EventsTable({
  EVENTS,
  allRegistrations,
  onSelect,
}: {
  EVENTS: ClubEvent[];
  allRegistrations: Registration[];
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<EventsFilter>("all");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [dateAsc, setDateAsc] = useState<boolean | null>(null);

  const startOf = (ev: ClubEvent) => parseLocalDate(ev.eventDate || ev.date)?.getTime() ?? 0;
  const isActive = (ev: ClubEvent) => getEventStatus(ev) !== "previous";

  const counts = {
    all: EVENTS.length,
    active: EVENTS.filter(isActive).length,
    past: EVENTS.filter(e => !isActive(e)).length,
  };

  const q = query.trim().toLowerCase();
  const rows = EVENTS
    .filter(ev => filter === "all" || (filter === "active" ? isActive(ev) : !isActive(ev)))
    .filter(ev => !q || (ev.title ?? "").toLowerCase().includes(q) || (ev.venue ?? "").toLowerCase().includes(q))
    .sort((a, b) => {
      if (dateAsc !== null) return dateAsc ? startOf(a) - startOf(b) : startOf(b) - startOf(a);
      const rank = (e: ClubEvent) => ({ live: 0, upcoming: 1, previous: 2 }[getEventStatus(e)]);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return getEventStatus(a) === "previous" ? startOf(b) - startOf(a) : startOf(a) - startOf(b);
    });

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, totalPages);
  const from = rows.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, rows.length);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);

  const pageNumbers: (number | "…")[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - current) <= 1) pageNumbers.push(n);
    else if (pageNumbers[pageNumbers.length - 1] !== "…") pageNumbers.push("…");
  }

  const tabs: { id: EventsFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Upcoming" },
    { id: "past", label: "Past" },
  ];

  const pill = "inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap";
  const gridCols = "md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_24px]";

  const statusCell = (ev: ClubEvent) => {
    const st = getEventStatus(ev);
    if (st === "live") return <LiveTag />;
    if (st === "upcoming") {
      return <span className={pill} style={{ color: "var(--sk-brand)", borderColor: "color-mix(in srgb, var(--sk-brand) 30%, transparent)", background: "color-mix(in srgb, var(--sk-brand) 10%, transparent)", fontFamily: FM }}>Upcoming</span>;
    }
    return <span className={pill} style={{ color: "var(--sk-muted)", borderColor: "var(--sk-line)", background: "var(--sk-raised)", fontFamily: FM }}>Ended</span>;
  };

  const pendingOf = (ev: ClubEvent) => {
    const pend = allRegistrations.filter(r => r.eventId === ev.id && r.status?.toLowerCase() === "pending");
    const teamIds = new Set(pend.filter(r => r.team?.id).map(r => r.team!.id));
    const calc = pend.filter(r => !r.team?.id).length + teamIds.size;
    return allRegistrations.length > 0 ? calc : (ev.pendingCount ?? 0);
  };

  const regBar = (ev: ClubEvent) => {
    // Places against capacity: teams for team events, students for solo events
    const regCount = countPlaces(allRegistrations.filter(r => r.eventId === ev.id));
    const fill = ev.capacity > 0 ? Math.min(100, (regCount / ev.capacity) * 100) : 0;
    return (
      <div className="min-w-[120px]">
        <div className="text-xs mb-1.5" style={{ color: "var(--sk-fg)", fontFamily: FM }}>
          {regCount}<span style={{ color: "var(--sk-muted)" }}>{ev.capacity > 0 ? ` / ${ev.capacity}` : " · Open"}{typeLabel(ev) === "Team" ? " teams" : ""}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--sk-raised)" }}>
          <div className="h-full rounded-full" style={{ width: `${fill}%`, background: getEventStatus(ev) === "previous" ? "var(--sk-faint)" : "var(--sk-brand)" }} />
        </div>
      </div>
    );
  };

  const typeLabel = (ev: ClubEvent) => ((ev.type ?? "").toLowerCase() === "team" ? "Team" : "Solo");

  const navBtn = "h-8 min-w-8 px-2 inline-flex items-center justify-center rounded-lg text-xs border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const navStyle = { background: "var(--sk-surface)", borderColor: "var(--sk-line)", color: "var(--sk-fg)" };

  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-6 max-w-7xl">
      <div>
        <p className="text-[11px] tracking-[0.5em] uppercase mb-1.5" style={{ color: "var(--sk-muted)", fontFamily: FM }}>Directory</p>
        <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: "var(--sk-fg)", fontFamily: FC }}>All Events</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex p-0.5 rounded-lg self-start" style={{ background: "var(--sk-raised)", border: "1px solid var(--sk-line)" }}>
          {tabs.map(t => {
            const on = filter === t.id;
            return (
              <button key={t.id} onClick={() => { setFilter(t.id); setPage(1); }}
                className="px-3 h-8 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                style={{ background: on ? "var(--sk-surface)" : "transparent", color: on ? "var(--sk-fg)" : "var(--sk-muted)", border: on ? "1px solid var(--sk-line)" : "1px solid transparent", fontFamily: FB }}>
                {t.label}
                <span style={{ color: "var(--sk-faint)", fontFamily: FM }}>{counts[t.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sk-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search events"
            className="w-full h-9 pl-9 pr-3 rounded-lg text-sm outline-none"
            style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", color: "var(--sk-fg)", fontFamily: FB }} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
        <div className={`hidden md:grid ${gridCols} gap-4 px-5 h-10 items-center text-[11px] uppercase tracking-[0.15em]`} style={{ background: "var(--sk-raised)", borderBottom: "1px solid var(--sk-line)", color: "var(--sk-muted)", fontFamily: FM }}>
          <span>Event</span>
          <button onClick={() => setDateAsc(d => (d === null ? false : !d))} className="flex items-center gap-1 uppercase tracking-[0.15em] cursor-pointer text-left" style={{ color: "inherit" }}>
            Date {dateAsc === null ? "" : dateAsc ? "↑" : "↓"}
          </button>
          <span>Registrations</span>
          <span>Status</span>
          <span />
        </div>

        {visible.length === 0 ? (
          <div className="py-14 text-center text-sm" style={{ color: "var(--sk-muted)", fontFamily: FB }}>
            {EVENTS.length === 0 ? "No events yet." : "No events match your filters."}
          </div>
        ) : (
          <div>
            {visible.map((ev, i) => {
              const pending = pendingOf(ev);
              const ended = getEventStatus(ev) === "previous";
              return (
                <div key={ev.id} onClick={() => onSelect(ev.id)} role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter") onSelect(ev.id); }}
                  className={`group cursor-pointer px-5 py-3.5 md:grid ${gridCols} md:gap-4 md:items-center transition-colors hover:bg-[color:var(--sk-raised)]`}
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--sk-line)", opacity: ended ? 0.8 : 1 }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--sk-fg)", fontFamily: FB }} title={ev.title}>{ev.title}</p>
                    <p className="text-xs mt-0.5 truncate flex items-center gap-1.5" style={{ color: "var(--sk-muted)", fontFamily: FB }}>
                      <span>{typeLabel(ev)}</span>
                      {ev.venue && <><span style={{ color: "var(--sk-faint)" }}>·</span><span className="truncate">{ev.venue}</span></>}
                    </p>
                  </div>
                  <p className="text-xs mt-2 md:mt-0 flex items-center gap-1.5" style={{ color: "var(--sk-muted)", fontFamily: FM }}>
                    <Calendar size={12} className="md:hidden" />{formatEventHeaderDate(ev.eventDate || ev.date, ev.eventEndDate)}
                  </p>
                  <div className="mt-2 md:mt-0">{regBar(ev)}</div>
                  <div className="mt-2 md:mt-0 flex items-center gap-2 flex-wrap">
                    {statusCell(ev)}
                    {pending > 0 && (
                      <span className={pill} style={{ color: "#b7791f", borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.12)", fontFamily: FM }}>
                        {pending > 9 ? "9+" : pending} pending
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} className="hidden md:block justify-self-end transition-transform group-hover:translate-x-0.5" style={{ color: "var(--sk-faint)" }} />
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 text-xs" style={{ borderTop: "1px solid var(--sk-line)", background: "var(--sk-raised)", color: "var(--sk-muted)", fontFamily: FM }}>
          <div className="flex items-center gap-3">
            <span>{from}–{to} of {rows.length}</span>
            <label className="flex items-center gap-1.5">
              Rows
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="h-7 rounded-md px-1.5 outline-none cursor-pointer"
                style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", color: "var(--sk-fg)" }}>
                {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1">
            <button className={navBtn} disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Previous page" style={navStyle}><ChevronLeft size={14} /></button>
            {pageNumbers.map((n, idx) => n === "…" ? (
              <span key={`e${idx}`} className="px-1">…</span>
            ) : (
              <button key={n} className={navBtn} onClick={() => setPage(n)}
                style={n === current ? { background: "var(--sk-brand)", borderColor: "var(--sk-brand)", color: "#fff" } : navStyle}>{n}</button>
            ))}
            <button className={navBtn} disabled={current >= totalPages} onClick={() => setPage(current + 1)} aria-label="Next page" style={navStyle}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
