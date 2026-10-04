import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { login, signup, DUMMY_CREDENTIALS } from '@/api/auth';
import { fetchPublicStats } from '@/api/events';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { isProfileIncomplete } from '@/types/user';
import { DEMO_USER } from '@/utils/demoData';
import { toast } from 'sonner';

// ─── Shared Styles ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#888',
  letterSpacing: '0.8px',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1.5px solid #2a2a2a',
  borderRadius: 14,
  padding: '15px 18px',
  fontSize: 15,
  color: '#fff',
  width: '100%',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 0.2s ease',
};

const submitBtnStyle: React.CSSProperties = {
  background: 'var(--color-crimson)',
  color: '#fff',
  borderRadius: 50,
  padding: '16px 24px',
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
  color: 'var(--color-crimson)',
  fontSize: 12,
  marginTop: 4,
};

// ─── Validation Schemas ──────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  usn: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[1-9][A-Z]{2}\d{2}[A-Z]{2}\d{3}$/.test(v.toUpperCase()),
      'Enter a valid USN (e.g., 1AB23CD456)'
    ),
  branch: z.string().optional(),
  phone: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

const BRANCHES = ['CS', 'IS', 'EC', 'ME', 'CV', 'EE', 'AI', 'BT', 'Other'];
const YEARS = ['1', '2', '3', '4'];
const SEMS = ['1', '2', '3', '4', '5', '6', '7', '8'];

// ─── Main Auth Page ──────────────────────────────────────────────────────────
export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false);
  const [stats, setStats] = useState({ totalEvents: 0, clubs: 0, totalStudents: 0 });
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const { setCurrentUser } = useUserStore();

  // Load public stats for the landing display
  useEffect(() => {
    fetchPublicStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  // Login form
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const handleDemoLogin = async () => {
    setIsDemoLoggingIn(true);
    loginForm.setValue('email', DUMMY_CREDENTIALS.email);
    loginForm.setValue('password', DUMMY_CREDENTIALS.password);
    try {
      const result = await login(DUMMY_CREDENTIALS);
      setSession(result.token, result.userId);
      setCurrentUser(result.user || DEMO_USER);
      toast.success('Logged in as Demo Student!');
      navigate('/', { replace: true });
    } catch (e) {
      toast.error(String(e).replace('Error: ', ''));
    } finally {
      setIsDemoLoggingIn(false);
    }
  };

  const handleLogin = loginForm.handleSubmit(async (data) => {
    try {
      const result = await login(data);
      setSession(result.token, result.userId);
      setCurrentUser(result.user);
      if (isProfileIncomplete(result.user)) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) {
      toast.error(String(e).replace('Error: ', ''));
    }
  });

  const handleSignup = signupForm.handleSubmit(async (data) => {
    try {
      const result = await signup({
        ...data,
        usn: data.usn?.toUpperCase() || undefined,
      });
      setSession(result.token, result.userId);
      setCurrentUser(result.user);
      if (isProfileIncomplete(result.user)) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) {
      toast.error(String(e).replace('Error: ', ''));
    }
  });

  const displayEvents = stats.totalEvents > 0 ? stats.totalEvents : 8;
  const displayClubs = stats.clubs > 0 ? stats.clubs : 8;
  const displayStudents = stats.totalStudents > 0 ? stats.totalStudents : 13;

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      padding: '52px 24px 40px',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.5px',
          marginBottom: 8,
          lineHeight: 1.15,
        }}>
          Welcome!
        </h1>
        <p style={{ color: '#888', fontSize: 15, fontWeight: 400 }}>
          {isLogin ? "Sign in to discover what's happening" : 'Join your campus community'}
        </p>
      </div>

      {/* Pill Tab Switcher */}
      <div style={{
        display: 'flex',
        background: '#1c1c1c',
        borderRadius: 50,
        padding: 4,
        marginBottom: 30,
      }}>
        {[{ label: 'Sign In', idx: 0 }, { label: 'Sign Up', idx: 1 }].map(({ label, idx }) => {
          const active = isLogin === (idx === 0);
          return (
            <button
              key={label}
              onClick={() => setIsLogin(idx === 0)}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 50,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: 15,
                background: active ? 'var(--color-crimson)' : 'transparent',
                color: active ? '#fff' : '#777',
                transition: 'all 0.25s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* LOGIN FORM */}
      {isLogin ? (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input
              {...loginForm.register('email')}
              type="email"
              placeholder="Enter your email"
              style={inputStyle}
              autoComplete="email"
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-crimson)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
            />
            {loginForm.formState.errors.email && (
              <p style={errorStyle}>{loginForm.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                {...loginForm.register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                style={{ ...inputStyle, paddingRight: 52 }}
                autoComplete="current-password"
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-crimson)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {loginForm.formState.errors.password && (
              <p style={errorStyle}>{loginForm.formState.errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loginForm.formState.isSubmitting}
            style={submitBtnStyle}
          >
            {loginForm.formState.isSubmitting ? (
              <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Signing in…</>
            ) : 'Sign In'}
          </button>
        </form>
      ) : (
        /* SIGNUP FORM */
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>FULL NAME</label>
            <input
              {...signupForm.register('name')}
              type="text"
              placeholder="Your Name"
              style={inputStyle}
              autoComplete="name"
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-crimson)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
            />
            {signupForm.formState.errors.name && (
              <p style={errorStyle}>{signupForm.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>EMAIL</label>
            <input
              {...signupForm.register('email')}
              type="email"
              placeholder="Enter your email"
              style={inputStyle}
              autoComplete="email"
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-crimson)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
            />
            {signupForm.formState.errors.email && (
              <p style={errorStyle}>{signupForm.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                {...signupForm.register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                style={{ ...inputStyle, paddingRight: 52 }}
                autoComplete="new-password"
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-crimson)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {signupForm.formState.errors.password && (
              <p style={errorStyle}>{signupForm.formState.errors.password.message}</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>USN (OPTIONAL)</label>
            <input
              {...signupForm.register('usn')}
              type="text"
              placeholder="e.g. 1AB23CD456"
              style={{ ...inputStyle, textTransform: 'uppercase' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-crimson)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
            />
            {signupForm.formState.errors.usn && (
              <p style={errorStyle}>{signupForm.formState.errors.usn.message}</p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>BRANCH</label>
              <select
                {...signupForm.register('branch')}
                style={{ ...inputStyle, color: '#fff' }}
              >
                <option value="">Select</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>PHONE</label>
              <input
                {...signupForm.register('phone')}
                type="tel"
                placeholder="10-digit"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-crimson)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
              />
            </div>
          </div>

          <p style={{ fontSize: 11, color: '#666', marginTop: -4 }}>
            By signing up you agree to our{' '}
            <a href="/privacy" style={{ color: 'var(--color-crimson)', textDecoration: 'none' }}>
              Privacy Policy
            </a>
          </p>

          <button
            type="submit"
            disabled={signupForm.formState.isSubmitting}
            style={submitBtnStyle}
          >
            {signupForm.formState.isSubmitting ? (
              <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating account…</>
            ) : 'Create Account'}
          </button>
        </form>
      )}

      {/* Stats Card */}
      <div style={{
        marginTop: 36,
        background: '#111',
        borderRadius: 20,
        padding: '20px 8px',
        display: 'flex',
        alignItems: 'center',
      }}>
        {[
          { value: displayEvents, label: 'Events' },
          { value: displayClubs, label: 'Clubs' },
          { value: displayStudents, label: 'Students' },
        ].map(({ value, label }, idx) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {idx > 0 && (
              <div style={{ width: 1, height: 36, background: '#2a2a2a', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-crimson)', lineHeight: 1 }}>
                {value}+
              </div>
              <div style={{ fontSize: 12, color: '#666', fontWeight: 500, marginTop: 5 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Why Spotlight section */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
          Why Spotlight?
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { emoji: '🎯', title: 'Never Miss an Event', desc: 'Get notified about events from all your favourite clubs in one place.' },
            { emoji: '🎟️', title: 'Easy Registration', desc: 'Register for events and manage your tickets seamlessly.' },
            { emoji: '🏆', title: 'Campus Community', desc: 'Discover clubs, connect with students, and be part of campus life.' },
          ].map(({ emoji, title, desc }) => (
            <div
              key={title}
              style={{
                background: '#111',
                borderRadius: 16,
                padding: '16px 18px',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                border: '1px solid #1e1e1e',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1, marginTop: 1 }}>{emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Login */}
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isDemoLoggingIn}
          style={{
            background: 'none',
            border: 'none',
            color: '#444',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'color 0.2s',
            fontFamily: 'var(--font-sans)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#aaa')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
        >
          {isDemoLoggingIn ? 'Entering demo…' : '⚡ Preview with demo account'}
        </button>
      </div>
    </div>
  );
}

// Helper component for form fields
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && (
        <p style={{ color: 'var(--color-crimson)', fontSize: 12, marginTop: 4 }}>{error}</p>
      )}
    </div>
  );
}
