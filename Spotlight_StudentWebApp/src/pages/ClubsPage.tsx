import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ChevronRight } from 'lucide-react';
import { useClubsStore } from '@/store/clubsStore';
import { useEventsStore } from '@/store/eventsStore';
import { ClubModel } from '@/types/club';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { buildAvatarInitials } from '@/utils/imageUtils';

export default function ClubsPage() {
  const navigate = useNavigate();
  const { clubs, isLoading, error, load } = useClubsStore();
  const { events } = useEventsStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (clubs.length === 0) load();
  }, []);

  const filteredClubs = clubs.filter((c) =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count active events per club
  const eventCountByClub = events.reduce((acc: Record<string, number>, e) => {
    if (e.clubId) acc[e.clubId] = (acc[e.clubId] ?? 0) + 1;
    return acc;
  }, {});

  if (isLoading && clubs.length === 0) return <PageLoader />;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 680, margin: '0 auto' }}>
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
          placeholder="Search clubs..."
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

      {error && <ErrorState message={error} onRetry={load} />}

      {filteredClubs.length === 0 ? (
        <EmptyState
          svgSrc="/svg/empty_clubs.svg"
          title={searchQuery ? 'No clubs matching your search' : 'No clubs registered yet'}
          description={
            searchQuery
              ? `No clubs match "${searchQuery}". Try searching for another name.`
              : 'Clubs will appear here once registered.'
          }
          action={
            searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="btn-primary">
                Clear Search
              </button>
            ) : undefined
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredClubs.map((club) => (
            <ClubRow
              key={club.id}
              club={club}
              eventCount={eventCountByClub[club.id] ?? 0}
              onClick={() => navigate(`/clubs/${club.id}`)}
            />
          ))}
        </div>
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
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
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
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
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
