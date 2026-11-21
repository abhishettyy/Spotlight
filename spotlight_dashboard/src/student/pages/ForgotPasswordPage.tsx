import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { requestPasswordReset, resetPassword, newPasswordProblem } from '@student/api/auth';

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid transparent', borderRadius: 'var(--sk-radius-lg)',
  padding: '13px 16px', fontSize: 15, color: 'var(--text)', width: '100%', fontFamily: 'var(--font-sans)',
  outline: 'none', transition: 'border-color 0.15s ease, box-shadow 0.15s ease', boxSizing: 'border-box',
};
const submitBtnStyle: React.CSSProperties = {
  background: 'var(--color-crimson)', color: 'var(--sk-on-brand)', borderRadius: 'var(--sk-radius-lg)',
  padding: '14px 24px', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-sans)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
const errorStyle: React.CSSProperties = { color: 'var(--sk-danger)', fontSize: 12, marginTop: 4 };
const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-sans)',
  fontSize: 13, fontWeight: 600, color: 'var(--color-crimson)',
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: 'Please enter a valid email address.' });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const message = await requestPasswordReset(email.trim());
      setNotice(message);
      setStep('reset');
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!/^\d{6}$/.test(code.trim())) next.code = 'Enter the 6-digit code from the email.';
    const problem = newPasswordProblem(password);
    if (problem) next.password = problem;
    else if (password !== confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const message = await resetPassword({ email: email.trim(), code: code.trim(), newPassword: password });
      toast.success(message);
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const border = (key: string) => (errors[key] ? 'var(--sk-danger)' : 'transparent');

  return (
    <div className="stu-auth stu-auth--single">
      <div className="stu-auth-inner" style={{ maxWidth: 440 }}>
        <Link to="/login" className="stu-auth-back"><ChevronLeft size={16} /> Back to sign in</Link>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 8, lineHeight: 1.15 }}>
            Forgot password?
          </h1>
          <p style={{ fontSize: 15, color: 'var(--subtext)', lineHeight: 1.5 }}>
            {step === 'email'
              ? "Enter your account's email and we'll send you a 6-digit code to reset your password."
              : notice}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={sendCode} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle} htmlFor="fp-email">Email</label>
              <input
                id="fp-email" name="email" type="email" autoComplete="username" autoFocus
                placeholder="Enter your email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...inputStyle, borderColor: border('email') }}
              />
              {errors.email && <p style={errorStyle}>{errors.email}</p>}
            </div>
            <button type="submit" disabled={busy} style={{ ...submitBtnStyle, opacity: busy ? 0.7 : 1 }}>
              {busy ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending code…</> : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle} htmlFor="fp-code">6-digit code</label>
              <input
                id="fp-code" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
                placeholder="••••••" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ ...inputStyle, borderColor: border('code'), letterSpacing: 6, fontSize: 20, fontWeight: 600 }}
              />
              {errors.code && <p style={errorStyle}>{errors.code}</p>}
            </div>
            <div>
              <label style={labelStyle} htmlFor="fp-password">New password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="fp-password" name="password" autoComplete="new-password"
                  type={showPassword ? 'text' : 'password'} placeholder="Create a new password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 52, borderColor: border('password') }}
                />
                <button
                  type="button" onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sk-faint)', display: 'flex', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password
                ? <p style={errorStyle}>{errors.password}</p>
                : <p style={{ fontSize: 12, color: 'var(--sk-faint)', marginTop: 4 }}>At least 8 characters, with an uppercase letter, a number and a special character.</p>}
            </div>
            <div>
              <label style={labelStyle} htmlFor="fp-confirm">Confirm new password</label>
              <input
                id="fp-confirm" name="confirm" autoComplete="new-password"
                type={showPassword ? 'text' : 'password'} placeholder="Enter it again" value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={{ ...inputStyle, borderColor: border('confirm') }}
              />
              {errors.confirm && <p style={errorStyle}>{errors.confirm}</p>}
            </div>
            <button type="submit" disabled={busy} style={{ ...submitBtnStyle, opacity: busy ? 0.7 : 1 }}>
              {busy ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Reset Password'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" style={{ ...linkBtnStyle, color: 'var(--subtext)' }}
                onClick={() => { setStep('email'); setCode(''); setErrors({}); }}>
                Use a different email
              </button>
              <button type="button" disabled={busy || resendIn > 0} onClick={() => sendCode()}
                style={{ ...linkBtnStyle, opacity: busy || resendIn > 0 ? 0.5 : 1, cursor: resendIn > 0 ? 'default' : 'pointer' }}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
