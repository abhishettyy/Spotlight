import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, CalendarX, Users } from 'lucide-react';
import { useClubsStore } from '@student/store/clubsStore';
import { useEventsStore } from '@student/store/eventsStore';
import EventCard from '@student/components/ui/EventCard';
import { PageLoader } from '@student/components/ui/LoadingSpinner';
import { getEventStartDate, isEventUpcoming } from '@student/types/event';
import Paginated from '@student/components/ui/Paginated';

/** Name/logo passed by the caller, for clubs that only exist on an event or ticket. */
export interface ClubRouteState {
  name?: string;
  logoUrl?: string | null;
}

export default function ClubEventsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routeState = useLocation().state as ClubRouteState | null;
  const { clubs, load } = useClubsStore();
  const { events, isLoading, loadEvents } = useEventsStore();
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (clubs.length === 0) load();
    if (events.length === 0) loadEvents();
  }, []);

  const club = clubs.find((c) => c.id === id);
  const clubName = club?.name ?? routeState?.name ?? events.find((e) => e.clubId === id)?.clubName ?? id;
  const logoUrl = club?.logoUrl ?? routeState?.logoUrl ?? null;

  // Upcoming events of this club (matched by id or name), soonest first
  const clubEvents = useMemo(() => events
    .filter((e) => {
      const isThisClub = e.clubId === id || (!!e.clubName && e.clubName.toLowerCase() === clubName.toLowerCase());
      return isThisClub && isEventUpcoming(e);
    })
    .sort((a, b) => {
      const da = getEventStartDate(a);
      const db = getEventStartDate(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    }), [events, id, clubName]);

  return (
    <div className="stu-page stu-page--wide">
      {/* Club header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 4 }}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--raised)',
          border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          {logoUrl && !logoFailed ? (
            <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoFailed(true)} />
          ) : (
            <Users size={20} color="var(--subtext)" />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clubName}
          </h1>
          <p style={{ color: 'var(--subtext)', fontSize: 12 }}>Upcoming Events</p>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : clubEvents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '64px 24px', textAlign: 'center' }}>
          <CalendarX size={56} color="var(--subtext)" style={{ opacity: 0.4, marginBottom: 10 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--subtext)' }}>No upcoming events</h3>
          <p style={{ fontSize: 13, color: 'var(--subtext)', opacity: 0.7 }}>Check back later for new events from {clubName}</p>
        </div>
      ) : (
        <Paginated items={clubEvents} pageSize={12}>{(pageEvents) => (
        <div className="stu-card-grid">
          {pageEvents.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
        )}</Paginated>
      )}
    </div>
  );
}
