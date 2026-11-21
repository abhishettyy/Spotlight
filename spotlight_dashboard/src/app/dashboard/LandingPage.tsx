import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Zap, Shield, X, Mail } from "lucide-react";
import { fetchPublicStats } from "../api";
import { useTheme, ThemeToggle } from "../theme";
import { STUDENT_LOGIN_URL, FC, F_LOGO, FM, FB } from "./shared";
import { openAdminConsole } from "../siteNavigation";

export const FEATURES = [
  { icon: Calendar, title: "Liquid Event Creation", desc: "Craft events with a fluid step-by-step builder. From concept to live in under two minutes."      },
  { icon: Shield,   title: "Free Registration",     desc: "Every event is free. Students register in a tap and are confirmed instantly."                  },
  { icon: Zap,      title: "Smart Publishing",      desc: "Events go live as soon as you publish them, with live registration counts." },
];


export function LandingPage({ onEnter, onRegister }: { onEnter: () => void; onRegister: () => void }) {
  const { theme, isDark } = useTheme();
  const [scrollY, setScrollY] = useState(0);
  const [stats, setStats] = useState({
    liveEvents: 0,
    registrations: 0,
    clubs: 0,
    totalEvents: 0,
    totalStudents: 0
  });
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'contact' | null>(null);
  const [leaving, setLeaving] = useState(false);

  const leaveTo = (url: string) => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => { window.location.href = url; }, 200);
  };

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) setLeaving(false); };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("top-sentinel");
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrolled(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div id="ls" animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: 0.2 }} className="h-[100dvh] min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex flex-col relative bg-background touch-pan-y overscroll-none transition-colors duration-300">
      <div id="top-sentinel" className="absolute top-0 left-0 w-full h-10 pointer-events-none z-0" />

      <nav className="fixed top-0 left-0 right-0 z-30 transition-all duration-500"
        style={{
          background:   scrolled ? (isDark ? "rgba(5,5,5,0.92)" : "rgba(245,244,242,0.88)") : (isDark ? "rgba(5,5,5,0.2)" : "rgba(245,244,242,0.6)"),
          backdropFilter: scrolled ? "blur(20px)" : "blur(8px)",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "blur(8px)",
          borderBottom: scrolled ? (isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)") : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img src="/rit-emblem.png" alt="Ramaiah Emblem" className="h-8 sm:h-10 w-auto object-contain" />
            <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.25em] font-semibold whitespace-nowrap transition-colors" style={{ fontFamily: F_LOGO, color: isDark ? "#ffffff" : "var(--sk-fg)" }}>SPOTLIGHT-RIT</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button onClick={onEnter}
              className="text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2 rounded-full transition-all duration-400 cursor-pointer active:scale-95 font-medium"
              style={{
                border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                background: isDark ? "var(--sk-surface)" : "var(--sk-raised)",
                color: isDark ? "rgba(255,255,255,0.9)" : "var(--sk-fg)",
              }}
            >Sign In</button>
          </div>
        </div>
      </nav>

      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div style={{
          position: "absolute", top: "-10%", left: "50%",
          transform: "translateX(-50%)",
          width: "700px", height: "900px",
          background: isDark
            ? "conic-gradient(from 174deg at 50% 0%, transparent 0deg, var(--sk-surface) 6deg, transparent 12deg)"
            : "conic-gradient(from 174deg at 50% 0%, transparent 0deg, rgba(222,63,15,0.04) 6deg, transparent 18deg)",
          filter: "blur(40px)",
          animation: "beamSweep 10s ease-in-out infinite",
        }} />
      </div>

      <div className="flex-1 flex flex-col justify-between z-10 relative min-h-full h-full">
        
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-8 lg:px-12 w-full max-w-7xl mx-auto pt-16 sm:pt-20 pb-4">
          <section className="flex-1 flex flex-col items-center justify-center text-center w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center w-full my-auto"
            >
              <motion.h1
                initial={{ opacity: 0, filter: "blur(12px)", scale: 0.95 }}
                animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="leading-none select-none text-center w-full tracking-[0.04em] sm:tracking-[0.07em] md:tracking-[0.09em] lg:tracking-[0.11em] text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[6.5rem] font-semibold mb-2 sm:mb-4 whitespace-nowrap transition-colors"
                style={{
                  fontFamily: F_LOGO,
                  color: isDark ? "#ffffff" : "var(--sk-fg)",
                  textShadow: "none",
                }}
              >
                SPOTLIGHT-RIT
              </motion.h1>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="max-w-full sm:max-w-3xl mx-auto text-center px-4 mt-3 sm:mt-4 flex flex-col items-center gap-2 sm:gap-2.5"
              >
                <p
                  className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed transition-colors"
                  style={{ color: isDark ? "var(--sk-muted)" : "#4b5563", fontFamily: FB }}
                >
                  The Complete Campus{" "}<span style={{ color: isDark ? "rgba(255,255,255,0.85)" : "var(--sk-fg)" }}>Event Management Hub</span>
                </p>
                <p
                  className="text-xs sm:text-sm md:text-base font-medium tracking-wide transition-colors"
                  style={{ color: isDark ? "rgba(255,255,255,0.65)" : "var(--sk-brand)", fontFamily: FB }}
                >
                  Ramaiah Institute of Technology, Bangalore
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 sm:mt-8 w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openAdminConsole}
                  className="cursor-pointer group inline-flex items-center justify-center w-full sm:w-auto px-7 sm:px-8 py-2.5 sm:py-3 text-sm font-semibold text-[color:var(--sk-fg)] bg-[color:var(--sk-raised)] hover:bg-[color:var(--sk-line)] border border-[color:var(--sk-line)] rounded-full transition-all duration-300 active:scale-95"
                >
                  <span>Login as Admin</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onEnter}
                  className="cursor-pointer group inline-flex items-center justify-center w-full sm:w-auto px-7 sm:px-8 py-2.5 sm:py-3 text-sm font-semibold text-white bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] rounded-full transition-all duration-300 active:scale-95"
                >
                  <span>Login as Club</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => leaveTo(STUDENT_LOGIN_URL)}
                  className="cursor-pointer group inline-flex items-center justify-center w-full sm:w-auto px-7 sm:px-8 py-2.5 sm:py-3 text-sm font-semibold text-[color:var(--sk-fg)] bg-[color:var(--sk-raised)] hover:bg-[color:var(--sk-line)] border border-[color:var(--sk-line)] rounded-full transition-all duration-300 active:scale-95"
                >
                  <span>Login as Student</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </section>
        </div>

        <footer className={`w-full px-4 md:px-16 pb-4 sm:pb-6 pt-3 sm:pt-4 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4 border-t flex-shrink-0 transition-colors ${
          isDark ? "border-white/5" : "border-[color:var(--sk-line)] bg-[color:var(--sk-canvas)]"
        }`}>
          <div className="flex-1 flex justify-center md:justify-start">
            <span className="text-xs sm:text-sm tracking-[0.3em]" style={{ fontFamily: F_LOGO, color: isDark ? "rgba(255,255,255,0.4)" : "var(--sk-muted)" }}>SPOTLIGHT-RIT</span>
          </div>
          <p className="text-[10px] sm:text-xs text-center flex-shrink-0" style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-muted)", fontFamily: FM }}>© 2026 Spotlight-RIT. Ramaiah Institute of Technology. All rights reserved.</p>
          <div className="flex-1 flex justify-center md:justify-end gap-5 text-[10px] sm:text-[11px]" style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-muted)" }}>
            <button onClick={() => setActiveModal('privacy')} className={`transition-colors duration-300 hover:underline underline-offset-4 ${isDark ? "hover:text-white" : "hover:text-black"}`} style={{ fontFamily: FB }}>Privacy</button>
            <button onClick={() => setActiveModal('terms')} className={`transition-colors duration-300 hover:underline underline-offset-4 ${isDark ? "hover:text-white" : "hover:text-black"}`} style={{ fontFamily: FB }}>Terms</button>
            <button onClick={() => setActiveModal('contact')} className={`transition-colors duration-300 hover:underline underline-offset-4 ${isDark ? "hover:text-white" : "hover:text-black"}`} style={{ fontFamily: FB }}>Contact Us</button>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {activeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-2xl rounded-3xl p-8 max-h-[85vh] overflow-y-auto flex flex-col transition-colors"
              style={{
                background: isDark ? "#0a0a0a" : "var(--sk-canvas)",
                border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                color: isDark ? "#ffffff" : "var(--sk-fg)"
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold" style={{ fontFamily: FC, color: isDark ? "#ffffff" : "var(--sk-fg)" }}>
                    {activeModal === 'privacy' && 'Dashboard Privacy Policy'}
                    {activeModal === 'terms' && 'Dashboard Terms of Service'}
                    {activeModal === 'contact' && 'Contact Us'}
                  </h3>
                  <p className="text-xs mt-1" style={{ fontFamily: FB, color: isDark ? "#999" : "var(--sk-muted)" }}>
                    {activeModal === 'contact' ? 'Reach out to Spotlight Support' : 'Last Updated: November 21, 2026'}
                  </p>
                </div>
                <button onClick={() => setActiveModal(null)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isDark ? "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white" : "bg-[color:var(--sk-raised)] hover:bg-[color:var(--sk-raised)] text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)]"
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className={`flex-1 overflow-y-auto pr-2 space-y-6 text-sm leading-relaxed border-t border-b py-6 text-left ${
                isDark ? "text-[#ccc] border-white/5" : "text-[color:var(--sk-muted)] border-[color:var(--sk-line)]"
              }`} style={{ fontFamily: FB }}>
                {activeModal === 'privacy' && (
                  <>
                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Information We Collect From Clubs</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">We collect your club name, email address, password (stored only as a secure hash, or Google Sign-In instead), department, description, coordinator name and phone number, and logo. For each event you add details such as title, description, venue, dates, capacity, team size and banner image. New clubs can sign in only after the Spotlight admin approves their registration; the admin sees these details to decide.</p>
                    </div>

                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Participant Information Available to Clubs</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">When students register for your events, you see their name, email, phone number, USN, branch, year, semester, team name, and registration and check-in status.</p>
                    </div>

                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Handling Participant Information</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">Clubs must process participant data strictly to organize and conduct the event. You must not sell or share participant data with third parties, use it for unrelated spam/marketing, or store downloaded lists insecurely.</p>
                    </div>

                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Third-Party Services</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">Render hosts the Spotlight server; GoDaddy hosts the database, website and uploaded images; Google provides optional Google Sign-In; and Gmail sends your approval email. Club logos and event banners are public images that anyone with the link can view.</p>
                    </div>

                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Deleting Your Club Account</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">To delete your club account and its data, email spotlightapp.help@gmail.com from your registered club email with the subject "Account Deletion Request". The club, its events, registrations and uploaded images are permanently deleted within 7 business days.</p>
                    </div>
                  </>
                )}

                {activeModal === 'terms' && (
                  <>
                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">About the Spotlight Club Dashboard</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">The Spotlight Club Dashboard lets approved clubs create, publish and manage events. Published events appear in the Spotlight app and on the Spotlight student website. Clubs view registrations and scan entry tickets at the event.</p>
                    </div>

                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Club Accounts</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">Clubs register with their details and can sign in only after the Spotlight admin approves them. Sign in with your email and password or with Google. Keep your credentials private; you are responsible for all activity on your club account.</p>
                    </div>

                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Participant Data Compliance</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">Use participant data only to run your event. Do not sell or share it, use it for unrelated messages or marketing, or store downloaded lists insecurely.</p>
                    </div>

                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Events</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">All events on Spotlight are free, as per college guidelines; no fee may be charged through Spotlight. Students who register are confirmed straight away. Your club is responsible for its event details, capacity and entry rules.</p>
                    </div>

                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Suspension</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">The Spotlight admin may suspend a club that posts misleading events or misuses participant data.</p>
                    </div>
                  </>
                )}

                {activeModal === 'contact' && (
                  <>
                    <div>
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Reach Out For Support</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed mb-4">If you have concerns, deactivation requests, or reports of unauthorized dashboard activity, email support directly at:</p>
                      <a 
                        href="mailto:spotlightapp.help@gmail.com" 
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all"
                      >
                        <Mail size={16} />
                        <span>spotlightapp.help@gmail.com</span>
                      </a>
                    </div>

                    <div className="pt-4 border-t border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]">
                      <h4 className="text-[color:var(--sk-fg)] dark:text-white font-semibold text-sm mb-1.5">Response Guidelines</h4>
                      <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] leading-relaxed">Mention your club name and explain the issue clearly. We will look into it as soon as possible.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setActiveModal(null)} className="px-6 py-2.5 text-xs text-[color:var(--sk-fg)] dark:text-white bg-[color:var(--sk-raised)] hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-all font-semibold cursor-pointer border border-[color:var(--sk-line)] dark:border-transparent" style={{ fontFamily: FB }}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
