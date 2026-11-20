import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { CLUB_LOGIN_URL, LANDING_URL } from '@student/basePath';
import { Eye, EyeOff, Loader2, Compass, QrCode, ClipboardCheck, ChevronLeft } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { login, signup, googleLogin, AuthResult } from '@student/api/auth';
import { fetchPublicStats } from '@student/api/events';
import { useAuthStore } from '@student/store/authStore';
import { useUserStore } from '@student/store/userStore';
import { useEventsStore } from '@student/store/eventsStore';
import { useNotificationsStore } from '@student/store/notificationsStore';
import { isProfileIncomplete } from '@student/types/user';
import { toast } from 'sonner';
import { BRANCHES } from '@student/branches';
import SelectMenu from '@student/components/ui/SelectMenu';
import { saveCredential } from '../../saveCredential';

// ─── Shared Styles ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text)',
  marginBottom: 6,
};

// Focus ring and resting shadow come from `.stu-auth input` in student.css
const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid transparent',
  borderRadius: 'var(--sk-radius-lg)',
  padding: '13px 16px',
  fontSize: 15,
  color: 'var(--text)',
  width: '100%',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const submitBtnStyle: React.CSSProperties = {
  background: 'var(--color-crimson)',
  color: 'var(--sk-on-brand)',
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

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

const googleBtnStyle: React.CSSProperties = {
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--sk-line-strong)',
  boxShadow: 'var(--sk-shadow)',
  borderRadius: 'var(--sk-radius-lg)',
  padding: '13px 24px',
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  transition: 'background 0.15s ease',
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
  if (!v.branch.trim()) errors.branch = 'Select your branch';
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

  const finishSignIn = async (result: AuthResult, message: string) => {
    setSession(result.token, result.userId);
    setCurrentUser(result.user);
    await loadEvents();
    loadNotifications();
    toast.success(message);
    navigate(isProfileIncomplete(result.user) ? '/onboarding' : '/', { replace: true });
  };

  const continueWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        await finishSignIn(await googleLogin(tokenResponse.access_token), 'Signed in successfully!');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => toast.error('Google sign-in failed. Please try again.'),
  });

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
            branch: values.branch,
            phone: values.phone.trim(),
            year: values.year.trim(),
            sem: values.sem.trim(),
          });

      saveCredential(values.email.trim(), values.password.trim(), isLogin ? undefined : values.name.trim());
      await finishSignIn(result, isLogin ? 'Signed in successfully!' : 'Account created successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--color-crimson)');
  const focusOff = (key: keyof FormValues) => (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = errors[key] ? 'var(--sk-danger)' : 'transparent');
  const borderFor = (key: keyof FormValues) => (errors[key] ? 'var(--sk-danger)' : 'transparent');

  const field = (
    key: keyof FormValues,
    label: string,
    placeholder: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        id={`stu-${key}`}
        name={key}
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
      <label style={labelStyle}>Password</label>
      <div style={{ position: 'relative' }}>
        <input
          id="stu-password"
          name="password"
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
    <div className="stu-auth">
      <div className="stu-auth-main">
      <div className="stu-auth-inner">
      {/* Back to the site's landing page (it lives outside the student app, so a full page load) */}
      <a href={LANDING_URL} className="stu-auth-back"><ChevronLeft size={16} /> Back</a>
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
      <div className="stu-seg" role="tablist" style={{ marginBottom: 28 }}>
        {[{ label: 'Sign In', login: true }, { label: 'Sign Up', login: false }].map(({ label, login: tabIsLogin }) => (
          <button
            key={label}
            type="button"
            role="tab"
            className="stu-seg-btn"
            aria-selected={isLogin === tabIsLogin}
            onClick={() => switchTab(tabIsLogin)}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {isLogin ? (
          <>
            {field('email', 'Email', 'Enter your email', { type: 'email', autoComplete: 'username' })}
            {passwordField}
          </>
        ) : (
          <>
            {field('name', 'Full name', 'Enter your full name', { autoComplete: 'name' })}
            {field('email', 'Email', 'Enter your email', { type: 'email', autoComplete: 'username' })}
            {passwordField}
            {field('usn', 'USN', 'Enter valid USN', { style: { ...inputStyle, borderColor: borderFor('usn'), textTransform: 'uppercase' } })}
            {/* Branch: one of the college's branches. It can't be changed after sign-up. */}
            <div>
              <label style={labelStyle}>Branch</label>
              <SelectMenu
                id="stu-branch"
                value={values.branch}
                onChange={setField('branch')}
                options={BRANCHES}
                placeholder="Select your branch"
                invalid={!!errors.branch}
              />
              {errors.branch && <p style={errorStyle}>{errors.branch}</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {field('year', 'Year', '1-4', { inputMode: 'numeric' })}
              {field('sem', 'Semester', '1-8', { inputMode: 'numeric' })}
            </div>
            {field('phone', 'Phone number', '10-digit number', { type: 'tel', inputMode: 'numeric', autoComplete: 'tel' })}
          </>
        )}

        <button type="submit" disabled={isLoading} style={{ ...submitBtnStyle, marginTop: 20, opacity: isLoading ? 0.7 : 1 }}>
          {isLoading
            ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        {/* Google is offered for sign-in only; new accounts are created with the sign-up form */}
        {isLogin && GOOGLE_ENABLED && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--sk-faint)' }}>or</span>
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => continueWithGoogle()}
              style={{ ...googleBtnStyle, opacity: isLoading ? 0.7 : 1 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--raised)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>
          </>
        )}

        {!isLogin && (
          <p style={{ fontSize: 12, color: 'var(--sk-faint)', textAlign: 'center', marginTop: -4 }}>
            By creating an account, you agree to our{' '}
            <Link to="/privacy" style={{ color: 'var(--color-crimson)', fontWeight: 600 }}>
              Terms &amp; Privacy Policy
            </Link>
          </p>
        )}
      </form>

      {isLogin && <div className="stu-auth-info-mobile"><AuthInfo stats={stats} /></div>}

      <p style={{ marginTop: 40, textAlign: 'center', fontSize: 13, color: 'var(--subtext)' }}>
        Running a club?{' '}
        <a href={CLUB_LOGIN_URL} style={{ color: 'var(--color-crimson)', fontWeight: 600 }}>
          Sign in to the club dashboard
        </a>
      </p>
      </div>
      </div>

      {/* Desktop-only side panel */}
      <div className="stu-auth-side stu-auth-side-only">
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '3px', color: 'var(--sk-brand)' }}>SPOTLIGHT</p>
          <h2 style={{ fontSize: 34, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.8px', lineHeight: 1.15, marginTop: 12 }}>
            Every campus event, in one place.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--subtext)', lineHeight: 1.6, marginTop: 12 }}>
            Discover events from every club at Ramaiah Institute of Technology, register solo or as a team, and keep your tickets ready for the door.
          </p>
          <AuthInfo stats={stats} />
        </div>
      </div>
    </div>
  );
}

/** Stats and "Why Spotlight?" — below the form on mobile (sign-in tab), in the side panel on desktop. */
function AuthInfo({ stats }: { stats: { events: number; clubs: number; students: number } }) {
  return (
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
  );
}
