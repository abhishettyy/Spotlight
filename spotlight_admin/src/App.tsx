import React, { useState, useEffect } from 'react';
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
  EyeOff
} from 'lucide-react';

const FC = "'Playfair Display', serif";
const F_LOGO = "'Cinzel', serif";
const FM = "'JetBrains Mono', monospace";
const FB = "'Manrope', sans-serif";

interface RegistrationKeyRecord {
  id: string;
  code: string;
  isUsed: boolean;
  usedByClubId?: string | null;
  usedByClub?: { id: string; name: string; email: string } | null;
  createdAt: string;
  usedAt?: string | null;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://10.144.78.122:5000/api';

export default function App() {
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

  const fetchKeys = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const secret = localStorage.getItem('spotlight_admin_secret') || '';
      const res = await fetch(`${API_BASE}/clubs/registration-keys`, {
        headers: { 'x-admin-secret': secret },
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
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchKeys();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasscode.trim()) {
      setAuthError('Please enter admin passcode');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/clubs/verify-admin-secret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: adminPasscode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Incorrect admin passcode. Access denied.');
      }
      localStorage.setItem('spotlight_admin_secret', adminPasscode.trim());
      localStorage.setItem('spotlight_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect admin passcode. Access denied.');
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
      const secret = localStorage.getItem('spotlight_admin_secret') || '';
      const res = await fetch(`${API_BASE}/clubs/registration-keys/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const activeKey = keys.find(k => !k.isUsed);
  const usedKeys = keys.filter(k => k.isUsed);

  const filteredKeys = keys.filter(k => {
    const matchesSearch = k.code.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (k.usedByClubId ?? '').toLowerCase().includes(searchQuery.toLowerCase().trim());
    if (statusFilter === 'active') return matchesSearch && !k.isUsed;
    if (statusFilter === 'used') return matchesSearch && k.isUsed;
    return matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505] text-white">
        <div className="w-full max-w-md p-8 md:p-10 rounded-3xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 overflow-hidden p-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <img src="/logo.png" alt="Spotlight Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <span className="text-xs tracking-[0.4em] uppercase text-white/50 mb-1" style={{ fontFamily: F_LOGO }}>SPOTLIGHT</span>
            <h1 className="text-2xl font-bold text-white text-center" style={{ fontFamily: FC }}>Admin Portal</h1>
            <p className="text-xs text-[#888] mt-1 text-center" style={{ fontFamily: FB }}>Developer Key Management Console</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Admin Passcode</label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  placeholder="Enter developer passcode"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-red-500/50 transition-all"
                  style={{ fontFamily: FB }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-all p-1 bg-transparent border-none outline-none flex items-center justify-center cursor-pointer"
                  style={{ background: 'transparent' }}
                  aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                >
                  {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2" style={{ fontFamily: FB }}>
                <AlertCircle size={14} />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#F03D4E] hover:bg-[#d63545] text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg cursor-pointer"
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
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden p-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <img src="/logo.png" alt="Spotlight Logo" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-[0.35em] text-white/60 font-semibold" style={{ fontFamily: F_LOGO }}>SPOTLIGHT</span>
              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold" style={{ fontFamily: FM }}>DEVELOPER PORTAL</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-0.5" style={{ fontFamily: FC }}>Club Registration Keys</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchKeys}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            style={{ fontFamily: FB }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
            style={{ fontFamily: FB }}
          >
            <LogOut size={14} /> Exit Admin
          </button>
        </div>
      </header>

      {/* Action Messages */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between" style={{ fontFamily: FB }}>
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-xs underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center justify-between" style={{ fontFamily: FB }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[11px] tracking-[0.2em] uppercase text-white/50" style={{ fontFamily: FM }}>Active Unused Key</p>
          <p className="text-xl font-bold text-green-400 mt-2 font-mono">{activeKey ? activeKey.code : 'None (Generating...)'}</p>
          <p className="text-xs text-white/40 mt-1" style={{ fontFamily: FB }}>Ready to share with a new college club</p>
        </div>

        <div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[11px] tracking-[0.2em] uppercase text-white/50" style={{ fontFamily: FM }}>Total Keys Created</p>
          <p className="text-3xl font-bold text-white mt-2" style={{ fontFamily: FC }}>{keys.length}</p>
          <p className="text-xs text-white/40 mt-1" style={{ fontFamily: FB }}>Historical invite codes in database</p>
        </div>

        <div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[11px] tracking-[0.2em] uppercase text-white/50" style={{ fontFamily: FM }}>Keys Redeemed / Used</p>
          <p className="text-3xl font-bold text-purple-400 mt-2" style={{ fontFamily: FC }}>{usedKeys.length}</p>
          <p className="text-xs text-white/40 mt-1" style={{ fontFamily: FB }}>Clubs successfully registered</p>
        </div>
      </div>

      {/* Main Section: Current Active Key + Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Key Spotlight */}
        <div className="p-8 rounded-3xl relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(240,61,78,0.08), rgba(255,255,255,0.01))", border: "1px solid rgba(240,61,78,0.2)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-bold" style={{ fontFamily: FM }}>READY TO USE</span>
            <Sparkles size={18} className="text-[#F03D4E]" />
          </div>

          <h2 className="text-lg font-bold text-white" style={{ fontFamily: FB }}>Current Active Authorization Key</h2>
          <p className="text-xs text-white/60 mt-1" style={{ fontFamily: FB }}>Share this key with the next college club looking to register on Spotlight.</p>

          <div className="my-6 p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between">
            <span className="text-xl md:text-2xl font-bold tracking-widest text-white select-all" style={{ fontFamily: FM }}>
              {activeKey ? activeKey.code : 'Generating...'}
            </span>
            {activeKey && (
              <button
                onClick={() => handleCopy(activeKey.code)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                style={{ fontFamily: FB }}
              >
                {copiedCode === activeKey.code ? <><Check size={14} className="text-green-400" /> Copied!</> : <><Copy size={14} /> Copy</>}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGenerateKey()}
              disabled={generating}
              className="px-5 py-2.5 rounded-xl bg-[#F03D4E] hover:bg-[#d63545] text-white text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
              style={{ fontFamily: FB }}
            >
              <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
              {generating ? "Generating..." : "Generate New Key"}
            </button>
          </div>
        </div>

        {/* Custom Key Generator */}
        <div className="p-8 rounded-3xl flex flex-col justify-between" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Plus size={18} className="text-white/60" />
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: FB }}>Create Custom Invite Code</h2>
            </div>
            <p className="text-xs text-white/50" style={{ fontFamily: FB }}>Need a specific custom code for a specific college club? Generate one here.</p>

            <div className="mt-6 space-y-3">
              <label className="text-[11px] uppercase tracking-widest text-[#f3f4f6] block" style={{ fontFamily: FM }}>Custom Code (Optional)</label>
              <input
                type="text"
                placeholder="e.g. CLUB-ROTARACT-2026"
                value={customCodeInput}
                onChange={e => setCustomCodeInput(e.target.value.toUpperCase())}
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all uppercase tracking-widest"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: FM }}
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => handleGenerateKey(customCodeInput)}
              disabled={generating}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              style={{ fontFamily: FB }}
            >
              <Plus size={14} /> Create Custom Code
            </button>
          </div>
        </div>
      </div>

      {/* Keys Table & History */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: FB }}>All Registration Keys ({filteredKeys.length})</h2>
            <p className="text-xs text-white/50 mt-0.5" style={{ fontFamily: FB }}>Historical single-use keys and their usage status.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search key or club..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 pl-9 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all"
                style={{ fontFamily: FB }}
              />
              <Search size={14} className="absolute left-3 top-2.5 text-white/30" />
            </div>

            {/* Filter Tabs */}
            <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              {(['all', 'active', 'used'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${statusFilter === f ? 'bg-white/15 text-white font-bold' : 'text-white/50 hover:text-white'}`}
                  style={{ fontFamily: FB }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.005]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Registration Code</th>
                <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Status</th>
                <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Used By Club</th>
                <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Created At</th>
                <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6]" style={{ fontFamily: FM }}>Used At</th>
                <th className="p-4 text-[11px] tracking-[0.2em] uppercase text-[#f3f4f6] text-right" style={{ fontFamily: FM }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredKeys.map(k => (
                <tr key={k.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-4">
                    <span className="font-mono font-semibold text-white tracking-wider bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 select-all">
                      {k.code}
                    </span>
                  </td>
                  <td className="p-4">
                    {k.isUsed ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold" style={{ fontFamily: FM }}>
                        <XCircle size={12} /> USED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-bold" style={{ fontFamily: FM }}>
                        <CheckCircle2 size={12} /> ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {k.usedByClub ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white text-xs font-semibold" style={{ fontFamily: FB }}>{k.usedByClub.name}</span>
                        <span className="text-white/40 text-[11px] font-mono">{k.usedByClub.email}</span>
                      </div>
                    ) : k.usedByClubId ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-yellow-400/80 text-xs font-semibold" style={{ fontFamily: FB }}>Club ID on record</span>
                        <span className="text-white/30 text-[10px] font-mono truncate max-w-[140px]">{k.usedByClubId}</span>
                      </div>
                    ) : (
                      <span className="text-white/25 text-xs" style={{ fontFamily: FB }}>—</span>
                    )}
                  </td>
                  <td className="p-4 text-white/50 font-mono">
                    {new Date(k.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-white/50 font-mono">
                    {k.usedAt ? new Date(k.usedAt).toLocaleString() : '—'}
                  </td>
                  <td className="p-4 text-right">
                    {!k.isUsed && (
                      <button
                        onClick={() => handleCopy(k.code)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-semibold cursor-pointer"
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
                  <td colSpan={6} className="p-8 text-center text-white/40" style={{ fontFamily: FB }}>
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
