import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Users, ChevronRight, WifiOff } from 'lucide-react';
import { useClubsStore } from '@student/store/clubsStore';
import { useEventsStore } from '@student/store/eventsStore';
import { ClubModel } from '@student/types/club';
import { isEventUpcoming } from '@student/types/event';
import { PageLoader } from '@student/components/ui/LoadingSpinner';
import { EmptyState } from '@student/components/ui/States';
import Paginated from '@student/components/ui/Paginated';

export default function ClubsPage() {
  const navigate = useNavigate();
  const { clubs: storeClubs, isLoading, error, load } = useClubsStore();
  const { events } = useEventsStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    load();
  }, []);

  // Like ClubsScreen._loadClubs: add any club that only appears on an event
  const clubs = useMemo(() => {
    const seen = new Set(storeClubs.map((c) => c.id));
    const merged: ClubModel[] = [...storeClubs];
    for (const e of events) {
      const clubId = e.clubId ?? e.clubName;
      if (clubId && !seen.has(clubId)) {
        seen.add(clubId);
        merged.push({ id: clubId, name: e.clubName ?? 'Unknown Club', logoUrl: e.clubLogoUrl });
      }
    }
    return merged;
  }, [storeClubs, events]);

  const query = searchQuery.toLowerCase().trim();
  const filteredClubs = clubs.filter((c) => !query || c.name.toLowerCase().includes(query));

  // Upcoming events per club, matched by id or name
  const activeEventCount = (club: ClubModel) => events.filter((e) => {
    const cid = e.clubId ?? e.clubName;
    const isThisClub = cid === club.id || (!!e.clubName && e.clubName.toLowerCase() === club.name.toLowerCase());
    return isThisClub && isEventUpcoming(e);
  }).length;

  if (isLoading && clubs.length === 0) return <PageLoader />;

  return (
    <div className="stu-page stu-page--list">
      {/* Header */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: '-0.4px',
          marginBottom: 4,
        }}
      >
        Explore Clubs
      </h1>
      <p style={{ fontSize: 14, color: 'var(--subtext)', marginBottom: 20, fontWeight: 400 }}>
        Discover campus clubs and explore their events
      </p>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 560 }}>
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
          placeholder="Search clubs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="stu-search"
          style={{ paddingRight: 16 }}
        />
      </div>

      {error && clubs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 24px', textAlign: 'center' }}>
          <WifiOff size={48} color="var(--subtext)" style={{ opacity: 0.6 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Could not load clubs</h3>
          <button onClick={load} className="btn-primary" style={{ padding: '8px 20px' }}>Retry</button>
        </div>
      ) : filteredClubs.length === 0 ? (
        <EmptyState
          svgSrc="/svg/empty_clubs.svg"
          title={query ? `No clubs matching "${query}"` : 'No clubs registered yet'}
        />
      ) : (
        <Paginated items={filteredClubs} pageSize={12} resetKey={query}>{(pageClubs) => (
        <div className="stu-list stu-list--grid">
          {pageClubs.map((club) => (
            <ClubRow
              key={club.id}
              club={club}
              eventCount={activeEventCount(club)}
              onClick={() => navigate(`/clubs/${encodeURIComponent(club.id)}`, { state: { name: club.name, logoUrl: club.logoUrl } })}
            />
          ))}
        </div>
        )}</Paginated>
      )}
    </div>
  );
}

function ClubRow({
  club,
  eventCount,
  onClick,
}: {
  club: ClubModel;
  eventCount: number;
  onClick: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--raised)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
      }}
    >
      {/* Club Avatar */}
      <div
        style={{
          width: 52,
          height: 52,
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
        {club.logoUrl?.trim() && !logoFailed ? (
          <img
            src={club.logoUrl}
            alt={club.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Users size={22} color="var(--subtext)" strokeWidth={1.5} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {club.name}
        </p>
        <p style={{ fontSize: 13, color: 'var(--subtext)', fontWeight: 400 }}>
          {eventCount} active event{eventCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight size={18} color="var(--subtext)" style={{ flexShrink: 0 }} />
    </div>
  );
}
