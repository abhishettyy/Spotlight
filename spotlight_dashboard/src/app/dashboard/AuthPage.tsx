import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Eye, EyeOff, ChevronLeft, Upload } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { createClub, clubLogin, sanitizeErrorMessage, checkClubEmail, googleAuth, ClubSignupDetails } from "../api";
import { useTheme, ThemeToggle } from "../theme";
import { GlassSelect } from "./GlassFields";
import { STUDENT_LOGIN_URL, FC, FM, FB, AuthTab, validatePasswordStrength, fileToBase64 } from "./shared";

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Information Science & Engineering",
  "Artificial Intelligence & Data Science",
  "Artificial Intelligence & Machine Learning",
  "CSE (AI & ML)",
  "CSE (Cyber Security)",
  "Electronics & Communication Engineering",
  "Electronics & Instrumentation Engineering",
  "Electronics & Telecommunication Engineering",
  "Electrical & Electronics Engineering",
  "Medical Electronics Engineering",
  "Mechanical Engineering",
  "Industrial Engineering & Management",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Architecture",
  "MCA",
  "MBA",
  "Institute level (not department-specific)",
  "Other",
].map(d => ({ value: d, label: d }));

/** After sign-up, or when signing in before approval: what the club sees instead of the form. */
type StatusScreen = { kind: "submitted" | "pending" | "rejected"; message?: string; email?: string } | null;

const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30";
const inputStyle = { background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB };
const labelCls = "text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block";
const errorBorder = "1px solid color-mix(in srgb, var(--sk-danger) 70%, transparent)";

type SignupField = "clubName" | "department" | "description" | "coordinatorName" | "coordinatorPhone" | "email" | "password";
type SignupErrors = Partial<Record<SignupField, string>>;
/** Fields in the order they appear on the form, so the first problem is the one scrolled to. */
const SIGNUP_FIELDS: SignupField[] = ["clubName", "department", "description", "coordinatorName", "coordinatorPhone", "email", "password"];
const DETAIL_FIELDS: SignupField[] = ["clubName", "department", "description", "coordinatorName", "coordinatorPhone"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{message}</p>;
}

export function AuthPage({ tab, onTabChange, onBack, onLocalSignIn, initialError }: {
  tab: AuthTab; onTabChange: (t: AuthTab) => void; onBack: () => void;
  onLocalSignIn: (token: string, profile: any) => void;
  initialError?: string | null;
}) {
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clubName, setClubName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorPhone, setCoordinatorPhone] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [status, setStatus] = useState<StatusScreen>(null);
  const [error, setError] = useState<string | null>(initialError || null);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  // Which sign-up fields to show errors for: none until a submit, only the club details for Google sign-up
  const [checkFields, setCheckFields] = useState<SignupField[]>([]);

  const resetForm = () => {
    setEmail(""); setPassword(""); setClubName(""); setDepartment(""); setDescription("");
    setCoordinatorName(""); setCoordinatorPhone(""); setLogoFile(null);
    setError(null); setShowPassword(false); setStatus(null); setCheckFields([]);
  };

  /** Pending / rejected sign-in answers become a status screen; anything else is an inline error. */
  const handleAuthError = (err: any, fallback: string) => {
    if (err?.code === "CLUB_PENDING") {
      setStatus({ kind: "pending", message: err.message });
    } else if (err?.code === "CLUB_REJECTED") {
      setStatus({ kind: "rejected", message: err.message });
    } else {
      setError(sanitizeErrorMessage(err, fallback));
    }
  };

  /** Every sign-up field with a problem, and what to fix. */
  const signupErrors = ((): SignupErrors => {
    const errors: SignupErrors = {};
    if (!clubName.trim()) errors.clubName = "Enter the club name.";
    if (!department) errors.department = "Choose the department the club comes under.";
    if (!description.trim()) errors.description = "Describe what the club does.";
    if (!coordinatorName.trim()) errors.coordinatorName = "Enter the coordinator's name.";
    const digits = coordinatorPhone.replace(/\D/g, "");
    if (!coordinatorPhone.trim()) errors.coordinatorPhone = "Enter the coordinator's phone number.";
    else if (digits.length < 10 || digits.length > 13) errors.coordinatorPhone = "Enter a valid phone number (10 to 13 digits).";
    if (!email.trim()) errors.email = "Enter an email address.";
    else if (!email.includes("@") || !email.includes(".")) errors.email = "Enter a valid email address.";
    if (!password.trim()) errors.password = "Create a password.";
    else {
      const pwdCheck = validatePasswordStrength(password);
      if (!pwdCheck.valid) errors.password = pwdCheck.message;
    }
    return errors;
  })();

  // Errors shown under the fields; they clear as each field is fixed
  const shownErrors: SignupErrors = {};
  for (const f of checkFields) if (signupErrors[f]) shownErrors[f] = signupErrors[f];

  /** Shows errors for the given fields and scrolls to the first one; returns whether they are all valid. */
  const checkSignupFields = (fields: SignupField[]): boolean => {
    setCheckFields(fields);
    const first = SIGNUP_FIELDS.find(f => fields.includes(f) && signupErrors[f]);
    if (!first) return true;
    const el = document.getElementById(`signup-${first}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
    return false;
  };

  const fieldBorder = (f: SignupField) => (shownErrors[f] ? { ...inputStyle, border: errorBorder } : inputStyle);

  const buildDetails = async (): Promise<ClubSignupDetails> => ({
    name: clubName.trim(),
    department,
    description: description.trim(),
    coordinatorName: coordinatorName.trim(),
    coordinatorPhone: coordinatorPhone.trim(),
    ...(logoFile && { logoUrl: await fileToBase64(logoFile) }),
  });

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      try {
        if (tab === "register") {
          const res = await googleAuth({ access_token: tokenResponse.access_token, signup: await buildDetails() });
          if (res?.pending) setStatus({ kind: "submitted" });
          else setError("Google sign-up failed.");
          return;
        }
        const res = await googleAuth({ access_token: tokenResponse.access_token });
        if (res && res.token && res.profile) {
          onLocalSignIn(res.token, res.profile);
        } else {
          setError("Google authentication failed.");
        }
      } catch (err: any) {
        handleAuthError(err, "Google authentication failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google sign-in failed. Please try again."),
  });

  const handleGoogle = () => {
    setError(null);
    if (tab === "register" && !checkSignupFields(DETAIL_FIELDS)) {
      setError("Fill in the club details above, then continue with Google.");
      return;
    }
    loginWithGoogle();
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
      handleAuthError(err, "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!checkSignupFields(SIGNUP_FIELDS)) return;

    setLoading(true);
    setError(null);
    try {
      await checkClubEmail(email.trim());
      await createClub({
        ...(await buildDetails()),
        email: email.trim(),
        password: password.trim(),
      });
      setStatus({ kind: "submitted", email: email.trim() });
    } catch (err: any) {
      setError(sanitizeErrorMessage(err, "Failed to register club."));
    } finally {
      setLoading(false);
    }
  };

  const backToSignIn = () => { resetForm(); onTabChange("login"); };

  const statusCard = status && (() => {
    const rejected = status.kind === "rejected";
    const title = status.kind === "submitted" ? "Registration Submitted"
      : status.kind === "pending" ? "Awaiting Approval" : "Registration Not Approved";
    const body = status.kind === "submitted"
      ? `Thanks for registering your club. The Spotlight admin will review your details. Once approved, you'll get an email${status.email ? ` at ${status.email}` : ""} and can sign in.`
      : status.message;
    return (
      <motion.div
        key="status"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: FC, color: isDark ? "#ffffff" : "var(--sk-fg)" }}>{title}</h2>
        <p className="text-sm leading-relaxed text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>{body}</p>
        <p className="text-xs text-[color:var(--sk-muted)] mt-6" style={{ fontFamily: FB }}>
          Questions? Mail us at{" "}
          <a href="mailto:spotlightapp.help@gmail.com" className="text-[color:var(--sk-brand)] hover:text-[color:var(--sk-brand-hover)] font-medium underline underline-offset-2">
            spotlightapp.help@gmail.com
          </a>
        </p>
        <motion.button
          type="button"
          onClick={rejected ? () => { resetForm(); onTabChange("register"); } : backToSignIn}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="mt-8 w-full flex items-center justify-center gap-2 py-3 bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] text-white text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer"
          style={{ fontFamily: FB }}
        >
          {rejected ? <>Sign Up Again <ArrowRight size={14} /></> : <>Back to Sign In <ArrowRight size={14} /></>}
        </motion.button>
      </motion.div>
    );
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="fixed inset-0 z-20 overflow-y-auto"
      style={{ background: isDark ? "rgba(5,5,5,0.97)" : "var(--sk-canvas)", backdropFilter: "blur(10px)" }}
    >
      <button onClick={onBack}
        className="absolute top-8 left-8 z-10 flex items-center gap-2 text-sm transition-all duration-300"
        style={{ color: isDark ? "var(--sk-muted)" : "var(--sk-fg)", fontFamily: FB }}
        onMouseEnter={e => (e.currentTarget.style.color = isDark ? "#eeeeee" : "var(--sk-brand)")}
        onMouseLeave={e => (e.currentTarget.style.color = isDark ? "var(--sk-muted)" : "var(--sk-fg)")}
      ><ChevronLeft size={14} /> Back</button>

      <div className="absolute top-8 right-8 z-10">
        <ThemeToggle />
      </div>

      <div className="min-h-full flex items-center justify-center px-6 pt-20 pb-10">
      <div className={`flex flex-col items-center gap-6 w-full ${tab === "register" && !status ? "max-w-xl" : "max-w-md"}`}>

        {!status && (
        <div className="flex gap-1 p-1 rounded-xl w-full relative" style={{
          background: isDark ? "var(--sk-surface)" : "var(--sk-raised)",
          border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)"
        }}>
          {(["login", "register"] as AuthTab[]).map(t => (
            <button key={t} onClick={() => { resetForm(); onTabChange(t); }}
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
        )}

        <div className="w-full p-8 md:p-10 rounded-3xl" style={{
          background: "var(--sk-surface)",
          border: "1px solid var(--sk-line)",
          boxShadow: isDark ? "none" : "var(--sk-shadow-lg)",
          backdropFilter: "blur(24px)"
        }}>
          <AnimatePresence mode="popLayout">
            {statusCard || (
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
                  {tab === "login"
                    ? "Access your club dashboard"
                    : "Fill in your club's details. The Spotlight admin reviews every registration before you can sign in."}
                </p>
              </div>

              <form noValidate onSubmit={tab === "login" ? handleSignIn : handleSignUp} className="space-y-6">
                {tab === "register" && (
                  <>
                    <div id="signup-clubName" className="space-y-1.5">
                      <label className={labelCls} style={{ fontFamily: FM }}>Club Name</label>
                      <input
                        type="text"
                        placeholder="Enter club name"
                        required
                        maxLength={120}
                        className={inputCls}
                        style={fieldBorder("clubName")}
                        aria-invalid={!!shownErrors.clubName}
                        value={clubName}
                        onChange={e => setClubName(e.target.value)}
                      />
                      <FieldError message={shownErrors.clubName} />
                    </div>

                    <div id="signup-department" className="space-y-1.5">
                      <label className={labelCls} style={{ fontFamily: FM }}>Department</label>
                      <GlassSelect
                        value={department}
                        onChange={setDepartment}
                        options={DEPARTMENTS}
                        placeholder="Which department does the club come under?"
                        error={shownErrors.department}
                      />
                      <FieldError message={shownErrors.department} />
                    </div>

                    <div id="signup-description" className="space-y-1.5">
                      <label className={labelCls} style={{ fontFamily: FM }}>Description</label>
                      <textarea
                        placeholder="What does your club do?"
                        required
                        rows={3}
                        maxLength={2000}
                        className={`${inputCls} resize-none`}
                        style={fieldBorder("description")}
                        aria-invalid={!!shownErrors.description}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                      />
                      <FieldError message={shownErrors.description} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
                      <div id="signup-coordinatorName" className="space-y-1.5">
                        <label className={labelCls} style={{ fontFamily: FM }}>Coordinator Name</label>
                        <input
                          type="text"
                          placeholder="Faculty / club coordinator"
                          required
                          className={inputCls}
                          style={fieldBorder("coordinatorName")}
                          aria-invalid={!!shownErrors.coordinatorName}
                          value={coordinatorName}
                          onChange={e => setCoordinatorName(e.target.value)}
                        />
                        <FieldError message={shownErrors.coordinatorName} />
                      </div>
                      <div id="signup-coordinatorPhone" className="space-y-1.5">
                        <label className={labelCls} style={{ fontFamily: FM }}>Coordinator Phone</label>
                        <input
                          type="tel"
                          inputMode="tel"
                          placeholder="10-digit mobile number"
                          required
                          maxLength={16}
                          className={inputCls}
                          style={fieldBorder("coordinatorPhone")}
                          aria-invalid={!!shownErrors.coordinatorPhone}
                          value={coordinatorPhone}
                          onChange={e => setCoordinatorPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                        />
                        <FieldError message={shownErrors.coordinatorPhone} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelCls} style={{ fontFamily: FM }}>Club Logo <span className="normal-case tracking-normal text-[color:var(--sk-muted)]">(optional)</span></label>
                      <input type="file" accept="image/*" className="hidden" id="logo-upload-signup" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setLogoFile(file);
                      }} />
                      <label htmlFor="logo-upload-signup" className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-muted)] flex items-center justify-between cursor-pointer transition-all hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/[0.04]" style={inputStyle}>
                        <span className="truncate">{logoFile ? logoFile.name : "Upload logo image..."}</span>
                        <Upload size={14} className={logoFile ? "text-green-500 flex-shrink-0" : "flex-shrink-0"} />
                      </label>
                    </div>
                  </>
                )}

                <div id="signup-email" className="space-y-1.5">
                  <label className={labelCls} style={{ fontFamily: FM }}>Email ID</label>
                  <input
                    type="email"
                    placeholder={tab === "register" ? "Official club or student email" : "Enter email address"}
                    required
                    className={inputCls}
                    style={fieldBorder("email")}
                    aria-invalid={!!shownErrors.email}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <FieldError message={shownErrors.email} />
                </div>

                <div id="signup-password" className="space-y-1.5 relative">
                  <label className={labelCls} style={{ fontFamily: FM }}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={tab === "register" ? "Create a password" : "Enter password"}
                      required
                      className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none transition-all focus:border-white/30"
                      style={fieldBorder("password")}
                      aria-invalid={!!shownErrors.password}
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
                  <FieldError message={shownErrors.password} />
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
                  ) : tab === "register" ? (
                    <>Submit for Approval <ArrowRight size={14} /></>
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
                onClick={handleGoogle}
                disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className={`cursor-pointer w-full flex items-center justify-center gap-3 py-3 text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 ${
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
                {tab === "register" ? "Sign Up with Google" : "Continue with Google"}
              </motion.button>
              {tab === "register" && (
                <p className="text-center text-[11px] text-[color:var(--sk-muted)] mt-3" style={{ fontFamily: FB }}>
                  With Google, fill in the club details above first; your Google email becomes the club's sign-in.
                </p>
              )}

              {tab === "login" ? (
                <p className="text-center text-xs text-[color:var(--sk-muted)] mt-6" style={{ fontFamily: FB }}>
                  Want to register a new club?{" "}
                  <button
                    type="button"
                    onClick={() => { resetForm(); onTabChange("register"); }}
                    className="text-[color:var(--sk-brand)] hover:text-[color:var(--sk-brand-hover)] font-semibold transition-colors cursor-pointer underline underline-offset-2"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p className="text-center text-xs text-[color:var(--sk-muted)] mt-6" style={{ fontFamily: FB }}>
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="text-[color:var(--sk-brand)] hover:text-[color:var(--sk-brand-hover)] font-semibold transition-colors cursor-pointer underline underline-offset-2"
                  >
                    Sign In
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
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </motion.div>
  );
}
