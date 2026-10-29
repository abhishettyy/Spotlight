import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Bell, X, WifiOff, Users, Download, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { usePWAInstall } from '@student/hooks/usePWAInstall';
import { IOSInstallModal } from '@student/components/ui/IOSInstallModal';
import { useEventsStore } from '@student/store/eventsStore';
import { useClubsStore } from '@student/store/clubsStore';
import { useNotificationsStore } from '@student/store/notificationsStore';
import { useUserStore } from '@student/store/userStore';
import { useThemeStore } from '@student/store/themeStore';
import { ClubModel } from '@student/types/club';
import EventCard from '@student/components/ui/EventCard';
import { LoadingSpinner } from '@student/components/ui/LoadingSpinner';
import { EmptyState } from '@student/components/ui/States';
import { getGreeting } from '@student/utils/dateUtils';
import { isEventUpcoming } from '@student/types/event';

function isConnectionError(message: string) {
  const m = message.toLowerCase();
  return m.includes('connection') || m.includes('timeout') || m.includes('network');
}

export default function HomePage() {
  const navigate = useNavigate();
  const { events, isLoading, error, loadEvents } = useEventsStore();
  const { clubs, isLoading: clubsLoading, error: clubsError, load: loadClubs } = useClubsStore();
  const { unreadCount, load: loadNotifications } = useNotificationsStore();
  const { currentUser } = useUserStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Same as Flutter's pull-to-refresh: events, clubs and notifications together
  useEffect(() => {
    loadEvents();
    loadClubs();
    loadNotifications();
  }, []);

  const filters = useMemo(() => {
    const cats = [...new Set(
      events.map((e) => e.category.trim()).filter((c) => c && c.toLowerCase() !== 'other')
    )].sort();
    return ['All', ...cats];
  }, [events]);

  useEffect(() => {
    if (!filters.includes(activeFilter)) setActiveFilter('All');
  }, [filters]);

  const query = searchQuery.toLowerCase().trim();
  const filteredEvents = events.filter((e) => {
    const matchesCategory = activeFilter === 'All' || e.category.toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch = !query ||
      e.title.toLowerCase().includes(query) ||
      e.venue.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query);
    return isEventUpcoming(e) && matchesCategory && matchesSearch;
  });

  const renderEvents = () => {
    if (isLoading) {
      return <div style={{ height: 280, display: 'grid', placeItems: 'center' }}><LoadingSpinner /></div>;
    }
    if (error) {
      return (
        <div style={{ minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '0 24px' }}>
          <WifiOff size={48} color="var(--subtext)" style={{ opacity: 0.6, marginBottom: 6 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Unable to load events</h3>
          <p style={{ fontSize: 12, color: 'var(--subtext)' }}>
            {isConnectionError(error)
              ? 'Please check your internet connection and try again.'
              : 'Something went wrong. Please try again later.'}
          </p>
          <button onClick={loadEvents} className="btn-primary" style={{ marginTop: 10, padding: '8px 20px', fontSize: 12 }}>
            Retry
          </button>
        </div>
      );
    }
    if (events.length === 0) {
      return (
        <EmptyState
          svgSrc="/svg/empty_events.svg"
          svgWidth={170}
          svgHeight={110}
          title="No upcoming or live events"
          description="Check back later for exciting campus events!"
        />
      );
    }
    if (filteredEvents.length === 0) {
      return (
        <EmptyState
          svgSrc="/svg/empty_events.svg"
          svgWidth={170}
          svgHeight={110}
          title={query ? `No events match "${query}"` : 'No upcoming events in this category'}
          description="Try clearing your search or switching categories"
        />
      );
    }
    return (
      <div className="stu-scroller">
        {filteredEvents.map((e) => (
          <div key={e.id} className="stu-scroller-item">
            <EventCard event={e} compact />
          </div>
        ))}
      </div>
    );
  };

  const renderClubs = () => {
    if (clubsLoading) {
      return <div style={{ height: 90, display: 'grid', placeItems: 'center' }}><LoadingSpinner size={24} /></div>;
    }
    if (clubsError) {
      return (
        <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: 'var(--subtext)' }}>
          <span>{isConnectionError(clubsError) ? 'Connection error. Please try again.' : 'Unable to load active clubs.'}</span>
          <button
            onClick={loadClubs}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-crimson)', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-sans)' }}
          >
            Retry
          </button>
        </div>
      );
    }
    if (clubs.length === 0) {
      return (
        <EmptyState svgSrc="/svg/empty_clubs.svg" svgWidth={160} svgHeight={90} title="No clubs available" />
      );
    }
    return (
      <div className="stu-club-row">
        {clubs.map((club) => (
          <ClubAvatar key={club.id} club={club} onClick={() => navigate(`/clubs/${club.id}`)} />
        ))}
      </div>
    );
  };

  return (
    <div className="stu-page stu-page--wide">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: 'var(--subtext)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            {getGreeting()}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser?.name ?? 'User'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <MobileInstallBtn />
        <MobileThemeBtn />
        <button
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
          style={{
            position: 'relative',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--sk-shadow)',
            borderRadius: '50%',
            width: 44,
            height: 44,
            cursor: 'pointer',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: 18,
                height: 18,
                padding: '0 4px',
                borderRadius: 99,
                background: 'var(--color-crimson)',
                color: 'var(--sk-on-brand)',
                fontSize: 10,
                fontWeight: 700,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--subtext)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          className="stu-search"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtext)', display: 'flex' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 28, scrollbarWidth: 'none' }}>
        {filters.map((f) => (
          <button key={f} className="stu-chip" aria-pressed={activeFilter === f} onClick={() => setActiveFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Featured Events */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Featured Events</h2>
          <button
            onClick={() => navigate('/events')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-crimson)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
          >
            See all →
          </button>
        </div>
        {renderEvents()}
      </section>

      {/* Active Clubs */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Active Clubs</h2>
        {renderClubs()}
      </section>
    </div>
  );
}

function ClubAvatar({ club, onClick }: { club: ClubModel; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  const showLogo = !!club.logoUrl && !failed;
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0, width: 80 }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--raised)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {showLogo ? (
          <img
            src={club.logoUrl!}
            alt={club.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setFailed(true)}
          />
        ) : (
          <Users size={22} color="var(--subtext)" strokeWidth={1.6} />
        )}
      </div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text)',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        {club.name}
      </p>
    </div>
  );
}

// Mobile install button: the sidebar's Install App button only exists on desktop
function MobileInstallBtn() {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || (!canInstall && !isIOS)) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    const outcome = await install();
    if (outcome === 'accepted') {
      toast.success('Spotlight installed! Launch it from your home screen.');
    }
  };

  return (
    <>
      <button
        className="stu-mobile-only"
        onClick={handleInstall}
        aria-label="Install app"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--sk-shadow)',
          borderRadius: 99,
          height: 44,
          padding: '0 14px',
          cursor: 'pointer',
          color: 'var(--text)',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <Download size={18} />
        Install
      </button>
      {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
    </>
  );
}

// Mobile theme switch: the sidebar's theme button only exists on desktop
function MobileThemeBtn() {
  const { isDark, toggle } = useThemeStore();
  return (
    <button
      className="stu-mobile-only"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--sk-shadow)',
        borderRadius: '50%',
        width: 44,
        height: 44,
        cursor: 'pointer',
        color: 'var(--text)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
