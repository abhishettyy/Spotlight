import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, Calendar, Users, CreditCard, Plus, MapPin,
  ChevronRight, Eye, EyeOff, LayoutDashboard, Archive,
  CheckCircle, Zap, Shield, ChevronLeft, Check, Upload,
  X, Key, Copy, Settings
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
const FC = "'Cinzel', serif";
const FM = "'JetBrains Mono', monospace";
const FB = "'Manrope', sans-serif";

type View = "landing" | "auth" | "dashboard";
type AuthTab = "login" | "register";

// ─── Data ────────────────────────────────────────────────────────────────────
let globalEvents = [
  { id: 1, title: "UI/UX Workshop",  date: "Jan 28, 2026", venue: "Innovation Hub",   capacity: 50,  registered: 35,  type: "free", club: "GDSC",         status: "previous" },
  { id: 2, title: "Hackathon 2026",  date: "Feb 14, 2026", venue: "Main Auditorium",  capacity: 200, registered: 156, type: "paid", club: "TechClub",      status: "upcoming" },
  { id: 3, title: "Cultural Fest",   date: "Mar 5, 2026",  venue: "Open Ground",      capacity: 500, registered: 289, type: "free", club: "Cultural Comm.", status: "upcoming" },
  { id: 4, title: "Startup Summit",  date: "Mar 20, 2026", venue: "Conference Hall",  capacity: 150, registered: 98,  type: "paid", club: "E-Cell",        status: "upcoming" },
  { id: 5, title: "Design Sprint",   date: "Apr 2, 2026",  venue: "Design Studio",   capacity: 30,  registered: 27,  type: "free", club: "DesignHub",     status: "previous" },
];

let eventsListeners: (() => void)[] = [];
function addEvent(ev: any) {
  globalEvents = [...globalEvents, ev];
  eventsListeners.forEach(l => l());
}
function useEvents() {
  const [events, setEvents] = useState(globalEvents);
  useEffect(() => {
    const listener = () => setEvents(globalEvents);
    eventsListeners.push(listener);
    return () => { eventsListeners = eventsListeners.filter(l => l !== listener); };
  }, []);
  return events;
}

const ACTIVITY = [
  { id: 1, type: "reg",     text: "Kavya Sharma registered for UI/UX Workshop",          time: "2 min ago"  },
  { id: 2, type: "pay",     text: "Payment verified — Aryan Shetty · Hackathon 2026",     time: "15 min ago" },
  { id: 3, type: "team",    text: "Team 'Pixel Pushers' created for Hackathon 2026",       time: "1h ago"     },
  { id: 4, type: "approve", text: "Approved — Rohan Mehta · Startup Summit",              time: "2h ago"     },
  { id: 5, type: "reg",     text: "Dev Patel registered for Design Sprint",               time: "3h ago"     },
  { id: 6, type: "pay",     text: "Payment screenshot submitted — Sneha Rao",             time: "5h ago"     },
];

const QUICK_ACTIONS = [
  { id: "create",          icon: Plus,        label: "Create Event",     desc: "Launch a new event in minutes"   },
  { id: "events",          icon: CheckCircle, label: "Review Payments",  desc: "Approve pending verifications"   },
  { id: "teams",           icon: Users,       label: "Manage Teams",     desc: "Oversee team registrations"      },
  { id: "settings",        icon: CreditCard,  label: "Payment Settings", desc: "Configure QR and UPI details"   },
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
          { label: "● 48 LIVE EVENTS", delay: 0, x: "left-12 top-36", y: [0, -14, 0], d: 5.5 },
          { label: "2,400+ REGISTRATIONS", delay: 1.5, x: "right-16 top-44", y: [0, 12, 0], d: 7 },
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
              className="group flex items-center gap-3 px-9 py-4 text-sm font-semibold text-white bg-[#F03D4E] rounded-full transition-all duration-500"
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 40px rgba(240,61,78,0.4)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              Enter Dashboard
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-300" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={onRegister}
              className="px-9 py-4 text-sm rounded-full text-white/55 hover:text-white transition-all duration-500"
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

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage({ tab, onTabChange, onLogin, onBack }: {
  tab: AuthTab; onTabChange: (t: AuthTab) => void;
  onLogin: (email: string) => void; onBack: () => void;
}) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [clubName, setClubName] = useState("");
  const [contact, setContact]  = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [error, setError]      = useState("");
  const [regDone, setRegDone]  = useState(false);

  const handleLogin = () => {
    if (!email || !password) { setError("Enter any email and password to continue."); return; }
    setError(""); onLogin(email);
  };

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

      <motion.div
        key={tab}
        initial={{ opacity: 0, scale: 0.93, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-8 rounded-3xl relative"
        style={{ background: "#070707", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 40px 120px rgba(0,0,0,0.8)" }}
      >
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }} />
        <p className="text-[10px] tracking-[0.55em] uppercase mb-7" style={{ color: "#bbbbbb", fontFamily: FM }}>SPOTLIGHT</p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-8" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {(["login", "register"] as AuthTab[]).map(t => (
            <button key={t} onClick={() => { onTabChange(t); setError(""); setRegDone(false); }}
              className="flex-1 py-2.5 text-sm rounded-lg font-medium transition-all duration-300"
              style={{ background: tab === t ? "#fff" : "transparent", color: tab === t ? "#000" : "#aaaaaa", fontFamily: FB }}
            >{t === "login" ? "Sign In" : "Register Club"}</button>
          ))}
        </div>

        {tab === "login" ? (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold text-white mb-7" style={{ fontFamily: FC }}>Welcome back.</h2>

            <AuthInput label="Email" type="email" placeholder="admin@club.edu" value={email} onChange={setEmail} />
            <div className="relative">
              <AuthInput label="Password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={setPassword} />
              <button onClick={() => setShowPw(p => !p)}
                className="absolute right-4 bottom-3.5 transition-colors duration-200"
                style={{ color: "#cccccc" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#cccccc")}
                onMouseLeave={e => (e.currentTarget.style.color = "#aaaaaa")}
              >{showPw ? <EyeOff size={13} /> : <Eye size={13} />}</button>
            </div>

            {error && <p className="text-xs text-center py-2.5 rounded-xl" style={{ color: "#e05555", background: "rgba(224,85,85,0.07)", fontFamily: FM }}>{error}</p>}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleLogin}
              className="w-full py-3.5 bg-[#F03D4E] text-white text-sm font-semibold rounded-xl mt-1 transition-all duration-500"
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 35px rgba(240,61,78,0.35)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              style={{ fontFamily: FB }}
            >Sign in to Spotlight</motion.button>
            
            <div className="relative mt-2 mb-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} /></div>
              <div className="relative text-center"><span className="px-3 text-[10px]" style={{ background: "#070707", color: "#777777", fontFamily: FM }}>or continue with</span></div>
            </div>

            <button
              className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2.5 transition-all duration-300 mb-2"
              style={{ border: "1px solid rgba(255,255,255,0.07)", color: "#bbbbbb", fontFamily: FB }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; e.currentTarget.style.color = "#dddddd"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#bbbbbb"; }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-xs pt-1" style={{ color: "#bbbbbb", fontFamily: FM }}>Use any email + password · Demo mode</p>
          </div>

        ) : regDone ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-5">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            ><Check size={18} style={{ color: "rgba(255,255,255,0.5)" }} /></motion.div>
            <h2 className="text-xl font-semibold text-white" style={{ fontFamily: FC }}>Submitted.</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#cccccc", fontFamily: FB }}>
              Your club is <span style={{ color: "#cccccc" }}>Pending Verification</span>.<br />An admin will review within 24 hours.
            </p>
            <button onClick={() => { setRegDone(false); onTabChange("login"); }}
              className="text-xs underline transition-colors duration-200" style={{ color: "#999999" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#666")}
              onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
            >Back to sign in</button>
          </motion.div>

        ) : (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold text-white mb-7" style={{ fontFamily: FC }}>Register Your Club.</h2>
            <div className="space-y-4">
              <AuthInput label="Club Name" type="text" placeholder="e.g. GDSC BITS Pilani" value={clubName} onChange={setClubName} />
              <AuthInput label="Primary Contact" type="email" placeholder="contact@club.edu" value={contact} onChange={setContact} />
              <div className="grid grid-cols-2 gap-3">
                <AuthInput label="Username" type="text" placeholder="admin_gdsc" value={regUsername} onChange={setRegUsername} />
                <AuthInput label="Password" type="password" placeholder="••••••••" value={regPassword} onChange={setRegPassword} />
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setRegDone(true)}
              className="w-full py-3.5 bg-[#F03D4E] text-white text-sm font-semibold rounded-xl transition-all duration-500"
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 35px rgba(240,61,78,0.35)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              style={{ fontFamily: FB }}
            >Register Club</motion.button>
            <p className="text-xs text-center" style={{ color: "#bbbbbb", fontFamily: FM }}>
              Status: <span style={{ color: "#cccccc" }}>Pending Verification</span> until admin approves.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Events Page ──────────────────────────────────────────────────────────────
function EventsPage() {
  const EVENTS = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [registrations, setRegistrations] = useState([
    { id: 1, eventId: 2, name: "Rahul Verma", email: "rahul@example.edu", status: "pending", date: "10 mins ago" },
    { id: 2, eventId: 2, name: "Anjali Nair", email: "anjali@example.edu", status: "pending", date: "30 mins ago" },
    { id: 3, eventId: 2, name: "Vikram Singh", email: "vikram@example.edu", status: "approved", date: "2 hours ago" },
    { id: 4, eventId: 1, name: "Priya Sharma", email: "priya@example.edu", status: "pending", date: "5 mins ago" },
    { id: 5, eventId: 3, name: "Amit Kumar", email: "amit@example.edu", status: "pending", date: "1 day ago" },
  ]);

  const activeEvent = EVENTS.find(e => e.id === selectedEventId);
  const eventRegs = registrations.filter(r => r.eventId === selectedEventId);
  const pending = eventRegs.filter(r => r.status === "pending");
  const approved = eventRegs.filter(r => r.status === "approved");

  const handleApprove = (id: number) => {
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
  };
  const handleReject = (id: number) => {
    setRegistrations(prev => prev.filter(r => r.id !== id));
  };

  if (activeEvent) {
    return (
      <div className="p-8 lg:p-10 space-y-8 max-w-6xl">
        <button onClick={() => setSelectedEventId(null)}
          className="flex items-center gap-2 text-sm transition-all duration-300"
          style={{ color: "#999999", fontFamily: FB }}
          onMouseEnter={e => (e.currentTarget.style.color = "#eeeeee")}
          onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
        ><ChevronLeft size={14} /> Back to Events</button>

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
            { label: "Total Capacity", value: activeEvent.capacity },
            { label: "Registered", value: activeEvent.registered },
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
                        <p className="text-sm font-medium text-white/90" style={{ fontFamily: FB }}>{req.name}</p>
                        <p className="text-[10px] mt-0.5 text-[#cccccc]" style={{ fontFamily: FM }}>{req.email} · {req.date}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleApprove(req.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"><Check size={14} /></button>
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
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/50">{req.name.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-medium text-white/70" style={{ fontFamily: FB }}>{req.name}</p>
                          <p className="text-[10px] mt-0.5 text-[#bbbbbb]" style={{ fontFamily: FM }}>{req.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-green-500/70 uppercase tracking-widest" style={{ fontFamily: FM }}>Approved</span>
                   </motion.div>
                 ))}
               </AnimatePresence>
             </div>
           </div>
        </div>
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
              const fill = (ev.registered / ev.capacity) * 100;
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
                    <span className="flex items-center gap-1.5 text-xs"><Calendar size={12} />{ev.date}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-2" style={{ color: "#cccccc", fontFamily: FM }}>
                      <span>{ev.registered} registered</span><span>{ev.capacity} cap</span>
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
          </div>
        </div>

        {/* Previous Events */}
        <div>
          <h2 className="text-lg font-medium text-[#bbbbbb] mb-5" style={{ fontFamily: FB }}>Previous Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {EVENTS.filter(e => e.status === "previous").map((ev, i) => {
              const fill = (ev.registered / ev.capacity) * 100;
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
                    <span className="text-[9px] px-2.5 py-1 rounded-full" style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.03)",
                      color: "#666666",
                      fontFamily: FM,
                    }}>Ended</span>
                  </div>
                  <h3 className="text-[#cccccc] font-semibold mb-2 leading-tight text-lg transition-colors">{ev.title}</h3>
                  <div className="flex items-center gap-3 mb-6" style={{ color: "#666666" }}>
                    <span className="flex items-center gap-1.5 text-xs"><Calendar size={12} />{ev.date}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-2" style={{ color: "#666666", fontFamily: FM }}>
                      <span>{ev.registered} registered</span><span>{ev.capacity} cap</span>
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
function CreateEventPage({ onCreated }: { onCreated: () => void }) {
  const [formData, setFormData] = useState({
    title: "", desc: "", date: "", type: "free", capacity: "", venue: "", amount: "", qrCode: "", banner: "", useDefaultQr: true,
    bannerFile: null as File | null, qrFile: null as File | null
  });
  
  const handleSubmit = () => {
    addEvent({
      id: Math.floor(Math.random() * 10000),
      title: formData.title,
      date: formData.date,
      venue: formData.venue || "TBA",
      capacity: parseInt(formData.capacity) || 0,
      registered: 0,
      type: formData.type,
      club: "Demo Club",
      status: "upcoming",
      amount: formData.amount,
      qrCode: formData.qrCode,
      banner: formData.banner,
      useDefaultQr: formData.useDefaultQr
    });
    onCreated();
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
            <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Event Type</label>
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
        
        <div className="pt-4 mt-8">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={!formData.title} className="px-8 py-3.5 bg-[#F03D4E] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50" style={{ fontFamily: FB }} onMouseEnter={e => !(!formData.title) && (e.currentTarget.style.boxShadow = "0 0 35px rgba(240,61,78,0.35)")} onMouseLeave={e => !(!formData.title) && (e.currentTarget.style.boxShadow = "none")}>Publish Event</motion.button>
        </div>
      </div>
    </div>
  );
}


// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="p-8 lg:p-10 space-y-8 max-w-4xl">
      <div>
        <p className="text-[10px] tracking-[0.5em] uppercase mb-1.5 text-[#bbbbbb]" style={{ fontFamily: FM }}>Preferences</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white" style={{ fontFamily: FC }}>Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: FB }}>Profile Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Club Name</label>
              <input type="text" placeholder="e.g. Demo Club" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Contact Email</label>
              <input type="email" placeholder="club@example.com" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
          </div>
          <div className="pt-6">
            <button className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-all" style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>Save Changes</button>
          </div>
        </div>

        {/* Payment Settings Section */}
        <div id="payment-settings" className="p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: FB }}>Payment Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Default UPI ID</label>
              <input type="text" placeholder="club@upi" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#bbbbbb] block" style={{ fontFamily: FM }}>Default QR Code</label>
              <div className="w-full rounded-xl px-4 py-3 text-sm text-[#cccccc] flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>
                <span>Upload QR Image...</span>
                <Upload size={14} />
              </div>
            </div>
          </div>
          <div className="pt-6">
            <button className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-all" style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: FB }}>Save Payment Methods</button>
          </div>
        </div>

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

// ─── Dashboard ────────────────────────────────────────────────────────────────

const DASH_NAV = [
  { icon: LayoutDashboard, label: "Overview",  id: "overview" },
  { icon: Calendar,        label: "Events",    id: "events"   },
  
  { icon: Archive,         label: "Archive",   id: "archive"  },
  { icon: Settings,        label: "Settings",  id: "settings" },
];

function DashboardPage({ userEmail, onSignOut }: { userEmail: string; onSignOut: () => void }) {
  const name = userEmail.split("@")[0];
  const [activeTab, setActiveTab] = useState("overview");

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
               <CreateEventPage onCreated={() => setActiveTab("events")} />
            </motion.div>
          )}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
               <OverviewPage name={name} onNavigate={setActiveTab} />
            </motion.div>
          )}
          {activeTab === "events" && (
            <motion.div key="events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
               <EventsPage />
            </motion.div>
          )}
          {activeTab === "teams" && (
            <motion.div key="teams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
               <TeamsPage />
            </motion.div>
          )}
          {activeTab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
               <SettingsPage onLogout={onSignOut} />
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
function OverviewPage({ name, onNavigate }: { name: string; onNavigate: (tab: string) => void }) {
  const EVENTS = useEvents();
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Active Events",       value: 5,   suffix: "",  sub: "2 live right now",      delay: 0    },
          { label: "Total Registrations", value: 605, suffix: "+", sub: "Across all events",     delay: 0.08 },
          { label: "Pending Review",      value: 3,   suffix: "",  sub: "Payment verifications", delay: 0.16 },
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

      {/* Upcoming Events */}
      <div>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] tracking-[0.5em] uppercase mb-1" style={{ color: "#bbbbbb", fontFamily: FM }}>Upcoming</p>
            <h2 className="text-xl font-semibold text-white" style={{ fontFamily: FC }}>Events</h2>
          </div>
          <button className="flex items-center gap-1 text-xs transition-colors duration-300" style={{ color: "#999999", fontFamily: FB }}
            onMouseEnter={e => (e.currentTarget.style.color = "#dddddd")}
            onMouseLeave={e => (e.currentTarget.style.color = "#999999")}
          >View all <ChevronRight size={12} /></button>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory" style={{ scrollbarWidth: "none", margin: "0 -2rem", padding: "0 2rem" }}>
          {EVENTS.map((ev, i) => {
            const fill = (ev.registered / ev.capacity) * 100;
            return (
              <motion.div key={ev.id}
                initial={{ opacity: 0, x: 35 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="flex-shrink-0 w-[340px] p-6 rounded-3xl cursor-pointer snap-start"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.45s ease" }}
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
                  <span className="text-[9px] px-2.5 py-1 rounded-full" style={{
                    background: "transparent",
                    border:     "1px solid rgba(255,255,255,0.06)",
                    color:      ev.status === "previous" ? "#666666" : "#aaaaaa",
                    fontFamily: FM,
                  }}>{ev.status === "previous" ? "Ended" : "Upcoming"}</span>
                </div>
                <h3 className="text-white font-semibold mb-1 leading-tight text-sm">{ev.title}</h3>
                <div className="flex items-center gap-3 mb-4" style={{ color: "#999999" }}>
                  <span className="flex items-center gap-1 text-[9px]"><Calendar size={9} />{ev.date}</span>
                  <span className="flex items-center gap-1 text-[9px]"><MapPin size={9} />{ev.venue}</span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-1.5" style={{ color: "#bbbbbb", fontFamily: FM }}>
                    <span>{ev.registered} registered</span><span>{ev.capacity} cap</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, rgba(240,61,78,0.4), rgba(240,61,78,1))" }}
                      initial={{ width: 0 }} animate={{ width: `${fill}%` }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 + 0.3 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions + Activity */}
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

        {/* Activity */}
        <div>
          <p className="text-[10px] tracking-[0.5em] uppercase mb-5" style={{ color: "#bbbbbb", fontFamily: FM }}>Recent Activity</p>
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {ACTIVITY.map((a, i) => (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex items-start gap-2.5 py-3 px-2 rounded-lg transition-all duration-300"
                style={{ borderBottom: i < ACTIVITY.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.022)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{
                  background:
                    a.type === "pay"     ? "rgba(255,255,255,0.55)" :
                    a.type === "approve" ? "rgba(255,255,255,0.38)" :
                    a.type === "team"    ? "rgba(255,255,255,0.22)" :
                                          "rgba(255,255,255,0.12)",
                }} />
                <div>
                  <p className="text-xs leading-snug" style={{ color: "#cccccc", fontFamily: FB }}>{a.text}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: "#777777", fontFamily: FM }}>{a.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view,      setView]      = useState<View>("landing");
  const [authTab,   setAuthTab]   = useState<AuthTab>("login");
  const [mousePos,  setMousePos]  = useState({ x: -9999, y: -9999 });
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fn = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = view === "dashboard" ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [view]);

  const goAuth    = (tab: AuthTab = "login") => { setAuthTab(tab); setView("auth"); };
  const doLogin   = (email: string) => { setUserEmail(email); setView("dashboard"); };
  const doSignOut = () => { setUserEmail(""); setView("landing"); };

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

      {view === "landing" && <LandingPage onEnter={() => goAuth("login")} onRegister={() => goAuth("register")} />}
      {view === "auth"    && <AuthPage tab={authTab} onTabChange={setAuthTab} onLogin={doLogin} onBack={() => setView("landing")} />}
      {view === "dashboard" && (
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
