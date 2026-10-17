import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Plus,
  LogOut,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';

const FC = 'var(--sk-font)';
const F_LOGO = 'var(--sk-font)';
const FM = 'var(--sk-mono)';
const FB = 'var(--sk-font)';

interface RegistrationKeyRecord {
  id: string;
  code: string;
  isUsed: boolean;
  usedByClubId?: string | null;
  usedByClub?: { id: string; name: string; email: string } | null;
  createdAt: string;
  usedAt?: string | null;
}

let rawAdminBase = String((import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api')
  .replace(/\s+/g, '')
  .trim()
  .replace(/\/+$/, '');
if (!rawAdminBase.endsWith('/api')) {
  rawAdminBase += '/api';
}
const API_BASE = rawAdminBase;

export default function AdminConsole() {
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem('spotlight_admin_auth') === 'true' && Boolean(localStorage.getItem('spotlight_admin_secret'))
  );
  const [authError, setAuthError] = useState<string | null>(null);

  const [keys, setKeys] = useState<RegistrationKeyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [customCodeInput, setCustomCodeInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used'>('all');

  const [showPwModal, setShowPwModal] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const closePwModal = () => {
    setShowPwModal(false);
    setOldPw(''); setNewPw(''); setConfirmPw(''); setShowPw(false); setPwError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!oldPw || !newPw) { setPwError('Enter your old and new password.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return; }
    if (newPw === oldPw) { setPwError('New password must be different from the old one.'); return; }
    setPwSaving(true);
    try {
      const token = localStorage.getItem('spotlight_admin_secret') || '';
      const res = await fetch(`${API_BASE}/clubs/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update password.');
      closePwModal();
      setActionSuccess('Admin password updated.');
    } catch (err: any) {
      setPwError(err.message || 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('spotlight_admin_secret') || '';
      const res = await fetch(`${API_BASE}/clubs/registration-keys`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await res.json();
      if (res.status === 403 || res.status === 401) {
        localStorage.removeItem('spotlight_admin_auth');
        localStorage.removeItem('spotlight_admin_secret');
        setIsAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to fetch registration keys');
      setKeys(data.keys || []);
    } catch (err: any) {
      const msg = err.message === 'Failed to fetch'
        ? `Cannot connect to backend server at ${API_BASE}. Please ensure backend server is running.`
        : (err.message || 'Error connecting to backend server.');
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchKeys();
    }
  }, [isAuthenticated, fetchKeys]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasscode.trim()) {
      setAuthError('Please enter the admin password');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/clubs/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ password: adminPasscode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Incorrect admin password.');
      }
      localStorage.setItem('spotlight_admin_secret', data.token);
      localStorage.setItem('spotlight_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect admin password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('spotlight_admin_auth');
    localStorage.removeItem('spotlight_admin_secret');
    setAdminPasscode('');
  };

  const handleGenerateKey = async (codeToUse?: string) => {
    setGenerating(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const token = localStorage.getItem('spotlight_admin_secret') || '';
      const res = await fetch(`${API_BASE}/clubs/registration-keys/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ customCode: codeToUse }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate key');
      }
      setActionSuccess(`Successfully generated key: ${data.key.code}`);
      setCustomCodeInput('');
      fetchKeys();
    } catch (err: any) {
      setActionError(err.message || 'Could not generate registration key');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  }, []);

  const activeKey = useMemo(() => keys.find(k => !k.isUsed), [keys]);
  const usedKeys = useMemo(() => keys.filter(k => k.isUsed), [keys]);

  const filteredKeys = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return keys.filter(k => {
      const matchesSearch = !query || k.code.toLowerCase().includes(query) ||
        (k.usedByClubId ?? '').toLowerCase().includes(query) ||
        (k.usedByClub?.name ?? '').toLowerCase().includes(query) ||
        (k.usedByClub?.email ?? '').toLowerCase().includes(query);
      if (statusFilter === 'active') return matchesSearch && !k.isUsed;
      if (statusFilter === 'used') return matchesSearch && k.isUsed;
      return matchesSearch;
    });
  }, [keys, searchQuery, statusFilter]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-ad-ink text-ad-fg">
        <div className="ad-card w-full max-w-md p-6 sm:p-10">
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 sm:mb-4 overflow-hidden p-1.5 bg-ad-raised border border-ad-line">
              <img src="/logo.png" alt="Spotlight Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <span className="text-[10px] sm:text-xs tracking-wider uppercase text-ad-muted mb-1" style={{ fontFamily: F_LOGO }}>SPOTLIGHT</span>
            <h1 className="text-xl sm:text-2xl font-bold text-ad-fg text-center" style={{ fontFamily: FC }}>Admin Portal</h1>
            <p className="text-xs text-ad-muted mt-1 text-center" style={{ fontFamily: FB }}>Developer Key Management Console</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-ad-muted block" style={{ fontFamily: FM }}>Admin Password</label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-ad-raised border border-ad-line text-ad-fg text-sm outline-none focus:border-ad-brand transition-all"
                  style={{ fontFamily: FB }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ad-faint hover:text-ad-fg transition-all p-1 bg-transparent border-none outline-none flex items-center justify-center cursor-pointer active:scale-95"
                  style={{ background: 'transparent' }}
                  aria-label={showPasscode ? "Hide password" : "Show password"}
                >
                  {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-ad-danger/10 border border-ad-danger/20 text-ad-danger text-xs flex items-center gap-2" style={{ fontFamily: FB }}>
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-ad-brand hover:bg-[var(--sk-brand-hover)] text-ad-fg text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer active:scale-98"
              style={{ fontFamily: FB }}
            >
              Authenticate Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ad-ink text-ad-fg p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-ad-line">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center overflow-hidden p-1.5 flex-shrink-0 bg-ad-raised border border-ad-line">
            <img src="/logo.png" alt="Spotlight Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs tracking-[0.12em] text-ad-muted font-semibold" style={{ fontFamily: F_LOGO }}>SPOTLIGHT</span>
              <span className="text-[10px] bg-ad-danger/10 text-ad-danger border border-ad-danger/20 px-2 py-0.5 rounded font-bold" style={{ fontFamily: FM }}>ADMIN PORTAL</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-ad-fg mt-0.5" style={{ fontFamily: FC }}>Club Registration Keys</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchKeys}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-ad-muted hover:text-ad-fg bg-ad-raised hover:bg-ad-line border border-ad-line transition-all cursor-pointer active:scale-95"
            style={{ fontFamily: FB }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => setShowPwModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-ad-muted hover:text-ad-fg bg-ad-raised hover:bg-ad-line border border-ad-line transition-all cursor-pointer active:scale-95"
            style={{ fontFamily: FB }}
          >
            <KeyRound size={14} /> Change Password
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-ad-danger bg-ad-danger/10 hover:bg-ad-danger/20 border border-ad-danger/20 transition-all cursor-pointer active:scale-95"
            style={{ fontFamily: FB }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closePwModal}>
          <form onSubmit={handleChangePassword} onClick={e => e.stopPropagation()} className="ad-card w-full max-w-md p-6 sm:p-8 space-y-4 bg-ad-ink">
            <h2 className="text-lg font-bold text-ad-fg" style={{ fontFamily: FC }}>Change Password</h2>
            {[
              { label: 'Old password', value: oldPw, set: setOldPw, auto: 'current-password' },
              { label: 'New password', value: newPw, set: setNewPw, auto: 'new-password' },
              { label: 'Confirm new password', value: confirmPw, set: setConfirmPw, auto: 'new-password' },
            ].map(f => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-widest text-ad-muted block" style={{ fontFamily: FM }}>{f.label}</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={f.value}
                  autoComplete={f.auto}
                  onChange={e => f.set(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-ad-raised border border-ad-line text-ad-fg text-sm outline-none focus:border-ad-brand transition-all"
                  style={{ fontFamily: FB }}
                />
              </div>
            ))}
            <button type="button" onClick={() => setShowPw(v => !v)} className="flex items-center gap-1.5 text-xs text-ad-muted hover:text-ad-fg cursor-pointer" style={{ fontFamily: FB }}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />} {showPw ? 'Hide' : 'Show'} passwords
            </button>
            {pwError && (
              <div className="p-3 rounded-xl bg-ad-danger/10 border border-ad-danger/20 text-ad-danger text-xs flex items-center gap-2" style={{ fontFamily: FB }}>
                <AlertCircle size={14} className="flex-shrink-0" /><span>{pwError}</span>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closePwModal} className="flex-1 py-3 rounded-xl text-sm font-semibold text-ad-muted bg-ad-raised border border-ad-line cursor-pointer" style={{ fontFamily: FB }}>Cancel</button>
              <button type="submit" disabled={pwSaving} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-ad-brand cursor-pointer disabled:opacity-60" style={{ fontFamily: FB }}>{pwSaving ? 'Saving...' : 'Update Password'}</button>
            </div>
          </form>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-ad-danger/10 border border-ad-danger/20 text-ad-danger text-xs sm:text-sm flex items-center justify-between gap-2" style={{ fontFamily: FB }}>
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-xs underline cursor-pointer flex-shrink-0">Dismiss</button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-ad-ok text-xs sm:text-sm flex items-center justify-between gap-2" style={{ fontFamily: FB }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs underline cursor-pointer flex-shrink-0">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        <div className="ad-card p-4 sm:p-6">
          <p className="text-[10px] sm:text-[11px] tracking-wider uppercase text-ad-muted" style={{ fontFamily: FM }}>Active Unused Key</p>
          <p className="text-lg sm:text-xl font-bold text-ad-ok mt-1.5 font-mono truncate">{activeKey ? activeKey.code : 'None (Generating...)'}</p>
          <p className="text-[11px] sm:text-xs text-ad-faint mt-1" style={{ fontFamily: FB }}>Ready to share with a new club</p>
        </div>

        <div className="ad-card p-4 sm:p-6">
          <p className="text-[10px] sm:text-[11px] tracking-wider uppercase text-ad-muted" style={{ fontFamily: FM }}>Total Keys Created</p>
          <p className="text-2xl sm:text-3xl font-bold text-ad-fg mt-1.5" style={{ fontFamily: FC }}>{keys.length}</p>
          <p className="text-[11px] sm:text-xs text-ad-faint mt-1" style={{ fontFamily: FB }}>Historical invite codes created</p>
        </div>

        <div className="ad-card p-4 sm:p-6">
          <p className="text-[10px] sm:text-[11px] tracking-wider uppercase text-ad-muted" style={{ fontFamily: FM }}>Keys Redeemed / Used</p>
          <p className="text-2xl sm:text-3xl font-bold text-ad-info mt-1.5" style={{ fontFamily: FC }}>{usedKeys.length}</p>
          <p className="text-[11px] sm:text-xs text-ad-faint mt-1" style={{ fontFamily: FB }}>Clubs successfully registered</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        <div className="ad-card p-5 sm:p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full bg-ad-ok/10 text-ad-ok border border-ad-ok/20 font-bold" style={{ fontFamily: FM }}>READY TO USE</span>
            <Sparkles size={18} className="text-ad-brand" />
          </div>

          <h2 className="text-base sm:text-lg font-bold text-ad-fg" style={{ fontFamily: FB }}>Current Active Authorization Key</h2>
          <p className="text-xs text-ad-muted mt-1" style={{ fontFamily: FB }}>Share this key with the next college club looking to register on Spotlight.</p>

          <div className="my-4 sm:my-6 p-3.5 sm:p-4 rounded-xl bg-ad-raised border border-ad-line flex items-center justify-between gap-3">
            <span className="text-sm sm:text-xl md:text-2xl font-bold tracking-wider sm:tracking-widest text-ad-fg select-all font-mono break-all">
              {activeKey ? activeKey.code : 'Generating...'}
            </span>
            {activeKey && (
              <button
                onClick={() => handleCopy(activeKey.code)}
                className="px-3.5 py-2 rounded-xl bg-ad-raised hover:bg-ad-line text-ad-fg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 active:scale-95"
                style={{ fontFamily: FB }}
              >
                {copiedCode === activeKey.code ? <><Check size={14} className="text-ad-ok" /> Copied!</> : <><Copy size={14} /> Copy</>}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGenerateKey()}
              disabled={generating}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-ad-brand hover:bg-[var(--sk-brand-hover)] text-ad-fg text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
              style={{ fontFamily: FB }}
            >
              <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
              {generating ? "Generating..." : "Generate New Key"}
            </button>
          </div>
        </div>

        <div className="ad-card p-5 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Plus size={18} className="text-ad-muted" />
              <h2 className="text-base sm:text-lg font-bold text-ad-fg" style={{ fontFamily: FB }}>Create Custom Invite Code</h2>
            </div>
            <p className="text-xs text-ad-muted" style={{ fontFamily: FB }}>Need a custom code for a specific club? Enter custom name below.</p>

            <div className="mt-4 sm:mt-6 space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-ad-muted block" style={{ fontFamily: FM }}>Custom Code (Optional)</label>
              <input
                type="text"
                placeholder="e.g. CLUB-ROTARACT-2026"
                value={customCodeInput}
                onChange={e => setCustomCodeInput(e.target.value.toUpperCase())}
                className="w-full rounded-xl px-4 py-3 text-xs sm:text-sm text-ad-fg outline-none transition-all uppercase tracking-widest bg-ad-raised border border-ad-line focus:border-ad-line"
                style={{ fontFamily: FM }}
              />
            </div>
          </div>

          <div className="mt-5 sm:mt-6">
            <button
              onClick={() => handleGenerateKey(customCodeInput)}
              disabled={generating}
              className="w-full py-3 rounded-xl bg-ad-raised hover:bg-ad-line text-ad-fg text-xs font-semibold border border-ad-line transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
              style={{ fontFamily: FB }}
            >
              <Plus size={14} /> Create Custom Code
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2 sm:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ad-fg" style={{ fontFamily: FB }}>All Registration Keys ({filteredKeys.length})</h2>
            <p className="text-xs text-ad-muted mt-0.5" style={{ fontFamily: FB }}>Historical single-use keys and usage details.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search key or club..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-ad-raised border border-ad-line rounded-xl px-4 py-2 pl-9 text-xs text-ad-fg placeholder-ad-faint focus:outline-none focus:border-ad-line transition-all"
                style={{ fontFamily: FB }}
              />
              <Search size={14} className="absolute left-3 top-2.5 text-ad-faint" />
            </div>

            <div className="flex p-1 rounded-xl bg-ad-raised border border-ad-line text-xs justify-between sm:justify-start">
              {(['all', 'active', 'used'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer text-center ${statusFilter === f ? 'bg-ad-raised text-ad-fg font-bold' : 'text-ad-muted hover:text-ad-fg'}`}
                  style={{ fontFamily: FB }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile View: Clean Responsive Cards */}
        <div className="block md:hidden space-y-3">
          {filteredKeys.map(k => (
            <div key={k.id} className="p-4 rounded-xl bg-ad-surface border border-ad-line space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-xs text-ad-fg tracking-wider bg-ad-raised px-2.5 py-1 rounded-lg border border-ad-line select-all break-all">
                  {k.code}
                </span>
                {k.isUsed ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-ad-info/10 text-ad-info border border-ad-info/20 font-bold flex-shrink-0" style={{ fontFamily: FM }}>
                    <XCircle size={10} /> USED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-ad-ok/10 text-ad-ok border border-ad-ok/20 font-bold flex-shrink-0" style={{ fontFamily: FM }}>
                    <CheckCircle2 size={10} /> ACTIVE
                  </span>
                )}
              </div>

              {k.usedByClub ? (
                <div className="p-2.5 rounded-xl bg-ad-surface border border-ad-line text-xs">
                  <p className="text-ad-fg font-semibold" style={{ fontFamily: FB }}>{k.usedByClub.name}</p>
                  <p className="text-ad-faint text-[11px] font-mono mt-0.5 truncate">{k.usedByClub.email}</p>
                </div>
              ) : null}

              <div className="flex items-center justify-between text-[11px] text-ad-faint font-mono pt-1 border-t border-ad-line">
                <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                {!k.isUsed && (
                  <button
                    onClick={() => handleCopy(k.code)}
                    className="px-3 py-1 rounded-lg bg-ad-raised text-ad-fg text-xs font-semibold cursor-pointer active:scale-95"
                    style={{ fontFamily: FB }}
                  >
                    {copiedCode === k.code ? 'Copied' : 'Copy Key'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredKeys.length === 0 && (
            <div className="p-6 text-center text-xs text-ad-faint rounded-xl bg-ad-surface border border-ad-line" style={{ fontFamily: FB }}>
              No registration keys found matching criteria.
            </div>
          )}
        </div>

        {/* Desktop View: Full Formatted Table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-ad-line bg-ad-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-ad-line bg-ad-surface">
                <th className="p-4 text-[11px] tracking-wider uppercase text-ad-muted" style={{ fontFamily: FM }}>Registration Code</th>
                <th className="p-4 text-[11px] tracking-wider uppercase text-ad-muted" style={{ fontFamily: FM }}>Status</th>
                <th className="p-4 text-[11px] tracking-wider uppercase text-ad-muted" style={{ fontFamily: FM }}>Used By Club</th>
                <th className="p-4 text-[11px] tracking-wider uppercase text-ad-muted" style={{ fontFamily: FM }}>Created At</th>
                <th className="p-4 text-[11px] tracking-wider uppercase text-ad-muted" style={{ fontFamily: FM }}>Used At</th>
                <th className="p-4 text-[11px] tracking-wider uppercase text-ad-muted text-right" style={{ fontFamily: FM }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ad-line text-xs">
              {filteredKeys.map(k => (
                <tr key={k.id} className="hover:bg-ad-raised/50 transition-colors">
                  <td className="p-4">
                    <span className="font-mono font-semibold text-ad-fg tracking-wider bg-ad-raised px-2.5 py-1 rounded-lg border border-ad-line select-all">
                      {k.code}
                    </span>
                  </td>
                  <td className="p-4">
                    {k.isUsed ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-ad-info/10 text-ad-info border border-ad-info/20 font-bold" style={{ fontFamily: FM }}>
                        <XCircle size={12} /> USED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-ad-ok/10 text-ad-ok border border-ad-ok/20 font-bold" style={{ fontFamily: FM }}>
                        <CheckCircle2 size={12} /> ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {k.usedByClub ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-ad-fg text-xs font-semibold" style={{ fontFamily: FB }}>{k.usedByClub.name}</span>
                        <span className="text-ad-faint text-[11px] font-mono">{k.usedByClub.email}</span>
                      </div>
                    ) : k.usedByClubId ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-ad-warn text-xs font-semibold" style={{ fontFamily: FB }}>Club ID on record</span>
                        <span className="text-ad-faint text-[10px] font-mono truncate max-w-[140px]">{k.usedByClubId}</span>
                      </div>
                    ) : (
                      <span className="text-ad-faint text-xs" style={{ fontFamily: FB }}>—</span>
                    )}
                  </td>
                  <td className="p-4 text-ad-muted font-mono">
                    {new Date(k.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-ad-muted font-mono">
                    {k.usedAt ? new Date(k.usedAt).toLocaleString() : '—'}
                  </td>
                  <td className="p-4 text-right">
                    {!k.isUsed && (
                      <button
                        onClick={() => handleCopy(k.code)}
                        className="px-3 py-1.5 rounded-lg bg-ad-raised hover:bg-ad-line text-ad-muted hover:text-ad-fg transition-all text-xs font-semibold cursor-pointer active:scale-95"
                        style={{ fontFamily: FB }}
                      >
                        {copiedCode === k.code ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredKeys.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ad-faint" style={{ fontFamily: FB }}>
                    No registration keys found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
