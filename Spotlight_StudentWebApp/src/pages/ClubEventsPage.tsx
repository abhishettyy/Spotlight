import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useClubsStore } from '@/store/clubsStore';
import { useEventsStore } from '@/store/eventsStore';
import EventCard from '@/components/ui/EventCard';
import { EmptyState } from '@/components/ui/States';
import { buildAvatarInitials } from '@/utils/imageUtils';

export default function ClubEventsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clubs, load } = useClubsStore();
  const { events, loadEvents } = useEventsStore();

  useEffect(() => {
    if (clubs.length === 0) load();
    if (events.length === 0) loadEvents();
  }, []);

  const club = clubs.find((c) => c.id === id);
  const clubEvents = useMemo(() => events.filter((e) => e.clubId === id), [events, id]);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/clubs')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-crimson)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}
      >
        <ArrowLeft size={16} /> Clubs
      </button>

      {/* Club header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, overflow: 'hidden', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {club?.logoUrl ? (
            <img src={club.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--subtext)' }}>{buildAvatarInitials(club?.name ?? '?')}</span>
          )}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>
            {club?.name ?? 'Club Events'}
          </h1>
          <p style={{ color: 'var(--subtext)', fontSize: 14 }}>
            {clubEvents.length} event{clubEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {clubEvents.length === 0 ? (
        <EmptyState
          svgSrc="/svg/empty_events.svg"
          title="No events yet"
          description="This club hasn't posted any events. Check back soon!"
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {clubEvents.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
