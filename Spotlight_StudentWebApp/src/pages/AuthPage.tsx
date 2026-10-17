import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Compass, QrCode, ClipboardCheck } from 'lucide-react';
import { login, signup } from '@/api/auth';
import { fetchPublicStats } from '@/api/events';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useEventsStore } from '@/store/eventsStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { isProfileIncomplete } from '@/types/user';
import { toast } from 'sonner';

// ─── Shared Styles ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--subtext)',
  letterSpacing: '0.8px',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  borderRadius: 'var(--sk-radius-lg)',
  padding: '15px 18px',
  fontSize: 15,
  color: 'var(--text)',
  width: '100%',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 0.2s ease',
};

const submitBtnStyle: React.CSSProperties = {
  background: 'var(--color-crimson)',
  color: '#fff',
  borderRadius: 'var(--sk-radius-lg)',
  padding: '14px 24px',
  fontWeight: 700,
  fontSize: 16,
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.15s ease, transform 0.1s ease',
  fontFamily: 'var(--font-sans)',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 4,
};

const errorStyle: React.CSSProperties = {
  color: 'var(--sk-danger)',
  fontSize: 12,
  marginTop: 4,
};

// ─── Validation (mirrors auth_screen.dart) ───────────────────────────────────
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

interface FormValues {
  name: string;
  email: string;
  password: string;
  usn: string;
  branch: string;
  year: string;
  sem: string;
  phone: string;
}

const EMPTY_FORM: FormValues = { name: '', email: '', password: '', usn: '', branch: '', year: '', sem: '', phone: '' };

function isSemValid(sem: string, year: string): boolean {
  const s = parseInt(sem.trim(), 10);
  if (isNaN(s)) return false;
  const y = parseInt(year.trim(), 10);
  if (!isNaN(y) && y >= 1 && y <= 4) return s >= y * 2 - 1 && s <= y * 2;
  return s >= 1 && s <= 8;
}

function validate(v: FormValues, isLogin: boolean): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Invalid email';
  if (!v.password.trim()) errors.password = 'Invalid password';
  if (isLogin) return errors;

  if (!v.name.trim()) errors.name = 'Invalid name';
  const usn = v.usn.trim().toUpperCase();
  if (!(usn.startsWith('1MS') && usn.length >= 5)) errors.usn = 'Invalid';
  if (!v.branch.trim()) errors.branch = 'Invalid';
  const y = parseInt(v.year.trim(), 10);
  if (isNaN(y) || y < 1 || y > 4) errors.year = 'Invalid';
  if (!isSemValid(v.sem, v.year)) errors.sem = 'Invalid';
  if (!/^\d{10}$/.test(v.phone.trim())) errors.phone = 'Invalid';
  return errors;
}

// ─── Main Auth Page ──────────────────────────────────────────────────────────
export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ events: 0, clubs: 0, students: 0 });
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const { setCurrentUser } = useUserStore();
  const loadEvents = useEventsStore((s) => s.loadEvents);
  const loadNotifications = useNotificationsStore((s) => s.load);

  useEffect(() => {
    fetchPublicStats()
      .then((s) => setStats({
        events: s.totalEvents ?? s.liveEvents ?? 0,
        clubs: s.clubs ?? 0,
        students: s.totalStudents ?? 0,
      }))
      .catch(() => {});
  }, []);

  const errors = submitted ? validate(values, isLogin) : {};

  const setField = (key: keyof FormValues) => (raw: string) => {
    let val = raw;
    if (key === 'usn') val = raw.toUpperCase();
    if (key === 'year' || key === 'sem') val = raw.replace(/\D/g, '').slice(0, 1);
    if (key === 'phone') val = raw.replace(/\D/g, '').slice(0, 10);
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const switchTab = (targetLogin: boolean) => {
    if (isLogin === targetLogin) return;
    setIsLogin(targetLogin);
    setSubmitted(false);
    setValues(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values, isLogin)).length > 0) return;

    setIsLoading(true);
    try {
      const result = isLogin
        ? await login({ email: values.email.trim(), password: values.password.trim() })
        : await signup({
            email: values.email.trim(),
            password: values.password.trim(),
            name: values.name.trim(),
            usn: values.usn.trim().toUpperCase(),
            branch: values.branch.trim().toUpperCase(),
            phone: values.phone.trim(),
            year: values.year.trim(),
            sem: values.sem.trim(),
          });

      setSession(result.token, result.userId);
      setCurrentUser(result.user);
      await loadEvents();
      loadNotifications();

      toast.success(isLogin ? 'Signed in successfully!' : 'Account created successfully!');
      navigate(isProfileIncomplete(result.user) ? '/onboarding' : '/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--color-crimson)');
  const focusOff = (key: keyof FormValues) => (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = errors[key] ? 'var(--sk-danger)' : 'var(--border)');
  const borderFor = (key: keyof FormValues) => (errors[key] ? 'var(--sk-danger)' : 'var(--border)');

  const field = (
    key: keyof FormValues,
    label: string,
    placeholder: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        value={values[key]}
        onChange={(e) => setField(key)(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, borderColor: borderFor(key) }}
        onFocus={focusOn}
        onBlur={focusOff(key)}
        {...extra}
      />
      {errors[key] && <p style={errorStyle}>{errors[key]}</p>}
    </div>
  );

  const passwordField = (
    <div>
      <label style={labelStyle}>PASSWORD</label>
      <div style={{ position: 'relative' }}>
        <input
          value={values.password}
          onChange={(e) => setField('password')(e.target.value)}
          type={showPassword ? 'text' : 'password'}
          placeholder={isLogin ? 'Enter your password' : 'Create a password'}
          style={{ ...inputStyle, paddingRight: 52, borderColor: borderFor('password') }}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          onFocus={focusOn}
          onBlur={focusOff('password')}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--sk-faint)',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {errors.password && <p style={errorStyle}>{errors.password}</p>}
    </div>
  );

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      padding: '52px 24px 40px',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.5px',
          marginBottom: 8,
          lineHeight: 1.15,
        }}>
          {isLogin ? 'Welcome!' : 'Create Account'}
        </h1>
        <p style={{ color: 'var(--subtext)', fontSize: 15, fontWeight: 400 }}>
          {isLogin ? "Sign in to discover what's happening" : 'Fill in your details to get started'}
        </p>
      </div>

      {/* Pill Tab Switcher */}
      <div style={{
        display: 'flex',
        background: 'var(--raised)',
        borderRadius: 'var(--sk-radius-lg)',
        padding: 4,
        marginBottom: 30,
      }}>
        {[{ label: 'Sign In', login: true }, { label: 'Sign Up', login: false }].map(({ label, login: tabIsLogin }) => {
          const active = isLogin === tabIsLogin;
          return (
            <button
              key={label}
              type="button"
              onClick={() => switchTab(tabIsLogin)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 'var(--sk-radius)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: 15,
                background: active ? 'var(--surface)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--subtext)',
                boxShadow: active ? 'var(--sk-shadow)' : 'none',
                transition: 'all 0.25s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isLogin ? (
          <>
            {field('email', 'EMAIL', 'Enter your email', { type: 'email', autoComplete: 'email' })}
            {passwordField}
          </>
        ) : (
          <>
            {field('name', 'FULL NAME', 'Enter your full name', { autoComplete: 'name' })}
            {field('email', 'EMAIL', 'Enter your email', { type: 'email', autoComplete: 'email' })}
            {passwordField}
            {field('usn', 'USN', 'Enter valid USN', { style: { ...inputStyle, borderColor: borderFor('usn'), textTransform: 'uppercase' } })}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {field('branch', 'BRANCH', 'Branch', { style: { ...inputStyle, borderColor: borderFor('branch'), textTransform: 'uppercase' } })}
              {field('year', 'YEAR', '1-4', { inputMode: 'numeric' })}
              {field('sem', 'SEM', '1-8', { inputMode: 'numeric' })}
            </div>
            {field('phone', 'PHONE NUMBER', '10-digit number', { type: 'tel', inputMode: 'numeric', autoComplete: 'tel' })}
          </>
        )}

        <button type="submit" disabled={isLoading} style={{ ...submitBtnStyle, marginTop: 20, opacity: isLoading ? 0.7 : 1 }}>
          {isLoading
            ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        {!isLogin && (
          <p style={{ fontSize: 12, color: 'var(--sk-faint)', textAlign: 'center', marginTop: -4 }}>
            By creating an account, you agree to our{' '}
            <a href="/privacy" style={{ color: 'var(--color-crimson)', fontWeight: 600 }}>
              Terms &amp; Privacy Policy
            </a>
          </p>
        )}
      </form>

      {isLogin && (
        <>
          {/* Stats Card */}
          <div style={{
            marginTop: 40,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--sk-radius-lg)',
            padding: '20px 8px',
            display: 'flex',
            alignItems: 'center',
          }}>
            {[
              { value: stats.events, label: 'Events' },
              { value: stats.clubs, label: 'Clubs' },
              { value: stats.students, label: 'Students' },
            ].map(({ value, label }, idx) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                {idx > 0 && (
                  <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-crimson)', lineHeight: 1 }}>
                    {value}+
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--sk-faint)', fontWeight: 500, marginTop: 4 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Why Spotlight section */}
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
              Why Spotlight?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: <Compass size={20} />, title: 'Discover campus events', desc: 'Find every workshop, hackathon & fest on campus in real-time.' },
                { icon: <QrCode size={20} />, title: 'Solo or team, register in seconds', desc: "Your QR ticket's ready right after, and it works even without internet." },
                { icon: <ClipboardCheck size={20} />, title: 'Everything in one place', desc: 'Track your active, pending, and past registrations without digging through emails.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{
                    padding: 8,
                    borderRadius: 12,
                    background: 'var(--color-crimson-dim)',
                    color: 'var(--color-crimson)',
                    display: 'flex',
                    flexShrink: 0,
                  }}>
                    {icon}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--subtext)', lineHeight: 1.35 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
