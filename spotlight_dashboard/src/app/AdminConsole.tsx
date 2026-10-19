import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Plus,
  LogOut,
  Search,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { ThemeToggle } from './theme';
import { BASE_URL } from './api';

const FM = 'var(--sk-mono)';

interface RegistrationKeyRecord {
  id: string;
  code: string;
  isUsed: boolean;
  usedByClubId?: string | null;
  usedByClub?: { id: string; name: string; email: string } | null;
  createdAt: string;
  usedAt?: string | null;
}

type StatusFilter = 'all' | 'active' | 'used';

const API_BASE = BASE_URL;
const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

const TOKEN_KEY = 'spotlight_admin_secret';
const AUTH_KEY = 'spotlight_admin_auth';

function adminFetch(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
      ...init.headers,
    },
  });
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// ── Small building blocks ────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 px-3 rounded-lg bg-ad-raised border border-ad-line text-sm text-ad-fg placeholder:text-ad-faint outline-none focus:border-ad-brand transition-colors';

const btnBase =
  'inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
const btnPrimary = `${btnBase} bg-ad-brand text-white hover:bg-[var(--sk-brand-hover)]`;
const btnSecondary = `${btnBase} bg-ad-surface text-ad-fg border border-ad-line hover:bg-ad-raised`;
const btnGhost = `${btnBase} text-ad-muted hover:text-ad-fg hover:bg-ad-raised`;

function Notice({ tone, children, onDismiss }: { tone: 'error' | 'success'; children: React.ReactNode; onDismiss?: () => void }) {
  const isError = tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 px-3.5 py-3 rounded-lg border text-sm ${
        isError ? 'bg-ad-danger/10 border-ad-danger/25 text-ad-danger' : 'bg-ad-ok/10 border-ad-ok/25 text-ad-ok'
      }`}
    >
      {isError ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
      <span className="flex-1 min-w-0">{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function StatusBadge({ used }: { used: boolean }) {
  return used ? (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border border-ad-line bg-ad-raised text-ad-muted">
      <span className="w-1.5 h-1.5 rounded-full bg-ad-faint" /> Used
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border border-ad-ok/25 bg-ad-ok/10 text-ad-ok">
      <span className="w-1.5 h-1.5 rounded-full bg-ad-ok" /> Available
    </span>
  );
}

function CopyButton({ code, copied, onCopy, label = 'Copy' }: { code: string; copied: boolean; onCopy: (c: string) => void; label?: string }) {
  return (
    <button onClick={() => onCopy(code)} className={btnSecondary} aria-label={`Copy ${code}`}>
      {copied ? <Check size={15} className="text-ad-ok" /> : <Copy size={15} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function Pagination({
  total, page, pageSize, onPage, onPageSize,
}: { total: number; page: number; pageSize: number; onPage: (n: number) => void; onPageSize: (n: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | '…')[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) pages.push(n);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  const navBtn =
    'h-8 min-w-8 px-2 inline-flex items-center justify-center rounded-md text-xs border border-ad-line bg-ad-surface text-ad-fg hover:bg-ad-raised transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-ad-line bg-ad-raised/60 text-xs text-ad-muted">
      <div className="flex items-center gap-4">
        <span className="tabular">{from}–{to} of {total}</span>
        <label className="flex items-center gap-1.5">
          Rows per page
          <select
            value={pageSize}
            onChange={e => onPageSize(Number(e.target.value))}
            className="h-7 rounded-md px-1.5 bg-ad-surface border border-ad-line text-ad-fg outline-none cursor-pointer"
          >
            {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button className={navBtn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={14} />
        </button>
        {pages.map((n, i) =>
          n === '…' ? (
            <span key={`gap${i}`} className="px-1">…</span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={n === page ? `${navBtn} !bg-ad-brand !border-ad-brand !text-white` : navBtn}
            >
              {n}
            </button>
          )
        )}
        <button className={navBtn} disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={14} />
        </button>
      </nav>
    </div>
  );
}

// ── Console ──────────────────────────────────────────────────────────────────

export default function AdminConsole() {
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem(AUTH_KEY) === 'true' && Boolean(localStorage.getItem(TOKEN_KEY))
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [keys, setKeys] = useState<RegistrationKeyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [customCodeInput, setCustomCodeInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showPwModal, setShowPwModal] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const signOut = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
    setAdminPasscode('');
    setKeys([]);
  }, []);

  const closePwModal = () => {
    setShowPwModal(false);
    setOldPw(''); setNewPw(''); setConfirmPw(''); setShowPw(false); setPwError(null);
  };

  useEffect(() => {
    if (!showPwModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePwModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPwModal]);

  // Success messages clear themselves; errors stay until dismissed
  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [actionSuccess]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!oldPw || !newPw) { setPwError('Enter your current and new password.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return; }
    if (newPw === oldPw) { setPwError('New password must be different from the current one.'); return; }
    setPwSaving(true);
    try {
      const res = await adminFetch('/clubs/admin/change-password', {
        method: 'POST',
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
      const res = await adminFetch('/clubs/registration-keys');
      if (res.status === 401 || res.status === 403) {
        signOut();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch registration keys');
      setKeys(data.keys || []);
    } catch (err: any) {
      const msg = err.message === 'Failed to fetch'
        ? `Cannot reach the server at ${API_BASE}. Check that the backend is running.`
        : (err.message || 'Error connecting to the server.');
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    if (isAuthenticated) fetchKeys();
  }, [isAuthenticated, fetchKeys]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasscode.trim()) {
      setAuthError('Enter the admin password.');
      return;
    }
    setSigningIn(true);
    try {
      const res = await fetch(`${API_BASE}/clubs/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ password: adminPasscode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect admin password.');
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : (err.message || 'Incorrect admin password.'));
    } finally {
      setSigningIn(false);
    }
  };

  const handleGenerateKey = async (codeToUse?: string) => {
    setGenerating(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await adminFetch('/clubs/registration-keys/generate', {
        method: 'POST',
        body: JSON.stringify({ customCode: codeToUse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate key');
      setActionSuccess(`Created key ${data.key.code}`);
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
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const activeKey = useMemo(() => keys.find(k => !k.isUsed), [keys]);
  const counts = useMemo(() => {
    const used = keys.filter(k => k.isUsed).length;
    return { all: keys.length, active: keys.length - used, used };
  }, [keys]);

  const filteredKeys = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return keys.filter(k => {
      if (statusFilter === 'active' && k.isUsed) return false;
      if (statusFilter === 'used' && !k.isUsed) return false;
      return !query ||
        k.code.toLowerCase().includes(query) ||
        (k.usedByClubId ?? '').toLowerCase().includes(query) ||
        (k.usedByClub?.name ?? '').toLowerCase().includes(query) ||
        (k.usedByClub?.email ?? '').toLowerCase().includes(query);
    });
  }, [keys, searchQuery, statusFilter]);

  // Back to the first page whenever the visible set changes shape
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageKeys = filteredKeys.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ── Sign-in ────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-ad-ink text-ad-fg">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <img src={LOGO_SRC} alt="" className="w-9 h-9 rounded-lg border border-ad-line bg-ad-surface object-contain p-1" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">Spotlight</p>
              <p className="text-xs text-ad-muted">Admin console</p>
            </div>
          </div>

          <div className="ad-card p-6">
            <h1 className="text-lg font-semibold">Sign in</h1>
            <p className="text-sm text-ad-muted mt-1">Manage club registration keys.</p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="text-sm font-medium block">Password</label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPasscode ? 'text' : 'password'}
                    autoComplete="current-password"
                    autoFocus
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ad-faint hover:text-ad-fg cursor-pointer"
                    aria-label={showPasscode ? 'Hide password' : 'Show password'}
                  >
                    {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {authError && <Notice tone="error">{authError}</Notice>}

              <button type="submit" disabled={signingIn} className={`${btnPrimary} w-full h-10`}>
                {signingIn ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Console ────────────────────────────────────────────────────────────────
  const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Available' },
    { id: 'used', label: 'Used' },
  ];

  return (
    <div className="min-h-screen bg-ad-ink text-ad-fg">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-ad-line bg-ad-surface/90 backdrop-blur">
        <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={LOGO_SRC} alt="" className="w-7 h-7 rounded-md border border-ad-line object-contain p-0.5" />
            <span className="text-sm font-semibold">Spotlight</span>
            <span className="text-xs px-1.5 py-0.5 rounded border border-ad-line text-ad-muted">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="mr-1" />
            <button onClick={() => setShowPwModal(true)} className={btnGhost} aria-label="Change password">
              <KeyRound size={16} /> <span className="hidden sm:inline">Password</span>
            </button>
            <button onClick={signOut} className={btnGhost} aria-label="Sign out">
              <LogOut size={16} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Registration keys</h1>
            <p className="text-sm text-ad-muted mt-1">Single-use invite codes that let a new club create its dashboard account.</p>
          </div>
          <button onClick={fetchKeys} disabled={loading} className={btnSecondary}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {actionError && <Notice tone="error" onDismiss={() => setActionError(null)}>{actionError}</Notice>}
        {actionSuccess && <Notice tone="success" onDismiss={() => setActionSuccess(null)}>{actionSuccess}</Notice>}

        {/* Stats */}
        <div className="ad-card grid grid-cols-3 divide-x divide-ad-line">
          {[
            { label: 'Total keys', value: counts.all },
            { label: 'Available', value: counts.active },
            { label: 'Redeemed', value: counts.used },
          ].map(s => (
            <div key={s.label} className="px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-xs text-ad-muted">{s.label}</p>
              <p className="text-2xl font-semibold mt-1 tabular">{loading && keys.length === 0 ? '–' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Issue keys */}
        <section className="ad-card grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-ad-line">
          <div className="p-5 sm:p-6">
            <h2 className="text-sm font-semibold">Next key to share</h2>
            <p className="text-sm text-ad-muted mt-1">Send this to the next club that signs up. It stops working once used.</p>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <code
                className="flex-1 min-w-0 h-11 px-3.5 flex items-center rounded-lg bg-ad-raised border border-ad-line text-base font-semibold tracking-wider select-all truncate"
                style={{ fontFamily: FM }}
              >
                {activeKey ? activeKey.code : <span className="text-ad-faint font-normal">{loading ? 'Loading…' : 'No key available'}</span>}
              </code>
              <div className="flex gap-2">
                {activeKey && <CopyButton code={activeKey.code} copied={copiedCode === activeKey.code} onCopy={handleCopy} />}
                <button onClick={() => handleGenerateKey()} disabled={generating} className={btnPrimary}>
                  <RefreshCw size={15} className={generating ? 'animate-spin' : ''} /> New key
                </button>
              </div>
            </div>
          </div>

          <form
            className="p-5 sm:p-6 border-t lg:border-t-0 border-ad-line"
            onSubmit={(e) => { e.preventDefault(); if (customCodeInput.trim()) handleGenerateKey(customCodeInput.trim()); }}
          >
            <h2 className="text-sm font-semibold">Custom code</h2>
            <p className="text-sm text-ad-muted mt-1">Create a readable code for a specific club.</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. ROTARACT-2026"
                value={customCodeInput}
                onChange={e => setCustomCodeInput(e.target.value.toUpperCase())}
                className={`${inputCls} h-11 tracking-wider`}
                style={{ fontFamily: FM }}
                aria-label="Custom code"
              />
              <button type="submit" disabled={generating || !customCodeInput.trim()} className={`${btnSecondary} h-11`}>
                <Plus size={15} /> Create
              </button>
            </div>
          </form>
        </section>

        {/* Key list */}
        <section className="ad-card overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-b border-ad-line">
            <div className="inline-flex p-0.5 rounded-lg bg-ad-raised border border-ad-line self-start" role="tablist">
              {filterTabs.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={statusFilter === t.id}
                  onClick={() => setStatusFilter(t.id)}
                  className={`h-8 px-3 rounded-md text-sm transition-colors cursor-pointer ${
                    statusFilter === t.id ? 'bg-ad-surface text-ad-fg font-medium shadow-sm' : 'text-ad-muted hover:text-ad-fg'
                  }`}
                >
                  {t.label} <span className="text-ad-faint tabular ml-0.5">{counts[t.id]}</span>
                </button>
              ))}
            </div>
            <div className="relative md:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ad-faint pointer-events-none" />
              <input
                type="search"
                placeholder="Search code or club"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`${inputCls} h-9 pl-9`}
                aria-label="Search keys"
              />
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-ad-muted">
                <tr className="border-b border-ad-line">
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Club</th>
                  <th className="px-4 py-2.5 font-medium">Created</th>
                  <th className="px-4 py-2.5 font-medium">Redeemed</th>
                  <th className="px-4 py-2.5 font-medium w-24"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ad-line">
                {pageKeys.map(k => (
                  <tr key={k.id} className="hover:bg-ad-raised/50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="font-semibold tracking-wide select-all" style={{ fontFamily: FM }}>{k.code}</code>
                    </td>
                    <td className="px-4 py-3"><StatusBadge used={k.isUsed} /></td>
                    <td className="px-4 py-3">
                      {k.usedByClub ? (
                        <div className="leading-tight">
                          <p className="font-medium">{k.usedByClub.name}</p>
                          <p className="text-xs text-ad-faint mt-0.5">{k.usedByClub.email}</p>
                        </div>
                      ) : k.usedByClubId ? (
                        <span className="text-xs text-ad-warn" title={k.usedByClubId}>Club removed</span>
                      ) : (
                        <span className="text-ad-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ad-muted tabular whitespace-nowrap">
                      {formatDate(k.createdAt)} <span className="text-ad-faint">{formatTime(k.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-ad-muted tabular whitespace-nowrap">
                      {k.usedAt ? <>{formatDate(k.usedAt)} <span className="text-ad-faint">{formatTime(k.usedAt)}</span></> : <span className="text-ad-faint">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {!k.isUsed && (
                        <button
                          onClick={() => handleCopy(k.code)}
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs text-ad-muted hover:text-ad-fg hover:bg-ad-raised cursor-pointer"
                        >
                          {copiedCode === k.code ? <Check size={14} className="text-ad-ok" /> : <Copy size={14} />}
                          {copiedCode === k.code ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="md:hidden divide-y divide-ad-line">
            {pageKeys.map(k => (
              <li key={k.id} className="px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <code className="text-sm font-semibold tracking-wide break-all select-all" style={{ fontFamily: FM }}>{k.code}</code>
                  <StatusBadge used={k.isUsed} />
                </div>
                {k.usedByClub && (
                  <p className="text-sm">
                    {k.usedByClub.name} <span className="text-xs text-ad-faint block truncate">{k.usedByClub.email}</span>
                  </p>
                )}
                <div className="flex items-center justify-between gap-3 text-xs text-ad-faint">
                  <span>
                    Created {formatDate(k.createdAt)}
                    {k.usedAt && <> · Redeemed {formatDate(k.usedAt)}</>}
                  </span>
                  {!k.isUsed && (
                    <button onClick={() => handleCopy(k.code)} className="inline-flex items-center gap-1 text-ad-muted hover:text-ad-fg cursor-pointer">
                      {copiedCode === k.code ? <Check size={13} className="text-ad-ok" /> : <Copy size={13} />}
                      {copiedCode === k.code ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {pageKeys.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium">{loading ? 'Loading keys…' : 'No keys found'}</p>
              {!loading && (searchQuery || statusFilter !== 'all') && (
                <p className="text-sm text-ad-muted mt-1">Try a different search or filter.</p>
              )}
            </div>
          )}

          {filteredKeys.length > 0 && (
            <Pagination
              total={filteredKeys.length}
              page={currentPage}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          )}
        </section>
      </main>

      {/* Change password dialog */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closePwModal}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="pw-title"
            onSubmit={handleChangePassword}
            onClick={e => e.stopPropagation()}
            className="ad-card w-full max-w-md p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="pw-title" className="text-base font-semibold">Change password</h2>
                <p className="text-sm text-ad-muted mt-1">Use at least 8 characters.</p>
              </div>
              <button type="button" onClick={closePwModal} aria-label="Close" className="p-1 rounded-md text-ad-faint hover:text-ad-fg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {[
              { id: 'pw-old', label: 'Current password', value: oldPw, set: setOldPw, auto: 'current-password' },
              { id: 'pw-new', label: 'New password', value: newPw, set: setNewPw, auto: 'new-password' },
              { id: 'pw-confirm', label: 'Confirm new password', value: confirmPw, set: setConfirmPw, auto: 'new-password' },
            ].map((f, i) => (
              <div key={f.id} className="space-y-1.5">
                <label htmlFor={f.id} className="text-sm font-medium block">{f.label}</label>
                <input
                  id={f.id}
                  type={showPw ? 'text' : 'password'}
                  value={f.value}
                  autoComplete={f.auto}
                  autoFocus={i === 0}
                  onChange={e => f.set(e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}

            <label className="flex items-center gap-2 text-sm text-ad-muted cursor-pointer select-none">
              <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} className="accent-[var(--sk-brand)]" />
              Show passwords
            </label>

            {pwError && <Notice tone="error">{pwError}</Notice>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closePwModal} className={btnSecondary}>Cancel</button>
              <button type="submit" disabled={pwSaving} className={btnPrimary}>{pwSaving ? 'Saving…' : 'Update password'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
