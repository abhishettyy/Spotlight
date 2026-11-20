import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Plus, LayoutDashboard, X, Settings, Menu, AlertTriangle } from "lucide-react";
import { useTheme, ThemeToggle } from "../theme";
import { FC, FM, FB, PageFallback } from "./shared";
import { useSpotlightData } from "./useSpotlightData";
import { OverviewPage } from "./OverviewPage";

// Tabs other than the overview are downloaded on demand, then prefetched once the dashboard is up
const loadEventsPage = () => import("./EventsPage");
const loadCreateEventPage = () => import("./CreateEventPage");
const loadSettingsPage = () => import("./SettingsPage");
const EventsPage = lazy(() => loadEventsPage().then(m => ({ default: m.EventsPage })));
const CreateEventPage = lazy(() => loadCreateEventPage().then(m => ({ default: m.CreateEventPage })));
const SettingsPage = lazy(() => loadSettingsPage().then(m => ({ default: m.SettingsPage })));

export function TeamsPage() {
  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-4xl">
      <div>
        <p className="text-[11px] tracking-[0.5em] uppercase mb-1.5 text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Management</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FC }}>Teams</h1>
      </div>
      <div className="p-10 rounded-2xl text-center" style={{ border: "1px dashed var(--sk-line)" }}>
        <p className="text-sm text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>Team management coming soon.</p>
      </div>
    </div>
  );
}


export const DASH_NAV = [
  { icon: LayoutDashboard, label: "Overview",  id: "overview" },
  { icon: Calendar,        label: "Events",    id: "events"   },
  { icon: Settings,        label: "Settings",  id: "settings" },
];

export function DashboardPage({ userEmail, onSignOut }: { userEmail: string; onSignOut: () => void }) {
  const { isDark } = useTheme();
  const {
    clubEvents,
    clubs,
    profile,
    loading,
    allRegistrations,
    totalEvents,
    totalRegistrations,
    pendingCount,
    recentActivity,
    refreshEvents,
    refreshProfile,
    setAllRegistrations,
    getToken,
  } = useSpotlightData();

  // Fetch the other tabs' code in the background so switching tabs stays instant
  useEffect(() => {
    const prefetch = () => { loadEventsPage(); loadCreateEventPage(); loadSettingsPage(); };
    const id = window.setTimeout(prefetch, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const currentClub = clubs.find((c: any) => c.id === profile?.clubId);
  const name = currentClub?.name ?? profile?.fullName ?? profile?.full_name ?? userEmail.split("@")[0] ?? 'Admin';

  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "overview";
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab());
  const [showOnboardingNotice, setShowOnboardingNotice] = useState(() => {
    return localStorage.getItem("show_first_time_notice") === "true";
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [reminderDismissed, setReminderDismissed] = useState(() => {
    return sessionStorage.getItem("spotlight_reminder_dismissed") === "true";
  });

  // Only the logo matters now: all events are free, so clubs no longer need UPI or QR details
  const isProfileIncomplete = !!currentClub && (
    !currentClub.logoUrl ||
    currentClub.logoUrl === "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
  );

  const renderProfileSection = () => (
    <div className="p-4 pb-6 mt-auto flex-shrink-0" style={{ borderTop: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)" }}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {currentClub?.logoUrl && currentClub.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" ? (
            <img
              src={currentClub.logoUrl}
              alt={name}
              className="w-7 h-7 rounded-full flex-shrink-0 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const sibling = e.currentTarget.nextSibling as HTMLElement;
                if (sibling) sibling.style.display = 'flex';
              }}
            />
          ) : null}
          {(!currentClub?.logoUrl || currentClub.logoUrl === "https://images.unsplash.com/photo-1516321318423-f06f85e504b3") && (
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[color:var(--sk-brand)]">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          {currentClub?.logoUrl && currentClub.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" && (
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[color:var(--sk-brand)]" style={{ display: 'none' }}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-xs truncate font-semibold" style={{ color: isDark ? "rgba(255,255,255,0.85)" : "var(--sk-fg)", fontFamily: FB }}>{name}</p>
            <p className="text-[11px]" style={{ color: isDark ? "var(--sk-fg)" : "var(--sk-muted)", fontFamily: FM }}>Admin</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <button onClick={onSignOut}
        className="w-full py-2.5 text-xs rounded-xl transition-all duration-300 font-semibold cursor-pointer active:scale-98"
        style={{
          color: isDark ? "#ffffff" : "var(--sk-brand)",
          background: isDark ? "var(--sk-raised)" : "color-mix(in srgb, var(--sk-brand) 6%, transparent)",
          border: isDark ? "1px solid var(--sk-line)" : "1px solid color-mix(in srgb, var(--sk-brand) 18%, transparent)",
          fontFamily: FB
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = "#ffffff";
          e.currentTarget.style.background = isDark ? "var(--sk-raised)" : "var(--sk-brand)";
          e.currentTarget.style.borderColor = isDark ? "var(--sk-line)" : "var(--sk-brand)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = isDark ? "#ffffff" : "var(--sk-brand)";
          e.currentTarget.style.background = isDark ? "var(--sk-raised)" : "color-mix(in srgb, var(--sk-brand) 6%, transparent)";
          e.currentTarget.style.borderColor = isDark ? "1px solid var(--sk-line)" : "1px solid color-mix(in srgb, var(--sk-brand) 18%, transparent)";
        }}
      >Sign Out</button>
    </div>
  );

  const getInitialEventId = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("eventId");
  };

  const getInitialShowTeams = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("showTeams") === "true";
  };

  const [selectedEventId, setSelectedEventId] = useState<string | null>(getInitialEventId());
  const [showTeams, setShowTeams] = useState(getInitialShowTeams());

  const setActiveTab = (tab: string, pushHistory = true, eventId?: string, sTeams = false) => {
    setActiveTabState(tab);
    setSelectedEventId(eventId || null);
    setShowTeams(sTeams);

    if (tab === "create" && !profile?.clubId) {
      refreshProfile();
    }

    if (!pushHistory) return;

    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    if (eventId) {
      url.searchParams.set("eventId", eventId);
    } else {
      url.searchParams.delete("eventId");
    }
    if (sTeams) {
      url.searchParams.set("showTeams", "true");
    } else {
      url.searchParams.delete("showTeams");
    }

    const currentParams = new URLSearchParams(window.location.search);
    const tabChanged = currentParams.get("tab") !== tab;
    const eventIdChanged = currentParams.get("eventId") !== (eventId || null);
    const showTeamsChanged = (currentParams.get("showTeams") === "true") !== sTeams;

    if (tabChanged || eventIdChanged || showTeamsChanged) {
      window.history.pushState({ view: "dashboard", tab, eventId: eventId || null, showTeams: sTeams }, "", url.toString());
    }
  };

  const handleSetSelectedEventId = (eventId: string | null, pushHistory = true) => {
    setSelectedEventId(eventId);
    if (eventId === null) {
      setShowTeams(false);
    }
    if (!pushHistory) return;

    const url = new URL(window.location.href);
    if (eventId) {
      url.searchParams.set("eventId", eventId);
    } else {
      url.searchParams.delete("eventId");
      url.searchParams.delete("showTeams");
    }

    const currentParams = new URLSearchParams(window.location.search);
    const eventIdChanged = currentParams.get("eventId") !== (eventId || null);

    if (eventIdChanged) {
      window.history.pushState({ view: "dashboard", tab: "events", eventId: eventId || null, showTeams: eventId ? showTeams : false }, "", url.toString());
    }
  };

  const handleSetShowTeams = (val: boolean, pushHistory = true) => {
    setShowTeams(val);
    if (!pushHistory) return;

    const url = new URL(window.location.href);
    if (val) {
      url.searchParams.set("showTeams", "true");
    } else {
      url.searchParams.delete("showTeams");
    }

    const currentParams = new URLSearchParams(window.location.search);
    if ((currentParams.get("showTeams") === "true") !== val) {
      window.history.pushState({ view: "dashboard", tab: "events", eventId: selectedEventId, showTeams: val }, "", url.toString());
    }
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.view === "dashboard") {
        if (state.tab) setActiveTabState(state.tab);
        setSelectedEventId(state.eventId || null);
        setShowTeams(state.showTeams || false);
      } else {
        const params = new URLSearchParams(window.location.search);
        if (params.get("view") === "dashboard") {
          setActiveTabState(params.get("tab") || "overview");
          setSelectedEventId(params.get("eventId") || null);
          setShowTeams(params.get("showTeams") === "true");
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedEventId]);

  useEffect(() => {
    if (profile) {
      const params = new URLSearchParams(window.location.search);
      if (!params.get("tab") || activeTab === "onboarding") {
        setActiveTab("overview", false);
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: isDark ? "rgba(5,5,5,0.98)" : "#ffffff" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[color:var(--sk-brand)] border-t-transparent animate-spin" />
          <p className="text-xs tracking-[0.4em] uppercase" style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-fg)", fontFamily: FM }}>Loading Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ position: "relative", zIndex: 10 }}>
      
      <aside className="hidden xl:flex w-56 flex-shrink-0 flex-col h-screen"
        style={{
          background: isDark ? "rgba(5,5,5,0.97)" : "transparent",
          borderRight: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
          backdropFilter: "blur(24px)"
        }}
      >
        <div className="px-6 pt-6 pb-5 flex-shrink-0 flex items-center gap-2.5">
          {currentClub?.logoUrl && currentClub.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" ? (
            <img
              src={currentClub.logoUrl}
              alt={name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const sibling = e.currentTarget.nextSibling as HTMLElement;
                if (sibling) sibling.style.display = 'flex';
              }}
            />
          ) : null}
          {(!currentClub?.logoUrl || currentClub.logoUrl === "https://images.unsplash.com/photo-1516321318423-f06f85e504b3") && (
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[color:var(--sk-brand)]">
              {(name || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          {currentClub?.logoUrl && currentClub.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" && (
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[color:var(--sk-brand)]" style={{ display: 'none' }}>
              {(name || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-[13px] tracking-[0.16em] font-bold truncate max-w-[150px]" title={name} style={{ fontFamily: FB, color: isDark ? "rgba(255,255,255,0.9)" : "var(--sk-fg)" }}>
            {name || 'SPOTLIGHT'}
          </span>
        </div>
        <div className="px-4 mb-5 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab("create")}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[color:var(--sk-brand)] rounded-xl transition-all duration-300"
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "none")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            style={{ fontFamily: FB }}
          ><Plus size={14} /> Create Event</motion.button>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {DASH_NAV.map(({ id, icon: Icon, label }) => {
            const active = id === activeTab;
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300"
                style={{
                  background: active ? (isDark ? "var(--sk-raised)" : "var(--sk-raised)") : "transparent",
                  color:      active ? (isDark ? "#fff" : "var(--sk-fg)") : (isDark ? "var(--sk-muted)" : "var(--sk-muted)"),
                  border:     active ? (isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)") : "1px solid transparent",
                  fontFamily: FB,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = isDark ? "#dddddd" : "var(--sk-fg)";
                    e.currentTarget.style.background = isDark ? "var(--sk-surface)" : "var(--sk-surface)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = isDark ? "var(--sk-muted)" : "var(--sk-muted)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              ><Icon size={14} />{label}</button>
            );
          })}
        </nav>
        {renderProfileSection()}
      </aside>

      <div className="flex-1 flex flex-col h-[100dvh] min-h-[100dvh] overflow-hidden">
        
        <header className="xl:hidden flex items-center justify-between px-4 sm:px-6 py-3.5 flex-shrink-0"
          style={{
            background: isDark ? "rgba(5,5,5,0.97)" : "rgba(245,244,242,0.85)",
            borderBottom: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
            backdropFilter: "blur(16px)"
          }}
        >
          <button onClick={() => setIsMobileMenuOpen(true)} className={`p-1.5 rounded-lg active:bg-[color:var(--sk-raised)] ${isDark ? "text-white hover:text-[color:var(--sk-brand)]" : "text-[color:var(--sk-fg)] hover:text-[color:var(--sk-brand)]"}`}>
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            {currentClub?.logoUrl && currentClub.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" ? (
              <img
                src={currentClub.logoUrl}
                alt={name}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const sibling = e.currentTarget.nextSibling as HTMLElement;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
            ) : null}
            {(!currentClub?.logoUrl || currentClub.logoUrl === "https://images.unsplash.com/photo-1516321318423-f06f85e504b3") && (
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[color:var(--sk-brand)]">
                {(name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            {currentClub?.logoUrl && currentClub.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" && (
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[color:var(--sk-brand)]" style={{ display: 'none' }}>
                {(name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs sm:text-[13px] tracking-[0.14em] font-bold truncate max-w-[180px]" title={name} style={{ fontFamily: FB, color: isDark ? "rgba(255,255,255,0.9)" : "var(--sk-fg)" }}>
              {name || 'SPOTLIGHT'}
            </span>
          </div>
          <ThemeToggle />
        </header>

        <AnimatePresence>
          {!reminderDismissed && activeTab !== "settings" && isProfileIncomplete && (
            <motion.div
              initial={{ opacity: 0, y: -15, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -15, height: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mx-6 mt-4 overflow-hidden flex-shrink-0"
            >
              <div
                className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{
                  background: "color-mix(in srgb, var(--sk-brand) 4%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--sk-brand) 12%, transparent)",
                  backdropFilter: "blur(20px)"
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[color:var(--sk-brand)]/10 rounded-xl text-[color:var(--sk-brand)] flex-shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white" style={{ fontFamily: FB }}>Complete Your Club Profile</h4>
                    <p className="text-xs text-[color:var(--sk-muted)]" style={{ fontFamily: FM }}>
                      Your club logo is missing. Please add it to customize your page.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => {
                      setReminderDismissed(true);
                      sessionStorage.setItem("spotlight_reminder_dismissed", "true");
                    }}
                    className="px-4 py-2 hover:bg-white/5 text-[color:var(--sk-muted)] hover:text-white text-xs font-semibold rounded-xl transition-all duration-300"
                    style={{ fontFamily: FB }}
                  >
                    Do It Later
                  </button>
                  <button
                    onClick={() => {
                      setReminderDismissed(true);
                      sessionStorage.setItem("spotlight_reminder_dismissed", "true");
                      setActiveTab("settings");
                    }}
                    className="px-4 py-2 bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] text-white text-xs font-semibold rounded-xl transition-all duration-300"
                    style={{ fontFamily: FB }}
                  >
                    Complete Now
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto relative pb-28 xl:pb-8" style={{ background: "transparent" }}>
          <AnimatePresence mode="wait">
            {activeTab === "create" && (
              <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <Suspense fallback={<PageFallback />}>
                  <CreateEventPage clubId={profile?.clubId ?? ""} onCreated={async () => { await refreshEvents(); setActiveTab("overview"); }} getToken={getToken} clubQrUrl={currentClub?.qrUrl} clubUpiId={currentClub?.upiId} refreshProfile={refreshProfile} />
                </Suspense>
              </motion.div>
            )}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <OverviewPage
                    name={name}
                    onNavigate={(tab, eventId) => setActiveTab(tab, true, eventId)}

                   totalEvents={totalEvents}
                   totalRegistrations={totalRegistrations}
                   pendingCount={pendingCount}
                   recentActivity={recentActivity}
                   clubEvents={clubEvents}
                 />
              </motion.div>
            )}
            {activeTab === "events" && (
              <motion.div key="events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <Suspense fallback={<PageFallback />}>
                 <EventsPage
                   EVENTS={clubEvents}
                   allRegistrations={allRegistrations}
                   onRegistrationsChange={setAllRegistrations}
                   getToken={getToken}
                   selectedEventId={selectedEventId}
                   setSelectedEventId={handleSetSelectedEventId}
                   showTeams={showTeams}
                   setShowTeams={handleSetShowTeams}
                   refreshEvents={refreshEvents}
                 />
                </Suspense>
              </motion.div>
            )}
            {activeTab === "teams" && (
              <motion.div key="teams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                 <TeamsPage />
              </motion.div>
            )}
            {activeTab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <Suspense fallback={<PageFallback />}>
                 <SettingsPage club={clubs.find((c: any) => c.id === profile?.clubId)} profile={profile} getToken={getToken} onUpdate={refreshEvents} onLogout={onSignOut} />
                </Suspense>
              </motion.div>
            )}
            {activeTab !== "overview" && activeTab !== "teams" && activeTab !== "events" && activeTab !== "settings" && activeTab !== "create" && (
              <motion.div key="fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-10 text-[#444] text-sm" style={{ fontFamily: FB }}>
                 {DASH_NAV.find(n => n.id === activeTab)?.label || activeTab} Module - Under Construction
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
            />
            
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-[100dvh] max-h-[100dvh] xl:hidden"
              style={{
                background: isDark ? "rgba(5,5,5,0.98)" : "var(--sk-canvas)",
                borderRight: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                backdropFilter: "blur(24px)"
              }}
            >
              <div className="px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  {currentClub?.logoUrl && currentClub.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" ? (
                    <img
                      src={currentClub.logoUrl}
                      alt={name}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const sibling = e.currentTarget.nextSibling as HTMLElement;
                        if (sibling) sibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  {(!currentClub?.logoUrl || currentClub.logoUrl === "https://images.unsplash.com/photo-1516321318423-f06f85e504b3") && (
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[color:var(--sk-brand)]">
                      {(name || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {currentClub?.logoUrl && currentClub.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" && (
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[color:var(--sk-brand)]" style={{ display: 'none' }}>
                      {(name || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs tracking-[0.14em] font-bold truncate max-w-[150px]" title={name} style={{ fontFamily: FB, color: isDark ? "rgba(255,255,255,0.9)" : "var(--sk-fg)" }}>
                    {name || 'SPOTLIGHT'}
                  </span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className={`p-1.5 rounded-lg active:bg-[color:var(--sk-raised)] ${isDark ? "text-white/60 hover:text-white" : "text-[color:var(--sk-muted)] hover:text-black"}`}>
                  <X size={18} />
                </button>
              </div>
              <div className="px-4 mb-4 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setActiveTab("create"); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[color:var(--sk-brand)] rounded-xl transition-all duration-300"
                  style={{ fontFamily: FB }}
                ><Plus size={14} /> Create Event</motion.button>
              </div>
              <nav className="flex-1 px-3 space-y-1 overflow-y-auto min-h-0">
                {DASH_NAV.map(({ id, icon: Icon, label }) => {
                  const active = id === activeTab;
                  return (
                    <button key={id} onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-300"
                      style={{
                        background: active ? (isDark ? "var(--sk-raised)" : "var(--sk-raised)") : "transparent",
                        color:      active ? (isDark ? "#fff" : "var(--sk-fg)") : (isDark ? "var(--sk-muted)" : "var(--sk-muted)"),
                        border:     active ? (isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)") : "1px solid transparent",
                        fontFamily: FB,
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.color = isDark ? "#dddddd" : "var(--sk-fg)";
                          e.currentTarget.style.background = isDark ? "var(--sk-surface)" : "var(--sk-surface)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.color = isDark ? "var(--sk-muted)" : "var(--sk-muted)";
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    ><Icon size={16} />{label}</button>
                  );
                })}
              </nav>
              {renderProfileSection()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {showOnboardingNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md p-8 rounded-3xl relative border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]"
            style={{ background: isDark ? "rgba(15,15,15,0.98)" : "var(--sk-canvas)" }}
          >
            <h2 className="text-xl font-bold text-[color:var(--sk-fg)] dark:text-white mb-2" style={{ fontFamily: FC }}>Welcome to Spotlight! 🚀</h2>
            <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mb-6 leading-relaxed" style={{ fontFamily: FB }}>
              Your club has been successfully created, but a few settings are yet to be completed. Please configure the pending fields below:
            </p>
            <div className="space-y-3 mb-8">

              {(!currentClub?.logoUrl || currentClub.logoUrl === "https://images.unsplash.com/photo-1516321318423-f06f85e504b3") && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "color-mix(in srgb, var(--sk-brand) 3%, transparent)", border: "1px dashed color-mix(in srgb, var(--sk-brand) 20%, transparent)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--sk-brand)]" />
                  <span className="text-xs text-[color:var(--sk-fg)] dark:text-white/90" style={{ fontFamily: FB }}>Club Logo is not uploaded</span>
                </div>
              )}

            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem("show_first_time_notice");
                  setShowOnboardingNotice(false);
                  setActiveTab("settings");
                }}
                className="flex-1 py-3 text-xs font-semibold text-white bg-[color:var(--sk-brand)] hover:bg-[#d93041] rounded-xl transition-all cursor-pointer text-center"
                style={{ fontFamily: FB }}
              >
                Configure Settings
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("show_first_time_notice");
                  setShowOnboardingNotice(false);
                }}
                className="px-5 py-3 text-xs font-semibold text-[color:var(--sk-fg)] dark:text-white/60 hover:text-[color:var(--sk-fg)] dark:hover:text-white bg-[color:var(--sk-raised)] hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-[color:var(--sk-line)] dark:border-transparent"
                style={{ fontFamily: FB }}
              >
                Later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
