import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Search, X, WifiOff } from 'lucide-react';
import { useEventsStore } from '@student/store/eventsStore';
import EventCard from '@student/components/ui/EventCard';
import { PageLoader } from '@student/components/ui/LoadingSpinner';
import { EmptyState } from '@student/components/ui/States';
import { EventModel, isEventUpcoming } from '@student/types/event';

const FORMAT_FILTERS = ['All', 'Solo', 'Team'] as const;
type FormatFilter = typeof FORMAT_FILTERS[number];

function isTeamEvent(e: EventModel) {
  return (e.eventType ?? '').toLowerCase() === 'team' ||
    (e.minTeamSize != null && e.minTeamSize > 1) ||
    (e.teamSizeLimit != null && e.teamSizeLimit > 1);
}

export default function AllEventsPage() {
  const navigate = useNavigate();
  const { events, isLoading, error, loadEvents } = useEventsStore();
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('All');

  const q = query.toLowerCase();
  const filteredEvents = events.filter((e) => {
    const matchesQuery = !q ||
      e.title.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q);
    const team = isTeamEvent(e);
    const matchesFormat = formatFilter === 'All' || (formatFilter === 'Team' ? team : !team);
    return isEventUpcoming(e) && matchesQuery && matchesFormat;
  });

  const renderBody = () => {
    if (isLoading) return <PageLoader />;
    if (error) {
      const m = error.toLowerCase();
      const isConnection = m.includes('connection') || m.includes('timeout') || m.includes('network');
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', padding: '64px 24px' }}>
          <WifiOff size={48} color="var(--subtext)" style={{ opacity: 0.6, marginBottom: 6 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Unable to load events</h3>
          <p style={{ fontSize: 12, color: 'var(--subtext)' }}>
            {isConnection ? 'Please check your internet connection and try again.' : 'Something went wrong. Please try again later.'}
          </p>
          <button onClick={loadEvents} className="btn-primary" style={{ marginTop: 10, padding: '8px 20px' }}>
            Retry
          </button>
        </div>
      );
    }
    if (filteredEvents.length === 0) {
      return (
        <EmptyState
          svgSrc="/svg/empty_events.svg"
          svgWidth={170}
          svgHeight={110}
          title={
            q
              ? `No events match "${q}"`
              : formatFilter !== 'All'
                ? `No ${formatFilter} events found`
                : 'No upcoming events'
          }
          description={q ? 'Try searching with a different keyword or format' : 'Check back later for exciting campus events!'}
        />
      );
    }
    return (
      <div className="stu-card-grid">
        {filteredEvents.map((e) => <EventCard key={e.id} event={e} />)}
      </div>
    );
  };

  return (
    <div className="stu-page stu-page--wide">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 4 }}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>
          All Events
        </h1>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--subtext)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          placeholder="Search events..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field"
          style={{ paddingLeft: 40, paddingRight: 40 }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtext)', display: 'flex' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Format filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {FORMAT_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFormatFilter(f)}
            style={{
              padding: '9px 20px',
              borderRadius: 20,
              border: 'none',
              background: formatFilter === f ? 'var(--color-crimson)' : 'var(--raised)',
              color: formatFilter === f ? 'var(--sk-on-brand)' : 'var(--subtext)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: formatFilter === f ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {renderBody()}
    </div>
  );
}
