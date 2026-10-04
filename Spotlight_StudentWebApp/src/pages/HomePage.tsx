import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, BookmarkIcon, ChevronRight } from 'lucide-react';
import { useEventsStore } from '@/store/eventsStore';
import { useClubsStore } from '@/store/clubsStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useUserStore } from '@/store/userStore';
import { useSavedEventsStore } from '@/store/savedEventsStore';
import { ClubModel } from '@/types/club';
import EventCard from '@/components/ui/EventCard';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { getGreeting } from '@/utils/dateUtils';
import { buildAvatarInitials } from '@/utils/imageUtils';
import { isEventLive, isEventUpcoming } from '@/types/event';

export default function HomePage() {
  const navigate = useNavigate();
  const { events, isLoading, error, loadEvents } = useEventsStore();
  const { clubs, load: loadClubs } = useClubsStore();
  const { unreadCount, load: loadNotifications } = useNotificationsStore();
  const { currentUser } = useUserStore();
  const { savedIds } = useSavedEventsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    if (events.length === 0) loadEvents();
    if (clubs.length === 0) loadClubs();
    loadNotifications();
  }, []);

  // Build filter categories from events
  const filters = useMemo(() => {
    const cats = events
      .map((e) => e.category.trim())
      .filter((c) => c && c.toLowerCase() !== 'other')
      .reduce((acc: string[], c) => (acc.includes(c) ? acc : [...acc, c]), [])
      .sort();
    return ['All', ...cats];
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchFilter = activeFilter === 'All' || e.category === activeFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.clubName?.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [events, activeFilter, searchQuery]);

  const savedEvents = events.filter((e) => savedIds.has(e.id));

  // Featured = live first, then upcoming, max 10 for horizontal scroll
  const featuredEvents = [
    ...filteredEvents.filter(isEventLive),
    ...filteredEvents.filter((e) => !isEventLive(e) && isEventUpcoming(e)),
  ].slice(0, 10);

  if (isLoading && events.length === 0) return <PageLoader />;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div>
          <p style={{ color: 'var(--subtext)', fontSize: 14, marginBottom: 2 }}>
            {getGreeting()} 👋
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            {currentUser?.name ?? 'Explore'}
          </h1>
        </div>
        <button
          onClick={() => navigate('/notifications')}
          style={{
            position: 'relative',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
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
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--color-crimson)',
              }}
            />
          )}
        </button>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--subtext)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 14,
            padding: '13px 16px 13px 40px',
            fontSize: 15,
            color: 'var(--text)',
            width: '100%',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
        />
      </div>

      {/* Category filters */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 24,
          scrollbarWidth: 'none',
        }}
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '8px 20px',
              borderRadius: 99,
              border: '1.5px solid',
              borderColor: activeFilter === f ? 'var(--color-crimson)' : 'var(--border)',
              background: activeFilter === f ? 'var(--color-crimson)' : 'var(--surface)',
              color: activeFilter === f ? '#fff' : 'var(--subtext)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={loadEvents} />}

      {/* Empty state when no events */}
      {!error && !isLoading && filteredEvents.length === 0 && (
        <EmptyState
          svgSrc="/svg/empty_events.svg"
          title={searchQuery ? 'No events found' : 'No upcoming or live events'}
          description={
            searchQuery
              ? `No events match "${searchQuery}"`
              : 'Check back later for exciting campus events!'
          }
          action={
            searchQuery ? (
              <button
                onClick={() => { setSearchQuery(''); setActiveFilter('All'); }}
                className="btn-primary"
              >
                Clear Search
              </button>
            ) : undefined
          }
        />
      )}

      {/* Featured Events — horizontal scroll (live first, then upcoming) */}
      {featuredEvents.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              Featured Events
            </h2>
            <button
              onClick={() => navigate('/events')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-crimson)',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontFamily: 'var(--font-sans)',
              }}
            >
              See all &gt;
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 14,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollbarWidth: 'none',
            }}
          >
            {featuredEvents.map((e) => (
              <div key={e.id} style={{ minWidth: 280, maxWidth: 280, flexShrink: 0 }}>
                <EventCard event={e} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Saved events */}
      {savedEvents.length > 0 && !searchQuery && activeFilter === 'All' && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader
            icon={<BookmarkIcon size={16} color="var(--color-crimson)" />}
            title="Saved Events"
            count={savedEvents.length}
            onSeeAll={() => {/* shows all saved */}}
          />
          <div
            style={{
              display: 'flex',
              gap: 14,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollbarWidth: 'none',
            }}
          >
            {savedEvents.slice(0, 5).map((e) => (
              <div key={e.id} style={{ minWidth: 240, maxWidth: 240, flexShrink: 0 }}>
                <EventCard event={e} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Clubs — horizontal scroll */}
      {clubs.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              Active Clubs
            </h2>
            <button
              onClick={() => navigate('/clubs')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-crimson)',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontFamily: 'var(--font-sans)',
              }}
            >
              See all <ChevronRight size={16} />
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 20,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollbarWidth: 'none',
            }}
          >
            {clubs.map((club) => (
              <ClubAvatar
                key={club.id}
                club={club}
                onClick={() => navigate(`/clubs/${club.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  onSeeAll,
}: {
  icon?: React.ReactNode;
  title: string;
  count?: number;
  onSeeAll?: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
        {count !== undefined && count > 0 && (
          <span
            style={{
              background: 'var(--color-crimson-dim)',
              color: 'var(--color-crimson)',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 99,
              padding: '1px 8px',
            }}
          >
            {count}
          </span>
        )}
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-crimson)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontFamily: 'var(--font-sans)',
          }}
        >
          See all <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function ClubAvatar({ club, onClick }: { club: ClubModel; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        flexShrink: 0,
        width: 72,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
      >
        {club.logoUrl ? (
          <img
            src={club.logoUrl}
            alt={club.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
              (e.currentTarget.parentElement as HTMLElement).innerHTML = `<span style="font-size:18px;font-weight:800;color:var(--subtext)">${buildAvatarInitials(club.name)}</span>`;
            }}
          />
        ) : (
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--subtext)' }}>
            {buildAvatarInitials(club.name)}
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text)',
          textAlign: 'center',
          lineHeight: 1.2,
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
