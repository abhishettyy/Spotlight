import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, Calendar, Users, CreditCard, Plus, MapPin,
  ChevronRight, Eye, EyeOff, LayoutDashboard, Archive,
  CheckCircle, Zap, Shield, ChevronLeft, Check, Upload,
  X, Key, Copy, Settings, LogOut
} from "lucide-react";
import {
  useAuth,
  useUser,
  useSignIn,
  useSignUp,
} from "@clerk/clerk-react";
import { syncProfile, fetchEvents, fetchClubs, fetchEventRegistrations, approveRegistration, createEvent, fetchAllRegistrationsForEvents, createClub, fetchClubDashboardStats, updateClub, fetchPublicStats, clubLogin } from "./api";
import confetti from "canvas-confetti";


// ─── Constants ───────────────────────────────────────────────────────────────
const FC = "'Cinzel', serif";
const FM = "'JetBrains Mono', monospace";
const FB = "'Manrope', sans-serif";

type View = "landing" | "auth" | "dashboard";
type AuthTab = "login" | "register";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClubEvent {
  id: string;
  title: string;
  date: string | null;
  venue: string;
  capacity: number;
  type: string;
  club: string;
  club_id: string | null;
  status: "upcoming" | "previous" | "live";
  price: number;
  bannerUrl?: string | null;
  qrUrl?: string | null;
}

interface Registration {
  id: string;
  status: string;
  created_at: string;
  eventTitle: string;
  eventId: string;
  user: { id: string; name: string; email: string; usn: string; branch: string; phone: string; year?: number | null; sem?: number | null } | null;
  team: { id: string; name: string; passkey: string; leaderId?: string | null } | null;
  transaction_id?: string | null;
}

// ─── Real Data Hook ───────────────────────────────────────────────────────────
function useSpotlightData() {
  const { getToken: getClerkToken, userId: clerkUserId, isSignedIn: isClerkSignedIn } = useAuth();
  const { user } = useUser();

  // Local storage direct club login session
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

  // Live PostgreSQL-bound states
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

      // Populate allRegistrations in the background so the dashboard overview loads instantly
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
        // Re-sync profile to pick up newly assigned clubId
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
          // Direct direct-db club login: skip Clerk sync
          setProfile(localProfile);
          const clubsData = await fetchClubs();
          setClubs(clubsData.clubs ?? []);

          if (localProfile?.clubId) {
            await loadDashboardStats(localProfile.clubId, token);
          }
          return;
        }

        // 1. Fire syncProfile and fetchClubs concurrently for social users
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

        // 3. If they have a club, load the stats
        if (freshProfile?.clubId) {
          console.log("[SpotlightData] load() clubId found, loading dashboard stats for clubId:", freshProfile.clubId);
          await loadDashboardStats(freshProfile.clubId, token);
        } else {
          console.log("[SpotlightData] load() profile has no clubId, skipping stats load.");
        }
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      } finally {
        console.log("[SpotlightData] load() finished, setting loading to false");
        setLoading(false);
      }
    }

    load();
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
    setAllRegistrations,
    getToken,
  };
}

// ─── Legacy in-memory store (no longer used for real data) ───────────────────
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
  { id: "create",   icon: Plus,        label: "Create Event",     desc: "Launch a new event in minutes"   },
  { id: "events",   icon: CheckCircle, label: "Review Payments",  desc: "Approve pending verifications"   },
  { id: "events",    icon: Users,       label: "Manage Teams",     desc: "Oversee team registrations per event"      },
  { id: "settings", icon: CreditCard,  label: "Payment Settings", desc: "Configure QR and UPI details"   },
];
const FEATURES = [
  { icon: Calendar, title: "Liquid Event Creation", desc: "Craft events with a fluid step-by-step builder. From concept to live in under two minutes."      },
  { icon: Shield,   title: "Payment Moderation",    desc: "QR-based verification with screenshot uploads, manual approval pipelines, and audit trails."     },
  { icon: Zap,      title: "Smart Publishing",      desc: "Free events go live instantly. Paid events enter the intelligent moderation stream automatically." },
];





// ─── Shared Helpers ──────────────────────────────────────────────────────────
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
      <label className="text-[10px] tracking-[0.4em] uppercase block" style={{ color: "#cccccc", fontFamily: FM }}>
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

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage({ onEnter, onRegister }: { onEnter: () => void; onRegister: () => void }) {
  const [scrollY, setScrollY] = useState(0);
  const [stats, setStats] = useState({ liveEvents: 0, registrations: 0 });

  useEffect(() => {
    fetchPublicStats().then(data => {
      setStats({
        liveEvents: data.liveEvents || 0,
        registrations: data.registrations || 0
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
    <div id="ls" className="h-screen overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none" }}>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-30 transition-all duration-700"
        style={{
          background:   scrolled ? "rgba(5,5,5,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(24px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <span className="text-sm tracking-[0.35em] font-semibold text-white" style={{ fontFamily: FC }}>SPOTLIGHT</span>
          <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "#cccccc" }}>
            {["Platform", "Events", "About"].map(l => (
              <a key={l} href="#" className="hover:text-white transition-colors duration-300" style={{ fontFamily: FB }}>{l}</a>
            ))}
          </div>
          <button onClick={onEnter}
            className="text-sm px-5 py-2 rounded-full text-white/60 hover:text-white transition-all duration-400"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.32)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
          >Sign In</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
        {/* Spotlight beam */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: "absolute", top: "-10%", left: "50%",
            transform: "translateX(-50%)",
            width: "700px", height: "900px",
            background: "conic-gradient(from 174deg at 50% 0%, transparent 0deg, rgba(255,255,255,0.035) 6deg, transparent 12deg)",
            filter: "blur(40px)",
            animation: "beamSweep 10s ease-in-out infinite",
          }} />
        </div>

        {/* Floating chips */}
        {[
          { label: `● ${stats.liveEvents} LIVE EVENTS`, delay: 0, x: "left-12 top-36", y: [0, -14, 0], d: 5.5 },
          { label: `${stats.registrations.toLocaleString()}+ REGISTRATIONS`, delay: 1.5, x: "right-16 top-44", y: [0, 12, 0], d: 7 },
        ].map(chip => (
          <motion.div key={chip.label}
            animate={{ y: chip.y }}
            transition={{ duration: chip.d, repeat: Infinity, ease: "easeInOut", delay: chip.delay }}
            className={`absolute ${chip.x} px-3 py-1.5 rounded-full text-[9px] hidden xl:flex items-center gap-2`}
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)", color: "#cccccc", fontFamily: FM, backdropFilter: "blur(12px)" }}
          >{chip.label}</motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.55em" }}
            transition={{ duration: 2, delay: 0.2 }}
            className="text-[10px] uppercase mb-10" style={{ color: "#cccccc", fontFamily: FM }}
          >Event Management Platform</motion.p>

          <motion.h1
            initial={{ opacity: 0, filter: "blur(20px)", scale: 0.9 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="leading-none text-white select-none" style={{
            fontFamily: FC, fontWeight: 600,
            fontSize: "clamp(4rem, 12vw, 12rem)",
            letterSpacing: "-0.02em",
            textShadow: "0 0 100px rgba(255,255,255,0.15)",
          }}>SPOTLIGHT</motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 1.2 }}
            className="mt-8 text-xl md:text-2xl max-w-xl mx-auto"
            style={{ color: "#cccccc", lineHeight: 1.65, fontFamily: FB }}
          >
            Manage Events{" "}<span style={{ color: "rgba(255,255,255,0.72)" }}>Through Motion.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-14 flex flex-col sm:flex-row gap-4 items-center"
          >
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={onEnter}
              className="cursor-pointer group flex items-center gap-3 px-9 py-4 text-sm font-semibold text-white bg-[#F03D4E] rounded-full transition-all duration-500"
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 40px rgba(240,61,78,0.4)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              Enter Dashboard
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-300" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={onRegister}
              className="cursor-pointer px-9 py-4 text-sm rounded-full text-white/55 hover:text-white transition-all duration-500"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            >Join the Network</motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              className="px-6 py-4 text-sm text-white/60 hover:text-white/90 transition-colors duration-400"
              onClick={() => document.getElementById("ls")?.scrollBy({ top: window.innerHeight, behavior: "smooth" })}
            >View Events ↓</motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 10, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-px h-14 bg-gradient-to-b from-transparent via-white/15 to-white/45" />
          <p className="text-[9px] tracking-[0.6em] uppercase" style={{ color: "#bbbbbb", fontFamily: FM }}>Scroll</p>
        </motion.div>
      </section>

      {/* STATS + FEATURES */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8 }}
            className="flex flex-wrap justify-center gap-16 mb-28"
          >
            {[{ v: "48", l: "Active Events" }, { v: "2,400+", l: "Registrations" }, { v: "12", l: "Clubs" }, { v: "15k+", l: "Tickets Sold" }].map(s => (
              <div key={s.l} className="text-center">
                <p className="text-3xl font-semibold text-white mb-1.5">{s.v}</p>
                <p className="text-[10px] tracking-[0.45em] uppercase" style={{ color: "#bbbbbb", fontFamily: FM }}>{s.l}</p>
              </div>
            ))}
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.65, delay: i * 0.1 }}
                className="group p-7 rounded-2xl cursor-default"
                style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.45s ease" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,0.036)"; el.style.borderColor = "rgba(255,255,255,0.12)"; el.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,0.018)"; el.style.borderColor = "rgba(255,255,255,0.05)"; el.style.transform = "none"; }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-5" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <f.icon size={15} className="text-muted-foreground group-hover:text-white/70 transition-colors duration-300" />
                </div>
                <h3 className="text-white font-semibold mb-2 text-sm">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#cccccc" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* FOOTER */}
      <footer className="py-10 px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm tracking-[0.35em]" style={{ fontFamily: FC, color: "rgba(255,255,255,0.4)" }}>SPOTLIGHT</span>
          <p className="text-xs" style={{ color: "#777777", fontFamily: FM }}>© 2026 SPOTLIGHT · Event Management Through Motion</p>
          <div className="flex gap-6 text-xs" style={{ color: "#777777" }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href="#" className="hover:text-white/40 transition-colors duration-300" style={{ fontFamily: FB }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Clerk Auth Page ──────────────────────────────────────────────────────────
// ─── Custom Auth Page ──────────────────────────────────────────────────────────
// Helper to format authentication errors cleanly
function formatAuthError(err: any, defaultMsg: string): string {
  if (!err) return defaultMsg;
  const msg = err.message || "";
  
  if (
    msg.toLowerCase().includes("network error") || 
    msg.toLowerCase().includes("failed to fetch") || 
    msg.toLowerCase().includes("load failed") || 
    msg.toLowerCase().includes("networkerror") || 
    (err.name === "TypeError" && msg.toLowerCase().includes("fetch"))
  ) {
    return "Connection error. Please check your internet connection and try again.";
  }

  if (err.errors && err.errors.length > 0) {
    return err.errors[0].longMessage || err.errors[0].message || defaultMsg;
  }
  
  return msg || defaultMsg;
}

// ─── Custom Auth Page ──────────────────────────────────────────────────────────
function AuthPage({ tab, onTabChange, onBack, onLocalSignIn }: {
  tab: AuthTab; onTabChange: (t: AuthTab) => void; onBack: () => void;
  onLocalSignIn: (token: string, profile: any) => void;
}) {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clubName, setClubName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyingSignIn, setVerifyingSignIn] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // Toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

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
    if (!email || !password) {
      setError("Email and Password are required.");
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
    if (!clubName || !email || !password) {
      setError("Club Name, Email, and Password are required.");
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
        console.log("[CustomSignUp] Clerk signup verified successfully. Auto-provisioning club...");
        
        // Auto-provision the Club in the database, passing the raw password!
        const res = await createClub({
          name: clubName,
          email: email,
          password: password, // PASS PASSWORD SO IT SAVES IN DB!
          clerkUserId: result.createdUserId!,
          logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        });

        console.log("[CustomSignUp] Database club creation complete:", res);

        // Make the session active
        await setSignUpActive({ session: result.createdSessionId });
      } else {
        setError("Verification not complete.");
      }
    } catch (err: any) {
      setError(formatAuthError(err, "Verification code is incorrect."));
    } finally {
      setLoading(false);
    }
  };

  if (verifying || verifyingSignIn) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        className="fixed inset-0 z-20 flex items-center justify-center p-6"
        style={{ background: "rgba(5,5,5,0.97)", backdropFilter: "blur(10px)" }}
      >
        <button onClick={() => { setVerifying(false); setVerifyingSignIn(false); setError(null); setVerificationCode(""); }}
          className="absolute top-8 left-8 flex items-center gap-2 text-sm transition-all duration-300"
          style={{ color: "#999999", fontFamily: FB }}
          onMouseEnter={e => (e.currentTarget.style.color = "#eeeeee")}
          onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
        ><ChevronLeft size={14} /> Back</button>

        <div className="w-full max-w-md p-8 md:p-10 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: FC }}>
              {verifyingSignIn ? "Verify Sign In" : "Verify Email"}
            </h2>
            <p className="text-xs text-[#999999]" style={{ fontFamily: FB }}>We sent a 6-digit verification code to <span className="text-white font-medium">{email}</span>. Please enter it below.</p>
          </div>

          <form onSubmit={verifyingSignIn ? handleVerifySignIn : handleVerify} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Verification Code</label>
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
        style={{ color: "#999999", fontFamily: FB }}
        onMouseEnter={e => (e.currentTarget.style.color = "#eeeeee")}
        onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
      ><ChevronLeft size={14} /> Back</button>

      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        {/* Tab toggle */}
        <div className="flex gap-1 p-1 rounded-xl w-full" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {(["login", "register"] as AuthTab[]).map(t => (
            <button key={t} onClick={() => onTabChange(t)}
              className="flex-1 py-2.5 text-sm rounded-lg font-medium transition-all duration-300"
              style={{ background: tab === t ? "#fff" : "transparent", color: tab === t ? "#000" : "#aaaaaa", fontFamily: FB }}
            >{t === "login" ? "Sign In" : "Register Club"}</button>
          ))}
        </div>

        {/* Custom Form Card */}
        <div className="w-full p-8 md:p-10 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: FC }}>
              {tab === "login" ? "Club Sign In" : "Register Your Club"}
            </h2>
            <p className="text-xs text-[#999999]" style={{ fontFamily: FB }}>
              {tab === "login" ? "Access your club dashboard" : "Welcome! Please fill in the details to get started."}
            </p>
          </div>

          <form onSubmit={tab === "login" ? handleSignIn : handleSignUp} className="space-y-6">
            {tab === "register" && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Club Name</label>
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
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Email ID</label>
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
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Password</label>
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
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

          {tab === "login" && (
            <>
              {/* Social login divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="h-[1px] bg-white/10 flex-1" />
                <span className="text-[10px] text-white/30 uppercase tracking-widest" style={{ fontFamily: FM }}>or</span>
                <div className="h-[1px] bg-white/10 flex-1" />
              </div>

              {/* Social login button */}
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
        </div>
      </div>
    </motion.div>
  );
}

// ─── Events Page ──────────────────────────────────────────────────────────────
function EventsPage({ 
  EVENTS, 
  allRegistrations, 
  onRegistrationsChange, 
  getToken,
  selectedEventId,
  setSelectedEventId,
  showTeams,
  setShowTeams
}: {
  EVENTS: ClubEvent[];
  allRegistrations: Registration[];
  onRegistrationsChange: (updater: (prev: Registration[]) => Registration[]) => void;
  getToken: () => Promise<string | null>;
  selectedEventId: string | null;
  setSelectedEventId: (eventId: string | null, pushHistory?: boolean) => void;
  showTeams: boolean;
  setShowTeams: (val: boolean, pushHistory?: boolean) => void;
}) {

  const [regsLoading, setRegsLoading] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Reset sub-views when active event changes
  useEffect(() => {
    setShowParticipants(false);
    setSearchQuery("");
  }, [selectedEventId]);

  // Derive per-event registrations from the shared allRegistrations store
  const registrations = selectedEventId
    ? allRegistrations.filter(r => r.eventId === selectedEventId)
    : [];

  const activeEvent = EVENTS.find(e => e.id === selectedEventId);
  const pending  = registrations.filter(r => r.status?.toLowerCase() === "pending");
  const approved = registrations.filter(r => r.status?.toLowerCase() === "confirmed");

  // Recurring background poll for registrations to ensure real-time dynamic updates
  useEffect(() => {
    if (!selectedEventId) return;

    let isMounted = true;
    
    // Only show loading spinner on the very first load
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

    // Run immediately
    poll();

    // Set interval to poll every 4 seconds for real-time dynamic sync
    const intervalId = setInterval(poll, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedEventId]);

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    try {
      // Small localized green drops/burst effect around the clicked button
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

      // Find the team id of the registration being approved to optimistically update the whole team
      const reg = allRegistrations.find(r => r.id === id);
      const teamId = reg?.team?.id;

      // Instant optimistic update — move from pending → confirmed for the user (and their team)
      onRegistrationsChange(prev =>
        prev.map(r => {
          if (r.id === id || (teamId && r.team?.id === teamId)) {
            return { ...r, status: 'CONFIRMED' };
          }
          return r;
        })
      );
    } catch (e) {
      console.error('Approve failed:', e);
    }
  };

  const handleReject = (id: string) => {
    onRegistrationsChange(prev => prev.filter(r => r.id !== id));
  };

  if (activeEvent) {
    const teamGroups = new Map<string, { id: string; name: string; passkey: string; members: Registration[] }>();
    registrations.forEach(r => {
      if (r.team) {
        if (!teamGroups.has(r.team.id)) {
          teamGroups.set(r.team.id, { ...r.team, members: [] });
        }
        teamGroups.get(r.team.id)!.members.push(r);
      }
    });
    const teamsList = Array.from(teamGroups.values());

    return (
      <div className="p-8 lg:p-10 space-y-8 max-w-6xl">
        <button onClick={() => { setSelectedEventId(null); setShowTeams(false, false); }}
          className="flex items-center gap-2 text-sm transition-all duration-300"
          style={{ color: "#999999", fontFamily: FB }}
          onMouseEnter={e => (e.currentTarget.style.color = "#eeeeee")}
          onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
        ><ChevronLeft size={14} /> Back to Events</button>

        {showTeams ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-[12px] tracking-[0.4em] uppercase text-[#bbbbbb]" style={{ fontFamily: FM }}>Manage Teams ({teamsList.length})</h1>
              <button onClick={() => setShowTeams(false)} className="text-xs px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#bbb] hover:text-white transition-all" style={{ fontFamily: FB }}>Return to Event</button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teamsList.map(team => (
                <div key={team.id} className="p-6 rounded-2xl flex flex-col" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="text-white font-semibold text-lg leading-tight" style={{ fontFamily: FC }}>{team.name}</h3>
                      <p className="text-[10px] text-[#888] font-mono mt-1 tracking-wider">PASSKEY: {team.passkey}</p>
                    </div>
                    <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-[#bbb]" style={{ fontFamily: FM }}>{team.members.length} MEMBERS</span>
                  </div>
                  <div className="space-y-3 mt-auto">
                    {team.members.map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-xs text-[#ddd]" style={{ fontFamily: FB }}>{m.user?.name || m.user?.usn || 'Unknown'}</span>
                          <span className="text-[9px] text-[#666]" style={{ fontFamily: FM }}>{m.user?.usn || m.user?.email}</span>
                        </div>
                        <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm" style={{ 
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
        ) : showParticipants ? (
          <div className="mt-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <div>
                <h1 className="text-[12px] tracking-[0.4em] uppercase text-[#bbbbbb] mb-1" style={{ fontFamily: FM }}>Manage Attendees</h1>
                <p className="text-xs text-[#888]" style={{ fontFamily: FB }}>Total registrations: {registrations.length} ({approved.length} approved, {pending.length} pending)</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const headers = ["Name", "Email", "USN", "Branch", "Year", "Sem", "Phone", "Registration Type", "Team Name", "Transaction ID / UTR", "Status", "Registration Date"];
                    const rows = registrations.map(r => {
                      let txId = "";
                      if (activeEvent.price === 0) {
                        txId = "Free";
                      } else if (r.team) {
                        txId = r.team.leaderId === r.user?.id ? (r.transaction_id ?? "Pending Upload") : "Member (Leader uploads)";
                      } else {
                        txId = r.transaction_id ?? "Pending Upload";
                      }
                      return [
                        r.user?.name ?? 'Unknown',
                        r.user?.email ?? '',
                        r.user?.usn ?? '',
                        r.user?.branch ?? '',
                        r.user?.year ?? '',
                        r.user?.sem ?? '',
                        r.user?.phone ?? '',
                        r.team ? 'Team' : 'Solo',
                        r.team?.name ?? '',
                        txId,
                        r.status ?? '',
                        r.created_at ? new Date(r.created_at).toLocaleDateString() : ''
                      ];
                    });
                    const csvContent = [headers, ...rows]
                      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
                      .join("\n");
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `${activeEvent.title.replace(/\s+/g, "_")}_attendees.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-xs px-4 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 border border-green-500/20 transition-all font-semibold" 
                  style={{ fontFamily: FB }}
                >
                  Export CSV
                </button>
                <button onClick={() => setShowParticipants(false)} className="text-xs px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#bbb] hover:text-white transition-all" style={{ fontFamily: FB }}>Return to Event</button>
              </div>
            </div>

            {/* Search filter bar */}
            <div className="relative max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, USN, branch or team..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#F03D4E]/40 focus:ring-1 focus:ring-[#F03D4E]/40 transition-all"
                style={{ fontFamily: FB }}
              />
            </div>

            {/* Table roster */}
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.005]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5" style={{ background: "rgba(255,255,255,0.01)" }}>
                    <th className="p-4 text-[10px] tracking-[0.2em] uppercase text-[#bbbbbb]" style={{ fontFamily: FM }}>Name</th>
                    <th className="p-4 text-[10px] tracking-[0.2em] uppercase text-[#bbbbbb]" style={{ fontFamily: FM }}>USN</th>
                    <th className="p-4 text-[10px] tracking-[0.2em] uppercase text-[#bbbbbb]" style={{ fontFamily: FM }}>Branch / Sem</th>
                    <th className="p-4 text-[10px] tracking-[0.2em] uppercase text-[#bbbbbb]" style={{ fontFamily: FM }}>Contact</th>
                    <th className="p-4 text-[10px] tracking-[0.2em] uppercase text-[#bbbbbb]" style={{ fontFamily: FM }}>Type</th>
                    <th className="p-4 text-[10px] tracking-[0.2em] uppercase text-[#bbbbbb]" style={{ fontFamily: FM }}>Transaction / UTR</th>
                    <th className="p-4 text-[10px] tracking-[0.2em] uppercase text-[#bbbbbb] text-right" style={{ fontFamily: FM }}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {registrations.filter(r => {
                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (r.user?.name ?? '').toLowerCase().includes(q) ||
                      (r.user?.email ?? '').toLowerCase().includes(q) ||
                      (r.user?.usn ?? '').toLowerCase().includes(q) ||
                      (r.user?.branch ?? '').toLowerCase().includes(q) ||
                      (r.team?.name ?? '').toLowerCase().includes(q)
                    );
                  }).map(r => {
                    const isLeader = r.team ? r.team.leaderId === r.user?.id : false;
                    return (
                      <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/50">{(r.user?.name ?? '?').charAt(0)}</div>
                            <div>
                              <p className="text-sm font-medium text-white/80" style={{ fontFamily: FB }}>{r.user?.name ?? 'Unknown'}</p>
                              <p className="text-[10px] text-[#666] mt-0.5" style={{ fontFamily: FM }}>{r.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-mono text-[#aaa]">{r.user?.usn ?? 'N/A'}</td>
                        <td className="p-4 text-xs text-[#aaa]">
                          {r.user?.branch ? (
                            <div>
                              <p>{r.user.branch}</p>
                              <p className="text-[10px] text-[#666] mt-0.5 font-mono">
                                {r.user.year ? `Y${r.user.year}` : ''}
                                {r.user.year && r.user.sem ? ' · ' : ''}
                                {r.user.sem ? `Sem ${r.user.sem}` : ''}
                                {!r.user.year && !r.user.sem ? 'N/A' : ''}
                              </p>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="p-4 text-xs text-[#aaa] font-mono">{r.user?.phone ?? 'N/A'}</td>
                        <td className="p-4">
                          {r.team ? (
                            <div>
                              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-bold" style={{ fontFamily: FM }}>TEAM</span>
                              <p className="text-[10px] text-[#666] mt-1 font-mono">{r.team.name} (Passkey: {r.team.passkey})</p>
                            </div>
                          ) : (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold" style={{ fontFamily: FM }}>SOLO</span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-mono text-[#aaa]">
                          {activeEvent.price === 0 ? (
                            <span className="text-[#555]">Free</span>
                          ) : r.team ? (
                            isLeader ? (
                              r.transaction_id ? (
                                <span className="select-all bg-white/5 px-2 py-1 rounded border border-white/5">{r.transaction_id}</span>
                              ) : (
                                <span className="text-[#e59866] text-[10px] uppercase tracking-wider">Pending Upload</span>
                              )
                            ) : (
                              <span className="text-[#555] italic font-normal text-[11px]">Member (Leader uploads)</span>
                            )
                          ) : (
                            r.transaction_id ? (
                              <span className="select-all bg-white/5 px-2 py-1 rounded border border-white/5">{r.transaction_id}</span>
                            ) : (
                              <span className="text-[#e59866] text-[10px] uppercase tracking-wider">Pending Upload</span>
                            )
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm" style={{ 
                            color: r.status?.toLowerCase() === 'confirmed' ? '#10b981' : '#f59e0b',
                            background: r.status?.toLowerCase() === 'confirmed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            fontFamily: FM
                          }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {registrations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-[#666]" style={{ fontFamily: FB }}>No participants registered for this event yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            {activeEvent.bannerUrl ? (
              <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden relative shadow-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <img src={activeEvent.bannerUrl} alt={activeEvent.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              </div>
            ) : (
              <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col justify-end p-6 md:p-8" 
                style={{ 
                  background: "linear-gradient(135deg, rgba(240,61,78,0.12) 0%, rgba(5,5,5,0.98) 100%)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 20%, rgba(240,61,78,0.08), transparent 50%)" }} />
                <span className="text-[10px] tracking-[0.4em] uppercase text-[#F03D4E] font-bold" style={{ fontFamily: FM }}>SPOTLIGHT EXPERIENCE</span>
                <h2 className="text-xl md:text-2xl font-bold text-white mt-1 leading-tight" style={{ fontFamily: FC }}>{activeEvent.title}</h2>
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] tracking-[0.4em] uppercase" style={{ color: "#F03D4E", fontFamily: FM }}>{activeEvent.status === "live" ? "Live Now" : "Upcoming"}</span>
                <span className="text-[10px] tracking-[0.2em] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#aaa", fontFamily: FM }}>{activeEvent.club}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold text-white" style={{ fontFamily: FC }}>{activeEvent.title}</h1>
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "#cccccc", fontFamily: FB }}>
                 <span className="flex items-center gap-1.5"><Calendar size={12} />{activeEvent.date}</span>
                 <span className="flex items-center gap-1.5"><MapPin size={12} />{activeEvent.venue}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Capacity", value: activeEvent.capacity || '∞' },
                { label: "Registered",     value: registrations.length },
                { label: "Pending Approval", value: pending.length },
              ].map((stat, i) => (
                 <div key={i} className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "#bbbbbb", fontFamily: FM }}>{stat.label}</p>
                    <p className="text-3xl font-semibold text-white">{stat.value}</p>
                 </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
               {/* Pending */}
               <div>
                 <p className="text-[10px] tracking-[0.4em] uppercase text-[#bbbbbb] mb-4" style={{ fontFamily: FM }}>Pending Registrations ({pending.length})</p>
                 <div className="space-y-3">
                   {pending.length === 0 && <div className="p-6 rounded-xl text-center text-xs text-[#bbbbbb]" style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)" }}>No pending registrations.</div>}
                   <AnimatePresence>
                     {pending.map((req) => (
                       <motion.div key={req.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                         className="p-4 rounded-xl flex items-center justify-between group"
                         style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                       >
                          <div>
                            <p className="text-sm font-medium text-white/90" style={{ fontFamily: FB }}>{req.user?.name ?? req.team?.name ?? 'Unknown'}</p>
                            <p className="text-[10px] mt-0.5 text-[#cccccc]" style={{ fontFamily: FM }}>{req.user?.email ?? req.user?.usn ?? ''} · {req.created_at ? new Date(req.created_at).toLocaleDateString() : ''}</p>
                          </div>
                          <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                             <button onClick={(e) => handleApprove(req.id, e)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"><Check size={14} /></button>
                             <button onClick={() => handleReject(req.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-[#F03D4E]/20 text-white/70 hover:text-[#F03D4E] transition-all"><X size={14} /></button>
                          </div>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                 </div>
               </div>
               
               {/* Approved */}
               <div>
                 <p className="text-[10px] tracking-[0.4em] uppercase text-[#bbbbbb] mb-4" style={{ fontFamily: FM }}>Approved Attendees ({approved.length})</p>
                 <div className="space-y-3">
                   {approved.length === 0 && <div className="p-6 rounded-xl text-center text-xs text-[#bbbbbb]" style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)" }}>No approved attendees yet.</div>}
                   <AnimatePresence>
                     {approved.map((req) => (
                       <motion.div key={req.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                         className="p-4 rounded-xl flex items-center justify-between"
                         style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.03)" }}
                       >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/50">{(req.user?.name ?? req.team?.name ?? '?').charAt(0)}</div>
                            <div>
                              <p className="text-sm font-medium text-white/70" style={{ fontFamily: FB }}>{req.user?.name ?? req.team?.name ?? 'Unknown'}</p>
                              <p className="text-[10px] mt-0.5 text-[#bbbbbb]" style={{ fontFamily: FM }}>{req.user?.email ?? req.user?.usn ?? ''}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-green-500/70 uppercase tracking-widest" style={{ fontFamily: FM }}>Approved</span>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                 </div>
               </div>
            </div>

            {/* Manage Section */}
            <div className="mt-8 pt-8 flex flex-wrap gap-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {/* Manage Attendees (Always Available) */}
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

              {/* Manage Teams Card (Team events only) */}
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
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-7xl">
      <div className="flex items-end justify-between">
         <div>
            <p className="text-[10px] tracking-[0.5em] uppercase mb-1.5" style={{ color: "#bbbbbb", fontFamily: FM }}>Directory</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>All Events</h1>
         </div>
      </div>

      <div className="space-y-12 mt-4">
        {/* Upcoming Events */}
        <div>
          <h2 className="text-lg font-medium text-white mb-5" style={{ fontFamily: FB }}>Upcoming Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {EVENTS.filter(e => e.status === "upcoming").map((ev, i) => {
              const regCount = allRegistrations.filter(r => r.eventId === ev.id).length;
              const fill = ev.capacity > 0 ? (regCount / ev.capacity) * 100 : 0;
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
                    <span className="text-[9px] px-2.5 py-1 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.07)", color: "#cccccc", fontFamily: FM }}>{ev.club}</span>
                    <span className="text-[9px] px-2.5 py-1 rounded-full" style={{
                      background: "rgba(240,61,78,0.05)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#cccccc",
                      fontFamily: FM,
                    }}>Upcoming</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 leading-tight text-lg group-hover:text-[#F03D4E] transition-colors">{ev.title}</h3>
                  <div className="flex items-center gap-3 mb-6" style={{ color: "#bbbbbb" }}>
                    <span className="flex items-center gap-1.5 text-xs"><Calendar size={12} />{ev.date ?? 'TBD'}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-2" style={{ color: "#cccccc", fontFamily: FM }}>
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
            {EVENTS.filter(e => e.status === "upcoming").length === 0 && (
              <div className="col-span-3 p-10 rounded-2xl text-center text-sm text-[#555]" style={{ border: "1px dashed rgba(255,255,255,0.05)", fontFamily: FB }}>
                No upcoming events yet.
              </div>
            )}
          </div>
        </div>

        {/* Previous Events */}
        <div>
          <h2 className="text-lg font-medium text-[#bbbbbb] mb-5" style={{ fontFamily: FB }}>Previous Events</h2>
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
                    <span className="text-[9px] px-2.5 py-1 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.04)", color: "#bbbbbb", fontFamily: FM }}>{ev.club}</span>
                    <span className="text-[9px] px-2.5 py-1 rounded-full" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.03)", color: "#666666", fontFamily: FM }}>Ended</span>
                  </div>
                  <h3 className="text-[#cccccc] font-semibold mb-2 leading-tight text-lg transition-colors">{ev.title}</h3>
                  <div className="flex items-center gap-3 mb-6" style={{ color: "#666666" }}>
                    <span className="flex items-center gap-1.5 text-xs"><Calendar size={12} />{ev.date ?? 'TBD'}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-2" style={{ color: "#666666", fontFamily: FM }}>
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

// ─── Custom Date Picker ────────────────────────────────────────────────────────
function GlassDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const dateObj = value ? new Date(value) : new Date();
  
  const [currentMonth, setCurrentMonth] = useState(dateObj.getMonth());
  const [currentYear, setCurrentYear] = useState(dateObj.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? dateObj : null);
  const [timeStr, setTimeStr] = useState(value ? (value.includes("T") ? value.split("T")[1] : "12:00") : "12:00");

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
    if (selectedDate) {
      const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      onChange(`${dateString}T${t}`);
    }
  };

  return (
    <div className="relative">
      <div onClick={() => setOpen(!open)} className="w-full rounded-xl px-4 py-3 text-sm text-white cursor-pointer flex items-center justify-between transition-all" style={{ background: "rgba(255,255,255,0.02)", border: open ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>
        <span className={value ? "text-white" : "text-[#888]"}>{value ? value.replace("T", " ") : "Select Date & Time"}</span>
        <Calendar size={14} className="text-[#999]" />
      </div>
      
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 top-full mt-2 w-72 p-5 rounded-2xl shadow-2xl left-0" style={{ background: "rgba(15,15,15,0.98)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(24px)" }}>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => {
                if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                else { setCurrentMonth(m => m - 1); }
              }} className="p-1 hover:bg-white/10 rounded-md transition-colors text-white"><ChevronLeft size={16} /></button>
              <div className="text-sm text-white" style={{ fontFamily: FB }}>
                {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} {currentYear}
              </div>
              <button onClick={() => {
                if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                else { setCurrentMonth(m => m + 1); }
              }} className="p-1 hover:bg-white/10 rounded-md transition-colors text-white"><ChevronRight size={16} /></button>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {days.map(d => <div key={d} className="text-[10px] text-[#666]" style={{ fontFamily: FM }}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: numDays }).map((_, i) => {
                const d = i + 1;
                const isSelected = selectedDate?.getDate() === d && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;
                return (
                  <button key={d} onClick={() => handleSelectDate(d)} className={`w-8 h-8 mx-auto rounded-full text-xs flex items-center justify-center transition-all ${isSelected ? 'bg-[#F03D4E] text-white' : 'text-[#bbb] hover:bg-white/10 hover:text-white'}`} style={{ fontFamily: FB }}>
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Time Selector */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#888]" style={{ fontFamily: FM }}>Time</span>
              <input type="time" className="bg-transparent border border-white/10 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-white/30 transition-all" style={{ colorScheme: "dark", fontFamily: FB }} value={timeStr} onChange={handleTimeChange} />
            </div>

            {/* Close Button */}
            <div className="mt-4 pt-4 border-t border-white/5 text-right">
              <button onClick={() => setOpen(false)} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg transition-colors" style={{ fontFamily: FB }}>Done</button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Create Event Page ────────────────────────────────────────────────────────
function CreateEventPage({ clubId, onCreated, getToken }: { clubId: string; onCreated: () => void; getToken: () => Promise<string | null> }) {
  const [formData, setFormData] = useState({
    title: "", desc: "", date: "", type: "free", capacity: "", venue: "", amount: "", qrCode: "", banner: "", useDefaultQr: true,
    eventType: "Solo", teamSizeLimit: "",
    bannerFile: null as File | null, qrFile: null as File | null
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!formData.title) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();

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
        fee: formData.type === "paid" ? parseInt(formData.amount) || 0 : 0,
        registrationLimit: formData.capacity ? parseInt(formData.capacity) : undefined,
        eventType: formData.eventType,
        teamSizeLimit: formData.eventType === "Team" && formData.teamSizeLimit ? parseInt(formData.teamSizeLimit) : undefined,
        clubId: clubId,
        bannerUrl,
        qrUrl,
      }, token ?? undefined);
      onCreated();
    } catch (e: any) {
      setError(e.message ?? "Failed to create event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-4xl">
      <div>
        <p className="text-[10px] tracking-[0.5em] uppercase mb-1.5" style={{ color: "#bbbbbb", fontFamily: FM }}>Publish</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>Create New Event</h1>
      </div>

      <div className="space-y-6 p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
        
        {/* Banner Upload */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Event Banner</label>
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
              <Upload size={20} className="text-[#999999]" />
              <span className="text-sm text-[#cccccc]">Click to upload banner image</span>
            </label>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Event Name</label>
            <input type="text" placeholder="e.g. CodeFest 2026" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Date & Time</label>
            <GlassDatePicker value={formData.date} onChange={v => setFormData(p => ({...p, date: v}))} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Description</label>
          <textarea placeholder="Describe your event..." className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all min-h-[100px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.desc} onChange={e => setFormData(p => ({...p, desc: e.target.value}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Venue</label>
            <input type="text" placeholder="Main Auditorium" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.venue} onChange={e => setFormData(p => ({...p, venue: e.target.value}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Capacity</label>
            <input type="number" placeholder="e.g. 200" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.capacity} onChange={e => setFormData(p => ({...p, capacity: e.target.value}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
          </div>
          <div className="space-y-1.5 relative">
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Pricing</label>
            <select className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all appearance-none" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value, amount: "", qrCode: ""}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}>
              <option value="free" style={{ background: "#111" }}>Free</option>
              <option value="paid" style={{ background: "#111" }}>Paid</option>
            </select>
            {formData.type === "free" && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -bottom-5 left-1 text-[9px] text-[#bbbbbb]" style={{ fontFamily: FM }}>
                FCFS. No approval needed.
              </motion.p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1.5 relative">
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Participation Type</label>
            <select className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all appearance-none" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.eventType} onChange={e => setFormData(p => ({...p, eventType: e.target.value, teamSizeLimit: ""}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}>
              <option value="Solo" style={{ background: "#111" }}>Solo</option>
              <option value="Team" style={{ background: "#111" }}>Team</option>
            </select>
          </div>
          <AnimatePresence>
            {formData.eventType === "Team" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5"
              >
                <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Max Team Size</label>
                <input type="number" placeholder="e.g. 4" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.teamSizeLimit} onChange={e => setFormData(p => ({...p, teamSizeLimit: e.target.value}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
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
              <div className="p-6 rounded-2xl grid md:grid-cols-2 gap-6" style={{ background: "rgba(240,61,78,0.03)", border: "1px dashed rgba(240,61,78,0.2)" }}>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Amount (INR)</label>
                  <input type="number" placeholder="e.g. 500" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} onFocus={e => e.currentTarget.style.borderColor = "rgba(240,61,78,0.4)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Payment QR Code</label>
                  <div className="flex gap-2 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <button onClick={() => setFormData(p => ({...p, useDefaultQr: true}))} className={`flex-1 py-2 text-xs rounded-lg transition-all ${formData.useDefaultQr ? "bg-white/10 text-white" : "text-[#888] hover:text-[#ccc]"}`} style={{ fontFamily: FB }}>Default QR</button>
                    <button onClick={() => setFormData(p => ({...p, useDefaultQr: false}))} className={`flex-1 py-2 text-xs rounded-lg transition-all ${!formData.useDefaultQr ? "bg-white/10 text-white" : "text-[#888] hover:text-[#ccc]"}`} style={{ fontFamily: FB }}>Custom QR</button>
                  </div>
                  {!formData.useDefaultQr && (
                    <>
                      <input type="file" accept="image/*" className="hidden" id="qr-upload" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData(p => ({...p, qrFile: file, qrCode: file.name}));
                        }
                      }} />
                      <label htmlFor="qr-upload" className="w-full rounded-xl px-4 py-3 text-sm text-[#cccccc] flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>
                        <span>{formData.qrFile ? formData.qrFile.name : "Upload QR Image..."}</span>
                        <Upload size={14} className={formData.qrFile ? "text-green-400" : ""} />
                      </label>
                    </>
                  )}
                  {formData.useDefaultQr && (
                    <div className="text-xs text-[#999999] px-2" style={{ fontFamily: FB }}>Using the default QR code from your Payment Settings.</div>
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
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={!formData.title || submitting} className="cursor-pointer px-8 py-3.5 bg-[#F03D4E] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50" style={{ fontFamily: FB }} onMouseEnter={e => !(!formData.title || submitting) && (e.currentTarget.style.boxShadow = "0 0 35px rgba(240,61,78,0.35)")} onMouseLeave={e => !(!formData.title || submitting) && (e.currentTarget.style.boxShadow = "none")}>
            {submitting ? "Publishing..." : "Publish Event"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}


// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ club, getToken, onUpdate, onLogout }: { club: any; getToken: () => Promise<string | null>; onUpdate: () => void; onLogout: () => void }) {
  const [formData, setFormData] = useState({
    name: club?.name || "",
    email: club?.email || "",
    logoUrl: club?.logoUrl || "",
    upiId: club?.upiId || "",
    qrUrl: club?.qrUrl || ""
  });
  const [qrFile, setQrFile] = useState<File | null>(null);

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
        password
      }, token || undefined);
      
      setShowPasswordPrompt(false);
      setPassword("");
      setSuccessMsg("Settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      onUpdate();
    } catch (e: any) {
      setError(e.message || "Failed to update club.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-4xl relative">
      <div>
        <p className="text-[10px] tracking-[0.5em] uppercase mb-1.5 text-[#bbbbbb]" style={{ fontFamily: FM }}>Preferences</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>Settings</h1>
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium flex items-center gap-2" style={{ fontFamily: FB }}>
            <Check size={16} />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: FB }}>Profile Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Club Name</label>
              <input type="text" placeholder="e.g. Demo Club" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Contact Email</label>
              <input type="email" placeholder="club@example.com" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Club Logo</label>
              <input type="file" accept="image/*" className="hidden" id="logo-upload-settings" onChange={e => {
                const file = e.target.files?.[0];
                if (file) setLogoFile(file);
              }} />
              <label htmlFor="logo-upload-settings" className="w-full rounded-xl px-4 py-3 text-sm text-[#cccccc] flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>
                <span>{logoFile ? logoFile.name : (formData.logoUrl ? "Logo Uploaded (Click to change)" : "Upload Logo Image...")}</span>
                <Upload size={14} className={logoFile || formData.logoUrl ? "text-green-400" : ""} />
              </label>
            </div>
          </div>
        </div>

        {/* Payment Settings Section */}
        <div id="payment-settings" className="p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: FB }}>Payment Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Default UPI ID</label>
              <input type="text" placeholder="club@upi" value={formData.upiId} onChange={e => setFormData(p => ({ ...p, upiId: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Default QR Code</label>
              <input type="file" accept="image/*" className="hidden" id="qr-upload-settings" onChange={e => {
                const file = e.target.files?.[0];
                if (file) setQrFile(file);
              }} />
              <label htmlFor="qr-upload-settings" className="w-full rounded-xl px-4 py-3 text-sm text-[#cccccc] flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>
                <span>{qrFile ? qrFile.name : (formData.qrUrl ? "QR Uploaded (Click to change)" : "Upload QR Image...")}</span>
                <Upload size={14} className={qrFile || formData.qrUrl ? "text-green-400" : ""} />
              </label>
            </div>
          </div>
        </div>

        {/* Save Button for Profile & Payment */}
        <div className="p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white" style={{ fontFamily: FB }}>Save All Settings</p>
              <p className="text-[11px] text-[#bbbbbb]" style={{ fontFamily: FM }}>Apply updates to profile and payment settings.</p>
            </div>
            <button onClick={handleSaveInit} className="px-6 py-2.5 bg-[#F03D4E] hover:bg-[#F03D4E]/80 text-white text-xs font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(240,61,78,0.3)] hover:shadow-[0_0_30px_rgba(240,61,78,0.5)]" style={{ fontFamily: FB }}>Apply Changes</button>
          </div>
        </div>
        
        <AnimatePresence>
          {showPasswordPrompt && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-3xl p-8" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: FC }}>Confirm Changes</h3>
                <p className="text-xs text-[#999] mb-6" style={{ fontFamily: FB }}>Please enter your club login password to save these updates.</p>
                
                {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl" style={{ fontFamily: FB }}>{error}</div>}

                <div className="space-y-1.5 mb-6">
                  <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Password</label>
                  <input type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
                </div>

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

        {/* Notifications Section */}
        <div className="p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
           <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: FB }}>Notifications</h2>
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-white" style={{ fontFamily: FB }}>Email Alerts</p>
                 <p className="text-[11px] text-[#bbbbbb]" style={{ fontFamily: FM }}>Get notified when someone registers for your event.</p>
               </div>
               <div className="w-10 h-5 bg-[#F03D4E] rounded-full flex items-center p-1 cursor-pointer">
                 <motion.div className="w-3 h-3 bg-white rounded-full shadow-md" style={{ marginLeft: "auto" }} />
               </div>
             </div>
             <div className="flex items-center justify-between pt-4 border-t border-white/5">
               <div>
                 <p className="text-sm text-white" style={{ fontFamily: FB }}>Marketing Updates</p>
                 <p className="text-[11px] text-[#bbbbbb]" style={{ fontFamily: FM }}>Receive updates about Spotlight features.</p>
               </div>
               <div className="w-10 h-5 bg-white/10 rounded-full flex items-center p-1 cursor-pointer">
                 <motion.div className="w-3 h-3 bg-white/50 rounded-full shadow-md" />
               </div>
             </div>
           </div>
        </div>



        {/* Privacy & Security */}
        <div className="p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
           <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: FB }}>Privacy & Security</h2>
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-white" style={{ fontFamily: FB }}>Two-Factor Authentication</p>
                 <p className="text-[11px] text-[#bbbbbb]" style={{ fontFamily: FM }}>Add an extra layer of security to your account.</p>
               </div>
               <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-all" style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>Enable 2FA</button>
             </div>
             <div className="flex items-center justify-between pt-4 border-t border-white/5">
               <div>
                 <p className="text-sm text-white" style={{ fontFamily: FB }}>Change Password</p>
                 <p className="text-[11px] text-[#bbbbbb]" style={{ fontFamily: FM }}>Update your login credentials securely.</p>
               </div>
               <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-all" style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>Update</button>
             </div>
           </div>
        </div>

        {/* Logout */}
        <div className="p-8 rounded-3xl flex items-center justify-between" style={{ background: "rgba(240,61,78,0.05)", border: "1px solid rgba(240,61,78,0.1)" }}>
          <div>
            <p className="text-sm font-medium text-[#F03D4E]" style={{ fontFamily: FB }}>Sign Out</p>
            <p className="text-[11px] text-[#bbbbbb]" style={{ fontFamily: FM }}>End your current session.</p>
          </div>
          <button onClick={onLogout} className="px-6 py-2.5 bg-[#F03D4E]/10 hover:bg-[#F03D4E]/20 text-[#F03D4E] text-xs font-semibold rounded-lg transition-all" style={{ border: "1px solid rgba(240,61,78,0.2)", fontFamily: FB }}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

// ─── Teams Page (stub — full implementation coming) ──────────────────────────
function TeamsPage() {
  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-4xl">
      <div>
        <p className="text-[10px] tracking-[0.5em] uppercase mb-1.5 text-[#bbbbbb]" style={{ fontFamily: FM }}>Management</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>Teams</h1>
      </div>
      <div className="p-10 rounded-2xl text-center" style={{ border: "1px dashed rgba(255,255,255,0.07)" }}>
        <p className="text-sm text-[#555]" style={{ fontFamily: FB }}>Team management coming soon.</p>
      </div>
    </div>
  );
}

// ─── Club Onboarding Page ─────────────────────────────────────────────────────
interface ClubOnboardingPageProps {
  onSuccess: (clubId: string) => void;
}

function ClubOnboardingPage({ onSuccess }: ClubOnboardingPageProps) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const [formData, setFormData] = useState({ name: "", email: "", logoUrl: "", password: "" });
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
    if (!formData.name || !formData.email || !formData.password) {
      setError("Club Name, Contact Email, and Mobile Login Password are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await createClub({
        name: formData.name,
        email: formData.email,
        logoUrl: formData.logoUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        clerkUserId: userId!,
        password: formData.password,
      }, token ?? undefined);

      if (res.club && res.club.id) {
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
          <p className="text-[10px] tracking-[0.5em] uppercase mb-2 text-[#bbbbbb]" style={{ fontFamily: FM }}>Step 1 · Onboarding</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2" style={{ fontFamily: FC }}>Set Up Your Club</h2>
          <p className="text-xs text-[#999999]" style={{ fontFamily: FB }}>Welcome to Spotlight! Provide your club details to activate the dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Club Name</label>
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
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Contact Email</label>
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
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Club Logo URL (Optional)</label>
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
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Mobile App Login Password</label>
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

const DASH_NAV = [
  { icon: LayoutDashboard, label: "Overview",  id: "overview" },
  { icon: Calendar,        label: "Events",    id: "events"   },
  
  { icon: Archive,         label: "Archive",   id: "archive"  },
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
    setAllRegistrations,
    getToken,
  } = useSpotlightData();
  const currentClub = clubs.find((c: any) => c.id === profile?.clubId);
  const name = currentClub?.name ?? profile?.fullName ?? profile?.full_name ?? userEmail.split("@")[0] ?? 'Admin';

  // Parse initial tab from search params
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "overview";
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab());

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

  // Custom setter that updates URL history
  const setActiveTab = (tab: string, pushHistory = true, eventId?: string, sTeams = false) => {
    setActiveTabState(tab);
    setSelectedEventId(eventId || null);
    setShowTeams(sTeams);
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


  // Sync state on popstate (browser back/forward button)
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
      if (!profile.clubId) {
        setActiveTab("onboarding", false);
      } else {
        const params = new URLSearchParams(window.location.search);
        if (!params.get("tab") || activeTab === "onboarding") {
          setActiveTab("overview", false);
        }
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "rgba(5,5,5,0.98)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F03D4E] border-t-transparent animate-spin" />
          <p className="text-xs tracking-[0.4em] uppercase text-[#555]" style={{ fontFamily: FM }}>Loading Dashboard</p>
        </div>
      </div>
    );
  }

  if (activeTab === "onboarding") {
    return (
      <ClubOnboardingPage 
        onSuccess={async (newClubId) => {
          await refreshEvents();
          setActiveTab("overview");
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ position: "relative", zIndex: 10 }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col h-screen"
        style={{ background: "rgba(5,5,5,0.97)", borderRight: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(24px)" }}
      >
        <div className="px-6 pt-6 pb-5 flex-shrink-0">
          <span className="text-[13px] tracking-[0.32em] font-semibold" style={{ fontFamily: FC, color: "rgba(255,255,255,0.82)" }}>SPOTLIGHT</span>
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
        <div className="p-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-[#F03D4E]">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.75)", fontFamily: FB }}>{name}</p>
              <p className="text-[9px]" style={{ color: "#bbbbbb", fontFamily: FM }}>Admin</p>
            </div>
          </div>
          <button onClick={onSignOut}
            className="w-full py-2 text-xs rounded-lg transition-all duration-300"
            style={{ color: "#bbbbbb", border: "1px solid rgba(255,255,255,0.03)", fontFamily: FB }}
            onMouseEnter={e => { e.currentTarget.style.color = "#cccccc"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#bbbbbb"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)"; }}
          >Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto relative" style={{ background: "transparent" }}>
        <AnimatePresence mode="wait">
          {activeTab === "create" && (
            <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <CreateEventPage clubId={profile?.clubId ?? ""} onCreated={async () => { await refreshEvents(); setActiveTab("overview"); }} getToken={getToken} />
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
               <SettingsPage club={clubs.find((c: any) => c.id === profile?.clubId)} getToken={getToken} onUpdate={refreshEvents} onLogout={onSignOut} />
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
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────
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
  // Relative time helper
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
    <div className="p-8 lg:p-10 space-y-10 max-w-7xl">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative p-8 rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(255,255,255,0.03) 0%, transparent 60%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent 55%)" }} />
        <p className="text-[10px] tracking-[0.5em] uppercase mb-3" style={{ color: "#bbbbbb", fontFamily: FM }}>Dashboard · Synced</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>
          Welcome back, {name}.
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: "#cccccc", fontFamily: FB }}>Your dashboard is synced. Everything looks on track.</p>
      </motion.div>

      {/* KPI Cards — live data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Events",          value: totalEvents,        suffix: "",  sub: `${clubEvents.filter(e => e.status === 'upcoming').length} upcoming`,  delay: 0    },
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
            <p className="text-[10px] tracking-[0.42em] uppercase mb-5" style={{ color: "#bbbbbb", fontFamily: FM }}>{k.label}</p>
            <p className="text-5xl font-semibold text-white mb-2.5" style={{ fontFamily: FB }}>
              <AnimatedCounter target={k.value} suffix={k.suffix} />
            </p>
            <p className="text-xs" style={{ color: "#999999", fontFamily: FB }}>{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Upcoming Events strip — live */}
      <div>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] tracking-[0.5em] uppercase mb-1" style={{ color: "#bbbbbb", fontFamily: FM }}>Upcoming</p>
            <h2 className="text-xl font-semibold text-white" style={{ fontFamily: FC }}>Events</h2>
          </div>
          <button className="flex items-center gap-1 text-xs transition-colors duration-300" style={{ color: "#999999", fontFamily: FB }}
            onClick={() => onNavigate("events")}
            onMouseEnter={e => (e.currentTarget.style.color = "#dddddd")}
            onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
          >View all <ChevronRight size={12} /></button>
        </div>

        {clubEvents.filter(e => e.status === 'upcoming').length === 0 ? (
          <div className="p-8 rounded-2xl text-center text-sm text-[#555]" style={{ border: "1px dashed rgba(255,255,255,0.05)", fontFamily: FB }}>
            No upcoming events yet. <button onClick={() => onNavigate("create")} className="text-[#F03D4E] hover:underline">Create one →</button>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory" style={{ scrollbarWidth: "none", margin: "0 -2rem", padding: "0 2rem" }}>
            {clubEvents.filter(e => e.status === 'upcoming').map((ev, i) => (
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
                  <span className="text-[9px] px-2.5 py-1 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.07)", color: "#cccccc", fontFamily: FM }}>{ev.club}</span>
                  <span className="text-[9px] px-2.5 py-1 rounded-full" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#aaaaaa", fontFamily: FM }}>Upcoming</span>
                </div>
                <h3 className="text-white font-semibold mb-1 leading-tight text-sm">{ev.title}</h3>
                <div className="flex items-center gap-3 mb-4" style={{ color: "#999999" }}>
                  <span className="flex items-center gap-1 text-[9px]"><Calendar size={9} />{ev.date ?? 'TBD'}</span>
                  <span className="flex items-center gap-1 text-[9px]"><MapPin size={9} />{ev.venue}</span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-1.5" style={{ color: "#bbbbbb", fontFamily: FM }}>
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
          <p className="text-[10px] tracking-[0.5em] uppercase mb-5" style={{ color: "#bbbbbb", fontFamily: FM }}>Quick Actions</p>
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
                <p className="text-xs" style={{ color: "#999999", fontFamily: FB }}>{qa.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div>
          <p className="text-[10px] tracking-[0.5em] uppercase mb-5" style={{ color: "#bbbbbb", fontFamily: FM }}>Recent Activity</p>
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "#555", fontFamily: FB }}>No activity yet.</p>
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
                    <p className="text-xs leading-snug" style={{ color: "#cccccc", fontFamily: FB }}>
                      <span className="text-white/80">{a.user?.name ?? a.team?.name ?? 'Someone'}</span>
                      {" signed up for "}
                      <span className="text-white/80">{a.eventTitle}</span>
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: "#777777", fontFamily: FM }}>{timeAgo(a.created_at)}</p>
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

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { isSignedIn: isClerkSignedIn, isLoaded: isClerkLoaded, signOut: clerkSignOut } = useAuth();
  const [localToken, setLocalToken] = useState<string | null>(() => localStorage.getItem("spotlight_token"));
  const isLocalSignedIn = !!localToken;
  const isSignedIn = isClerkSignedIn || isLocalSignedIn;
  const { user } = useUser();

  // Helper to parse initial search parameters
  // If already signed in on load, always start on dashboard to prevent refresh-to-login flicker
  const getInitialParams = () => {
    if (typeof window === "undefined") return { view: "landing" as View, authTab: "login" as AuthTab };
    const params = new URLSearchParams(window.location.search);
    const v = (params.get("view") as View) || "landing";
    const t = (params.get("authTab") as AuthTab) || "login";
    // If already authenticated (local token present), always start on dashboard
    const hasLocalToken = !!localStorage.getItem("spotlight_token");
    if (hasLocalToken && v !== "auth") return { view: "dashboard" as View, authTab: t };
    return { view: v, authTab: t };
  };

  const initial = getInitialParams();
  const [view,      setView]      = useState<View>(initial.view);
  const [authTab,   setAuthTab]   = useState<AuthTab>(initial.authTab);
  const [mousePos,  setMousePos]  = useState({ x: -9999, y: -9999 });

  // Sync state changes with the URL and push to browser history
  const updateNavigation = (newView: View, newAuthTab?: AuthTab) => {
    setView(newView);
    if (newAuthTab) setAuthTab(newAuthTab);

    const url = new URL(window.location.href);
    url.searchParams.set("view", newView);
    if (newView === "auth" && (newAuthTab || authTab)) {
      url.searchParams.set("authTab", newAuthTab || authTab);
    } else {
      url.searchParams.delete("authTab");
    }

    // Keep active tab synced if moving to dashboard
    if (newView === "dashboard") {
      const tab = url.searchParams.get("tab") || "overview";
      url.searchParams.set("tab", tab);
    } else {
      url.searchParams.delete("tab");
      url.searchParams.delete("eventId");
      url.searchParams.delete("showTeams");
    }

    const currentParams = new URLSearchParams(window.location.search);
    const hasChanged = currentParams.get("view") !== newView || 
                       (newView === "auth" && currentParams.get("authTab") !== (newAuthTab || authTab));

    if (hasChanged) {
      window.history.pushState({ view: newView, authTab: newAuthTab || authTab }, "", url.toString());
    }
  };

  // Sync state on popstate (browser back/forward or mobile swipe gestures)
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

  // Auto-navigate to dashboard when signed in (covers both Clerk login and local login)
  // Triggers from any non-dashboard view so after login you always end up on dashboard
  useEffect(() => {
    if (isSignedIn && (view === "auth" || view === "landing")) {
      updateNavigation("dashboard");
    }
  }, [isSignedIn, view]);

  useEffect(() => {
    const fn = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = view === "dashboard" ? "hidden" : "";
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
    url.search = ""; // clear all routing parameters
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

  // Wait for Clerk to resolve auth state before rendering.
  // Without this, on refresh Clerk briefly shows isSignedIn=undefined and the
  // landing/auth page flashes before the effect can redirect to dashboard.
  if (!isClerkLoaded && !isLocalSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "rgba(5,5,5,0.98)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F03D4E] border-t-transparent animate-spin" />
          <p className="text-xs tracking-[0.4em] uppercase" style={{ color: "#555", fontFamily: FM }}>Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: FB, height: view === "dashboard" ? "100vh" : "auto" }}
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
          onBack={() => setView("landing")} 
          onLocalSignIn={(token, profile) => {
            localStorage.setItem("spotlight_token", token);
            localStorage.setItem("spotlight_profile", JSON.stringify(profile));
            setLocalToken(token);
          }}
        />
      )}
      {(view === "dashboard" || (isSignedIn && view !== "auth" && view !== "landing")) && (
        <motion.div key="dash" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} style={{ height: "100vh" }}
        >
          <DashboardPage userEmail={userEmail} onSignOut={doSignOut} />
        </motion.div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; }
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
