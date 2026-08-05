import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, Calendar, Users, CreditCard, Plus, MapPin,
  ChevronRight, Eye, EyeOff, LayoutDashboard,
  CheckCircle, Zap, Shield, ChevronLeft, ChevronDown, Check, Upload,
  X, Key, Copy, Settings, LogOut, Mail, Menu, AlertTriangle, Image as ImageIcon, Camera, QrCode
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import {
  useAuth,
  useUser,
  useSignIn,
  useSignUp,
} from "@clerk/clerk-react";
import { syncProfile, fetchEvents, fetchClubs, fetchEventRegistrations, approveRegistration, rejectRegistration, createEvent, fetchAllRegistrationsForEvents, createClub, fetchClubDashboardStats, updateClub, fetchPublicStats, clubLogin, changePassword, updateEventDeadline, updateEvent, sanitizeErrorMessage, verifyRegistrationKey, verifyTicketQR } from "./api";
import confetti from "canvas-confetti";

const FC = "'Playfair Display', serif";
const F_LOGO = "'Cinzel', serif";
const FM = "'JetBrains Mono', monospace";
const FB = "'Manrope', sans-serif";

type View = "landing" | "auth" | "dashboard";
type AuthTab = "login" | "register";

const formatEventHeaderDate = (eventDateStr?: string | null, endDateStr?: string | null) => {
  if (!eventDateStr) return "TBD";
  const start = new Date(eventDateStr);
  if (isNaN(start.getTime())) return eventDateStr;

  let end: Date;
  if (endDateStr) {
    const parsedEnd = new Date(endDateStr);
    end = !isNaN(parsedEnd.getTime())
      ? parsedEnd
      : new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59);
  } else {
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59);
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatDate = (d: Date) => `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const formatTime = (d: Date) => {
    const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    return `${h}:${m} ${ampm}`;
  };

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate()) {
    return `${formatDate(start)} · ${formatTime(start)} - ${formatTime(end)}`;
  } else {
    return `${formatDate(start)} (${formatTime(start)}) → ${formatDate(end)} (${formatTime(end)})`;
  }
};

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 items-center justify-center flex-shrink-0">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"
        style={{
          willChange: "transform, opacity",
          transform: "translateZ(0)",
          animationDuration: "1.2s",
        }}
      />
      <span
        className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500 shadow-[0_0_8px_#f03d4e]"
        style={{ transform: "translateZ(0)" }}
      />
    </span>
  );
}

function LiveTag({ size = "normal" }: { size?: "normal" | "large" }) {
  if (size === "large") {
    return (
      <span
        className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] uppercase text-red-400 px-1 py-0.5"
        style={{ fontFamily: FM, transform: "translateZ(0)" }}
      >
        <LiveDot />
        LIVE NOW
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-red-400 px-1 py-0.5"
      style={{ fontFamily: FM, transform: "translateZ(0)" }}
    >
      <LiveDot />
      LIVE NOW
    </span>
  );
}

interface ClubEvent {
  id: string;
  title: string;
  date: string | null;
  eventDate?: string | null;
  eventEndDate?: string | null;
  venue: string;
  capacity: number;
  type: string;
  eventType?: string | null;
  club: string;
  club_id: string | null;
  status: "upcoming" | "previous" | "live";
  price: number;
  bannerUrl?: string | null;
  qrUrl?: string | null;
  registrationDeadline?: string | null;
  pendingCount?: number;
  teamSizeLimit?: number | null;
  minTeamSize?: number | null;
}

interface Registration {
  id: string;
  status: string;
  checkedInAt?: string | Date | null;
  created_at: string;
  eventTitle: string;
  eventId: string;
  user: { id: string; name: string; email: string; usn: string; branch: string; phone: string; year?: number | null; sem?: number | null } | null;
  team: { id: string; name: string; passkey: string; leaderId?: string | null } | null;
  transaction_id?: string | null;
}

function useSpotlightData() {
  const { getToken: getClerkToken, userId: clerkUserId, isSignedIn: isClerkSignedIn } = useAuth();
  const { user } = useUser();

  const localToken = localStorage.getItem("spotlight_token");
  const localProfileRaw = localStorage.getItem("spotlight_profile");
  const localProfile = localProfileRaw ? JSON.parse(localProfileRaw) : null;
  const isLocalSignedIn = !!localToken && !!localProfile;

  const isSignedIn = isClerkSignedIn || isLocalSignedIn;
  const userId = isLocalSignedIn ? localProfile.id : clerkUserId;

  const getToken = async () => {
    if (isLocalSignedIn) {
      return localToken;
    }
    return getClerkToken();
  };

  const [clubs, setClubs]                   = useState<any[]>([]);
  const [profile, setProfile]               = useState<any>(localProfile);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading]               = useState(true);

  const [totalEvents, setTotalEvents]             = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [pendingCount, setPendingCount]           = useState(0);
  const [recentActivity, setRecentActivity]       = useState<Registration[]>([]);
  const [clubEvents, setClubEvents]               = useState<ClubEvent[]>([]);

  const loadDashboardStats = async (clubId: string, token: string) => {
    try {
      console.log("[SpotlightData] loadDashboardStats called for clubId:", clubId);
      const stats = await fetchClubDashboardStats(clubId, token);
      console.log("[SpotlightData] loadDashboardStats response stats:", stats);
      setTotalEvents(stats.totalEvents);
      setTotalRegistrations(stats.totalRegistrations);
      setPendingCount(stats.pendingCount);
      setRecentActivity(stats.recentActivity);
      setClubEvents(stats.clubEvents);

      fetchAllRegistrationsForEvents(
        stats.clubEvents.map((e: any) => ({ id: e.id, title: e.title })),
        token
      ).then(regs => {
        setAllRegistrations(regs);
      }).catch(err => console.error("Background fetch for all registrations failed:", err));
    } catch (e) {
      console.error("Failed to load dashboard stats from PostgreSQL:", e);
    }
  };

  const refreshEvents = async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.warn("[SpotlightData] refreshEvents returning early because token is null");
        return;
      }

      let freshProfile = profile;
      if (!isLocalSignedIn) {

        const email = user?.primaryEmailAddress?.emailAddress ?? '';
        const name  = user?.fullName ?? user?.firstName ?? 'Club Admin';
        console.log("[SpotlightData] refreshEvents syncing profile for email:", email);
        const syncResult = await syncProfile(userId!, email, name, token);
        freshProfile = syncResult.profile;
        console.log("[SpotlightData] refreshEvents syncResult profile:", freshProfile);
        setProfile(freshProfile);
      }

      console.log("[SpotlightData] refreshEvents fetching clubs...");
      const clubsData = await fetchClubs();
      setClubs(clubsData.clubs ?? []);

      const clubId = freshProfile?.clubId;
      if (clubId) {
        await loadDashboardStats(clubId, token);
      }
    } catch (e) {
      console.error("Failed to refresh events:", e);
    }
  };

  const refreshProfile = async (): Promise<any> => {
    try {
      if (isLocalSignedIn) return localProfile;
      const token = await getToken();
      if (!token || !userId) return profile;
      const email = user?.primaryEmailAddress?.emailAddress ?? '';
      const name  = user?.fullName ?? user?.firstName ?? 'Club Admin';
      const syncResult = await syncProfile(userId, email, name, token);
      const freshProfile = syncResult.profile;
      setProfile(freshProfile);
      console.log("[SpotlightData] refreshProfile → clubId:", freshProfile?.clubId);
      return freshProfile;
    } catch (e) {
      console.error("[SpotlightData] refreshProfile error:", e);
      return profile;
    }
  };

  useEffect(() => {
    console.log("[SpotlightData] useEffect triggered. isSignedIn:", isSignedIn, "userId:", userId, "userLoaded:", !!user || isLocalSignedIn);
    if (!isSignedIn || !userId || (!isLocalSignedIn && !user)) {
      console.log("[SpotlightData] useEffect returning early because: ", { isSignedIn, userId, userLoaded: !!user || isLocalSignedIn });
      return;
    }

    async function load() {
      try {
        console.log("[SpotlightData] load() started");
        const token = await getToken();
        console.log("[SpotlightData] load() token obtained:", !!token);
        if (!token) {
          console.warn("[SpotlightData] load() returned early because token is null/undefined");
          return;
        }

        if (isLocalSignedIn) {

          setProfile(localProfile);
          const clubsData = await fetchClubs();
          setClubs(clubsData.clubs ?? []);

          if (localProfile?.clubId) {
            await loadDashboardStats(localProfile.clubId, token);
          }
          return;
        }

        const email = user?.primaryEmailAddress?.emailAddress ?? '';
        const name  = user?.fullName ?? user?.firstName ?? 'Club Admin';
        console.log("[SpotlightData] load() starting concurrent requests");

        const [syncResult, clubsData] = await Promise.all([
          syncProfile(userId!, email, name, token),
          fetchClubs()
        ]);

        console.log("[SpotlightData] load() concurrent requests finished");
        let freshProfile = syncResult.profile;

        setProfile(freshProfile);
        setClubs(clubsData.clubs ?? []);

        if (freshProfile?.clubId) {
          console.log("[SpotlightData] load() clubId found, loading dashboard stats for clubId:", freshProfile.clubId);
          await loadDashboardStats(freshProfile.clubId, token);
        } else {
          console.log("[SpotlightData] load() profile has no clubId, sin kipping stats load.");
        }
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      } finally {
        console.log("[SpotlightData] load() finished, setting loading to false");
        setLoading(false);
      }
    }

    load();

    const intervalId = setInterval(() => {
      refreshEvents();
    }, 5000);

    const handleClubCreated = async () => {
      console.log("[SpotlightData] spotlight:club_created event received. Refreshing profile & events...");
      const freshProf = await refreshProfile();
      if (freshProf?.clubId) {
        const token = await getToken();
        if (token) await loadDashboardStats(freshProf.clubId, token);
      }
    };
    window.addEventListener('spotlight:club_created', handleClubCreated);

    return () => {
      window.removeEventListener('spotlight:club_created', handleClubCreated);
      clearInterval(intervalId);
    };
  }, [isSignedIn, userId, user]);

  return {
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
  };
}

let globalEvents: any[] = [];
let eventsListeners: (() => void)[] = [];
function useEvents() {
  const [events, setEvents] = useState(globalEvents);
  useEffect(() => {
    const listener = () => setEvents(globalEvents);
    eventsListeners.push(listener);
    return () => { eventsListeners = eventsListeners.filter(l => l !== listener); };
  }, []);
  return events;
}

const QUICK_ACTIONS = [
  { id: "create",   icon: Plus,     label: "Create Event",        desc: "Launch a new event in minutes" },
  { id: "settings", icon: Settings, label: "Update Club Profile", desc: "Edit club info, UPI ID & security" },
  { id: "events",   icon: Users,    label: "Manage Teams",        desc: "Oversee team registrations per event" },
];
const FEATURES = [
  { icon: Calendar, title: "Liquid Event Creation", desc: "Craft events with a fluid step-by-step builder. From concept to live in under two minutes."      },
  { icon: Shield,   title: "Payment Moderation",    desc: "QR-based verification with screenshot uploads, manual approval pipelines, and audit trails."     },
  { icon: Zap,      title: "Smart Publishing",      desc: "Free events go live instantly. Paid events enter the intelligent moderation stream automatically." },
];

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
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

function AuthInput({ label, type, placeholder, value, onChange }: {
  label: string; type: string; placeholder: string; value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] tracking-[0.4em] uppercase block" style={{ color: "#f9fafb", fontFamily: FM }}>
        {label}
      </label>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-300"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: FB }}
        onFocus={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
          e.currentTarget.style.background  = "rgba(255,255,255,0.06)";
          e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(255,255,255,0.03), 0 0 20px rgba(255,255,255,0.03)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
          e.currentTarget.style.background  = "rgba(255,255,255,0.03)";
          e.currentTarget.style.boxShadow   = "none";
        }}
      />
    </div>
  );
}

function LandingPage({ onEnter, onRegister }: { onEnter: () => void; onRegister: () => void }) {
  const [scrollY, setScrollY] = useState(0);
  const [stats, setStats] = useState({
    liveEvents: 0,
    registrations: 0,
    clubs: 0,
    totalEvents: 0,
    totalStudents: 0
  });
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'contact' | null>(null);

  useEffect(() => {
    fetchPublicStats().then(data => {
      setStats({
        liveEvents: data.liveEvents || 0,
        registrations: data.registrations || 0,
        clubs: data.clubs || 0,
        totalEvents: data.totalEvents || 0,
        totalStudents: data.totalStudents || 0
      });
    }).catch(e => console.error("Failed to fetch public stats", e));
  }, []);

  useEffect(() => {
    const el = document.getElementById("ls");
    if (!el) return;
    const fn = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, []);

  const scrolled = scrollY > 40;

  return (
    <div id="ls" className="h-screen w-screen overflow-hidden flex flex-col relative bg-background">

      <nav className="fixed top-0 left-0 right-0 z-30 transition-all duration-700"
        style={{
          background:   scrolled ? "rgba(5,5,5,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(24px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Spotlight Logo" className="w-8 h-8 object-contain" />
            <span className="text-sm tracking-[0.35em] font-semibold text-white" style={{ fontFamily: F_LOGO }}>SPOTLIGHT</span>
          </div>
          <button onClick={onEnter}
            className="text-sm px-5 py-2 rounded-full text-white/85 hover:text-white transition-all duration-400"
            style={{ border: "1.5px solid rgba(255,255,255,0.2)" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
          >Sign In</button>
        </div>
      </nav>

      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div style={{
          position: "absolute", top: "-10%", left: "50%",
          transform: "translateX(-50%)",
          width: "700px", height: "900px",
          background: "conic-gradient(from 174deg at 50% 0%, transparent 0deg, rgba(255,255,255,0.035) 6deg, transparent 12deg)",
          filter: "blur(40px)",
          animation: "beamSweep 10s ease-in-out infinite",
        }} />
        {[
          { label: `● ${stats.liveEvents} LIVE EVENTS`, delay: 0, x: "left-[8%] top-[15%]", y: [0, -14, 0], d: 5.5 },
          { label: `${stats.registrations.toLocaleString()}+ REGISTRATIONS`, delay: 1.5, x: "right-[9%] top-[32%]", y: [0, 12, 0], d: 7 },
          { label: `● ${stats.clubs} ACTIVE CLUBS`, delay: 0.7, x: "left-[5%] top-[48%]", y: [0, 15, 0], d: 6.2 },
          { label: `${stats.totalEvents} EVENTS HOSTED`, delay: 2.2, x: "right-[8%] top-[65%]", y: [0, -10, 0], d: 6.8 },
          { label: `${stats.totalStudents.toLocaleString()}+ REGISTERED STUDENTS`, delay: 1.1, x: "left-[8%] top-[82%]", y: [0, 12, 0], d: 7.5 },
        ].map(chip => (
          <motion.div key={chip.label}
            animate={{ y: chip.y }}
            transition={{ duration: chip.d, repeat: Infinity, ease: "easeInOut", delay: chip.delay }}
            className={`absolute ${chip.x} px-3 py-1.5 rounded-full text-[11px] hidden xl:flex items-center gap-2`}
            style={{ border: "1.5px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.015)", color: "#f9fafb", fontFamily: FM, backdropFilter: "blur(12px)" }}
          >{chip.label}</motion.div>
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-between z-10 relative">
        
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 pt-24 pb-6 w-full max-w-5xl mx-auto">
          <section className="flex-1 flex flex-col items-center justify-center text-center py-6 w-full">
            <motion.div
              initial={{ opacity: 0, y: 70 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.2em" }}
                animate={{ opacity: 1, letterSpacing: "clamp(0.18em, 1.5vw, 0.55em)" }}
                transition={{ duration: 2, delay: 0.2 }}
                className="text-[11px] uppercase text-center mb-5 md:mb-6 tracking-[0.3em]"
                style={{ color: "#f9fafb", fontFamily: FM }}
              >Event Management Platform</motion.p>

              <motion.h1
                initial={{ opacity: 0, filter: "blur(20px)", scale: 0.9 }}
                animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className="leading-none text-white select-none text-center w-full flex items-center justify-center mx-auto" style={{
                fontFamily: F_LOGO, fontWeight: 600,
                fontSize: "clamp(2rem, 10vw, 12rem)",
                letterSpacing: "-0.02em",
                textShadow: "0 0 100px rgba(255,255,255,0.15)",
                marginTop: "0px",
                marginBottom: "0.8rem"
              }}>SPOTLIGHT</motion.h1>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 1.2 }}
                className="text-lg md:text-2xl max-w-xl mx-auto text-center"
                style={{ color: "#f9fafb", lineHeight: 1.65, fontFamily: FB, marginTop: "0px" }}
              >
                The Complete Campus{" "}<span style={{ color: "rgba(255,255,255,0.72)" }}>Event Management Hub.</span>
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row gap-4 items-center mt-6"
              >
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(240,61,78,0.25)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onEnter}
                  className="cursor-pointer group flex items-center justify-center px-12 py-4 text-sm font-semibold text-white bg-[#F03D4E] rounded-full transition-all duration-500"
                  style={{ cursor: "pointer" }}
                >
                  <span className="pointer-events-none">Enter Dashboard</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </section>
        </div>

        <footer className="w-full px-8 md:px-16 pb-6 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/5">
          <div className="flex-1 flex justify-center md:justify-start">
            <span className="text-sm tracking-[0.35em]" style={{ fontFamily: F_LOGO, color: "rgba(255,255,255,0.4)" }}>SPOTLIGHT</span>
          </div>
          <p className="text-xs text-center flex-shrink-0" style={{ color: "#94a3b8", fontFamily: FM }}>© 2026 Spotlight. All rights reserved.</p>
          <div className="flex-1 flex justify-center md:justify-end gap-6 text-[11px]" style={{ color: "#94a3b8" }}>
            <button onClick={() => setActiveModal('privacy')} className="hover:text-white transition-colors duration-300 hover:underline underline-offset-4 decoration-white/60" style={{ fontFamily: FB }}>Privacy</button>
            <button onClick={() => setActiveModal('terms')} className="hover:text-white transition-colors duration-300 hover:underline underline-offset-4 decoration-white/60" style={{ fontFamily: FB }}>Terms</button>
            <button onClick={() => setActiveModal('contact')} className="hover:text-white transition-colors duration-300 hover:underline underline-offset-4 decoration-white/60" style={{ fontFamily: FB }}>Contact Us</button>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {activeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl rounded-3xl p-8 max-h-[85vh] overflow-y-auto flex flex-col" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white" style={{ fontFamily: FC }}>
                    {activeModal === 'privacy' && 'Dashboard Privacy Policy'}
                    {activeModal === 'terms' && 'Dashboard Terms of Service'}
                    {activeModal === 'contact' && 'Contact Us'}
                  </h3>
                  <p className="text-xs text-[#999] mt-1" style={{ fontFamily: FB }}>
                    {activeModal === 'contact' ? 'Reach out to Spotlight Support' : 'Last Updated: July 26, 2026'}
                  </p>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-sm text-[#ccc] leading-relaxed border-t border-b border-white/5 py-6 text-left" style={{ fontFamily: FB }}>
                {activeModal === 'privacy' && (
                  <>
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1.5">Information We Collect From Clubs</h4>
                      <p className="text-xs text-[#bbbbbb] leading-relaxed">We collect and store your Club Name, Email Address, UPI ID, UPI QR Code graphics, custom club logos, and event details (title, description, venue, price, capacity limits, banner graphics). New accounts are verified via single-use registration keys.</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1.5">Participant Information Available to Clubs</h4>
                      <p className="text-xs text-[#bbbbbb] leading-relaxed">When users register for your events, we share their Name, USN/Roll Number, Email, Phone, Year, Semester, Branch, UPI Transaction ID (UTR), and payment proof screenshot URL with you to facilitate moderation.</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1.5">Handling Participant Information</h4>
                      <p className="text-xs text-[#bbbbbb] leading-relaxed">Clubs must process participant data strictly to organize and conduct the event. You must not sell or share participant data with third parties, use it for unrelated spam/marketing, or store downloaded lists insecurely.</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1.5">Third-Party Services</h4>
                      <p className="text-xs text-[#bbbbbb] leading-relaxed">We rely on secure authentication services, Supabase Storage (storing logos, posters, and user payment proof screenshots), and PostgreSQL databases to run the infrastructure.</p>
                    </div>
                  </>
                )}

                {activeModal === 'terms' && (
                  <>
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1.5">About the Spotlight Club Dashboard</h4>
                      <p className="text-xs text-[#bbbbbb] leading-relaxed">The Spotlight Club Dashboard allows authorized clubs to create, publish, and manage events. Once published, these events are visible to users of the Spotlight mobile application. Clubs can review, manage, approve, or deny participant registrations, including verifying payment proofs.</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1.5">Club Authentication</h4>
                      <p className="text-xs text-[#bbbbbb] leading-relaxed">We provide administrator sign-in, session verification, and secure access. Access is restricted using secure JSON Web Tokens. Clubs must maintain credential confidentiality.</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1.5">Participant Data Compliance</h4>
                      <p className="text-xs text-[#bbbbbb] leading-relaxed">Clubs must handle participant registrations responsibly. Downloading participant data for third-party commercial use or unauthorized solicitation is strictly prohibited.</p>
                    </div>
                  </>
                )}

                {activeModal === 'contact' && (
                  <>
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1.5">Reach Out For Support</h4>
                      <p className="text-xs text-[#bbbbbb] leading-relaxed mb-4">If you have concerns, deactivation requests, or reports of unauthorized dashboard activity, email support directly at:</p>
                      <a 
                        href="mailto:spotlightapp.help@gmail.com" 
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all"
                      >
                        <Mail size={16} />
                        <span>spotlightapp.help@gmail.com</span>
                      </a>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <h4 className="text-white font-semibold text-sm mb-1.5">Response Guidelines</h4>
                      <p className="text-xs text-[#888] leading-relaxed">Our support team reviews requests within 24-48 hours. Please include your registered Club Name and Email Address in your message.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setActiveModal(null)} className="px-6 py-2.5 text-xs text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all font-semibold" style={{ fontFamily: FB }}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function formatAuthError(err: any, defaultMsg: string): string {
  return sanitizeErrorMessage(err, defaultMsg);
}

function AuthPage({ tab, onTabChange, onBack, onLocalSignIn }: {
  tab: AuthTab; onTabChange: (t: AuthTab) => void; onBack: () => void;
  onLocalSignIn: (token: string, profile: any) => void;
}) {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clubName, setClubName] = useState("");

  const [registrationKey, setRegistrationKey] = useState("");
  const [keyVerified, setKeyVerified] = useState(false);
  const [verifyingKey, setVerifyingKey] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verifyingSignIn, setVerifyingSignIn] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationKey.trim()) {
      setError("Please enter your authorization key.");
      return;
    }
    setVerifyingKey(true);
    setError(null);
    try {
      await verifyRegistrationKey(registrationKey.trim());
      setKeyVerified(true);
    } catch (err: any) {
      setError(err.message || "Invalid or expired registration key.");
    } finally {
      setVerifyingKey(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setError(null);
      if (tab === "login") {
        if (!isSignInLoaded || !signIn) return;
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } else {
        if (!isSignUpLoaded || !signUp) return;
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      }
    } catch (err: any) {
      setError(formatAuthError(err, "Google Redirect Auth failed. Please try again."));
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in both Email ID and Password.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await clubLogin(email, password);
      if (data && data.token && data.profile) {
        onLocalSignIn(data.token, data.profile);
      } else {
        setError("Sign in failed. Invalid server response.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;
    if (!verificationCode) {
      setError("Please enter the verification code.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        setError("Verification not complete.");
      }
    } catch (err: any) {
      setError(formatAuthError(err, "Verification code is incorrect."));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;
    if (!clubName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in Club Name, Email ID, and Password.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signUp.create({
        emailAddress: email,
        password: password,
        firstName: clubName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err: any) {
      setError(formatAuthError(err, "Failed to initiate sign up."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;
    if (!verificationCode) {
      setError("Please enter the verification code.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete") {
        console.log("[CustomSignUp] Clerk signup verified successfully. Activating session & auto-provisioning club...");
        await setSignUpActive({ session: result.createdSessionId });

        try {
          const res = await createClub({
            name: clubName,
            email: email,
            password: password, 
            clerkUserId: result.createdUserId!,
            logoUrl: "",
            registrationKey: registrationKey.trim(),
          });
          localStorage.setItem("show_first_time_notice", "true");
          console.log("[CustomSignUp] Database club creation complete:", res);
          window.dispatchEvent(new CustomEvent('spotlight:club_created'));
        } catch (clubErr: any) {
          console.error("[CustomSignUp] Failed to create club in database:", clubErr);
          setError(sanitizeErrorMessage(clubErr, "Failed to create club."));
        }
      } else {
        setError("Verification not complete.");
      }
    } catch (err: any) {
      setError(formatAuthError(err, "Verification code is incorrect."));
    } finally {
      setLoading(false);
    }
  };

  if (tab === "register" && !keyVerified) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        className="fixed inset-0 z-20 flex items-center justify-center p-6"
        style={{ background: "rgba(5,5,5,0.97)", backdropFilter: "blur(10px)" }}
      >
        <button onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-sm transition-all duration-300"
          style={{ color: "#999", fontFamily: FB }}
          onMouseEnter={e => (e.currentTarget.style.color = "#eee")}
          onMouseLeave={e => (e.currentTarget.style.color = "#999")}
        ><ChevronLeft size={14} /> Back</button>

        <div className="w-full max-w-md p-8 md:p-10 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(240,61,78,0.1)", border: "1px solid rgba(240,61,78,0.2)" }}>
              <Key size={24} className="text-[#F03D4E]" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center" style={{ fontFamily: FC }}>Authorization Required</h2>
          </div>

          <form noValidate onSubmit={handleVerifyKey} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Authorization Key</label>
              <input
                type="text"
                placeholder="SPOTLIGHT-XXXX-XXXX"
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all uppercase tracking-widest"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FM }}
                value={registrationKey}
                onChange={e => { setRegistrationKey(e.target.value); if (error) setError(null); }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {error && (
              <p className="text-xs text-[#F03D4E] font-medium" style={{ fontFamily: FB }}>{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={verifyingKey}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#F03D4E] hover:bg-[#d63545] text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
              style={{ fontFamily: FB }}
            >
              {verifyingKey ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <><Shield size={14} /> Verify & Continue</>
              )}
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.08] text-center space-y-2">
            <p className="text-xs text-white/70 leading-relaxed font-normal" style={{ fontFamily: FB }}>
              Need an authorization key? Mail us at{" "}
              <a href="mailto:spotlightapp.help@gmail.com" className="text-[#10B981] font-medium hover:text-[#34d399] transition-colors underline underline-offset-2">
                spotlightapp.help@gmail.com
              </a>
            </p>
            <p className="text-xs text-white/60 leading-relaxed font-normal max-w-sm mx-auto" style={{ fontFamily: FB }}>
              Requests must be submitted using an official club mail ID or student mail ID. Personal email requests will not be processed.
            </p>
          </div>

          <p className="text-center text-[11px] text-[#555] mt-6" style={{ fontFamily: FM }}>Already have an account?{" "}
            <button onClick={() => { setError(null); setRegistrationKey(""); onTabChange("login"); }} className="text-white/50 hover:text-white transition-colors underline underline-offset-2">Sign In</button>
          </p>
        </div>
      </motion.div>
    );
  }

  if (verifying || verifyingSignIn) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        className="fixed inset-0 z-20 flex items-center justify-center p-6"
        style={{ background: "rgba(5,5,5,0.97)", backdropFilter: "blur(10px)" }}
      >
        <button onClick={() => { setVerifying(false); setVerifyingSignIn(false); setError(null); setVerificationCode(""); }}
          className="absolute top-8 left-8 flex items-center gap-2 text-sm transition-all duration-300"
          style={{ color: "#d1d5db", fontFamily: FB }}
          onMouseEnter={e => (e.currentTarget.style.color = "#eeeeee")}
          onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
        ><ChevronLeft size={14} /> Back</button>

        <div className="w-full max-w-md p-8 md:p-10 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: FC }}>
              {verifyingSignIn ? "Verify Sign In" : "Verify Email"}
            </h2>
            <p className="text-xs text-[#d1d5db]" style={{ fontFamily: FB }}>We sent a 6-digit verification code to <span className="text-white font-medium">{email}</span>. Please enter it below.</p>
          </div>

          <form noValidate onSubmit={verifyingSignIn ? handleVerifySignIn : handleVerify} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Verification Code</label>
              <input 
                type="text" 
                placeholder="e.g. 123456" 
                required
                maxLength={6}
                className="w-full rounded-xl px-4 py-3 text-center text-lg font-semibold tracking-[0.25em] text-white outline-none transition-all focus:border-white/30" 
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FM }} 
                value={verificationCode} 
                onChange={e => setVerificationCode(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs text-[#F03D4E] text-center font-medium" style={{ fontFamily: FB }}>{error}</p>
            )}

            <motion.button 
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#F03D4E] hover:bg-[#d63545] text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
              style={{ fontFamily: FB }}
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>Continue <ArrowRight size={14} /></>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="fixed inset-0 z-20 flex items-center justify-center p-6"
      style={{ background: "rgba(5,5,5,0.97)", backdropFilter: "blur(10px)" }}
    >
      <button onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-sm transition-all duration-300"
        style={{ color: "#d1d5db", fontFamily: FB }}
        onMouseEnter={e => (e.currentTarget.style.color = "#eeeeee")}
        onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
      ><ChevronLeft size={14} /> Back</button>

      <div className="flex flex-col items-center gap-6 w-full max-w-md">

        <div className="flex gap-1 p-1 rounded-xl w-full relative" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {(["login", "register"] as AuthTab[]).map(t => (
            <button key={t} onClick={() => { setEmail(""); setPassword(""); setClubName(""); setError(null); setShowPassword(false); setRegistrationKey(""); setKeyVerified(false); onTabChange(t); }}
              className="relative flex-1 py-2.5 text-sm font-medium transition-colors duration-300 cursor-pointer"
              style={{ fontFamily: FB }}
            >
              {tab === t && (
                <motion.div
                  layoutId="activeAuthTabPill"
                  className="absolute inset-0 bg-white rounded-lg"
                  transition={{ type: "spring", stiffness: 220, damping: 24 }}
                />
              )}
              <span className={`relative z-10 transition-colors duration-300 ${tab === t ? "text-black font-semibold" : "text-[#aaaaaa]"}`}>
                {t === "login" ? "Sign In" : "Sign Up"}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full p-8 md:p-10 rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: FC }}>
                  {tab === "login" ? "Sign In to Club" : "Register Your Club"}
                </h2>
                <p className="text-xs text-[#d1d5db]" style={{ fontFamily: FB }}>
                  {tab === "login" ? "Access your club dashboard" : "Welcome! Please fill in the details to get started."}
                </p>
              </div>

              <form noValidate onSubmit={tab === "login" ? handleSignIn : handleSignUp} className="space-y-6">
                {tab === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Club Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter club name" 
                      required
                      className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30" 
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
                      value={clubName} 
                      onChange={e => setClubName(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Email ID</label>
                  <input 
                    type="email" 
                    placeholder="Enter email address" 
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30" 
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter password" 
                      required
                      className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition-all focus:border-white/30" 
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/65 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-[#F03D4E] text-center font-medium" style={{ fontFamily: FB }}>{error}</p>
                )}

                <motion.button 
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#F03D4E] hover:bg-[#d63545] text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
                  style={{ fontFamily: FB }}
                >
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>Continue <ArrowRight size={14} /></>
                  )}
                </motion.button>
              </form>

              {tab === "login" && (
                <>
                  <div className="flex items-center gap-4 my-6">
                    <div className="h-[1px] bg-white/10 flex-1" />
                    <span className="text-[11px] text-white/55 uppercase tracking-widest" style={{ fontFamily: FM }}>or</span>
                    <div className="h-[1px] bg-white/10 flex-1" />
                  </div>

                  <motion.button
                    onClick={handleGoogleAuth}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="cursor-pointer w-full flex items-center justify-center gap-3 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-all duration-300"
                    style={{ fontFamily: FB }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.66 1.39 7.56l3.92 3.04C6.26 7.55 8.91 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.57v2.96h3.87c2.26-2.08 3.56-5.14 3.56-8.68z" />
                      <path fill="#FBBC05" d="M5.31 10.6C5.07 11.3 4.94 12.04 4.94 12.8s.13 1.5.37 2.2l-3.92 3.04C.48 16.29 0 14.61 0 12.8s.48-3.49 1.39-5.24l3.92 3.04z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.87-2.96c-1.08.72-2.48 1.16-4.09 1.16-3.09 0-5.74-2.51-6.69-5.56l-3.92 3.04C3.37 20.34 7.35 23 12 23z" />
                    </svg>
                    Continue with Google
                  </motion.button>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

const checkScanStatus = (eventDateStr?: string | null) => {
  if (!eventDateStr) {
    return { enabled: false, reason: "Scan disabled", isUpcoming: false };
  }

  const rawDate = new Date(eventDateStr);
  if (isNaN(rawDate.getTime())) {
    return { enabled: false, reason: "Scan disabled", isUpcoming: false };
  }

  const now = new Date();

  // If time is 00:00 (date only), default event start to 09:00 AM
  const eventStart = new Date(rawDate);
  if (eventStart.getHours() === 0 && eventStart.getMinutes() === 0) {
    eventStart.setHours(9, 0, 0, 0);
  }

  // 7:00 AM on the morning of event date
  const windowStart = new Date(
    eventStart.getFullYear(),
    eventStart.getMonth(),
    eventStart.getDate(),
    7, 0, 0, 0
  );

  // 2 hours after event start time
  const windowEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);

  if (now < windowStart) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateFormatted = `${monthNames[eventStart.getMonth()]} ${eventStart.getDate()}`;
    return { enabled: false, reason: `Opens ${dateFormatted} at 7:00 AM`, isUpcoming: true };
  }

  if (now > windowEnd) {
    return { enabled: false, reason: "Scan disabled", isUpcoming: false };
  }

  return { enabled: true, reason: "Scanner Active", isUpcoming: false };
};

function TicketScannerModal({
  activeEvent,
  getToken,
  onClose,
  onScanSuccess,
  scannerKey,
}: {
  activeEvent: any;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onScanSuccess?: (ticket: any) => void;
  scannerKey?: number;
}) {
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState<string | null>(null);

  useEffect(() => {
    setScanResult(null);
    setScanError(null);
    setManualCode("");
    setAlreadyCheckedIn(null);
  }, [scannerKey]);

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;
    const elementId = "qr-reader-canvas";

    const startScanner = async () => {
      try {
        html5Qrcode = new Html5Qrcode(elementId);
        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 25,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.85);
              return { width: Math.max(qrboxSize, 180), height: Math.max(qrboxSize, 180) };
            },
            aspectRatio: 1.0,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          } as any,
          async (decodedText) => {
            if (decodedText) {
              if (html5Qrcode && html5Qrcode.isScanning) {
                await html5Qrcode.stop().catch(() => {});
              }
              handleProcessTicket(decodedText);
            }
          },
          () => {}
        );
      } catch (err: any) {
        console.warn("[QR Scanner] Camera initialize warning:", err);
      }
    };

    if (!scanResult && !alreadyCheckedIn) {
      const timer = setTimeout(startScanner, 150);
      return () => {
        clearTimeout(timer);
        if (html5Qrcode && html5Qrcode.isScanning) {
          html5Qrcode.stop().catch(() => {});
        }
      };
    }
  }, [scanResult, alreadyCheckedIn]);

  const handleProcessTicket = async (ticketId: string) => {
    if (!ticketId.trim()) return;
    setLoading(true);
    setScanError(null);
    setAlreadyCheckedIn(null);
    try {
      const token = await getToken();
      const res = await verifyTicketQR(ticketId.trim(), activeEvent.id, token ?? undefined);
      if (res.valid && res.alreadyCheckedIn) {
        setAlreadyCheckedIn(res.message || 'This ticket has already been checked in.');
      } else if (res.valid && res.ticket) {
        setScanResult(res.ticket);
        if (onScanSuccess) {
          onScanSuccess(res.ticket);
        }
      } else {
        setScanError(res.error || "Unrecognized or invalid ticket.");
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to verify ticket QR code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-[#F03D4E]/20 bg-[#F03D4E]/[0.03] overflow-hidden"
    >
      
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Camera size={16} className="text-[#F03D4E]" />
          <span className="text-sm font-semibold text-white" style={{ fontFamily: FB }}>
            Scan Ticket QR
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider" style={{ fontFamily: FM }}>
            Live
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5">
        {alreadyCheckedIn ? (
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                    <path d="M12 8v4"/>
                    <path d="M12 16h.01"/>
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-amber-400" style={{ fontFamily: FM }}>
                    ALREADY CHECKED IN
                  </span>
                  <p className="text-sm font-semibold text-white mt-0.5" style={{ fontFamily: FB }}>
                    {alreadyCheckedIn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setAlreadyCheckedIn(null); setScanError(null); setManualCode(""); }}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer font-semibold"
                style={{ fontFamily: FB }}
              >
                Scan Next Ticket
              </button>
            </div>
            <p className="text-xs text-[#888] text-center" style={{ fontFamily: FB }}>
              This team/attendee is already marked as present. No duplicate entry was created.
            </p>
          </div>
        ) : !scanResult ? (
          <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
            
            <div className="flex-shrink-0 flex flex-col items-center mx-auto lg:mx-0">
              <div
                className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl"
                style={{ width: 280, height: 280 }}
              >
                <div id="qr-reader-canvas" className="w-full h-full" />

                {/* Professional Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 p-4">
                  {/* Subtle Laser Scanline */}
                  <div className="absolute inset-x-4 h-[1.5px] bg-gradient-to-r from-transparent via-[#F03D4E] to-transparent shadow-[0_0_8px_#F03D4E] animate-scanlaser pointer-events-none opacity-80" />

                  {/* Elegant Corner Guides */}
                  <div className="absolute top-4 left-4 w-5 h-5 border-t border-l border-white/40 rounded-tl" />
                  <div className="absolute top-4 right-4 w-5 h-5 border-t border-r border-white/40 rounded-tr" />
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b border-l border-white/40 rounded-bl" />
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b border-r border-white/40 rounded-br" />
                </div>

                {loading && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                    <div className="w-7 h-7 border-2 border-[#F03D4E] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-white/80 font-medium" style={{ fontFamily: FB }}>Verifying Ticket...</p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-white/30 mt-2 text-center" style={{ fontFamily: FB }}>
                Point camera at attendee's QR code
              </p>
            </div>

            {/* Manual Entry */}
            <div className="flex-1 flex flex-col justify-center gap-4 w-full text-center lg:text-left">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ fontFamily: FM }}>
                  Or enter Ticket ID or Team Passkey
                </p>
                <p className="text-[11px] text-white/30" style={{ fontFamily: FB }}>
                  Enter Ticket ID or Team Passkey manually if camera cannot scan
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Ticket ID or Team Passkey..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleProcessTicket(manualCode);
                  }}
                  className="flex-1 rounded-xl px-4 py-2.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#F03D4E]/50 transition-all"
                  style={{ fontFamily: FB }}
                />
                <button
                  onClick={() => handleProcessTicket(manualCode)}
                  disabled={loading || !manualCode.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#F03D4E] text-white text-xs font-semibold hover:bg-[#d63545] transition-all disabled:opacity-40 cursor-pointer flex-shrink-0"
                  style={{ fontFamily: FB }}
                >
                  Verify
                </button>
              </div>
              {scanError && (
                <div className="p-3.5 rounded-xl bg-[#F03D4E]/10 border border-[#F03D4E]/20 flex items-start gap-2.5 text-left">
                  <AlertTriangle size={16} className="text-[#F03D4E] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#ff949d] font-medium leading-relaxed" style={{ fontFamily: FB }}>
                    {scanError}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Inline Result Panel */
          <div className="space-y-5">
            {/* Verified Header Bar */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-emerald-400" style={{ fontFamily: FM }}>
                      TICKET VERIFIED · {scanResult.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white mt-0.5" style={{ fontFamily: FB }}>
                    {scanResult.event.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setScanResult(null); setScanError(null); setManualCode(""); }}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer font-semibold"
                style={{ fontFamily: FB }}
              >
                Scan Next Ticket
              </button>
            </div>

            {/* Scanned Attendee Profile Summary */}
            {scanResult.attendee && (
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-[11px] uppercase tracking-widest text-[#f3f4f6] font-semibold" style={{ fontFamily: FM }}>
                    Scanned Attendee Details
                  </span>
                  {scanResult.team && (
                    <span className="text-xs text-white/70 font-mono" style={{ fontFamily: FB }}>
                      Team: <strong className="text-white">{scanResult.team.name}</strong> (Passkey: <span className="text-emerald-400 font-bold">{scanResult.team.passkey}</span>)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-[#94a3b8]" style={{ fontFamily: FB }}>
                  <div>
                    <span className="text-[10px] uppercase text-[#666] block mb-0.5" style={{ fontFamily: FM }}>Full Name</span>
                    <span className="text-white font-medium text-sm">{scanResult.attendee.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#666] block mb-0.5" style={{ fontFamily: FM }}>USN</span>
                    <span className="text-white font-mono">{scanResult.attendee.usn || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#666] block mb-0.5" style={{ fontFamily: FM }}>Email</span>
                    <span className="text-white font-mono text-[11px]">{scanResult.attendee.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#666] block mb-0.5" style={{ fontFamily: FM }}>Branch / Sem</span>
                    <span className="text-white">
                      {scanResult.attendee.branch || '—'}
                      {scanResult.attendee.sem ? `, Sem ${scanResult.attendee.sem}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Team Members List */}
            {scanResult.team && scanResult.team.members.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#f3f4f6]" style={{ fontFamily: FM }}>
                    Team Roster ({scanResult.team.members.length} members checked-in)
                  </h4>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.005]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-[#94a3b8]" style={{ fontFamily: FM }}>
                        <th className="p-3">Member Name</th>
                        <th className="p-3">USN</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80" style={{ fontFamily: FB }}>
                      {scanResult.team.members.map((member: any) => (
                        <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-semibold text-white flex items-center gap-2">
                            {member.name}
                            {member.isLeader && (
                              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase tracking-wider" style={{ fontFamily: FM }}>Leader</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[#94a3b8]">{member.usn || '—'}</td>
                          <td className="p-3 text-[#94a3b8]">{member.email || '—'}</td>
                          <td className="p-3 text-[#94a3b8]">{member.branch || '—'}</td>
                          <td className="p-3 text-right">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                              member.status?.toUpperCase() === 'CONFIRMED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`} style={{ fontFamily: FM }}>
                              {member.status || 'CONFIRMED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EventsPage({ 
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

  const registrations = selectedEventId
    ? allRegistrations.filter(r => r.eventId === selectedEventId)
    : [];

  const activeEvent = EVENTS.find(e => e.id === selectedEventId);
  const isEventFinished = activeEvent 
    ? (activeEvent.status === "previous" || (() => {
        if (!activeEvent.date) return false;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const d = new Date(activeEvent.date + 'T23:59:59');
        return d < todayStart;
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

    const poll = async () => {
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
        if (isMounted) {
          setRegsLoading(false);
        }
      }
    };

    poll();

    const intervalId = setInterval(poll, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedEventId]);

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    if (isEventFinished) return;
    try {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
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
        <button onClick={() => { setSelectedEventId(null); setShowTeams(false, false); }}
          className="flex items-center gap-2 text-sm transition-all duration-300"
          style={{ color: "#d1d5db", fontFamily: FB }}
          onMouseEnter={e => (e.currentTarget.style.color = "#eeeeee")}
          onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
        ><ChevronLeft size={14} /> Back to Events</button>

        {showTeams ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-[13px] tracking-[0.4em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Manage Teams ({teamsList.length})</h1>
              <button onClick={() => setShowTeams(false)} className="text-xs px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#f3f4f6] hover:text-white transition-all" style={{ fontFamily: FB }}>Return to Event</button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teamsList.map(team => (
                <div key={team.id} className="p-6 rounded-2xl flex flex-col" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="text-white font-semibold text-lg leading-tight" style={{ fontFamily: FC }}>{team.name}</h3>
                      <p className="text-[11px] text-[#888] font-mono mt-1 tracking-wider">PASSKEY: {team.passkey || 'Pending Payment'}</p>
                    </div>
                    <span className="text-[11px] bg-white/5 px-2 py-1 rounded text-[#f3f4f6]" style={{ fontFamily: FM }}>{team.members.length} MEMBERS</span>
                  </div>
                  <div className="space-y-3 mt-auto">
                    {team.members.map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-xs text-[#ddd]" style={{ fontFamily: FB }}>{m.user?.name || m.user?.usn || 'Unknown'}</span>
                          <span className="text-[11px] text-[#94a3b8]" style={{ fontFamily: FM }}>{m.user?.usn || m.user?.email}</span>
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
                <h1 className="text-[13px] tracking-[0.4em] uppercase text-[#f3f4f6] mb-1" style={{ fontFamily: FM }}>Registration Approval</h1>
                <p className="text-xs text-[#888]" style={{ fontFamily: FB }}>{pending.length} pending · {approved.length} approved · {rejected.length} rejected</p>
              </div>
              <button onClick={() => setShowApprovals(false)} className="text-xs px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#f3f4f6] hover:text-white transition-all self-start sm:self-auto" style={{ fontFamily: FB }}>Return to Event</button>
            </div>

            {isEventFinished && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2.5" style={{ fontFamily: FB }}>
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>This event has finished. Approving or rejecting pending registrations is disabled.</span>
              </div>
            )}

            {/* Pending requests table */}
            <div>
              <p className="text-[11px] tracking-[0.4em] uppercase text-[#f3f4f6] mb-4" style={{ fontFamily: FM }}>Pending Requests ({pending.length})</p>
              {pending.length === 0 ? (
                <div className="p-8 rounded-xl text-center text-xs text-[#94a3b8]" style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", fontFamily: FB }}>No pending requests — you're all caught up.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.005]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5" style={{ background: "rgba(255,255,255,0.01)" }}>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Email</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Phone</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>USN</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Branch</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Team Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>UTR / Payment</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Date</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6] text-left" style={{ fontFamily: FM }}>Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <AnimatePresence>
                        {pending.map((req) => {
                          const isLeader = req.team ? req.team.leaderId === req.user?.id : false;
                          return (
                            <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 max-w-[180px]">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white/50">{(req.user?.name ?? '?').charAt(0)}</div>
                                  <p className="text-sm font-medium text-white/80 truncate" title={req.user?.name ?? 'Unknown'} style={{ fontFamily: FB }}>{req.user?.name ?? 'Unknown'}</p>
                                </div>
                              </td>
                              <td className="p-4 text-xs text-[#888] max-w-[200px] truncate" title={req.user?.email ?? '—'} style={{ fontFamily: FM }}>{req.user?.email ?? '—'}</td>
                              <td className="p-4 text-xs font-mono text-[#888] max-w-[130px] truncate" title={req.user?.phone ?? '—'}>{req.user?.phone ?? '—'}</td>
                              <td className="p-4 text-xs font-mono text-[#888] max-w-[120px] truncate" title={req.user?.usn ?? '—'}>{req.user?.usn ?? '—'}</td>
                              <td className="p-4 text-xs text-[#888] max-w-[90px] truncate" title={req.user?.branch ?? '—'}>{req.user?.branch ?? '—'}</td>
                              <td className="p-4 text-xs text-[#888] max-w-[180px]">
                                {req.team ? (
                                  <div>
                                    <span className="font-medium text-white/80 block truncate" title={req.team.name} style={{ fontFamily: FB }}>{req.team.name}</span>
                                    <p className="text-[10px] text-[#94a3b8] font-mono">Passkey: {req.team.passkey || 'Pending Payment'}</p>
                                  </div>
                                ) : (
                                  <span className="text-[#888] font-mono">—</span>
                                )}
                              </td>
                              <td className="p-4 text-xs font-mono text-[#888] max-w-[150px]">
                                {activeEvent.price === 0 ? (
                                  <span className="text-[#94a3b8]">Free</span>
                                ) : req.team ? (
                                  isLeader ? (
                                    req.transaction_id ? (
                                      <span className="select-all text-[#a3e635] bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[11px] truncate block" title={req.transaction_id}>{req.transaction_id}</span>
                                    ) : (
                                      <span className="text-[#e59866] text-[10px] uppercase tracking-wider">Pending Upload</span>
                                    )
                                  ) : (
                                    <span className="text-[#94a3b8] italic text-[11px]">Member</span>
                                  )
                                ) : (
                                  req.transaction_id ? (
                                    <span className="select-all text-[#a3e635] bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[11px] truncate block" title={req.transaction_id}>{req.transaction_id}</span>
                                  ) : (
                                    <span className="text-[#e59866] text-[10px] uppercase tracking-wider">Pending Upload</span>
                                  )
                                )}
                              </td>
                              <td className="p-4 text-[11px] text-[#888] font-mono whitespace-nowrap">{req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    disabled={isEventFinished}
                                    onClick={(e) => !isEventFinished && handleApprove(req.id, e)}
                                    title="Approve Registration"
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                      isEventFinished 
                                        ? 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed opacity-50' 
                                        : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20 hover:scale-105'
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
                                        ? 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed opacity-50' 
                                        : 'bg-[#F03D4E]/10 hover:bg-[#F03D4E]/20 text-[#F03D4E] border-[#F03D4E]/20 hover:scale-105'
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
              <p className="text-[11px] tracking-[0.4em] uppercase text-[#f3f4f6] mb-4" style={{ fontFamily: FM }}>Approved ({approved.length})</p>
              {approved.length === 0 ? (
                <div className="p-8 rounded-xl text-center text-xs text-[#94a3b8]" style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", fontFamily: FB }}>No approved registrations yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.005]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5" style={{ background: "rgba(255,255,255,0.01)" }}>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Email</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Phone</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>USN</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Branch</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Team Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>UTR / Payment</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Date</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6] text-left" style={{ fontFamily: FM }}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {approved.map((req) => {
                        const isLeader = req.team ? req.team.leaderId === req.user?.id : false;
                        return (
                          <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 max-w-[180px]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white/50">{(req.user?.name ?? '?').charAt(0)}</div>
                                <p className="text-sm font-medium text-white/70 truncate" title={req.user?.name ?? 'Unknown'} style={{ fontFamily: FB }}>{req.user?.name ?? 'Unknown'}</p>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-[#888] max-w-[200px] truncate" title={req.user?.email ?? '—'} style={{ fontFamily: FM }}>{req.user?.email ?? '—'}</td>
                            <td className="p-4 text-xs font-mono text-[#888] max-w-[130px] truncate" title={req.user?.phone ?? '—'}>{req.user?.phone ?? '—'}</td>
                            <td className="p-4 text-xs font-mono text-[#888] max-w-[120px] truncate" title={req.user?.usn ?? '—'}>{req.user?.usn ?? '—'}</td>
                            <td className="p-4 text-xs text-[#888] max-w-[90px] truncate" title={req.user?.branch ?? '—'}>{req.user?.branch ?? '—'}</td>
                            <td className="p-4 text-xs text-[#888] max-w-[180px]">
                              {req.team?.name ? (
                                <span className="truncate block" title={req.team.name}>{req.team.name}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-4 text-xs font-mono text-[#888] max-w-[150px]">
                              {activeEvent.price === 0 ? (
                                <span className="text-[#94a3b8]">Free</span>
                              ) : req.team ? (
                                isLeader ? (
                                  <span className="truncate block" title={req.transaction_id ?? '—'}>{req.transaction_id ?? '—'}</span>
                                ) : (
                                  <span className="italic text-[11px]">Member</span>
                                )
                              ) : (
                                <span className="truncate block" title={req.transaction_id ?? '—'}>{req.transaction_id ?? '—'}</span>
                              )}
                            </td>
                            <td className="p-4 text-[11px] text-[#888] font-mono whitespace-nowrap">{req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                            <td className="p-4 text-center">
                              <span className="text-[11px] text-green-500 uppercase tracking-widest font-bold" style={{ fontFamily: FM }}>Approved</span>
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
              <p className="text-[11px] tracking-[0.4em] uppercase text-[#f3f4f6] mb-4" style={{ fontFamily: FM }}>Rejected ({rejected.length})</p>
              {rejected.length === 0 ? (
                <div className="p-8 rounded-xl text-center text-xs text-[#94a3b8]" style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", fontFamily: FB }}>No rejected registrations.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.005]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5" style={{ background: "rgba(255,255,255,0.01)" }}>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Email</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Phone</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>USN</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Branch</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Team Name</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>UTR / Payment</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Date</th>
                        <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6] text-left" style={{ fontFamily: FM }}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rejected.map((req) => {
                        const isLeader = req.team ? req.team.leaderId === req.user?.id : false;
                        return (
                          <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 max-w-[180px]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white/50">{(req.user?.name ?? '?').charAt(0)}</div>
                                <p className="text-sm font-medium text-white/80 truncate" title={req.user?.name ?? 'Unknown'} style={{ fontFamily: FB }}>{req.user?.name ?? 'Unknown'}</p>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-[#888] max-w-[200px] truncate" title={req.user?.email ?? '—'} style={{ fontFamily: FM }}>{req.user?.email ?? '—'}</td>
                            <td className="p-4 text-xs font-mono text-[#888] max-w-[130px] truncate" title={req.user?.phone ?? '—'}>{req.user?.phone ?? '—'}</td>
                            <td className="p-4 text-xs font-mono text-[#888] max-w-[120px] truncate" title={req.user?.usn ?? '—'}>{req.user?.usn ?? '—'}</td>
                            <td className="p-4 text-xs text-[#888] max-w-[90px] truncate" title={req.user?.branch ?? '—'}>{req.user?.branch ?? '—'}</td>
                            <td className="p-4 text-xs text-[#888] max-w-[180px]">
                              {req.team ? (
                                <div>
                                  <span className="font-medium text-white/80 block truncate" title={req.team.name} style={{ fontFamily: FB }}>{req.team.name}</span>
                                  <p className="text-[10px] text-[#94a3b8] font-mono">Passkey: {req.team.passkey}</p>
                                </div>
                              ) : (
                                <span className="text-[#888] font-mono">—</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-mono text-[#888] max-w-[150px]">
                              {activeEvent.price === 0 ? (
                                <span className="text-[#94a3b8]">Free</span>
                              ) : req.team ? (
                                isLeader ? (
                                  req.transaction_id ? (
                                    <span className="select-all text-[#f87171] bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[11px] truncate block" title={req.transaction_id}>{req.transaction_id}</span>
                                  ) : (
                                    <span className="text-[#888] text-[10px] uppercase tracking-wider">—</span>
                                  )
                                ) : (
                                  <span className="text-[#94a3b8] italic text-[11px]">Member</span>
                                )
                              ) : (
                                req.transaction_id ? (
                                  <span className="select-all text-[#f87171] bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[11px] truncate block" title={req.transaction_id}>{req.transaction_id}</span>
                                ) : (
                                  <span className="text-[#888] text-[10px] uppercase tracking-wider">—</span>
                                )
                              )}
                            </td>
                            <td className="p-4 text-[11px] text-[#888] font-mono whitespace-nowrap">{req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                            <td className="p-4 text-center">
                              <span className="text-[11px] text-[#F03D4E] uppercase tracking-widest font-bold" style={{ fontFamily: FM }}>Rejected</span>
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
                  <h1 className="text-[13px] tracking-[0.4em] uppercase text-[#f3f4f6] mb-1" style={{ fontFamily: FM }}>Manage Attendees (Attendance List)</h1>
                  <p className="text-xs text-[#888]" style={{ fontFamily: FB }}>
                    Scanned Attendees: <span className="text-[#10b981] font-bold">{combinedAttendanceList.length} checked-in</span> ({registrations.length} total registered)
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
                    className="text-xs px-4 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 border border-green-500/20 transition-all font-semibold disabled:opacity-40 disabled:cursor-not-allowed" 
                    style={{ fontFamily: FB }}
                  >
                    Export CSV
                  </button>
                  {(() => {
                    const scanInfo = checkScanStatus(activeEvent.eventDate || activeEvent.date);
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
                            ? "bg-[#F03D4E]/10 hover:bg-[#F03D4E]/20 text-[#F03D4E] border-[#F03D4E]/30 cursor-pointer shadow-sm"
                            : "bg-[#F03D4E]/10 text-white/30 border-white/5 cursor-not-allowed opacity-50"
                        }`}
                        style={{ fontFamily: FB }}
                      >
                        <Camera size={14} /> Scan Ticket QR
                        {!scanInfo.enabled && (
                          <span className={`text-[10px] font-mono ${scanInfo.isUpcoming ? 'text-emerald-400 font-semibold' : 'text-amber-400/80'}`}>{scanInfo.reason}</span>
                        )}
                      </button>
                    );
                  })()}
                  <button onClick={() => setShowParticipants(false)} className="text-xs px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#f3f4f6] hover:text-white transition-all" style={{ fontFamily: FB }}>Return to Event</button>
                </div>
              </div>

              {showScannerModal && (
                <TicketScannerModal
                  activeEvent={activeEvent}
                  getToken={getToken}
                  scannerKey={scannerKey}
                  onClose={() => setShowScannerModal(false)}
                  onScanSuccess={async (scannedTicket) => {
                    await refreshEvents();
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
              )}

              <div className="relative max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search scanned attendees by name, USN, email, branch or team..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#F03D4E]/40 focus:ring-1 focus:ring-[#F03D4E]/40 transition-all"
                  style={{ fontFamily: FB }}
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.005]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5" style={{ background: "rgba(255,255,255,0.01)" }}>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Name</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>USN</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Branch / Sem</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Contact</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Type</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Team Name</th>
                      <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6] text-right" style={{ fontFamily: FM }}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
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
                        <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                                {(attendee.name ?? '?').charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white/90 flex items-center gap-2" style={{ fontFamily: FB }}>
                                  {attendee.name ?? 'Unknown'}
                                  {attendee.isLeader && (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">Leader</span>
                                  )}
                                </p>
                                <p className="text-[11px] text-[#94a3b8] mt-0.5" style={{ fontFamily: FM }}>{attendee.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-mono text-[#aaa]">{attendee.usn ?? 'N/A'}</td>
                          <td className="p-4 text-xs text-[#aaa]">
                            {attendee.branch ? (
                              <div>
                                <p>{attendee.branch}</p>
                                <p className="text-[11px] text-[#94a3b8] mt-0.5 font-mono">
                                  {attendee.year ? `Y${attendee.year}` : ''}
                                  {attendee.year && attendee.sem ? ' · ' : ''}
                                  {attendee.sem ? `Sem ${attendee.sem}` : ''}
                                  {!attendee.year && !attendee.sem ? 'N/A' : ''}
                                </p>
                              </div>
                            ) : 'N/A'}
                          </td>
                          <td className="p-4 text-xs text-[#aaa] font-mono">{attendee.phone ?? 'N/A'}</td>
                          <td className="p-4">
                            {team ? (
                              <div>
                                <span className="text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-bold" style={{ fontFamily: FM }}>TEAM</span>
                                <p className="text-[11px] text-[#94a3b8] mt-1 font-mono">Passkey: {team.passkey}</p>
                              </div>
                            ) : (
                              <span className="text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold" style={{ fontFamily: FM }}>SOLO</span>
                            )}
                          </td>
                          <td className="p-4 text-xs">
                            {team?.name ? (
                              <span className="font-medium text-white/90" style={{ fontFamily: FB }}>{team.name}</span>
                            ) : (
                              <span className="text-[#888] font-mono">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-[11px] uppercase tracking-widest px-2.5 py-1 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" style={{ fontFamily: FM }}>
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
                            <div className="w-12 h-12 rounded-2xl bg-[#F03D4E]/10 border border-[#F03D4E]/20 flex items-center justify-center text-[#F03D4E]">
                              <Camera size={24} />
                            </div>
                            <p className="text-sm font-semibold text-white" style={{ fontFamily: FB }}>No attendees scanned yet</p>
                            <p className="text-xs text-[#888] max-w-sm" style={{ fontFamily: FB }}>
                              Click <span className="text-[#F03D4E] font-semibold">"Scan Ticket QR"</span> above to start scanning.
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
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl mb-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {activeEvent.bannerUrl ? (
                      <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => setShowFullBannerModal(true)}>
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative border border-white/10 shadow-md">
                          <img src={activeEvent.bannerUrl} alt="Banner thumbnail" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white group-hover:text-[#F03D4E] transition-colors flex items-center gap-2" style={{ fontFamily: FB }}>
                            <Eye size={15} className="text-[#F03D4E]" /> Click to view full banner
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-xs text-[#94a3b8]" style={{ fontFamily: FB }}>
                        <ImageIcon size={16} className="text-white/40" /> No banner image uploaded for this event.
                      </div>
                    )}

                    <div className="flex items-center gap-3 ml-auto">
                      {bannerError && (
                        <p className="text-[11px] text-[#F03D4E] font-medium truncate" style={{ fontFamily: FB }}>{bannerError}</p>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="banner-update-input"
                        className="hidden"
                        onChange={handleBannerChange}
                        disabled={bannerUploading || activeEvent.status === "previous"}
                      />
                      <label
                        htmlFor="banner-update-input"
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeEvent.status === "previous" ? "opacity-40 pointer-events-none" : "cursor-pointer bg-white/5 hover:bg-white/10 text-white"}`}
                        style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}
                      >
                        {bannerUploading ? (
                          <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/60 border-t-transparent animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload size={13} /> {activeEvent.bannerUrl ? "Update Banner" : "Upload Banner"}</>
                        )}
                      </label>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showFullBannerModal && activeEvent.bannerUrl && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8"
                        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)" }}
                        onClick={() => setShowFullBannerModal(false)}
                      >
                        <button 
                          onClick={() => setShowFullBannerModal(false)}
                          className="fixed top-6 right-6 z-[80] p-3 text-white/80 hover:text-white transition-all bg-white/10 hover:bg-white/20 rounded-full cursor-pointer shadow-lg backdrop-blur-md"
                          title="Close"
                        >
                          <X size={22} />
                        </button>
                        <div 
                          className="relative max-w-5xl max-h-[85vh] flex items-center justify-center p-2 rounded-2xl"
                          onClick={e => e.stopPropagation()}
                        >
                          <img 
                            src={activeEvent.bannerUrl} 
                            alt={activeEvent.title} 
                            className="w-auto h-auto max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10" 
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {showBannerPasswordModal && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}>
                        <div className="w-full max-w-md p-8 rounded-3xl relative" style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)" }}>
                          <button onClick={() => { setShowBannerPasswordModal(false); setBannerPassword(""); setBannerPasswordError(null); }} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
                          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: FC }}>Confirm Banner Update</h2>
                          <p className="text-xs text-[#a1a1aa] mb-6" style={{ fontFamily: FB }}>Enter your club password to save the new banner.</p>

                          <div className="space-y-1.5 mb-6">
                            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Password</label>
                            <input
                              autoFocus
                              type="password"
                              placeholder="Enter password"
                              value={bannerPassword}
                              onChange={e => { setBannerPassword(e.target.value); setBannerPasswordError(null); }}
                              onKeyDown={e => { if (e.key === "Enter" && !bannerUploading) handleBannerPasswordConfirm(); }}
                              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: FB }}
                              onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"}
                              onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                            />
                          </div>

                          {bannerPasswordError && <p className="text-xs text-[#F03D4E] font-medium mb-6 text-center" style={{ fontFamily: FB }}>{bannerPasswordError}</p>}

                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => { setShowBannerPasswordModal(false); setBannerPassword(""); setBannerPasswordError(null); }} className="px-6 py-2.5 text-xs text-white bg-white/[0.06] hover:bg-white/10 rounded-full transition-all font-semibold cursor-pointer" style={{ fontFamily: FB }}>Cancel</button>
                            <button
                              onClick={handleBannerPasswordConfirm}
                              disabled={bannerUploading}
                              className="px-6 py-2.5 text-xs text-white bg-[#F03D4E] hover:bg-[#d63545] rounded-full transition-all font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
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
                {activeEvent.status === "live" ? (
                  <LiveTag size="large" />
                ) : (
                  <span className="text-[11px] tracking-[0.3em] uppercase px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#aaa]" style={{ fontFamily: FM }}>
                    Upcoming
                  </span>
                )}
                <span className="text-[11px] tracking-[0.2em] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#aaa", fontFamily: FM }}>{activeEvent.club}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold text-white" style={{ fontFamily: FC }}>{activeEvent.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs" style={{ color: "#f9fafb", fontFamily: FB }}>
                 <span className="flex items-center gap-1.5"><Calendar size={12} />{formatEventHeaderDate(activeEvent.eventDate || activeEvent.date, activeEvent.eventEndDate)}</span>
                 <span className="flex items-center gap-1.5"><MapPin size={12} />{activeEvent.venue}</span>
                 {(() => {
                   const isTeam = activeEvent.eventType === 'Team' || (activeEvent.teamSizeLimit && activeEvent.teamSizeLimit > 1) || activeEvent.type === 'Team';
                   if (!isTeam) {
                     return (
                       <span className="flex items-center gap-1.5 text-blue-400 font-medium bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20" style={{ fontFamily: FM }}>
                         <Users size={12} />Solo
                       </span>
                     );
                   }
                   const max = activeEvent.teamSizeLimit;
                   return (
                     <>
                       <span className="flex items-center gap-1.5 text-purple-400 font-medium bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20" style={{ fontFamily: FM }}>
                         <Users size={12} />Team
                       </span>
                       {max ? (
                         <span className="flex items-center gap-1.5 text-purple-300 font-medium bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20" style={{ fontFamily: FM }}>
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
                 <div key={i} className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[11px] tracking-[0.3em] uppercase mb-2" style={{ color: "#f3f4f6", fontFamily: FM }}>{stat.label}</p>
                    <p className="text-3xl font-semibold text-white">{stat.value}</p>
                 </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-8 mb-2">
               <div>
                 {activeEvent.registrationDeadline && (
                   <p className="text-xs text-[#888]" style={{ fontFamily: FB }}>
                     Registration Deadline: <span className="text-white/80 font-medium">{new Date(activeEvent.registrationDeadline).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}</span>
                   </p>
                 )}
               </div>
               <motion.button
                 whileHover={activeEvent.status === "previous" ? undefined : { scale: 1.02 }}
                 whileTap={activeEvent.status === "previous" ? undefined : { scale: 0.97 }}
                 disabled={activeEvent.status === "previous"}
                 onClick={() => {
                   const formatLocalDateStr = (dStr?: string | null) => {
                     if (!dStr) return "";
                     const d = new Date(dStr);
                     if (isNaN(d.getTime())) return "";
                     const year = d.getFullYear();
                     const month = String(d.getMonth() + 1).padStart(2, '0');
                     const day = String(d.getDate()).padStart(2, '0');
                     const hours = String(d.getHours()).padStart(2, '0');
                     const mins = String(d.getMinutes()).padStart(2, '0');
                     return `${year}-${month}-${day}T${hours}:${mins}`;
                   };

                   const startDateVal = formatLocalDateStr(activeEvent.eventDate || activeEvent.date);
                   let defaultEndDateVal = formatLocalDateStr(activeEvent.eventEndDate);
                   if (!defaultEndDateVal && startDateVal) {
                     const datePart = startDateVal.split('T')[0];
                     defaultEndDateVal = `${datePart}T23:59`;
                   }

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
                 className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#F03D4E] rounded-xl transition-all duration-300 ${activeEvent.status === "previous" ? "opacity-40 cursor-not-allowed" : ""}`}
                 onMouseEnter={e => {
                   if (activeEvent.status === "previous") return;
                   e.currentTarget.style.boxShadow = "0 0 25px rgba(240,61,78,0.3)";
                 }}
                 onMouseLeave={e => {
                   e.currentTarget.style.boxShadow = "none";
                 }}
                 style={{ fontFamily: FB }}
               >
                 <Calendar size={14} /> Update Event
               </motion.button>
            </div>

            <div className="mt-8 pt-8 flex flex-wrap gap-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>

              <div 
                onClick={() => {
                  if (!isEventFinished) setShowApprovals(true);
                }}
                className={`p-5 rounded-2xl flex items-center gap-5 transition-all duration-300 ${
                  isEventFinished ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/[0.03] hover:border-white/10'
                }`}
                style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", width: "fit-content", minWidth: "280px" }}
                onMouseEnter={e => {
                  if (isEventFinished) return;
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  if (isEventFinished) return;
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <CheckCircle size={20} className={isEventFinished ? "text-white/30" : "text-white/70"} />
                  {!isEventFinished && pending.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[#F03D4E] text-white text-[10px] font-bold flex items-center justify-center" style={{ fontFamily: FM }}>{pending.length}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-lg leading-tight ${isEventFinished ? 'text-white/40' : 'text-white'}`} style={{ fontFamily: FC }}>Registration Approval</h3>
                    {isEventFinished && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider" style={{ fontFamily: FM }}>Closed</span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: isEventFinished ? "#666" : "#888", fontFamily: FB }}>
                    {isEventFinished ? "Disabled (Event has ended)" : "Review & approve pending requests"}
                  </p>
                </div>
              </div>

              <div 
                onClick={() => setShowParticipants(true)}
                className="p-5 rounded-2xl flex items-center gap-5 cursor-pointer transition-all duration-300" 
                style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", width: "fit-content", minWidth: "280px" }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <Users size={20} className="text-white/70" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-lg leading-tight" style={{ fontFamily: FC }}>Manage Attendees</h3>
                  <p className="text-xs mt-1" style={{ color: "#888", fontFamily: FB }}>Roster database & CSV exports</p>
                </div>
              </div>

              {teamsList.length > 0 && (
                <div 
                  onClick={() => setShowTeams(true)}
                  className="p-5 rounded-2xl flex items-center gap-5 cursor-pointer transition-all duration-300" 
                  style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", width: "fit-content", minWidth: "280px" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <Users size={20} className="text-white/70" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-lg leading-tight" style={{ fontFamily: FC }}>Manage Teams</h3>
                    <p className="text-xs mt-1" style={{ color: "#888", fontFamily: FB }}>Oversee team slots per event</p>
                  </div>
                </div>
              )}

            </div>

            <AnimatePresence>
              {showEditModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start pt-16 justify-center p-6 overflow-y-auto" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}>
                  <div className="w-full max-w-lg p-8 rounded-3xl relative mb-24" style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)" }}>
                    <button onClick={() => setShowEditModal(false)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
                    <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: FC }}>Update Event</h2>

                    <div className="space-y-5">
                      
                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Event Start Date &amp; Time</label>
                        <GlassDatePicker value={editForm.date} onChange={v => {
                          let newEnd = editForm.endDate;
                          if (v && (!editForm.endDate || editForm.endDate.split('T')[0] === editForm.date.split('T')[0])) {
                            const datePart = v.split('T')[0];
                            newEnd = `${datePart}T23:59`;
                          }
                          setEditForm(p => ({...p, date: v, endDate: newEnd}));
                          setEditErrors(e => ({...e, date: "", endDate: ""}));
                        }} />
                        {editErrors.date && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{editErrors.date}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Event End Date &amp; Time</label>
                        <GlassDatePicker value={editForm.endDate} onChange={v => { setEditForm(p => ({...p, endDate: v})); setEditErrors(e => ({...e, endDate: ""})); }} defaultTime="23:59" />
                        {editErrors.endDate && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{editErrors.endDate}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Registration Deadline</label>
                        <GlassDatePicker value={editForm.deadline} onChange={v => { setEditForm(p => ({...p, deadline: v})); setEditErrors(e => ({...e, deadline: ""})); }} defaultTime="23:59" />
                        {editErrors.deadline && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{editErrors.deadline}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Venue</label>
                        <input type="text" placeholder="Main Auditorium" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${editErrors.venue ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.08)"}`, fontFamily: FB }} value={editForm.venue} onChange={e => { setEditForm(p => ({...p, venue: e.target.value})); setEditErrors(er => ({...er, venue: ""})); }} onFocus={e => e.currentTarget.style.borderColor = editErrors.venue ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = editErrors.venue ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.08)"} />
                        {editErrors.venue && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{editErrors.venue}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Venue Capacity</label>
                        <input type="number" placeholder="e.g. 200" min={1} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${editErrors.capacity ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.08)"}`, fontFamily: FB }} value={editForm.capacity} onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }} onChange={e => { const v = e.target.value; if (v === "" || parseInt(v) >= 1) { setEditForm(p => ({...p, capacity: v})); setEditErrors(er => ({...er, capacity: ""})); } }} onFocus={e => e.currentTarget.style.borderColor = editErrors.capacity ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = editErrors.capacity ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.08)"} />
                        {editErrors.capacity && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{editErrors.capacity}</p>}
                      </div>

                      {activeEvent && (activeEvent.eventType === 'Team' || (activeEvent.teamSizeLimit && activeEvent.teamSizeLimit > 1) || activeEvent.type === 'Team') && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Min Team Size</label>
                            <input
                              type="number"
                              placeholder="1"
                              min={1}
                              max={editForm.teamSizeLimit ? parseInt(editForm.teamSizeLimit) : undefined}
                              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${editErrors.minTeamSize ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.08)"}`, fontFamily: FB }}
                              value={editForm.minTeamSize}
                              onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }}
                              onChange={e => {
                                const v = e.target.value;
                                setEditForm(p => ({ ...p, minTeamSize: v }));
                                setEditErrors(er => ({ ...er, minTeamSize: "", teamSizeLimit: "" }));
                              }}
                              onFocus={e => e.currentTarget.style.borderColor = editErrors.minTeamSize ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"}
                              onBlur={e => e.currentTarget.style.borderColor = editErrors.minTeamSize ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.08)"}
                            />
                            {editErrors.minTeamSize && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{editErrors.minTeamSize}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Max Team Size</label>
                            <input
                              type="number"
                              placeholder="e.g. 4"
                              min={editForm.minTeamSize ? parseInt(editForm.minTeamSize) : 1}
                              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${editErrors.teamSizeLimit ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.08)"}`, fontFamily: FB }}
                              value={editForm.teamSizeLimit}
                              onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }}
                              onChange={e => {
                                const v = e.target.value;
                                setEditForm(p => ({ ...p, teamSizeLimit: v }));
                                setEditErrors(er => ({ ...er, teamSizeLimit: "", minTeamSize: "", capacity: "" }));
                              }}
                              onFocus={e => e.currentTarget.style.borderColor = editErrors.teamSizeLimit ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"}
                              onBlur={e => e.currentTarget.style.borderColor = editErrors.teamSizeLimit ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.08)"}
                            />
                            {editErrors.teamSizeLimit && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{editErrors.teamSizeLimit}</p>}
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
                      className="w-full mt-6 py-3.5 rounded-xl bg-[#F03D4E] hover:bg-[#d63545] text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg"
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
                  <div className="w-full max-w-md p-8 rounded-3xl relative" style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)" }}>
                    <button onClick={() => { setShowEditPasswordModal(false); setEditPassword(""); setEditPasswordError(null); }} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
                    <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: FC }}>Confirm Changes</h2>
                    <p className="text-xs text-[#a1a1aa] mb-6" style={{ fontFamily: FB }}>Please enter your club login password to save these updates.</p>

                    <div className="space-y-1.5 mb-6">
                      <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Password</label>
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
                          className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition-all"
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: FB }}
                          onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"}
                          onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPasswordText(!showEditPasswordText)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                          {showEditPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {editPasswordError && <p className="text-xs text-[#F03D4E] font-medium mb-6 text-center" style={{ fontFamily: FB }}>{editPasswordError}</p>}

                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => { setShowEditPasswordModal(false); setEditPassword(""); setEditPasswordError(null); }} className="px-6 py-2.5 text-xs text-white bg-white/[0.06] hover:bg-white/10 rounded-full transition-all font-semibold cursor-pointer" style={{ fontFamily: FB }}>Cancel</button>
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
                        className="px-6 py-2.5 text-xs text-white bg-[#F03D4E] hover:bg-[#F03D4E]/80 rounded-full transition-all font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
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
    <div className="p-5 md:p-8 lg:p-10 space-y-8 max-w-7xl">
      <div className="flex items-end justify-between">
         <div>
            <p className="text-[11px] tracking-[0.5em] uppercase mb-1.5" style={{ color: "#f3f4f6", fontFamily: FM }}>Directory</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>All Events</h1>
         </div>
      </div>

      <div className="space-y-12 mt-4">

        <div>
          <h2 className="text-lg font-medium text-white mb-5" style={{ fontFamily: FB }}>Upcoming Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {EVENTS.filter(e => e.status === "upcoming" || e.status === "live").map((ev, i) => {
              const regCount = allRegistrations.filter(r => r.eventId === ev.id).length;
              const fill = ev.capacity > 0 ? (regCount / ev.capacity) * 100 : 0;
              const pendingFromState = allRegistrations.filter(r => r.eventId === ev.id && r.status?.toLowerCase() === 'pending');
              const pendingTeamIds = new Set(pendingFromState.filter(r => r.team?.id).map(r => r.team!.id));
              const pendingSolo = pendingFromState.filter(r => !r.team?.id).length;
              const calculatedPending = pendingSolo + pendingTeamIds.size;
              const hasLoadedRegsForEvent = allRegistrations.some(r => r.eventId === ev.id);
              const pendingApprovals = hasLoadedRegsForEvent ? calculatedPending : (ev.pendingCount ?? 0);
              return (
                <motion.div key={ev.id}
                  onClick={() => setSelectedEventId(ev.id)}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="p-6 rounded-2xl cursor-pointer group"
                  style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.3s ease" }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    el.style.background = "rgba(255,255,255,0.03)";
                    el.style.borderColor = "rgba(255,255,255,0.1)";
                    el.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.background = "rgba(255,255,255,0.015)";
                    el.style.borderColor = "rgba(255,255,255,0.05)";
                    el.style.transform = "none";
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-2.5 py-1 rounded-full border ${(ev.type ?? '').toLowerCase() === "team" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`} style={{ fontFamily: FM }}>{(ev.type ?? '').toLowerCase() === "team" ? "Team" : "Solo"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingApprovals > 0 && (
                        <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontFamily: FM }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                          {pendingApprovals > 9 ? '9+' : pendingApprovals} pending
                        </span>
                      )}
                      {ev.status === "live" ? (
                        <LiveTag />
                      ) : (
                        <span className="text-[11px] px-2.5 py-1 rounded-full" style={{
                          background: "rgba(240,61,78,0.05)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: "#f9fafb",
                          fontFamily: FM,
                        }}>Upcoming</span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-white font-semibold mb-2 leading-tight text-lg group-hover:text-[#F03D4E] transition-colors">{ev.title}</h3>
                  <div className="flex flex-col gap-1.5 mb-6" style={{ color: "#f3f4f6" }}>
                    <span className="flex items-center gap-1.5 text-xs"><Calendar size={12} />{formatEventHeaderDate(ev.eventDate || ev.date, ev.eventEndDate)}</span>
                    {ev.registrationDeadline && (
                      <span className="flex items-center gap-1.5 text-xs text-[#f59e0b]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Deadline: {(() => { const d = new Date(ev.registrationDeadline); const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-2" style={{ color: "#f9fafb", fontFamily: FM }}>
                      <span>{regCount} registered</span><span>{ev.capacity > 0 ? `${ev.capacity} cap` : 'Open'}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, rgba(240,61,78,0.4), rgba(240,61,78,1))" }}
                        initial={{ width: 0 }} animate={{ width: `${fill}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {EVENTS.filter(e => e.status === "upcoming" || e.status === "live").length === 0 && (
              <div className="col-span-3 p-10 rounded-2xl text-center text-sm text-[#94a3b8]" style={{ border: "1px dashed rgba(255,255,255,0.05)", fontFamily: FB }}>
                No upcoming events yet.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-base font-medium text-white/50" style={{ fontFamily: FB }}>Past Events</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {EVENTS.filter(e => e.status === "previous").map((ev, i) => {
              const regCount = allRegistrations.filter(r => r.eventId === ev.id).length;
              const fill = ev.capacity > 0 ? (regCount / ev.capacity) * 100 : 0;
              return (
                <motion.div key={ev.id}
                  onClick={() => setSelectedEventId(ev.id)}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="p-6 rounded-2xl cursor-pointer group opacity-60 hover:opacity-100"
                  style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", transition: "all 0.3s ease" }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-2.5 py-1 rounded-full border ${(ev.type ?? '').toLowerCase() === "team" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`} style={{ fontFamily: FM }}>{(ev.type ?? '').toLowerCase() === "team" ? "Team" : "Solo"}</span>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.03)", color: "#94a3b8", fontFamily: FM }}>Ended</span>
                  </div>
                  <h3 className="text-[#cccccc] font-semibold mb-2 leading-tight text-lg transition-colors">{ev.title}</h3>
                  <div className="flex flex-col gap-1.5 mb-6" style={{ color: "#94a3b8" }}>
                    <span className="flex items-center gap-1.5 text-xs"><Calendar size={12} />{formatEventHeaderDate(ev.eventDate || ev.date, ev.eventEndDate)}</span>
                    {ev.registrationDeadline && (
                      <span className="flex items-center gap-1.5 text-xs text-[#94a3b8]/70">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Deadline: {(() => { const d = new Date(ev.registrationDeadline); const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-2" style={{ color: "#94a3b8", fontFamily: FM }}>
                      <span>{regCount} registered</span><span>{ev.capacity > 0 ? `${ev.capacity} cap` : 'Open'}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "rgba(255,255,255,0.1)" }}
                        initial={{ width: 0 }} animate={{ width: `${fill}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {EVENTS.filter(e => e.status === "previous").length === 0 && (
              <div className="col-span-3 p-6 rounded-2xl text-center text-xs text-[#444]" style={{ fontFamily: FB }}>No past events.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassDatePicker({ value, onChange, defaultTime = "12:00" }: { value: string; onChange: (v: string) => void; defaultTime?: string }) {
  const [open, setOpen] = useState(false);
  const dateObj = value ? new Date(value) : new Date();

  const [currentMonth, setCurrentMonth] = useState(dateObj.getMonth());
  const [currentYear, setCurrentYear] = useState(dateObj.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? dateObj : null);
  const [timeStr, setTimeStr] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
    }
    return defaultTime;
  });

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setTimeStr(`${hh}:${mm}`);
      }
    } else {
      setSelectedDate(null);
      setTimeStr(defaultTime);
    }
  }, [value, defaultTime]);

  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDay = new Date(currentYear, currentMonth, 1).getDay();

  const handleSelectDate = (d: number) => {
    const newDate = new Date(currentYear, currentMonth, d);
    setSelectedDate(newDate);
    const dateString = `${newDate.getFullYear()}-${String(newDate.getMonth()+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onChange(`${dateString}T${timeStr}`);
  };

  const handleTimeChange = (e: any) => {
    const t = e.target.value;
    setTimeStr(t);
    if (!t) return;
    const targetDate = selectedDate || new Date(currentYear, currentMonth, new Date().getDate());
    const dateString = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    onChange(`${dateString}T${t}`);
  };

  return (
    <div className="relative">
      <div onClick={() => setOpen(!open)} className="w-full rounded-xl px-4 py-3 text-sm text-white cursor-pointer flex items-center justify-between transition-all" style={{ background: "rgba(255,255,255,0.02)", border: open ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>
        <span className={value ? "text-white" : "text-[#888]"}>{value ? (() => { const d = new Date(value); const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12; const m = String(d.getMinutes()).padStart(2,'0'); const ampm = d.getHours() >= 12 ? 'PM' : 'AM'; return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}  ${h}:${m} ${ampm}`; })() : "Select Date & Time"}</span>
        <Calendar size={14} className="text-[#d1d5db]" />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 top-full mt-2 w-72 p-5 rounded-2xl shadow-2xl left-0" style={{ background: "rgba(15,15,15,0.98)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(24px)" }}>

            <div className="flex justify-between items-center mb-4">
              <button onClick={() => {
                if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                else { setCurrentMonth(m => m - 1); }
              }} className="p-1 hover:bg-white/10 rounded-md transition-colors text-white cursor-pointer"><ChevronLeft size={16} /></button>
              <div className="text-sm text-white" style={{ fontFamily: FB }}>
                {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} {currentYear}
              </div>
              <button onClick={() => {
                if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                else { setCurrentMonth(m => m + 1); }
              }} className="p-1 hover:bg-white/10 rounded-md transition-colors text-white cursor-pointer"><ChevronRight size={16} /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {days.map(d => <div key={d} className="text-[11px] text-[#94a3b8]" style={{ fontFamily: FM }}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: numDays }).map((_, i) => {
                const d = i + 1;
                const isSelected = selectedDate?.getDate() === d && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;
                return (
                  <button key={d} onClick={() => handleSelectDate(d)} className={`w-8 h-8 mx-auto rounded-full text-xs flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-[#F03D4E] text-white' : 'text-[#f3f4f6] hover:bg-white/10 hover:text-white'}`} style={{ fontFamily: FB }}>
                    {d}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#888]" style={{ fontFamily: FM }}>Time</span>
              <input type="time" className="bg-transparent border border-white/10 rounded-md px-2.5 py-1 text-xs text-white outline-none focus:border-white/40 hover:border-white/30 transition-all cursor-pointer" style={{ colorScheme: "dark", fontFamily: FB, cursor: "pointer" }} value={timeStr} onChange={handleTimeChange} />
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 text-right">
              <button onClick={() => setOpen(false)} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg transition-colors cursor-pointer" style={{ fontFamily: FB }}>Done</button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateEventPage({ clubId, onCreated, getToken, clubQrUrl, clubUpiId, refreshProfile }: { clubId: string; onCreated: () => void; getToken: () => Promise<string | null>; clubQrUrl?: string | null; clubUpiId?: string | null; refreshProfile?: () => Promise<any> }) {
  const [formData, setFormData] = useState({
    title: "", desc: "", date: "", endDate: "", deadline: "", type: "free", capacity: "", venue: "", amount: "", qrCode: "", banner: "", useDefaultQr: true, customUpiId: "",
    eventType: "Solo", minTeamSize: "1", teamSizeLimit: "",
    bannerFile: null as File | null, qrFile: null as File | null
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

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
        console.warn("[CreateEvent] clubId is empty at submit time — re-syncing profile to resolve it.");
        const freshProfile = refreshProfile ? await refreshProfile() : null;
        resolvedClubId = freshProfile?.clubId ?? '';
        if (!resolvedClubId) {
          setError("Your account is not linked to a club yet. Please refresh the page and try again.");
          setSubmitting(false);
          return;
        }
        console.log("[CreateEvent] Resolved clubId from refreshed profile:", resolvedClubId);
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

      <div className="space-y-6 p-6 md:p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Event Banner</label>
          <input type="file" accept="image/*" className="hidden" id="banner-upload" onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              setFormData(p => ({...p, bannerFile: file, banner: URL.createObjectURL(file)}));
            }
          }} />
          {formData.banner ? (
            <div className="relative w-full h-48 rounded-xl overflow-hidden group" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <img src={formData.banner} alt="Event Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => setFormData(p => ({...p, banner: "", bannerFile: null}))} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors" style={{ fontFamily: FB, border: "1px solid rgba(255,255,255,0.1)" }}>Remove Banner</button>
              </div>
            </div>
          ) : (
            <label htmlFor="banner-upload" className="w-full h-32 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", fontFamily: FB }}>
              <Upload size={20} className="text-[#d1d5db]" />
              <span className="text-sm text-[#cccccc]">Click to upload banner image</span>
            </label>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Event Name</label>
          <input type="text" placeholder="e.g. CodeFest 2026" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${fieldErrors.title ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}`, fontFamily: FB }} value={formData.title} onChange={e => { setFormData(p => ({...p, title: e.target.value})); setFieldErrors(fe => ({...fe, title: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.title ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.title ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"} />
          {fieldErrors.title && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.title}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Start Date &amp; Time</label>
            <GlassDatePicker value={formData.date} onChange={v => {
              let defaultEnd = formData.endDate;
              if (v && (!formData.endDate || (formData.date && formData.endDate.split('T')[0] === formData.date.split('T')[0]))) {
                const datePart = v.split('T')[0];
                defaultEnd = `${datePart}T23:59`;
              }
              setFormData(p => ({...p, date: v, endDate: defaultEnd}));
              setFieldErrors(fe => ({...fe, date: "", endDate: ""}));
            }} />
            {fieldErrors.date && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.date}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>End Date &amp; Time</label>
            <GlassDatePicker value={formData.endDate} onChange={v => { setFormData(p => ({...p, endDate: v})); setFieldErrors(fe => ({...fe, endDate: ""})); }} defaultTime="23:59" />
            {fieldErrors.endDate && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.endDate}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Registration Deadline</label>
            <GlassDatePicker value={formData.deadline} onChange={v => { setFormData(p => ({...p, deadline: v})); setFieldErrors(fe => ({...fe, deadline: ""})); }} defaultTime="23:59" />
            {fieldErrors.deadline && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.deadline}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Description</label>
          <textarea placeholder="Describe your event..." className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all min-h-[100px]" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${fieldErrors.desc ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}`, fontFamily: FB }} value={formData.desc} onChange={e => { setFormData(p => ({...p, desc: e.target.value})); setFieldErrors(fe => ({...fe, desc: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.desc ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.desc ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"} />
          {fieldErrors.desc && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.desc}</p>}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Venue</label>
            <input type="text" placeholder="Main Auditorium" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${fieldErrors.venue ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}`, fontFamily: FB }} value={formData.venue} onChange={e => { setFormData(p => ({...p, venue: e.target.value})); setFieldErrors(fe => ({...fe, venue: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.venue ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.venue ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"} />
            {fieldErrors.venue && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.venue}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Venue Capacity</label>
            <input type="number" placeholder="e.g. 200" min={formData.eventType === "Team" && formData.teamSizeLimit ? parseInt(formData.teamSizeLimit) : 2} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${fieldErrors.capacity ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}`, fontFamily: FB }} value={formData.capacity} onChange={e => { setFormData(p => ({...p, capacity: e.target.value})); setFieldErrors(fe => ({...fe, capacity: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.capacity ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.capacity ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"} />
            {formData.eventType === "Team" && formData.teamSizeLimit && (
              <p className="text-[10px] text-[#a1a1aa] mt-0.5" style={{ fontFamily: FM }}>Minimum venue capacity is {formData.teamSizeLimit} (Max Team Size).</p>
            )}
            {fieldErrors.capacity && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.capacity}</p>}
          </div>
          <div className="space-y-1.5 relative">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Pricing</label>
            <div className="relative">
              <select className="w-full rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none transition-all appearance-none cursor-pointer" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value, amount: "", qrCode: "", customUpiId: ""}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}>
                <option value="free" style={{ background: "#111" }}>Free</option>
                <option value="paid" style={{ background: "#111" }}>Paid</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
            {formData.type === "free" && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -bottom-5 left-1 text-[11px] text-[#f3f4f6]" style={{ fontFamily: FM }}>
                FCFS. No approval needed.
              </motion.p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5 relative">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Participation Type</label>
            <div className="relative">
              <select className="w-full rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none transition-all appearance-none cursor-pointer" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.eventType} onChange={e => setFormData(p => ({...p, eventType: e.target.value, minTeamSize: e.target.value === "Team" ? (p.minTeamSize || "1") : "", teamSizeLimit: ""}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}>
                <option value="Solo" style={{ background: "#111" }}>Solo</option>
                <option value="Team" style={{ background: "#111" }}>Team</option>
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
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
                  <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Min Team Size</label>
                  <input
                    type="number"
                    placeholder="Min (e.g. 1)"
                    min={1}
                    max={formData.teamSizeLimit ? parseInt(formData.teamSizeLimit) : undefined}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${fieldErrors.minTeamSize ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}`, fontFamily: FB }}
                    value={formData.minTeamSize}
                    onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData(p => ({ ...p, minTeamSize: v }));
                      setFieldErrors(fe => ({ ...fe, minTeamSize: "" }));
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = fieldErrors.minTeamSize ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"}
                    onBlur={e => e.currentTarget.style.borderColor = fieldErrors.minTeamSize ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}
                  />
                  {fieldErrors.minTeamSize && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.minTeamSize}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Max Team Size</label>
                  <input
                    type="number"
                    placeholder="Max (e.g. 4)"
                    min={parseInt(formData.minTeamSize || '1')}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${fieldErrors.teamSizeLimit ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}`, fontFamily: FB }}
                    value={formData.teamSizeLimit}
                    onKeyDown={e => { if (["-", "e", "+", "."].includes(e.key)) e.preventDefault(); }}
                    onChange={e => {
                      const v = e.target.value;
                      setFormData(p => ({ ...p, teamSizeLimit: v }));
                      setFieldErrors(fe => ({ ...fe, teamSizeLimit: "" }));
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = fieldErrors.teamSizeLimit ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"}
                    onBlur={e => e.currentTarget.style.borderColor = fieldErrors.teamSizeLimit ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}
                  />
                  {fieldErrors.teamSizeLimit && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.teamSizeLimit}</p>}
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
              <div className="p-6 rounded-2xl grid md:grid-cols-2 gap-6" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Amount (INR)</label>
                  <input type="number" placeholder="e.g. 500" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${fieldErrors.amount ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}`, fontFamily: FB }} value={formData.amount} onChange={e => { setFormData(p => ({...p, amount: e.target.value})); setFieldErrors(fe => ({...fe, amount: ""})); }} onFocus={e => e.currentTarget.style.borderColor = fieldErrors.amount ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = fieldErrors.amount ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"} />
                  {fieldErrors.amount && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.amount}</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Payment Setup</label>
                  <div className="flex gap-2 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <button onClick={() => setFormData(p => ({...p, useDefaultQr: true, customUpiId: ""}))} className={`flex-1 py-2 text-xs rounded-lg transition-all ${formData.useDefaultQr ? "bg-white/10 text-white" : "text-[#888] hover:text-[#ccc]"}`} style={{ fontFamily: FB }}>Default QR &amp; UPI</button>
                    <button onClick={() => setFormData(p => ({...p, useDefaultQr: false}))} className={`flex-1 py-2 text-xs rounded-lg transition-all ${!formData.useDefaultQr ? "bg-white/10 text-white" : "text-[#888] hover:text-[#ccc]"}`} style={{ fontFamily: FB }}>Custom QR &amp; UPI</button>
                  </div>

                  {!formData.useDefaultQr && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block mb-1" style={{ fontFamily: FM }}>Upload Custom QR Image</label>
                        <input type="file" accept="image/*" className="hidden" id="qr-upload" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData(p => ({...p, qrFile: file, qrCode: file.name}));
                            setFieldErrors(fe => ({...fe, qrCode: ""}));
                          }
                        }} />
                        <label htmlFor="qr-upload" className="w-full rounded-xl px-4 py-3 text-sm text-[#cccccc] flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${fieldErrors.qrCode ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}`, fontFamily: FB }}>
                          <span>{formData.qrFile ? formData.qrFile.name : "Upload Custom QR Image..."}</span>
                          <Upload size={14} className={formData.qrFile ? "text-green-400" : ""} />
                        </label>
                        {fieldErrors.qrCode && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.qrCode}</p>}
                      </div>

                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block mb-1" style={{ fontFamily: FM }}>Custom UPI ID (for this event)</label>
                        <input
                          type="text"
                          placeholder="e.g. event@upi"
                          className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                          style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${fieldErrors.customUpiId ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}`, fontFamily: FB }}
                          value={formData.customUpiId}
                          onChange={e => { setFormData(p => ({...p, customUpiId: e.target.value})); setFieldErrors(fe => ({...fe, customUpiId: ""})); }}
                          onFocus={e => e.currentTarget.style.borderColor = fieldErrors.customUpiId ? "rgba(240,61,78,0.8)" : "rgba(255,255,255,0.3)"}
                          onBlur={e => e.currentTarget.style.borderColor = fieldErrors.customUpiId ? "rgba(240,61,78,0.6)" : "rgba(255,255,255,0.1)"}
                        />
                        {fieldErrors.customUpiId && <p className="text-[11px] text-[#F03D4E] mt-1" style={{ fontFamily: FB }}>{fieldErrors.customUpiId}</p>}
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
                            <p className="text-[#F03D4E] font-medium flex items-center gap-1.5">
                              ⚠️ Default Payment QR Code is not uploaded in Settings.
                            </p>
                          )}
                          {!clubUpiId && (
                            <p className="text-[#F03D4E] font-medium flex items-center gap-1.5">
                              ⚠️ Default Payment UPI ID is not added in Settings.
                            </p>
                          )}
                          <p className="text-[#a1a1aa] text-[11px] pt-0.5">
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
          <p className="text-xs text-[#F03D4E] px-1" style={{ fontFamily: FM }}>{error}</p>
        )}
        <div className="pt-4 mt-8">
          <motion.button 
            whileHover={submitting ? undefined : { scale: 1.02 }} 
            whileTap={submitting ? undefined : { scale: 0.98 }} 
            onClick={handleSubmit} 
            disabled={submitting} 
            className={`px-8 py-3.5 bg-[#F03D4E] text-white text-sm font-semibold rounded-xl transition-all ${submitting ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`} 
            style={{ fontFamily: FB }} 
            onMouseEnter={e => !submitting && (e.currentTarget.style.boxShadow = "0 0 35px rgba(240,61,78,0.35)")} 
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

function SettingsPage({ club, profile, getToken, onUpdate, onLogout }: { club: any; profile: any; getToken: () => Promise<string | null>; onUpdate: () => void; onLogout: () => void }) {
  const { user } = useUser();
  const isSocialLogin = false; 

  const [formData, setFormData] = useState({
    name: club?.name || "",
    email: club?.email || "",
    logoUrl: club?.logoUrl || "",
    upiId: club?.upiId || "",
    qrUrl: club?.qrUrl || ""
  });
  const isLogoUploaded = formData.logoUrl && formData.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3";
  const [qrFile, setQrFile] = useState<File | null>(null);

  const initialData = { name: club?.name || "", email: club?.email || "", upiId: club?.upiId || "" };

  useEffect(() => {
    if (club) {
      setFormData({
        name: club.name || "",
        email: club.email || "",
        logoUrl: club.logoUrl || "",
        upiId: club.upiId || "",
        qrUrl: club.qrUrl || ""
      });
    }
  }, [club]);

  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isDirty =
    formData.name !== (club?.name || "") ||
    formData.upiId !== (club?.upiId || "") ||
    !!logoFile ||
    !!qrFile;

  const [showPasswordUpdateModal, setShowPasswordUpdateModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordError(null);
    try {
      const token = await getToken();
      await changePassword({ oldPassword, newPassword }, token || undefined);

      setPasswordSuccess("Password updated successfully!");

      setTimeout(() => {
        setPasswordSuccess(null);
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmNewPassword(false);
        setShowPasswordUpdateModal(false);
      }, 1000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSaveInit = () => {
    if (!formData.name || !formData.email) {
      setError("Club name and email are required.");
      return;
    }
    setError(null);
    setPassword("");
    setShowPasswordPrompt(true);
  };

  const handleConfirmSave = async () => {
    if (!password) {
      setError("Password is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      let finalQrUrl = formData.qrUrl;
      if (qrFile) {
        finalQrUrl = await fileToBase64(qrFile);
      }

      let finalLogoUrl = formData.logoUrl;
      if (logoFile) {
        finalLogoUrl = await fileToBase64(logoFile);
      }
      const token = await getToken();

      await updateClub(club.id, {
        ...formData,
        qrUrl: finalQrUrl,
        logoUrl: finalLogoUrl,
        password: password
      }, token || undefined);

      setShowPasswordPrompt(false);
      setPassword("");
      setSuccessMsg("Settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      onUpdate();
    } catch (e: any) {
      setError(sanitizeErrorMessage(e, "Failed to update settings. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-8 max-w-4xl relative">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>Settings</h1>
      </div>

      <div className="space-y-6">
        
        <div className="p-6 md:p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: FB }}>Profile Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Club Name</label>
              <input type="text" placeholder="e.g. Demo Club" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Contact Email</label>
              <input type="email" value={formData.email} disabled readOnly className="w-full rounded-xl px-4 py-3 text-sm text-white/50 bg-white/[0.01] border border-white/5 cursor-not-allowed outline-none select-none" style={{ fontFamily: FB }} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Club Logo</label>
              <input type="file" accept="image/*" className="hidden" id="logo-upload-settings" onChange={e => {
                const file = e.target.files?.[0];
                if (file) setLogoFile(file);
              }} />
              <label htmlFor="logo-upload-settings" className="w-full rounded-xl px-4 py-3 text-sm text-[#cccccc] flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>
                <span>{logoFile ? logoFile.name : (isLogoUploaded ? "Logo Uploaded (Click to change)" : "Upload Logo Image...")}</span>
                <Upload size={14} className={logoFile || isLogoUploaded ? "text-green-400" : ""} />
              </label>
              {!isLogoUploaded && !logoFile && (
                <p className="text-[11px] text-[#F03D4E] mt-1.5 font-medium" style={{ fontFamily: FM }}>Logo not uploaded yet</p>
              )}
            </div>
          </div>
        </div>

        <div id="payment-settings" className="p-6 md:p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: FB }}>Payment Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Default UPI ID</label>
              <input type="text" placeholder="club@upi" value={formData.upiId} onChange={e => setFormData(p => ({ ...p, upiId: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
              {!formData.upiId && (
                <p className="text-[11px] text-[#F03D4E] mt-1.5 font-medium" style={{ fontFamily: FM }}>UPI ID not added yet</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Default QR Code</label>
              <input type="file" accept="image/*" className="hidden" id="qr-upload-settings" onChange={e => {
                const file = e.target.files?.[0];
                if (file) setQrFile(file);
              }} />
              <label htmlFor="qr-upload-settings" className="w-full rounded-xl px-4 py-3 text-sm text-[#cccccc] flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>
                <span>{qrFile ? qrFile.name : (formData.qrUrl ? "QR Uploaded (Click to change)" : "Upload QR Image...")}</span>
                <Upload size={14} className={qrFile || formData.qrUrl ? "text-green-400" : ""} />
              </label>
              {!formData.qrUrl && !qrFile && (
                <p className="text-[11px] text-[#F03D4E] mt-1.5 font-medium" style={{ fontFamily: FM }}>QR Code not uploaded yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 rounded-3xl space-y-3" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white" style={{ fontFamily: FB }}>Save All Settings</p>
              <p className="text-[11px] text-[#f3f4f6]" style={{ fontFamily: FM }}>Apply updates to profile and payment settings.</p>
            </div>
            <button onClick={handleSaveInit} disabled={!isDirty || isSaving} className="px-6 py-2.5 bg-[#F03D4E] hover:bg-[#F03D4E]/80 text-white text-xs font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(240,61,78,0.3)] hover:shadow-[0_0_30px_rgba(240,61,78,0.5)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none" style={{ fontFamily: FB }}>Apply Changes</button>
          </div>
          <AnimatePresence>
            {successMsg && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-green-400 text-sm font-medium pt-2 flex items-center justify-end gap-1.5" style={{ fontFamily: FB }}>
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 md:p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Mail size={18} className="text-white/60" />
              </div>
              <div>
                <p className="text-sm text-white font-medium" style={{ fontFamily: FB }}>Contact Us</p>
                <p className="text-[11px] text-[#888] mt-0.5" style={{ fontFamily: FM }}>Reach out for support or queries</p>
              </div>
            </div>
            <a
              href="mailto:spotlightapp.help@gmail.com"
              className="px-5 py-2.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 rounded-xl transition-all"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", fontFamily: FB }}
            >
              spotlightapp.help@gmail.com
            </a>
          </div>
        </div>

        <AnimatePresence>
          {showPasswordPrompt && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-3xl p-8" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: FC }}>Confirm Changes</h3>
                <p className="text-xs text-[#d1d5db] mb-6" style={{ fontFamily: FB }}>Please enter your club login password to save these updates.</p>

                <div className="space-y-1.5 mb-4">
                  <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Password</label>
                  <input autoFocus type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isSaving) handleConfirmSave(); }} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
                </div>

                {error && <p className="text-xs text-[#F03D4E] font-medium mb-6 text-center" style={{ fontFamily: FB }}>{error}</p>}

                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => { setShowPasswordPrompt(false); setError(null); }} className="px-5 py-2.5 text-xs text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all" style={{ fontFamily: FB }}>Cancel</button>
                  <button onClick={handleConfirmSave} disabled={isSaving} className="px-5 py-2.5 text-xs text-white bg-[#F03D4E] hover:bg-[#F03D4E]/80 rounded-xl transition-all font-semibold flex items-center gap-2 disabled:opacity-50" style={{ fontFamily: FB }}>
                    {isSaving ? "Saving..." : "Confirm Save"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPasswordUpdateModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-3xl p-8" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: FC }}>Change Password</h3>
                <p className="text-xs text-[#999] mb-6" style={{ fontFamily: FB }}>Update your login credentials securely by entering your current and new password.</p>

                {passwordError && <p className="text-xs text-[#F03D4E] font-medium mb-4 text-center" style={{ fontFamily: FB }}>{passwordError}</p>}

                <div className="space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Old Password</label>
                    <div className="relative">
                      <input 
                        type={showOldPassword ? "text" : "password"} 
                        placeholder="Enter current password" 
                        value={oldPassword} 
                        onChange={e => setOldPassword(e.target.value)} 
                        className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition-all" 
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
                        onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} 
                        onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowOldPassword(!showOldPassword)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                      >
                        {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>New Password</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="Enter new password" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition-all" 
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
                        onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} 
                        onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Confirm New Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmNewPassword ? "text" : "password"} 
                        placeholder="Confirm new password" 
                        value={confirmNewPassword} 
                        onChange={e => setConfirmNewPassword(e.target.value)} 
                        className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition-all" 
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
                        onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} 
                        onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                      >
                        {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => { setShowPasswordUpdateModal(false); setPasswordError(null); setPasswordSuccess(null); setOldPassword(""); setNewPassword(""); setConfirmNewPassword(""); setShowOldPassword(false); setShowNewPassword(false); setShowConfirmNewPassword(false); }} className="px-5 py-2.5 text-xs text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all" style={{ fontFamily: FB }}>Cancel</button>
                  <button 
                    onClick={handleUpdatePassword} 
                    disabled={isUpdatingPassword || !!passwordSuccess} 
                    className={`px-5 py-2.5 text-xs text-white rounded-xl transition-all font-semibold flex items-center gap-2 disabled:opacity-50 ${passwordSuccess ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-[#F03D4E] hover:bg-[#F03D4E]/80'}`} 
                    style={{ fontFamily: FB }}
                  >
                    {isUpdatingPassword ? (
                      "Updating..."
                    ) : passwordSuccess ? (
                      <>
                        <Check size={16} />
                        Updated
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPrivacyModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl rounded-3xl p-8 max-h-[85vh] overflow-y-auto flex flex-col" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: FC }}>Dashboard Privacy Policy</h3>
                    <p className="text-xs text-[#999] mt-1" style={{ fontFamily: FB }}>Last Updated: July 26, 2026</p>
                  </div>
                  <button onClick={() => setShowPrivacyModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-sm text-[#ccc] leading-relaxed border-t border-b border-white/5 py-6" style={{ fontFamily: FB }}>
                  <div>
                    <h4 className="text-white font-medium text-sm mb-2">About the Spotlight Club Dashboard</h4>
                    <p className="text-xs text-[#bbbbbb]">The Spotlight Club Dashboard allows authorized clubs to create, publish, and manage events. Once published, these events are visible to users of the Spotlight mobile application. Clubs can review, manage, approve, or deny participant registrations, including verifying payment proofs.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium text-sm mb-2">Information We Collect From Clubs</h4>
                    <p className="text-xs text-[#bbbbbb]">We collect and store your Club Name, Email Address, UPI ID, UPI QR Code graphics, custom club logos, and event details (title, description, venue, price, capacity limits, banner graphics). New accounts are verified via single-use registration keys.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium text-sm mb-2">Club Authentication (Clerk)</h4>
                    <p className="text-xs text-[#bbbbbb]">We integrate with Clerk to provide administrator sign-in, session verification, and secure access. Access is restricted using secure JSON Web Tokens. Clubs must maintain credential confidentiality.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium text-sm mb-2">Participant Information Available to Clubs</h4>
                    <p className="text-xs text-[#bbbbbb]">When users register for your events, we share their Name, USN/Roll Number, Email, Phone, Year, Semester, Branch, UPI Transaction ID (UTR), and payment proof screenshot URL with you to facilitate moderation.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium text-sm mb-2">Handling Participant Information</h4>
                    <p className="text-xs text-[#bbbbbb]">Clubs must process participant data strictly to organize and conduct the event. You must not sell or share participant data with third parties, use it for unrelated spam/marketing, or store downloaded lists insecurely.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium text-sm mb-2">Third-Party Services</h4>
                    <p className="text-xs text-[#bbbbbb]">We rely on Clerk (authentication), Supabase Storage (storing logos, posters, and user payment proof screenshots), and PostgreSQL databases to run the infrastructure.</p>
                  </div>

                  <div>
                    <h4 className="text-white font-medium text-sm mb-2">Contact Us</h4>
                    <p className="text-xs text-[#bbbbbb]">If you have concerns, deactivation requests, or reports of unauthorized dashboard activity, email support at <strong>spotlightapp.help@gmail.com</strong>.</p>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button onClick={() => setShowPrivacyModal(false)} className="px-6 py-2.5 text-xs text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all font-semibold" style={{ fontFamily: FB }}>Close</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

         <div className="p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: FB }}>Privacy & Security</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white" style={{ fontFamily: FB }}>Change Password</p>
                  <p className="text-[11px] text-[#bbbbbb]" style={{ fontFamily: FM }}>
                    {isSocialLogin 
                      ? "Password managed by your social provider (Google)." 
                      : "Update your login credentials securely."}
                  </p>
                </div>
                {isSocialLogin ? (
                  <span className="px-3.5 py-1.5 bg-white/5 text-[#999] text-[10px] uppercase tracking-wider font-semibold rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.05)", fontFamily: FB }}>
                    Social Login
                  </span>
                ) : (
                  <button onClick={() => setShowPasswordUpdateModal(true)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-all" style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>Update</button>
                )}
              </div>
            </div>
          </div>

         <div className="p-8 rounded-3xl flex items-center justify-between" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
           <div>
             <p className="text-sm font-medium text-white" style={{ fontFamily: FB }}>Privacy Policy</p>
           </div>
           <button onClick={() => setShowPrivacyModal(true)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-all" style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>View Policy</button>
         </div>

        <div className="p-8 rounded-3xl flex items-center justify-between" style={{ background: "rgba(240,61,78,0.05)", border: "1px solid rgba(240,61,78,0.1)" }}>
          <div>
            <p className="text-sm font-medium text-[#F03D4E]" style={{ fontFamily: FB }}>Sign Out</p>
          </div>
          <button onClick={onLogout} className="px-6 py-2.5 bg-[#F03D4E]/10 hover:bg-[#F03D4E]/20 text-[#F03D4E] text-xs font-semibold rounded-lg transition-all" style={{ border: "1px solid rgba(240,61,78,0.2)", fontFamily: FB }}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

function TeamsPage() {
  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-4xl">
      <div>
        <p className="text-[11px] tracking-[0.5em] uppercase mb-1.5 text-[#f3f4f6]" style={{ fontFamily: FM }}>Management</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>Teams</h1>
      </div>
      <div className="p-10 rounded-2xl text-center" style={{ border: "1px dashed rgba(255,255,255,0.07)" }}>
        <p className="text-sm text-[#94a3b8]" style={{ fontFamily: FB }}>Team management coming soon.</p>
      </div>
    </div>
  );
}

interface ClubOnboardingPageProps {
  onSuccess: (clubId: string) => void;
}

function ClubOnboardingPage({ onSuccess }: ClubOnboardingPageProps) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const [formData, setFormData] = useState({ name: "", email: "", logoUrl: "", password: "", registrationKey: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      const name = user.fullName ?? user.firstName ?? "";
      setFormData(prev => ({
        ...prev,
        email: prev.email || email,
        name: prev.name || name
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.registrationKey.trim()) {
      setError("Club Name, Contact Email, Mobile Login Password, and Authorization Key are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await createClub({
        name: formData.name,
        email: formData.email,
        logoUrl: formData.logoUrl || "",
        clerkUserId: userId!,
        password: formData.password,
        registrationKey: formData.registrationKey.trim().toUpperCase(),
      }, token ?? undefined);

      if (res.club && res.club.id) {
        localStorage.setItem("show_first_time_notice", "true");
        window.dispatchEvent(new CustomEvent('spotlight:club_created'));
        onSuccess(res.club.id);
      } else {
        throw new Error("Failed to create club.");
      }
    } catch (e: any) {
      setError(e.message ?? "Onboarding failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 md:p-12 relative overflow-hidden" style={{ background: "rgba(5,5,5,0.98)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(240,61,78,0.08) 0%, transparent 60%)" }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-lg p-8 md:p-10 rounded-3xl relative z-10"
        style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}
      >
        <div className="text-center mb-8">
          <p className="text-[11px] tracking-[0.5em] uppercase mb-2 text-[#f3f4f6]" style={{ fontFamily: FM }}>Step 1 · Onboarding</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2" style={{ fontFamily: FC }}>Set Up Your Club</h2>
          <p className="text-xs text-[#d1d5db]" style={{ fontFamily: FB }}>Welcome to Spotlight! Provide your club details and authorization key to activate the dashboard.</p>
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Authorization Key</label>
            <input 
              type="text" 
              placeholder="SPOTLIGHT-XXXX-XXXX" 
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all uppercase tracking-wider font-mono placeholder:normal-case placeholder:font-sans" 
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(240,61,78,0.3)" }} 
              value={formData.registrationKey} 
              onChange={e => setFormData(p => ({ ...p, registrationKey: e.target.value.toUpperCase() }))}
            />
            <div className="mt-2.5 space-y-1.5 text-left">
              <p className="text-xs text-white/70 leading-relaxed font-normal" style={{ fontFamily: FB }}>
                To request a key, email{" "}
                <a href="mailto:spotlightapp.help@gmail.com" className="text-[#10B981] font-medium hover:text-[#34d399] transition-colors underline underline-offset-2">
                  spotlightapp.help@gmail.com
                </a>
              </p>
              <p className="text-xs text-white/60 leading-relaxed font-normal" style={{ fontFamily: FB }}>
                Requests must be submitted using an official club mail ID or student mail ID. Personal email requests will not be processed.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Club Name</label>
            <input 
              type="text" 
              placeholder="e.g. Turing Club" 
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" 
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
              value={formData.name} 
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Contact Email</label>
            <input 
              type="email" 
              placeholder="club@yourcollege.edu" 
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" 
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
              value={formData.email} 
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Club Logo URL (Optional)</label>
            <input 
              type="url" 
              placeholder="https://example.com/logo.png" 
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" 
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
              value={formData.logoUrl} 
              onChange={e => setFormData(p => ({ ...p, logoUrl: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Mobile App Login Password</label>
            <input 
              type="password" 
              placeholder="Create login password for mobile app" 
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30" 
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} 
              value={formData.password} 
              onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
            />
          </div>

          {error && (
            <p className="text-xs text-[#F03D4E] text-center" style={{ fontFamily: FM }}>{error}</p>
          )}

          <motion.button 
            type="submit"
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            disabled={submitting} 
            className="w-full py-3.5 bg-[#F03D4E] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 mt-8" 
            style={{ fontFamily: FB }}
          >
            {submitting ? "Activating Dashboard..." : "Activate Dashboard"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

const DASH_NAV = [
  { icon: LayoutDashboard, label: "Overview",  id: "overview" },
  { icon: Calendar,        label: "Events",    id: "events"   },
  { icon: Settings,        label: "Settings",  id: "settings" },
];

function DashboardPage({ userEmail, onSignOut }: { userEmail: string; onSignOut: () => void }) {
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

  const isProfileIncomplete = !!currentClub && (
    !currentClub.upiId ||
    !currentClub.logoUrl ||
    currentClub.logoUrl === "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
  );

  const renderProfileSection = () => (
    <div className="p-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-2.5 mb-3 px-1">
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
          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[#F03D4E]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        {currentClub?.logoUrl && currentClub.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" && (
          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[#F03D4E]" style={{ display: 'none' }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="overflow-hidden">
          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.75)", fontFamily: FB }}>{name}</p>
          <p className="text-[11px]" style={{ color: "#f3f4f6", fontFamily: FM }}>Admin</p>
        </div>
      </div>
      <button onClick={onSignOut}
        className="w-full py-2 text-xs rounded-lg transition-all duration-300"
        style={{ color: "#f3f4f6", border: "1px solid rgba(255,255,255,0.03)", fontFamily: FB }}
        onMouseEnter={e => { e.currentTarget.style.color = "#cccccc"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#bbbbbb"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)"; }}
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
      console.log("[Dashboard] Navigating to create tab with no clubId — triggering refreshProfile.");
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
      <div className="flex h-screen items-center justify-center" style={{ background: "rgba(5,5,5,0.98)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F03D4E] border-t-transparent animate-spin" />
          <p className="text-xs tracking-[0.4em] uppercase text-[#94a3b8]" style={{ fontFamily: FM }}>Loading Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ position: "relative", zIndex: 10 }}>
      
      <aside className="hidden xl:flex w-56 flex-shrink-0 flex-col h-screen"
        style={{ background: "rgba(5,5,5,0.97)", borderRight: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(24px)" }}
      >
        <div className="px-6 pt-6 pb-5 flex-shrink-0 flex items-center gap-2.5">
          <img src="/logo.png" alt="Spotlight Logo" className="w-8 h-8 object-contain" />
          <span className="text-[13px] tracking-[0.32em] font-semibold" style={{ fontFamily: F_LOGO, color: "rgba(255,255,255,0.82)" }}>SPOTLIGHT</span>
        </div>
        <div className="px-4 mb-5 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab("create")}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#F03D4E] rounded-xl transition-all duration-300"
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 25px rgba(240,61,78,0.3)")}
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
                  background: active ? "rgba(255,255,255,0.065)" : "transparent",
                  color:      active ? "#fff" : "#999999",
                  border:     active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                  fontFamily: FB,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#dddddd"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#999999"; }}
              ><Icon size={14} />{label}</button>
            );
          })}
        </nav>
        {renderProfileSection()}
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <header className="xl:hidden flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: "rgba(5,5,5,0.97)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(24px)" }}
        >
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-white hover:text-[#F03D4E] transition-colors p-1">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Spotlight Logo" className="w-8 h-8 object-contain" />
            <span className="text-[13px] tracking-[0.32em] font-semibold" style={{ fontFamily: F_LOGO, color: "rgba(255,255,255,0.82)" }}>SPOTLIGHT</span>
          </div>
          <div className="w-8" />
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
                  background: "rgba(240,61,78,0.04)",
                  border: "1px solid rgba(240,61,78,0.12)",
                  backdropFilter: "blur(20px)"
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#F03D4E]/10 rounded-xl text-[#F03D4E] flex-shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white" style={{ fontFamily: FB }}>Complete Your Club Profile</h4>
                    <p className="text-xs text-[#94a3b8]" style={{ fontFamily: FM }}>
                      Your profile is incomplete: logo or UPI ID is missing. Please add them to customize your page.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => {
                      setReminderDismissed(true);
                      sessionStorage.setItem("spotlight_reminder_dismissed", "true");
                    }}
                    className="px-4 py-2 hover:bg-white/5 text-[#94a3b8] hover:text-white text-xs font-semibold rounded-xl transition-all duration-300"
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
                    className="px-4 py-2 bg-[#F03D4E] hover:bg-[#d83544] text-white text-xs font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(240,61,78,0.2)]"
                    style={{ fontFamily: FB }}
                  >
                    Complete Now
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto relative" style={{ background: "transparent" }}>
          <AnimatePresence mode="wait">
            {activeTab === "create" && (
              <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <CreateEventPage clubId={profile?.clubId ?? ""} onCreated={async () => { await refreshEvents(); setActiveTab("overview"); }} getToken={getToken} clubQrUrl={currentClub?.qrUrl} clubUpiId={currentClub?.upiId} refreshProfile={refreshProfile} />
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
              </motion.div>
            )}
            {activeTab === "teams" && (
              <motion.div key="teams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                 <TeamsPage />
              </motion.div>
            )}
            {activeTab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                 <SettingsPage club={clubs.find((c: any) => c.id === profile?.clubId)} profile={profile} getToken={getToken} onUpdate={refreshEvents} onLogout={onSignOut} />
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
              className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-screen xl:hidden"
              style={{ background: "rgba(5,5,5,0.98)", borderRight: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(24px)" }}
            >
              <div className="px-6 pt-6 pb-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="Spotlight Logo" className="w-8 h-8 object-contain" />
                  <span className="text-[13px] tracking-[0.32em] font-semibold" style={{ fontFamily: F_LOGO, color: "rgba(255,255,255,0.82)" }}>SPOTLIGHT</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/60 hover:text-white transition-colors p-1">
                  <X size={18} />
                </button>
              </div>
              <div className="px-4 mb-5 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setActiveTab("create"); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#F03D4E] rounded-xl transition-all duration-300"
                  style={{ fontFamily: FB }}
                ><Plus size={14} /> Create Event</motion.button>
              </div>
              <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                {DASH_NAV.map(({ id, icon: Icon, label }) => {
                  const active = id === activeTab;
                  return (
                    <button key={id} onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300"
                      style={{
                        background: active ? "rgba(255,255,255,0.065)" : "transparent",
                        color:      active ? "#fff" : "#999999",
                        border:     active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                        fontFamily: FB,
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#dddddd"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#999999"; }}
                    ><Icon size={14} />{label}</button>
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
            className="w-full max-w-md p-8 rounded-3xl relative border border-white/10"
            style={{ background: "rgba(15,15,15,0.98)" }}
          >
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: FC }}>Welcome to Spotlight! 🚀</h2>
            <p className="text-xs text-[#d1d5db] mb-6 leading-relaxed" style={{ fontFamily: FB }}>
              Your club has been successfully created, but a few settings are yet to be completed. Please configure the pending fields below:
            </p>
            <div className="space-y-3 mb-8">

              {(!currentClub?.logoUrl || currentClub.logoUrl === "https://images.unsplash.com/photo-1516321318423-f06f85e504b3") && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(240,61,78,0.03)", border: "1px dashed rgba(240,61,78,0.2)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F03D4E]" />
                  <span className="text-xs text-white/90" style={{ fontFamily: FB }}>Club Logo is not uploaded</span>
                </div>
              )}

              {!currentClub?.upiId && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(240,61,78,0.03)", border: "1px dashed rgba(240,61,78,0.2)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F03D4E]" />
                  <span className="text-xs text-white/90" style={{ fontFamily: FB }}>Default UPI ID is not configured</span>
                </div>
              )}

              {!currentClub?.qrUrl && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(240,61,78,0.03)", border: "1px dashed rgba(240,61,78,0.2)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F03D4E]" />
                  <span className="text-xs text-white/90" style={{ fontFamily: FB }}>Default QR Code is not uploaded</span>
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
                className="flex-1 py-3 text-xs font-semibold text-white bg-[#F03D4E] hover:bg-[#d93041] rounded-xl transition-all cursor-pointer text-center"
                style={{ fontFamily: FB }}
              >
                Configure Settings
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("show_first_time_notice");
                  setShowOnboardingNotice(false);
                }}
                className="px-5 py-3 text-xs font-semibold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
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

function OverviewPage({
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
    <div className="p-5 md:p-8 lg:p-10 space-y-8 md:space-y-10 max-w-7xl">
      
      <motion.div
        initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative p-6 md:p-8 rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(255,255,255,0.03) 0%, transparent 60%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent 55%)" }} />
        <p className="text-[11px] tracking-[0.5em] uppercase mb-3" style={{ color: "#f3f4f6", fontFamily: FM }}>Dashboard</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>
          Welcome Back, {name}
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: "#94a3b8", fontFamily: FB }}>Manage your club's events, registrations, and track performance in real-time.</p>
      </motion.div>

      {/* KPI Cards — live data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Events",          value: totalEvents,        suffix: "",  sub: `${clubEvents.filter(e => e.status === 'upcoming' || e.status === 'live').length} active`,  delay: 0    },
          { label: "Total Registrations",   value: totalRegistrations, suffix: "",  sub: "Across all events",                                                   delay: 0.08 },
          { label: "Pending Approvals",     value: pendingCount,       suffix: "",  sub: "Awaiting your review",                                                delay: 0.16 },
        ].map(k => (
          <motion.div key={k.label}
            initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: k.delay, ease: [0.16, 1, 0.3, 1] }}
            className="relative p-7 rounded-2xl overflow-hidden cursor-default"
            style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.45s ease" }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background   = "rgba(255,255,255,0.044)";
              el.style.borderColor  = "rgba(255,255,255,0.13)";
              el.style.boxShadow    = "0 24px 70px rgba(0,0,0,0.45)";
              el.style.transform    = "translateY(-4px)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background  = "rgba(255,255,255,0.022)";
              el.style.borderColor = "rgba(255,255,255,0.06)";
              el.style.boxShadow   = "none";
              el.style.transform   = "none";
            }}
          >
            <div className="absolute top-0 right-0 w-36 h-36 pointer-events-none" style={{ background: "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.05), transparent 65%)" }} />
            <p className="text-[11px] tracking-[0.42em] uppercase mb-6" style={{ color: "#f3f4f6", fontFamily: FM }}>{k.label}</p>
            <p className="text-3xl font-semibold text-white mb-3" style={{ fontFamily: FB }}>
              <AnimatedCounter target={k.value} suffix={k.suffix} />
            </p>
            <p className="text-sm mt-2" style={{ color: "#d1d5db", fontFamily: FB }}>{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Upcoming & Live Events strip — live */}
      <div>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[11px] tracking-[0.5em] uppercase mb-1" style={{ color: "#f3f4f6", fontFamily: FM }}>Upcoming & Live</p>
            <h2 className="text-xl font-semibold text-white" style={{ fontFamily: FC }}>Events</h2>
          </div>
          <button className="group flex items-center gap-1.5 text-sm font-medium transition-all duration-300 text-white/70 hover:text-white cursor-pointer" style={{ fontFamily: FB }}
            onClick={() => onNavigate("events")}
          >
            <span>View all</span>
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>

        {clubEvents.filter(e => e.status === 'upcoming' || e.status === 'live').length === 0 ? (
          <div className="p-8 rounded-2xl text-center text-sm text-[#94a3b8]" style={{ border: "1px dashed rgba(255,255,255,0.05)", fontFamily: FB }}>
            No upcoming events yet. <button onClick={() => onNavigate("create")} className="text-[#F03D4E] hover:underline">Create one →</button>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory -mx-5 px-5 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10" style={{ scrollbarWidth: "none" }}>
            {clubEvents.filter(e => e.status === 'upcoming' || e.status === 'live').map((ev, i) => (
              <motion.div key={ev.id}
                initial={{ opacity: 0, x: 35 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="flex-shrink-0 w-[340px] p-6 rounded-3xl cursor-pointer snap-start"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.45s ease" }}
                onClick={() => onNavigate("events", ev.id)}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background  = "rgba(255,255,255,0.04)";
                  el.style.borderColor = "rgba(255,255,255,0.13)";
                  el.style.transform   = "translateY(-6px)";
                  el.style.boxShadow   = "0 28px 70px rgba(0,0,0,0.55)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background  = "rgba(255,255,255,0.018)";
                  el.style.borderColor = "rgba(255,255,255,0.05)";
                  el.style.transform   = "none";
                  el.style.boxShadow   = "none";
                }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${(ev.type ?? '').toLowerCase() === "team" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`} style={{ fontFamily: FM }}>{(ev.type ?? '').toLowerCase() === "team" ? "Team" : "Solo"}</span>
                  </div>
                  {ev.status === 'live' ? (
                    <LiveTag />
                  ) : (
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#aaaaaa", fontFamily: FM }}>Upcoming</span>
                  )}
                </div>
                <h3 className="text-white font-semibold mb-1 leading-tight text-sm">{ev.title}</h3>
                <div className="flex items-center gap-3 mb-3" style={{ color: "#d1d5db" }}>
                  <span className="flex items-center gap-1 text-[11px]"><Calendar size={9} />{formatEventHeaderDate(ev.eventDate || ev.date, ev.eventEndDate)}</span>
                  <span className="flex items-center gap-1 text-[11px]"><MapPin size={9} />{ev.venue}</span>
                </div>
                {ev.registrationDeadline && (
                  <div className="flex items-center gap-1 mb-4" style={{ color: "#f59e0b" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span className="text-[11px]" style={{ fontFamily: 'inherit' }}>Deadline: {(() => { const d = new Date(ev.registrationDeadline!); const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()}</span>
                  </div>
                )}
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "#f3f4f6", fontFamily: FM }}>
                    <span>{ev.capacity > 0 ? `${ev.capacity} cap` : 'Open'}</span>
                    <span>{ev.type}</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions + Live Activity Feed */}
      <div className="grid md:grid-cols-3 gap-6 pb-10">
        <div className="md:col-span-2">
          <p className="text-[11px] tracking-[0.5em] uppercase mb-5" style={{ color: "#f3f4f6", fontFamily: FM, marginBottom: "18px" }}>Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((qa, i) => (
              <motion.button key={qa.label} onClick={() => onNavigate(qa.id)}
                initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="p-5 rounded-xl text-left group"
                style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.4s ease" }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background  = "rgba(255,255,255,0.038)";
                  el.style.borderColor = "rgba(255,255,255,0.12)";
                  el.style.transform   = "scale(1.02)";
                  el.style.boxShadow   = "0 16px 50px rgba(0,0,0,0.4)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background  = "rgba(255,255,255,0.018)";
                  el.style.borderColor = "rgba(255,255,255,0.05)";
                  el.style.transform   = "none";
                  el.style.boxShadow   = "none";
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <qa.icon size={14} className="text-muted-foreground group-hover:text-white/65 transition-colors duration-300" />
                </div>
                <p className="text-white text-sm font-medium mb-0.5" style={{ fontFamily: FB }}>{qa.label}</p>
                <p className="text-xs" style={{ color: "#d1d5db", fontFamily: FB }}>{qa.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div>
          <p className="text-[11px] tracking-[0.5em] uppercase mb-5" style={{ color: "#f3f4f6", fontFamily: FM, marginBottom: "18px" }}>Recent Activity</p>
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "#94a3b8", fontFamily: FB }}>No activity yet.</p>
            ) : (
              recentActivity.map((a, i) => (
                <motion.div key={a.id}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="flex items-start gap-2.5 py-3 px-2 rounded-lg transition-all duration-300"
                  style={{ borderBottom: i < recentActivity.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.022)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                >
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{
                    background: a.status?.toLowerCase() === 'confirmed'
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(255,255,255,0.18)",
                  }} />
                  <div>
                    <p className="text-xs leading-snug" style={{ color: "#f9fafb", fontFamily: FB }}>
                      <span className="text-white/80">{a.user?.name ?? a.team?.name ?? 'Someone'}</span>
                      {" signed up for "}
                      <span className="text-white/80">{a.eventTitle}</span>
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#94a3b8", fontFamily: FM }}>{timeAgo(a.created_at)}</p>
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

export default function App() {
  const { isSignedIn: isClerkSignedIn, isLoaded: isClerkLoaded, signOut: clerkSignOut } = useAuth();
  const [localToken, setLocalToken] = useState<string | null>(() => localStorage.getItem("spotlight_token"));
  const isLocalSignedIn = !!localToken;
  const isSignedIn = isClerkSignedIn || isLocalSignedIn;
  const { user } = useUser();

  const getInitialParams = () => {
    if (typeof window === "undefined") return { view: "landing" as View, authTab: "login" as AuthTab };
    const params = new URLSearchParams(window.location.search);
    const v = (params.get("view") as View) || "landing";
    const t = (params.get("authTab") as AuthTab) || "login";

    const hasLocalToken = !!localStorage.getItem("spotlight_token");
    if (hasLocalToken && v !== "auth") return { view: "dashboard" as View, authTab: t };
    return { view: v, authTab: t };
  };

  const initial = getInitialParams();
  const [view,      setView]      = useState<View>(initial.view);
  const [authTab,   setAuthTab]   = useState<AuthTab>(initial.authTab);
  const [mousePos,  setMousePos]  = useState({ x: -9999, y: -9999 });

  const updateNavigation = (newView: View, newAuthTab?: AuthTab) => {
    setView(newView);
    if (newAuthTab) setAuthTab(newAuthTab);

    const url = new URL(window.location.href);
    if (newView === "landing") {
      url.search = "";
    } else {
      url.searchParams.set("view", newView);
      if (newView === "auth" && (newAuthTab || authTab)) {
        url.searchParams.set("authTab", newAuthTab || authTab);
      } else {
        url.searchParams.delete("authTab");
      }

      if (newView === "dashboard") {
        const tab = url.searchParams.get("tab") || "overview";
        url.searchParams.set("tab", tab);
      } else {
        url.searchParams.delete("tab");
        url.searchParams.delete("eventId");
        url.searchParams.delete("showTeams");
      }
    }

    const currentParams = new URLSearchParams(window.location.search);
    const hasChanged = newView === "landing"
      ? currentParams.toString() !== ""
      : currentParams.get("view") !== newView || 
        (newView === "auth" && currentParams.get("authTab") !== (newAuthTab || authTab));

    if (hasChanged) {
      window.history.pushState({ view: newView, authTab: newAuthTab || authTab }, "", url.toString());
    }
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.view) {
        setView(state.view);
        if (state.authTab) setAuthTab(state.authTab);
      } else {
        const params = new URLSearchParams(window.location.search);
        const v = (params.get("view") as View) || "landing";
        const t = (params.get("authTab") as AuthTab) || "login";
        setView(v);
        setAuthTab(t);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!isClerkLoaded && !isLocalSignedIn) return;
    if (isSignedIn && (view === "auth" || view === "landing")) {
      updateNavigation("dashboard");
    }
  }, [isSignedIn, view, isClerkLoaded]);

  useEffect(() => {
    const fn = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  useEffect(() => {

    const isMobile = window.innerWidth < 768;
    document.body.style.overflow = (view === "dashboard" && isMobile) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [view]);

  const goAuth    = (tab: AuthTab = "login") => { updateNavigation("auth", tab); };
  const doSignOut = async () => {
    localStorage.removeItem("spotlight_token");
    localStorage.removeItem("spotlight_profile");
    setLocalToken(null);
    if (isClerkSignedIn) {
      await clerkSignOut();
    }
    const url = new URL(window.location.href);
    url.search = "";
    window.history.pushState({ view: "landing" }, "", url.toString());
    setView("landing");
  };

  const userEmail = isLocalSignedIn
    ? (() => {
        try {
          const profileRaw = localStorage.getItem("spotlight_profile");
          return profileRaw ? JSON.parse(profileRaw).email : "";
        } catch {
          return "";
        }
      })()
    : (user?.primaryEmailAddress?.emailAddress ?? "");

  if (!isClerkLoaded && !isLocalSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "rgba(5,5,5,0.98)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F03D4E] border-t-transparent animate-spin" />
          <p className="text-xs tracking-[0.4em] uppercase" style={{ color: "#94a3b8", fontFamily: FM }}>Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: FB }}
    >
      {/* Cursor flashlight */}
      <div className="pointer-events-none fixed inset-0 z-50" style={{
        background: `radial-gradient(720px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.038), transparent 50%)`,
      }} />

      {/* Liquid blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {view === "landing" && <LandingPage onEnter={() => isSignedIn ? updateNavigation("dashboard") : goAuth("login")} onRegister={() => goAuth("register")} />}
      {view === "auth"    && (
        <AuthPage 
          tab={authTab} 
          onTabChange={setAuthTab} 
          onBack={() => updateNavigation("landing")} 
          onLocalSignIn={(token, profile) => {
            localStorage.setItem("spotlight_token", token);
            localStorage.setItem("spotlight_profile", JSON.stringify(profile));
            setLocalToken(token);
          }}
        />
      )}
      {(view === "dashboard" || (isClerkLoaded && isSignedIn && view !== "auth" && view !== "landing")) && (
      <motion.div key="dash" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="dashboard-root"
        >
          <DashboardPage userEmail={userEmail} onSignOut={doSignOut} />
        </motion.div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; }
        .dashboard-root { height: 100dvh; overflow: hidden; }
        @media (min-width: 768px) { .dashboard-root { height: auto; min-height: 100vh; overflow: visible; } }
        .blob {
          position: absolute; border-radius: 50%;
          filter: blur(100px); opacity: 0.08; will-change: transform;
          animation: morphBlob 22s ease-in-out infinite;
        }
        .blob-1 { width:750px; height:750px; background: radial-gradient(circle,rgba(240,61,78,.15),transparent 68%); top:-18%; left:-20%; animation-duration:20s; }
        .blob-2 { width:580px; height:580px; background: radial-gradient(circle,rgba(160,160,160,.25),transparent 68%); bottom:0; right:-14%; animation-duration:26s; animation-delay:-9s; }
        .blob-3 { width:440px; height:440px; background: radial-gradient(circle,rgba(240,61,78,.1),transparent 68%); top:42%; left:38%; animation-duration:32s; animation-delay:-16s; }
        @keyframes morphBlob {
          0%,100% { transform:translate(0,0) scale(1);          border-radius:60% 40% 70% 30%/50% 60% 40% 70%; }
          25%      { transform:translate(55px,-44px) scale(1.07); border-radius:40% 60% 30% 70%/60% 40% 70% 30%; }
          50%      { transform:translate(-32px,65px) scale(.93);  border-radius:70% 30% 50% 50%/30% 70% 50% 60%; }
          75%      { transform:translate(42px,28px) scale(1.04);  border-radius:50% 50% 60% 40%/70% 30% 60% 40%; }
        }
        @keyframes beamSweep {
          0%,100% { transform:translateX(-50%) rotate(-6deg); opacity:.55; }
          50%      { transform:translateX(-50%) rotate(6deg);  opacity:1;   }
        }
      `}</style>
    </div>
  );
}
