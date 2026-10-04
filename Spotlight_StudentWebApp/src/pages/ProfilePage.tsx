import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, GraduationCap, Calendar,
  Lock, LogOut, Shield, Info, Moon, ChevronRight,
  Loader2, Eye, EyeOff, Bookmark, Users, Ticket,
  Bell, Star, HelpCircle, IdCard, Download,
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { IOSInstallModal } from '@/components/ui/IOSInstallModal';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useThemeStore } from '@/store/themeStore';
import { useSavedEventsStore } from '@/store/savedEventsStore';
import { fetchProfileStats, editProfile } from '@/api/profiles';
import { changePassword, verifyPassword } from '@/api/auth';
import { buildAvatarInitials } from '@/utils/imageUtils';
import { toast } from 'sonner';

// No dropdowns needed — direct inputs used

// ── Shared row button ──────────────────────────────────────────────────────
function SettingsRow({
  icon,
  label,
  rightLabel,
  onClick,
  showChevron = true,
}: {
  icon: React.ReactNode;
  label: string;
  rightLabel?: string;
  onClick?: () => void;
  showChevron?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && onClick ? 'rgba(255,255,255,0.05)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '15px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'var(--font-sans)',
        width: '100%',
        textAlign: 'left',
        transition: 'background 0.15s ease',
      }}
    >
      <span style={{ color: 'var(--subtext)', flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
      {rightLabel && (
        <span style={{ fontSize: 14, color: 'var(--subtext)', marginRight: showChevron && onClick ? 2 : 0 }}>
          {rightLabel}
        </span>
      )}
      {showChevron && onClick && (
        <ChevronRight size={16} color="var(--subtext)" strokeWidth={1.8} />
      )}
    </Tag>
  );
}

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--subtext)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: 10,
        paddingLeft: 4,
      }}
    >
      {text}
    </p>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { currentUser, setCurrentUser } = useUserStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const userId = useAuthStore((s) => s.userId);
  const { savedIds } = useSavedEventsStore();

  const [stats, setStats] = useState({ eventsCount: 0, clubsCount: 0 });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfileStats(userId).then(setStats).catch(() => {});
    }
  }, [userId]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!currentUser) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'var(--subtext)' }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 640, margin: '0 auto', paddingBottom: 40 }}>

      {/* ── Profile Header ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 20,
            background: 'var(--color-crimson)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
            {buildAvatarInitials(currentUser.name)}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: 'var(--text)',
                letterSpacing: '-0.3px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentUser.name}
            </h1>
            <EditBtn onClick={() => setShowEditModal(true)} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--subtext)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.email}
          </p>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
        {[
          { icon: <Ticket size={22} color="var(--color-crimson)" strokeWidth={1.8} />, label: 'Events', value: stats.eventsCount },
          { icon: <Bookmark size={22} color="var(--color-crimson)" strokeWidth={1.8} />, label: 'Saved', value: savedIds.size },
          { icon: <Users size={22} color="var(--color-crimson)" strokeWidth={1.8} />, label: 'Clubs', value: stats.clubsCount },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '18px 12px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {icon}
            <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Academic Profile ─────────────────────────── */}
      <SectionLabel text="Academic Profile" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        <SettingsRow icon={<IdCard size={18} strokeWidth={1.8} />} label="USN" rightLabel={currentUser.usn ?? '—'} showChevron={false} />
        <SettingsRow icon={<GraduationCap size={18} strokeWidth={1.8} />} label="Branch" rightLabel={currentUser.branch ?? '—'} showChevron={false} />
        <SettingsRow icon={<Calendar size={18} strokeWidth={1.8} />} label="Academic Year" rightLabel={currentUser.year ? `Year ${currentUser.year}` : '—'} showChevron={false} />
        <SettingsRow icon={<BookOpen size={18} strokeWidth={1.8} />} label="Semester" rightLabel={currentUser.sem ? `Sem ${currentUser.sem}` : '—'} showChevron={false} />
      </div>

      {/* ── Preferences ──────────────────────────────── */}
      <SectionLabel text="Preferences" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        <PWAInstallRow />
        <SettingsRow
          icon={<Bell size={18} strokeWidth={1.8} />}
          label="Notifications"
          rightLabel="Off"
          onClick={() => navigate('/notifications')}
        />
        <SettingsRow
          icon={<Moon size={18} strokeWidth={1.8} />}
          label="Dark Mode"
          rightLabel={isDark ? 'On' : 'Off'}
          onClick={toggleTheme}
        />
        {currentUser.hasPassword && (
          <SettingsRow
            icon={<Lock size={18} strokeWidth={1.8} />}
            label="Update Password"
            onClick={() => setShowPasswordModal(true)}
          />
        )}
        <SettingsRow
          icon={<Star size={18} strokeWidth={1.8} />}
          label="Rate Us"
          onClick={() => toast.info('Rating coming soon!')}
        />
      </div>

      {/* ── Support & About Us ───────────────────────── */}
      <SectionLabel text="Support & About Us" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        <SettingsRow
          icon={<HelpCircle size={18} strokeWidth={1.8} />}
          label="Help Center"
          onClick={() => {
            window.location.href = 'mailto:spotlightapp.help@gmail.com?subject=%5BSpotlight%20Support%5D%20Help%20Request';
          }}
        />
        <SettingsRow
          icon={<Info size={18} strokeWidth={1.8} />}
          label="About Us"
          onClick={() => navigate('/about')}
        />
        <SettingsRow
          icon={<Shield size={18} strokeWidth={1.8} />}
          label="Privacy Policy"
          onClick={() => navigate('/privacy')}
        />
      </div>

      {/* ── Sign Out ─────────────────────────────────── */}
      <SignOutBtn onLogout={handleLogout} />

      {showEditModal && (
        <EditProfileModal
          user={currentUser}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setCurrentUser(updated);
            setShowEditModal(false);
            toast.success('Changes saved');
          }}
        />
      )}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

// ── Sign Out button ──────────────────────────────────────────────────────────
function SignOutBtn({ onLogout }: { onLogout: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <button
        onClick={onLogout}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '16px 0',
          background: hovered ? 'rgba(230,57,70,0.08)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-crimson)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontSize: 15,
          transition: 'background 0.15s ease',
        }}
      >
        <LogOut size={18} strokeWidth={1.8} />
        Sign Out
      </button>
    </div>
  );
}

// ── Edit button ────────────────────────────────────────────────────────────
function EditBtn({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.1)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: '4px 14px',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        flexShrink: 0,
        transition: 'background 0.15s ease',
      }}
    >
      Edit
    </button>
  );
}

import type { UserModel } from '@/types/user';

function SheetField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
  type = 'text',
  maxLength,
  helperText,
  helperColor = '#FF9F0A',
  autoUppercase = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  helperText?: React.ReactNode;
  helperColor?: string;
  autoUppercase?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: disabled ? 'rgba(255,255,255,0.035)' : 'var(--color-surface2-dark, #1E1E22)',
          borderRadius: 14,
          padding: '10px 16px 12px 16px',
          border: focused
            ? '1.5px solid var(--color-crimson)'
            : '1.5px solid transparent',
          transition: 'border-color 0.2s ease, background 0.2s ease',
          opacity: disabled ? 0.72 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--subtext)',
            marginBottom: 4,
            fontFamily: 'var(--font-sans)',
            userSelect: 'none',
          }}
        >
          {label}
        </label>
        <input
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => {
            const val = autoUppercase ? e.target.value.toUpperCase() : e.target.value;
            onChange?.(val);
          }}
          onFocus={() => !disabled && setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 16,
            fontWeight: 500,
            color: disabled ? 'var(--subtext)' : 'var(--text)',
            fontFamily: 'var(--font-sans)',
            padding: 0,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
      </div>
      {helperText && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: helperColor,
            marginTop: 6,
            paddingLeft: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {helperText}
        </div>
      )}
    </div>
  );
}

function EditProfileModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserModel;
  onClose: () => void;
  onSaved: (u: UserModel) => void;
}) {
  const initialName = user.name ?? '';
  const initialUsn = user.usn ?? '';
  const initialBranch = user.branch ?? '';
  const initialPhone = user.phone ?? '';
  const initialYear = user.year ?? '';
  const initialSem = user.sem ?? '';

  const hasUsnSet = Boolean(user.usn && user.usn.trim().length > 0);

  const [name, setName] = useState(initialName);
  const [usn, setUsn] = useState(initialUsn);
  const [branch, setBranch] = useState(initialBranch);
  const [phone, setPhone] = useState(initialPhone);
  const [year, setYear] = useState(initialYear);
  const [sem, setSem] = useState(initialSem);
  const [isLoading, setIsLoading] = useState(false);

  const hasChanges =
    name.trim() !== initialName.trim() ||
    (!hasUsnSet && usn.trim().toUpperCase() !== initialUsn.trim().toUpperCase()) ||
    branch.trim().toUpperCase() !== initialBranch.trim().toUpperCase() ||
    phone.trim() !== initialPhone.trim() ||
    year.trim() !== initialYear.trim() ||
    sem.trim() !== initialSem.trim();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Full Name is required');
      return;
    }
    if (!hasUsnSet && usn.trim()) {
      const u = usn.trim().toUpperCase();
      if (!u.startsWith('1MS')) {
        toast.error('USN must start with 1MS (e.g. 1MS21CS001)');
        return;
      }
    }
    if (!branch.trim()) {
      toast.error('Branch is required');
      return;
    }
    if (year.trim()) {
      const y = parseInt(year.trim(), 10);
      if (isNaN(y) || y < 1 || y > 4) {
        toast.error('Year must be between 1 and 4');
        return;
      }
    }
    if (sem.trim()) {
      const s = parseInt(sem.trim(), 10);
      if (isNaN(s) || s < 1 || s > 8) {
        toast.error('Semester must be between 1 and 8');
        return;
      }
    }
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await editProfile({
        userId: user.id,
        name: name.trim(),
        usn: hasUsnSet ? undefined : (usn.trim().toUpperCase() || undefined),
        branch: branch.trim().toUpperCase() || undefined,
        phone: phone.trim() || undefined,
        year: year.trim() || undefined,
        sem: sem.trim() || undefined,
      });
      onSaved(updated);
    } catch (e) {
      toast.error(String(e).replace('Error: ', ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="sheet-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--color-surface-dark, #141416)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: '12px 20px 32px 20px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Grab Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 16px 0' }}>
          <div
            style={{
              width: 42,
              height: 4.5,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.22)',
            }}
          />
        </div>

        {/* Title & Subtitle */}
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text)',
              margin: '0 0 4px 0',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.3px',
            }}
          >
            Edit Profile
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--subtext)',
              margin: 0,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Changes are saved to your account
          </p>
        </div>

        {/* Fields Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name */}
          <SheetField
            label="Full Name"
            value={name}
            onChange={setName}
            placeholder="Enter your full name"
          />

          {/* USN */}
          <SheetField
            label="USN"
            value={usn}
            onChange={setUsn}
            disabled={hasUsnSet}
            autoUppercase
            placeholder={hasUsnSet ? 'USN is locked' : 'e.g. 1MS24IS155'}
            helperText={
              hasUsnSet ? (
                <>
                  <span>🔒</span>
                  <span>USN cannot be edited once set</span>
                </>
              ) : (
                'Note: USN cannot be edited once set'
              )
            }
            helperColor={hasUsnSet ? '#FF9F0A' : 'var(--subtext)'}
          />

          {/* Branch */}
          <SheetField
            label="Branch"
            value={branch}
            onChange={setBranch}
            autoUppercase
            placeholder="e.g. ISE, CSE, ECE"
          />

          {/* Year & Semester side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SheetField
              label="Year"
              value={year}
              onChange={(val) => {
                const clean = val.replace(/\D/g, '').slice(0, 1);
                setYear(clean);
              }}
              placeholder="1-4"
              maxLength={1}
            />
            <SheetField
              label="Semester"
              value={sem}
              onChange={(val) => {
                const clean = val.replace(/\D/g, '').slice(0, 1);
                setSem(clean);
              }}
              placeholder="1-8"
              maxLength={1}
            />
          </div>

          {/* Phone Number */}
          <SheetField
            label="Phone Number"
            value={phone}
            onChange={(val) => {
              const clean = val.replace(/\D/g, '').slice(0, 10);
              setPhone(clean);
            }}
            type="tel"
            placeholder="10-digit number"
            maxLength={10}
          />

          {/* Save Changes button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            style={{
              marginTop: 18,
              width: '100%',
              height: 52,
              borderRadius: 16,
              border: 'none',
              background: hasChanges && !isLoading ? 'var(--color-crimson)' : 'rgba(255,255,255,0.08)',
              color: hasChanges && !isLoading ? '#FFFFFF' : 'rgba(255,255,255,0.38)',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              cursor: hasChanges && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span>Saving…</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const userId = useAuthStore((s) => s.userId);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async () => {
    if (!oldPassword || !newPassword) { toast.error('Please fill in all fields.'); return; }
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    setIsLoading(true);
    try {
      if (userId) await verifyPassword(userId, oldPassword);
      await changePassword(oldPassword, newPassword);
      toast.success('Password updated successfully!');
      onClose();
    } catch (e) {
      toast.error(String(e).replace('Error: ', ''));
    } finally {
      setIsLoading(false);
    }
  };

  return <Modal title="Update Password" onClose={onClose}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ModalField label="Current Password">
        <PasswordInput value={oldPassword} onChange={setOldPassword} show={showOld} onToggle={() => setShowOld(!showOld)} placeholder="Current password" />
      </ModalField>
      <ModalField label="New Password">
        <PasswordInput value={newPassword} onChange={setNewPassword} show={showNew} onToggle={() => setShowNew(!showNew)} placeholder="Min 6 characters" />
      </ModalField>
      <button onClick={handleChange} disabled={isLoading} className="btn-primary" style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {isLoading ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Updating…</> : 'Update Password'}
      </button>
    </div>
  </Modal>;
}

// ── Shared modal helpers ─────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="spotlight-card" style={{ width: '100%', maxWidth: 440, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtext)', fontSize: 20, fontFamily: 'var(--font-sans)', display: 'flex' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, show, onToggle, placeholder }: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-field" style={{ paddingRight: 44 }} />
      <button type="button" onClick={onToggle} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtext)', display: 'flex' }}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

// ── PWA Install Row ──────────────────────────────────────────────────────────
function PWAInstallRow() {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Hide when already installed and not iOS
  if (isInstalled && !isIOS) return null;
  // Hide if browser doesn't support install and it's not iOS
  if (!canInstall && !isIOS) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    setInstalling(true);
    const outcome = await install();
    setInstalling(false);
    if (outcome === 'accepted') {
      toast.success('Spotlight installed! Launch it from your home screen.');
    }
  };

  return (
    <>
      <SettingsRow
        icon={<Download size={18} strokeWidth={1.8} />}
        label={installing ? 'Installing…' : isInstalled ? 'App Installed ✓' : 'Install App'}
        rightLabel={isIOS ? 'iOS' : undefined}
        onClick={isInstalled ? undefined : handleInstall}
      />
      {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
    </>
  );
}

