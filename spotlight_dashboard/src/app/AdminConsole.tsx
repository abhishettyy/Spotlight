import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check,
  RefreshCw,
  LogOut,
  Search,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  Mail,
  Building2,
  User,
  Trash2,
  Users,
  Building,
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { ThemeToggle } from './theme';
import { BASE_URL } from './api';
import { saveCredential } from '../saveCredential';

type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ClubApplication {
  id: string;
  name: string;
  email: string;
  logoUrl?: string | null;
  description?: string | null;
  department?: string | null;
  coordinatorName?: string | null;
  coordinatorPhone?: string | null;
  status: ClubStatus;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'all';

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
const btnDanger = `${btnBase} bg-ad-surface text-ad-danger border border-ad-danger/30 hover:bg-ad-danger/10`;

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

function StatusBadge({ status }: { status: ClubStatus }) {
  const styles: Record<ClubStatus, { cls: string; dot: string; label: string }> = {
    PENDING: { cls: 'border-ad-warn/30 bg-ad-warn/10 text-ad-warn', dot: 'bg-ad-warn', label: 'Pending' },
    APPROVED: { cls: 'border-ad-ok/25 bg-ad-ok/10 text-ad-ok', dot: 'bg-ad-ok', label: 'Approved' },
    REJECTED: { cls: 'border-ad-danger/25 bg-ad-danger/10 text-ad-danger', dot: 'bg-ad-danger', label: 'Rejected' },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
    </span>
  );
}

function ClubLogo({ club, size = 44 }: { club: ClubApplication; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (club.logoUrl && !failed) {
    return (
      <img
        src={club.logoUrl}
        alt=""
        onError={() => setFailed(true)}
        className="rounded-lg border border-ad-line bg-ad-raised object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-lg border border-ad-line bg-ad-raised flex items-center justify-center text-sm font-semibold text-ad-muted shrink-0"
      style={{ width: size, height: size }}
    >
      {club.name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
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

// ── Students (admin) ─────────────────────────────────────────────────────────

type StudentRow = { id: string; name: string; usn: string | null; branch: string | null; email: string };

/** Every student account: name, USN, department and email, with search, pages and delete. */
function StudentsSection() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleting, setDeleting] = useState<StudentRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch('/clubs/admin/students');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load students.');
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : (err.message || 'Could not load students.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 6000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!deleting) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !deleteBusy) setDeleting(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, deleteBusy]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return students;
    return students.filter(s =>
      [s.name, s.usn, s.branch, s.email].some(v => (v ?? '').toLowerCase().includes(q)));
  }, [students, query]);

  useEffect(() => { setPage(1); }, [query, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`/clubs/admin/students/${encodeURIComponent(deleting.id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not delete the student.');
      setStudents(list => list.filter(s => s.id !== deleting.id));
      setSuccess(`${deleting.name} was deleted.`);
      setDeleting(null);
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : (err.message || 'Could not delete the student.'));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const th = 'px-4 py-2.5 text-left text-xs font-medium text-ad-muted whitespace-nowrap';
  const td = 'px-4 py-3 text-sm align-middle';

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-ad-muted mt-1">
            {loading && students.length === 0 ? 'Loading…' : `${students.length} student ${students.length === 1 ? 'account' : 'accounts'}`}
          </p>
        </div>
        <button onClick={load} disabled={loading} className={btnSecondary}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice>}
      {success && <Notice tone="success" onDismiss={() => setSuccess(null)}>{success}</Notice>}

      <section className="ad-card overflow-hidden">
        <div className="flex items-center justify-end px-4 py-3 border-b border-ad-line">
          <div className="relative w-full md:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ad-faint pointer-events-none" />
            <input
              type="search"
              placeholder="Search name, USN, department, email"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={`${inputCls} h-9 pl-9`}
              aria-label="Search students"
            />
          </div>
        </div>

        {pageRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-ad-raised/60 border-b border-ad-line">
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>USN</th>
                  <th className={th}>Department</th>
                  <th className={th}>Email</th>
                  <th className={`${th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ad-line">
                {pageRows.map(s => (
                  <tr key={s.id} className="hover:bg-ad-raised/40 transition-colors">
                    <td className={`${td} font-medium max-w-[220px]`}><span className="block truncate" title={s.name}>{s.name}</span></td>
                    <td className={`${td} tabular whitespace-nowrap text-ad-muted`}>{s.usn || '—'}</td>
                    <td className={`${td} text-ad-muted max-w-[260px]`}><span className="block truncate" title={s.branch ?? ''}>{s.branch || '—'}</span></td>
                    <td className={`${td} text-ad-muted max-w-[260px]`}><span className="block truncate" title={s.email}>{s.email}</span></td>
                    <td className={`${td} text-right`}>
                      <button onClick={() => setDeleting(s)} className={`${btnDanger} h-8 px-2.5`} aria-label={`Delete ${s.name}`}>
                        <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium">{loading ? 'Loading students…' : query ? 'No students found' : 'No students yet'}</p>
            {!loading && query && <p className="text-sm text-ad-muted mt-1">Try a different search.</p>}
          </div>
        )}

        {filtered.length > 0 && (
          <Pagination total={filtered.length} page={currentPage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        )}
      </section>

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deleteBusy && setDeleting(null)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="del-title"
            onClick={e => e.stopPropagation()}
            className="ad-card w-full max-w-md p-6 space-y-4 shadow-xl"
          >
            <div>
              <h2 id="del-title" className="text-base font-semibold">Delete {deleting.name}?</h2>
              <p className="text-sm text-ad-muted mt-1 break-words">{deleting.email}{deleting.usn ? ` · ${deleting.usn}` : ''}</p>
            </div>
            <p className="text-sm text-ad-fg/90">
              This permanently deletes the student's account, event registrations, tickets and notifications. It can't be undone.
              If they lead a team, the team passes to another member.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setDeleting(null)} disabled={deleteBusy} className={btnSecondary}>Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={deleteBusy} autoFocus
                className={`${btnBase} bg-[#dc2626] text-white hover:bg-[#b91c1c]`}>
                <Trash2 size={15} /> {deleteBusy ? 'Deleting…' : 'Delete student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminConsole() {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem(AUTH_KEY) === 'true' && Boolean(localStorage.getItem(TOKEN_KEY))
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [clubs, setClubs] = useState<ClubApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rejecting, setRejecting] = useState<ClubApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Which list the admin is looking at
  const [view, setView] = useState<'clubs' | 'students'>('clubs');
  const [showPwModal, setShowPwModal] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  // Sign-up alerts: the emails told when a new club signs up and needs approval
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [alertEmails, setAlertEmails] = useState<string[]>([]);
  const [alertMax, setAlertMax] = useState(10);
  const [newAlertEmail, setNewAlertEmail] = useState('');
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsSaving, setAlertsSaving] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const signOut = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
    setAdminEmail('');
    setAdminPasscode('');
    setClubs([]);
  }, []);

  const closePwModal = () => {
    setShowPwModal(false);
    setOldPw(''); setNewPw(''); setConfirmPw(''); setShowPw(false); setPwError(null);
  };
  const closeRejectModal = () => { setRejecting(null); setRejectReason(''); };
  const closeAlertsModal = () => { setShowAlertsModal(false); setNewAlertEmail(''); setAlertsError(null); };

  const openAlertsModal = async () => {
    setShowAlertsModal(true);
    setAlertsError(null);
    setAlertsLoading(true);
    try {
      const res = await adminFetch('/clubs/admin/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load the alert emails.');
      setAlertEmails(Array.isArray(data.signupAlertEmails) ? data.signupAlertEmails : []);
      if (typeof data.maxSignupAlertEmails === 'number') setAlertMax(data.maxSignupAlertEmails);
    } catch (err: any) {
      setAlertsError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : (err.message || 'Could not load the alert emails.'));
    } finally {
      setAlertsLoading(false);
    }
  };

  const addAlertEmail = () => {
    const e = newAlertEmail.trim().toLowerCase();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setAlertsError('Enter a valid email address.'); return; }
    if (alertEmails.includes(e)) { setAlertsError('That email is already on the list.'); return; }
    if (alertEmails.length >= alertMax) { setAlertsError(`Add at most ${alertMax} email addresses.`); return; }
    setAlertEmails(list => [...list, e]);
    setNewAlertEmail('');
    setAlertsError(null);
  };

  const saveAlertEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertsSaving(true);
    setAlertsError(null);
    try {
      const res = await adminFetch('/clubs/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ signupAlertEmails: alertEmails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the alert emails.');
      closeAlertsModal();
      setActionSuccess(alertEmails.length ? 'Sign-up alert emails saved.' : 'Sign-up alerts turned off (no emails on the list).');
    } catch (err: any) {
      setAlertsError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : (err.message || 'Could not save the alert emails.'));
    } finally {
      setAlertsSaving(false);
    }
  };

  useEffect(() => {
    if (!showPwModal && !rejecting && !showAlertsModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      closePwModal();
      closeRejectModal();
      closeAlertsModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPwModal, rejecting, showAlertsModal]);

  // Success messages clear themselves; errors stay until dismissed
  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(null), 6000);
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

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await adminFetch('/clubs/applications');
      if (res.status === 401 || res.status === 403) {
        signOut();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch club registrations');
      setClubs(data.clubs || []);
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
    if (isAuthenticated) fetchClubs();
  }, [isAuthenticated, fetchClubs]);

  const finishSignIn = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(AUTH_KEY, 'true');
    setIsAuthenticated(true);
    setAuthError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPasscode.trim()) {
      setAuthError('Enter the admin email and password.');
      return;
    }
    setSigningIn(true);
    try {
      const res = await fetch(`${API_BASE}/clubs/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPasscode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect admin email or password.');
      saveCredential(adminEmail.trim(), adminPasscode);
      finishSignIn(data.token);
    } catch (err: any) {
      setAuthError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : (err.message || 'Incorrect admin email or password.'));
    } finally {
      setSigningIn(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setSigningIn(true);
      try {
        const res = await fetch(`${API_BASE}/clubs/admin/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Google sign-in failed.');
        finishSignIn(data.token);
      } catch (err: any) {
        setAuthError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : (err.message || 'Google sign-in failed.'));
      } finally {
        setSigningIn(false);
      }
    },
    onError: () => setAuthError('Google sign-in failed. Please try again.'),
  });

  const replaceClub = (updated: ClubApplication) =>
    setClubs(prev => prev.map(c => (c.id === updated.id ? updated : c)));

  const handleApprove = async (club: ClubApplication) => {
    setBusyId(club.id);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await adminFetch(`/clubs/${club.id}/approve`, { method: 'POST' });
      if (res.status === 401) { signOut(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not approve the club.');
      replaceClub(data.club);
      if (data.emailSent) {
        setActionSuccess(`Approved ${club.name}. An approval email was sent to ${club.email}.`);
      } else {
        setActionError(`Approved ${club.name}, but the approval email could not be sent. Let them know at ${club.email}.`);
      }
    } catch (err: any) {
      setActionError(err.message || 'Could not approve the club.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejecting) return;
    const club = rejecting;
    setBusyId(club.id);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await adminFetch(`/clubs/${club.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (res.status === 401) { signOut(); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reject the club.');
      replaceClub(data.club);
      closeRejectModal();
      setActionSuccess(`Rejected ${club.name}. They will see the reason when they try to sign in.`);
    } catch (err: any) {
      setActionError(err.message || 'Could not reject the club.');
      closeRejectModal();
    } finally {
      setBusyId(null);
    }
  };

  const toggleExpanded = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const counts = useMemo(() => {
    const c = { all: clubs.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const club of clubs) c[club.status]++;
    return c;
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return clubs.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return !query ||
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.department ?? '').toLowerCase().includes(query) ||
        (c.coordinatorName ?? '').toLowerCase().includes(query);
    });
  }, [clubs, searchQuery, statusFilter]);

  // Back to the first page whenever the visible set changes shape
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredClubs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageClubs = filteredClubs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ── Sign-in ────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-ad-ink text-ad-fg">
        <div className="w-full max-w-sm">
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex items-center gap-1 mb-6 -ml-1 p-1 rounded-md text-sm font-medium text-ad-muted hover:text-ad-fg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </a>
          <div className="flex items-center gap-3 mb-8">
            <img src={LOGO_SRC} alt="" className="w-9 h-9 rounded-lg border border-ad-line bg-ad-surface object-contain p-1" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">Spotlight</p>
              <p className="text-xs text-ad-muted">Admin console</p>
            </div>
          </div>

          <div className="ad-card p-6">
            <h1 className="text-lg font-semibold">Sign in</h1>
            <p className="text-sm text-ad-muted mt-1">Review and approve club registrations.</p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="text-sm font-medium block">Email</label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="text-sm font-medium block">Password</label>
                <div className="relative">
                  <input
                    id="admin-password"
                    name="password"
                    type={showPasscode ? 'text' : 'password'}
                    autoComplete="current-password"
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

              {authError && <p role="alert" className="text-sm font-normal text-[#dc2626] text-center">{authError}</p>}

              <button type="submit" disabled={signingIn} className={`${btnPrimary} w-full h-10`}>
                {signingIn ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-ad-line" />
              <span className="text-xs text-ad-faint">or</span>
              <div className="h-px flex-1 bg-ad-line" />
            </div>

            <button
              type="button"
              onClick={() => { setAuthError(null); loginWithGoogle(); }}
              disabled={signingIn}
              className={`${btnSecondary} w-full h-10`}
            >
              <GoogleIcon /> Continue with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Console ────────────────────────────────────────────────────────────────
  const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: 'PENDING', label: 'Pending' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'REJECTED', label: 'Rejected' },
    { id: 'all', label: 'All' },
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
            <button onClick={openAlertsModal} className={btnGhost} aria-label="Sign-up alert emails">
              <Bell size={16} /> <span className="hidden sm:inline">Alerts</span>
            </button>
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
        {/* Section switch: club registrations or students */}
        <div className="inline-flex p-0.5 rounded-lg bg-ad-raised border border-ad-line" role="tablist" aria-label="Admin sections">
          {([
            { id: 'clubs', label: 'Clubs', icon: Building },
            { id: 'students', label: 'Students', icon: Users },
          ] as const).map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={view === t.id}
              onClick={() => setView(t.id)}
              className={`h-9 px-4 rounded-md text-sm inline-flex items-center gap-2 transition-colors cursor-pointer ${
                view === t.id ? 'bg-ad-surface text-ad-fg font-medium shadow-sm' : 'text-ad-muted hover:text-ad-fg'
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {view === 'students' ? <StudentsSection /> : (<>
        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Club registrations</h1>
            <p className="text-sm text-ad-muted mt-1">New clubs can sign in only after you approve them. Approved clubs get an email.</p>
          </div>
          <button onClick={fetchClubs} disabled={loading} className={btnSecondary}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {actionError && <Notice tone="error" onDismiss={() => setActionError(null)}>{actionError}</Notice>}
        {actionSuccess && <Notice tone="success" onDismiss={() => setActionSuccess(null)}>{actionSuccess}</Notice>}

        {/* Stats */}
        <div className="ad-card grid grid-cols-3 divide-x divide-ad-line">
          {[
            { label: 'Awaiting review', value: counts.PENDING },
            { label: 'Approved', value: counts.APPROVED },
            { label: 'Rejected', value: counts.REJECTED },
          ].map(s => (
            <div key={s.label} className="px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-xs text-ad-muted">{s.label}</p>
              <p className="text-2xl font-semibold mt-1 tabular">{loading && clubs.length === 0 ? '–' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Registration list */}
        <section className="ad-card overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-b border-ad-line">
            <div className="inline-flex p-0.5 rounded-lg bg-ad-raised border border-ad-line self-start overflow-x-auto max-w-full" role="tablist">
              {filterTabs.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={statusFilter === t.id}
                  onClick={() => setStatusFilter(t.id)}
                  className={`h-8 px-3 rounded-md text-sm transition-colors cursor-pointer whitespace-nowrap ${
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
                placeholder="Search club, email, department"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`${inputCls} h-9 pl-9`}
                aria-label="Search clubs"
              />
            </div>
          </div>

          <ul className="divide-y divide-ad-line">
            {pageClubs.map(c => {
              const isOpen = expanded.has(c.id);
              const longDescription = (c.description?.length ?? 0) > 180;
              return (
                <li key={c.id} className="px-4 py-4 sm:px-5 flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <ClubLogo club={c} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold truncate">{c.name}</p>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ad-muted">
                        <span className="inline-flex items-center gap-1.5 min-w-0"><Mail size={13} className="shrink-0" /><span className="truncate">{c.email}</span></span>
                        {c.department && <span className="inline-flex items-center gap-1.5"><Building2 size={13} className="shrink-0" />{c.department}</span>}
                      </div>
                      {(c.coordinatorName || c.coordinatorPhone) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ad-muted">
                          {c.coordinatorName && <span className="inline-flex items-center gap-1.5"><User size={13} className="shrink-0" />{c.coordinatorName}</span>}
                          {c.coordinatorPhone && (
                            <a href={`tel:${c.coordinatorPhone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-ad-fg">
                              <Phone size={13} className="shrink-0" />{c.coordinatorPhone}
                            </a>
                          )}
                        </div>
                      )}
                      {c.description && (
                        <div className="text-sm text-ad-fg/90 pt-0.5">
                          <p className={`whitespace-pre-line break-words ${isOpen ? '' : 'line-clamp-2'}`}>{c.description}</p>
                          {longDescription && (
                            <button onClick={() => toggleExpanded(c.id)} className="text-xs text-ad-brand hover:underline mt-1 cursor-pointer">
                              {isOpen ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      )}
                      {c.status === 'REJECTED' && c.rejectionReason && (
                        <p className="text-xs text-ad-danger">Reason: {c.rejectionReason}</p>
                      )}
                      <p className="text-xs text-ad-faint tabular">
                        Applied {formatDate(c.createdAt)} {formatTime(c.createdAt)}
                        {c.reviewedAt && <> · Reviewed {formatDate(c.reviewedAt)}</>}
                      </p>
                    </div>
                  </div>

                  {c.status !== 'APPROVED' && (
                    <div className="flex gap-2 md:flex-col md:w-32 shrink-0">
                      <button
                        onClick={() => handleApprove(c)}
                        disabled={busyId === c.id}
                        className={`${btnPrimary} flex-1 md:flex-none`}
                      >
                        <Check size={15} /> {busyId === c.id ? 'Working…' : 'Approve'}
                      </button>
                      {c.status === 'PENDING' && (
                        <button
                          onClick={() => setRejecting(c)}
                          disabled={busyId === c.id}
                          className={`${btnDanger} flex-1 md:flex-none`}
                        >
                          <X size={15} /> Reject
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {pageClubs.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium">
                {loading ? 'Loading registrations…' : statusFilter === 'PENDING' && !searchQuery ? 'No registrations waiting for review' : 'No clubs found'}
              </p>
              {!loading && searchQuery && (
                <p className="text-sm text-ad-muted mt-1">Try a different search or filter.</p>
              )}
            </div>
          )}

          {filteredClubs.length > 0 && (
            <Pagination
              total={filteredClubs.length}
              page={currentPage}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          )}
        </section>
        </>)}
      </main>

      {/* Reject dialog */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeRejectModal}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            onSubmit={handleReject}
            onClick={e => e.stopPropagation()}
            className="ad-card w-full max-w-md p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="reject-title" className="text-base font-semibold">Reject {rejecting.name}?</h2>
                <p className="text-sm text-ad-muted mt-1">The club sees this reason when it tries to sign in, and can sign up again with corrected details.</p>
              </div>
              <button type="button" onClick={closeRejectModal} aria-label="Close" className="p-1 rounded-md text-ad-faint hover:text-ad-fg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reject-reason" className="text-sm font-medium block">Reason <span className="text-ad-faint font-normal">(optional)</span></label>
              <textarea
                id="reject-reason"
                rows={3}
                maxLength={500}
                autoFocus
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Please register with the club's official email"
                className="w-full px-3 py-2 rounded-lg bg-ad-raised border border-ad-line text-sm text-ad-fg placeholder:text-ad-faint outline-none focus:border-ad-brand transition-colors resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeRejectModal} className={btnSecondary}>Cancel</button>
              <button type="submit" disabled={busyId === rejecting.id} className={`${btnBase} bg-ad-danger text-white hover:opacity-90`}>
                {busyId === rejecting.id ? 'Rejecting…' : 'Reject club'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sign-up alerts dialog: who is emailed when a new club signs up */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeAlertsModal}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="alerts-title"
            onSubmit={saveAlertEmails}
            onClick={e => e.stopPropagation()}
            className="ad-card w-full max-w-md p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="alerts-title" className="text-base font-semibold">Sign-up alert emails</h2>
                <p className="text-sm text-ad-muted mt-1">When a new club signs up, these addresses get an email that approval is needed.</p>
              </div>
              <button type="button" onClick={closeAlertsModal} aria-label="Close" className="p-1 rounded-md text-ad-faint hover:text-ad-fg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {alertsLoading ? (
              <p className="text-sm text-ad-muted py-4 text-center">Loading…</p>
            ) : (
              <>
                {alertEmails.length === 0 ? (
                  <p className="text-sm text-ad-muted rounded-md border border-dashed border-ad-line px-3 py-4 text-center">
                    No emails yet. Nobody is alerted about new sign-ups.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {alertEmails.map(email => (
                      <li key={email} className="flex items-center justify-between gap-3 rounded-md border border-ad-line px-3 py-2">
                        <span className="text-sm truncate" title={email}>{email}</span>
                        <button
                          type="button"
                          onClick={() => setAlertEmails(list => list.filter(x => x !== email))}
                          aria-label={`Remove ${email}`}
                          className="p-1 rounded-md text-ad-faint hover:text-[#dc2626] cursor-pointer flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newAlertEmail}
                    onChange={e => { setNewAlertEmail(e.target.value); setAlertsError(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlertEmail(); } }}
                    placeholder="Add an email address"
                    aria-label="Add an email address"
                    className={inputCls}
                  />
                  <button type="button" onClick={addAlertEmail} className={btnSecondary}>Add</button>
                </div>
                <p className="text-xs text-ad-faint">Up to {alertMax} addresses. Changes apply after you save.</p>
              </>
            )}

            {alertsError && <p role="alert" className="text-sm font-normal text-[#dc2626] text-center">{alertsError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeAlertsModal} className={btnSecondary}>Cancel</button>
              <button type="submit" disabled={alertsSaving || alertsLoading} className={btnPrimary}>{alertsSaving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

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

            {pwError && <p role="alert" className="text-sm font-normal text-[#dc2626] text-center">{pwError}</p>}

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
