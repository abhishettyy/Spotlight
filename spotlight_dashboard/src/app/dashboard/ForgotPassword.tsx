import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { requestPasswordReset, resetPasswordWithCode } from "../api";
import { FC, FM, FB, validatePasswordStrength } from "./shared";

const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30";
const labelCls = "text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] block";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;

export function ClubForgotPassword({ initialEmail, isDark, onBack, onDone }: {
  initialEmail: string; isDark: boolean; onBack: () => void; onDone: (message: string) => void;
}) {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const fieldStyle = (key: string) => ({
    background: "var(--sk-surface)",
    border: `1px solid ${errors[key] ? "var(--sk-danger)" : "var(--sk-line)"}`,
    fontFamily: FB,
  });

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) { setErrors({ email: "Please enter a valid email address." }); return; }
    setErrors({});
    setBusy(true);
    try {
      const data = await requestPasswordReset(email.trim());
      setNotice(data?.message ?? "Code sent.");
      setStep("reset");
      setResendIn(RESEND_SECONDS);
    } catch (err: any) {
      setError(err?.message || "Couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    if (!/^\d{6}$/.test(code.trim())) next.code = "Enter the 6-digit code from the email.";
    const strength = validatePasswordStrength(password);
    if (!strength.valid) next.password = strength.message ?? "Please choose a stronger password.";
    else if (password !== confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const data = await resetPasswordWithCode({ email: email.trim(), code: code.trim(), newPassword: password });
      onDone(data?.message ?? "Your password has been reset. You can now sign in.");
    } catch (err: any) {
      setError(err?.message || "Couldn't reset the password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key: string) => errors[key] && (
    <p className="text-[11px] text-[color:var(--sk-danger)] mt-1" style={{ fontFamily: FB }}>{errors[key]}</p>
  );

  return (
    <motion.div
      key="forgot"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
    >
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 text-xs mb-6 cursor-pointer transition-colors text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)]"
        style={{ fontFamily: FB }}>
        <ChevronLeft size={14} /> Back to sign in
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: FC, color: isDark ? "#ffffff" : "var(--sk-fg)" }}>Forgot Password</h2>
        <p className="text-xs text-[color:var(--sk-muted)] leading-relaxed" style={{ fontFamily: FB }}>
          {step === "email"
            ? "Enter your club's email and we'll send you a 6-digit code to reset your password."
            : notice}
        </p>
      </div>

      {step === "email" ? (
        <form noValidate onSubmit={sendCode} className="space-y-6">
          <div className="space-y-1.5">
            <label className={labelCls} style={{ fontFamily: FM }} htmlFor="club-fp-email">Email ID</label>
            <input id="club-fp-email" name="email" type="email" autoComplete="username" autoFocus
              placeholder="Your club's email" className={inputCls} style={fieldStyle("email")}
              aria-invalid={!!errors.email} value={email} onChange={e => setEmail(e.target.value)} />
            {fieldError("email")}
          </div>
          {error && <p className="text-xs text-[color:var(--sk-danger)] text-center font-medium" style={{ fontFamily: FB }}>{error}</p>}
          <motion.button type="submit" disabled={busy} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
            style={{ fontFamily: FB }}>
            {busy ? <><div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Sending code…</> : <>Send Code <ArrowRight size={14} /></>}
          </motion.button>
        </form>
      ) : (
        <form noValidate onSubmit={submitReset} className="space-y-6">
          <div className="space-y-1.5">
            <label className={labelCls} style={{ fontFamily: FM }} htmlFor="club-fp-code">6-Digit Code</label>
            <input id="club-fp-code" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
              placeholder="••••••" className={`${inputCls} tracking-[0.4em] text-lg font-semibold`} style={fieldStyle("code")}
              aria-invalid={!!errors.code} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            {fieldError("code")}
          </div>
          <div className="space-y-1.5">
            <label className={labelCls} style={{ fontFamily: FM }} htmlFor="club-fp-password">New Password</label>
            <div className="relative">
              <input id="club-fp-password" name="password" autoComplete="new-password" type={showPassword ? "text" : "password"}
                placeholder="Create a new password" className={`${inputCls} pr-12`} style={fieldStyle("password")}
                aria-invalid={!!errors.password} value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? "Hide password" : "Show password"}
                className="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/65 dark:hover:text-white transition-colors bg-transparent border-0 outline-none p-1 cursor-pointer flex items-center justify-center"
                style={{ background: "transparent", border: "none", boxShadow: "none" }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password ? fieldError("password") : (
              <p className="text-[10px] text-[color:var(--sk-muted)] mt-1" style={{ fontFamily: FM }}>At least 8 characters, with an uppercase letter, a number and a special character.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className={labelCls} style={{ fontFamily: FM }} htmlFor="club-fp-confirm">Confirm New Password</label>
            <input id="club-fp-confirm" name="confirm" autoComplete="new-password" type={showPassword ? "text" : "password"}
              placeholder="Enter it again" className={inputCls} style={fieldStyle("confirm")}
              aria-invalid={!!errors.confirm} value={confirm} onChange={e => setConfirm(e.target.value)} />
            {fieldError("confirm")}
          </div>
          {error && <p className="text-xs text-[color:var(--sk-danger)] text-center font-medium" style={{ fontFamily: FB }}>{error}</p>}
          <motion.button type="submit" disabled={busy} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
            style={{ fontFamily: FB }}>
            {busy ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <>Reset Password <ArrowRight size={14} /></>}
          </motion.button>
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs" style={{ fontFamily: FB }}>
            <button type="button" className="cursor-pointer text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] transition-colors"
              onClick={() => { setStep("email"); setCode(""); setErrors({}); setError(null); }}>
              Use a different email
            </button>
            <button type="button" disabled={busy || resendIn > 0} onClick={() => sendCode()}
              className={`font-semibold text-[color:var(--sk-brand)] transition-opacity ${busy || resendIn > 0 ? "opacity-50 cursor-default" : "cursor-pointer hover:opacity-80"}`}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
