import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Eye, EyeOff, Shield, ChevronLeft, Key } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { createClub, clubLogin, sanitizeErrorMessage, verifyRegistrationKey, checkClubEmail, googleAuth } from "../api";
import { useTheme, ThemeToggle } from "../theme";
import { STUDENT_LOGIN_URL, FC, FM, FB, AuthTab, validatePasswordStrength } from "./shared";

export function AuthPage({ tab, onTabChange, onBack, onLocalSignIn, initialError }: {
  tab: AuthTab; onTabChange: (t: AuthTab) => void; onBack: () => void;
  onLocalSignIn: (token: string, profile: any) => void;
  initialError?: string | null;
}) {
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clubName, setClubName] = useState("");

  const [registrationKey, setRegistrationKey] = useState("");
  const [keyVerified, setKeyVerified] = useState(false);
  const [verifyingKey, setVerifyingKey] = useState(false);

  const [error, setError] = useState<string | null>(initialError || null);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);
  const [loading, setLoading] = useState(false);

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

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      try {
        const res = await googleAuth({
          access_token: tokenResponse.access_token,
          registrationKey: keyVerified ? registrationKey : undefined,
          clubName: clubName || undefined,
        });
        if (res && res.token && res.profile) {
          onLocalSignIn(res.token, res.profile);
        } else {
          setError("Google authentication failed.");
        }
      } catch (err: any) {
        setError(sanitizeErrorMessage(err, "Google authentication failed. Please try again."));
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google sign-in failed. Please try again."),
  });

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in Club Name, Email ID, and Password.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      setError(pwdCheck.message);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await checkClubEmail(email.trim());

      await createClub({
        name: clubName.trim(),
        email: email.trim(),
        password: password.trim(),
        registrationKey: registrationKey.trim(),
        clerkUserId: "",
      });

      const loginData = await clubLogin(email.trim(), password.trim());
      if (loginData && loginData.token && loginData.profile) {
        onLocalSignIn(loginData.token, loginData.profile);
      }
    } catch (err: any) {
      setError(sanitizeErrorMessage(err, "Failed to register club."));
    } finally {
      setLoading(false);
    }
  };

  if (tab === "register" && !keyVerified) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        className="fixed inset-0 z-20 flex items-center justify-center p-6"
        style={{ background: isDark ? "rgba(5,5,5,0.97)" : "#ffffff", backdropFilter: "blur(10px)" }}
      >
        <button onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-sm transition-all duration-300"
          style={{ color: isDark ? "#999" : "var(--sk-fg)", fontFamily: FB }}
          onMouseEnter={e => (e.currentTarget.style.color = isDark ? "#eee" : "var(--sk-brand)")}
          onMouseLeave={e => (e.currentTarget.style.color = isDark ? "#999" : "var(--sk-fg)")}
        ><ChevronLeft size={14} /> Back</button>

        <div className="absolute top-8 right-8">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md p-8 md:p-10 rounded-3xl" style={{
          background: isDark ? "var(--sk-surface)" : "var(--sk-canvas)",
          border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
          boxShadow: isDark ? "none" : "0 20px 40px -15px var(--sk-raised)",
          backdropFilter: "blur(24px)"
        }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "color-mix(in srgb, var(--sk-brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--sk-brand) 20%, transparent)" }}>
              <Key size={24} className="text-[color:var(--sk-brand)]" />
            </div>
            <h2 className="text-2xl font-bold text-center" style={{ fontFamily: FC, color: isDark ? "#ffffff" : "var(--sk-fg)" }}>Authorization Required</h2>
          </div>

          <form noValidate onSubmit={handleVerifyKey} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Authorization Key</label>
              <input
                type="text"
                placeholder="SPOTLIGHT-XXXX-XXXX"
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase tracking-widest"
                style={{
                  background: isDark ? "var(--sk-surface)" : "var(--sk-raised)",
                  border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
                  color: isDark ? "#ffffff" : "var(--sk-fg)",
                  fontFamily: FM
                }}
                value={registrationKey}
                onChange={e => { setRegistrationKey(e.target.value); if (error) setError(null); }}
                onFocus={e => (e.currentTarget.style.borderColor = isDark ? "var(--sk-line-strong)" : "var(--sk-brand)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--sk-line)")}
              />
            </div>

            {error && (
              <p className="text-xs text-[color:var(--sk-danger)] font-medium" style={{ fontFamily: FB }}>{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={verifyingKey}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
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



  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="fixed inset-0 z-20 flex items-center justify-center p-6"
      style={{ background: isDark ? "rgba(5,5,5,0.97)" : "var(--sk-canvas)", backdropFilter: "blur(10px)" }}
    >
      <button onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-sm transition-all duration-300"
        style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-fg)", fontFamily: FB }}
        onMouseEnter={e => (e.currentTarget.style.color = isDark ? "#eeeeee" : "var(--sk-brand)")}
        onMouseLeave={e => (e.currentTarget.style.color = isDark ? "var(--sk-muted)" : "var(--sk-fg)")}
      ><ChevronLeft size={14} /> Back</button>

      <div className="absolute top-8 right-8">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-md">

        <div className="flex gap-1 p-1 rounded-xl w-full relative" style={{
          background: isDark ? "var(--sk-surface)" : "var(--sk-raised)",
          border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)"
        }}>
          {(["login", "register"] as AuthTab[]).map(t => (
            <button key={t} onClick={() => { setEmail(""); setPassword(""); setClubName(""); setError(null); setShowPassword(false); setRegistrationKey(""); setKeyVerified(false); onTabChange(t); }}
              className="relative flex-1 py-2.5 text-sm font-medium transition-colors duration-300 cursor-pointer"
              style={{ fontFamily: FB }}
            >
              {tab === t && (
                <motion.div
                  layoutId="activeAuthTabPill"
                  className={`absolute inset-0 rounded-lg ${isDark ? "bg-white" : "bg-white border border-[color:var(--sk-line)]"}`}
                  transition={{ type: "spring", stiffness: 220, damping: 24 }}
                />
              )}
              <span className={`relative z-10 transition-colors duration-300 font-semibold ${
                tab === t
                  ? (isDark ? "text-black" : "text-[color:var(--sk-fg)]")
                  : (isDark ? "text-[#aaaaaa]" : "text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)]")
              }`}>
                {t === "login" ? "Sign In" : "Sign Up"}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full p-8 md:p-10 rounded-3xl overflow-hidden" style={{
          background: isDark ? "var(--sk-surface)" : "var(--sk-canvas)",
          border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
          boxShadow: isDark ? "none" : "0 20px 40px -15px var(--sk-raised)",
          backdropFilter: "blur(24px)"
        }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: FC, color: isDark ? "#ffffff" : "var(--sk-fg)" }}>
                  {tab === "login" ? "Sign In to Club" : "Register Your Club"}
                </h2>
                <p className="text-xs" style={{ fontFamily: FB, color: isDark ? "var(--sk-muted)" : "var(--sk-muted)" }}>
                  {tab === "login" ? "Access your club dashboard" : "Welcome! Please fill in the details to get started."}
                </p>
              </div>

              <form noValidate onSubmit={tab === "login" ? handleSignIn : handleSignUp} className="space-y-6">
                {tab === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Club Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter club name" 
                      required
                      className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30" 
                      style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }} 
                      value={clubName} 
                      onChange={e => setClubName(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Email ID</label>
                  <input 
                    type="email" 
                    placeholder="Enter email address" 
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30" 
                    style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block" style={{ fontFamily: FM }}>Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter password" 
                      required
                      className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition-all focus:border-white/30" 
                      style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/65 dark:hover:text-white transition-colors bg-transparent border-0 outline-none p-1 cursor-pointer flex items-center justify-center"
                      style={{ background: "transparent", backgroundColor: "transparent", border: "none", boxShadow: "none" }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-[color:var(--sk-danger)] text-center font-medium" style={{ fontFamily: FB }}>{error}</p>
                )}

                <motion.button 
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
                  style={{ fontFamily: FB }}
                >
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>Continue <ArrowRight size={14} /></>
                  )}
                </motion.button>
              </form>

              <div className="flex items-center gap-4 my-6">
                <div className={`h-[1px] flex-1 ${isDark ? "bg-white/10" : "bg-[color:var(--sk-raised)]"}`} />
                <span className={`text-[11px] uppercase tracking-widest ${isDark ? "text-white/55" : "text-[color:var(--sk-muted)]"}`} style={{ fontFamily: FM }}>or</span>
                <div className={`h-[1px] flex-1 ${isDark ? "bg-white/10" : "bg-[color:var(--sk-raised)]"}`} />
              </div>

              <motion.button
                type="button"
                onClick={() => loginWithGoogle()}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className={`cursor-pointer w-full flex items-center justify-center gap-3 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  isDark
                    ? "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                    : "bg-white/70 border border-[color:var(--sk-line)] hover:bg-[color:var(--sk-raised)] text-[color:var(--sk-fg)]"
                }`}
                style={{ fontFamily: FB }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google
              </motion.button>

              {tab === "login" && (
                <p className="text-center text-xs text-[color:var(--sk-muted)] mt-6" style={{ fontFamily: FB }}>
                  Want to register a new club?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("");
                      setPassword("");
                      setClubName("");
                      setError(null);
                      setShowPassword(false);
                      setRegistrationKey("");
                      setKeyVerified(false);
                      onTabChange("register");
                    }}
                    className="text-[color:var(--sk-brand)] hover:text-[color:var(--sk-brand-hover)] font-semibold transition-colors cursor-pointer underline underline-offset-2"
                  >
                    Sign Up
                  </button>
                </p>
              )}
              <p className="text-center text-xs text-[color:var(--sk-muted)] mt-3" style={{ fontFamily: FB }}>
                Are you a student?{" "}
                <a
                  href={STUDENT_LOGIN_URL}
                  className="text-[color:var(--sk-brand)] hover:text-[color:var(--sk-brand-hover)] font-semibold transition-colors underline underline-offset-2"
                >
                  Student sign in
                </a>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
