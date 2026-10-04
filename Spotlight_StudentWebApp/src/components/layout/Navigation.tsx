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

  return (
    <aside
      style={{
        width: 220,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        padding: '24px 0',
      }}
    >
      {/* Logo */}
      <div
        style={{ padding: '0 24px 28px', cursor: 'pointer' }}
        onClick={() => navigate('/')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--color-crimson)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 900 }}>S</span>
          </div>
          <span
            style={{
              color: 'var(--text)',
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: '-0.3px',
            }}
          >
            Spotlight
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                background: active ? 'var(--color-crimson)' : 'transparent',
                color: active ? '#fff' : 'var(--subtext)',
                transition: 'background 0.15s, color 0.15s',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--subtext)';
                }
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          );
        })}

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 14px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: location.pathname === '/notifications' ? 600 : 500,
            background: location.pathname === '/notifications' ? 'var(--color-crimson)' : 'transparent',
            color: location.pathname === '/notifications' ? '#fff' : 'var(--subtext)',
            transition: 'background 0.15s, color 0.15s',
            textAlign: 'left',
            width: '100%',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (location.pathname !== '/notifications') {
              (e.currentTarget as HTMLElement).style.background = 'var(--border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text)';
            }
          }}
          onMouseLeave={(e) => {
            if (location.pathname !== '/notifications') {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--subtext)';
            }
          }}
        >
          <div style={{ position: 'relative' }}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  background: 'var(--color-crimson)',
                  color: '#fff',
                  borderRadius: '99px',
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '1px 4px',
                  minWidth: 14,
                  textAlign: 'center',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span>Notifications</span>
        </button>
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
        borderRadius: 35,
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
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
              background: active ? 'var(--color-crimson)' : 'transparent',
              color: active ? '#fff' : 'var(--subtext)',
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
    <div style={{ padding: '0 12px 16px' }}>
      <button
        onClick={handleInstall}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '11px 14px',
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 500,
          background: hovered ? 'var(--color-crimson-dim)' : 'transparent',
          color: hovered ? 'var(--color-crimson)' : 'var(--subtext)',
          transition: 'background 0.15s, color 0.15s',
          textAlign: 'left',
        }}
      >
        <Download size={18} />
        <span>{installing ? 'Installing…' : 'Install App'}</span>
      </button>
    </div>
  );
}
