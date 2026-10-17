import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Ticket, Users, User, Bell, Download } from 'lucide-react';
import { useNotificationsStore } from '@/store/notificationsStore';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Ticket, label: 'Events', path: '/tickets' },
  { icon: Users, label: 'Clubs', path: '/clubs' },
  { icon: User, label: 'Profile', path: '/profile' },
];

// Desktop sidebar - shown on lg+ screens
export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const items = [...NAV_ITEMS, { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadCount }];

  return (
    <aside className="stu-sidebar">
      {/* Logo */}
      <button className="stu-brand" onClick={() => navigate('/')}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--sk-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          S
        </span>
        <span>Spotlight</span>
      </button>

      {/* Nav items */}
      <nav className="stu-nav" aria-label="Main">
        {items.map(({ icon: Icon, label, path, badge }: { icon: typeof Home; label: string; path: string; badge?: number }) => {
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              className="stu-nav-item"
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(path)}
            >
              <Icon size={17} strokeWidth={1.9} />
              <span>{label}</span>
              {!!badge && badge > 0 && <span className="stu-nav-badge">{badge > 99 ? '99+' : badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Install App */}
      <SidebarInstallBtn />
    </aside>
  );
}

// Mobile bottom navigation - shown on <lg screens
export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        background: 'var(--surface)',
        borderRadius: 28,
        border: '1px solid var(--border)',
        boxShadow: 'var(--sk-shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        height: 68,
        zIndex: 100,
        padding: '0 8px',
      }}
    >
      {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
        const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: active ? 8 : 0,
              padding: active ? '10px 18px' : '12px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--text)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--subtext)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={22} />
            {active && <span>{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}

// ── Sidebar Install App button ────────────────────────────────────────────────
function SidebarInstallBtn() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (!canInstall || isInstalled) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  return (
    <div className="stu-sidebar-foot">
      <button
        onClick={handleInstall}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          height: 34,
          padding: '0 10px',
          borderRadius: 'var(--sk-radius)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 500,
          background: hovered ? 'var(--raised)' : 'transparent',
          color: hovered ? 'var(--text)' : 'var(--subtext)',
          transition: 'background 0.15s, color 0.15s',
          textAlign: 'left',
        }}
      >
        <Download size={17} strokeWidth={1.9} />
        <span>{installing ? 'Installing…' : 'Install App'}</span>
      </button>
    </div>
  );
}
