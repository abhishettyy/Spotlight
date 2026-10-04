import { useEffect, useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useEventsStore } from '@/store/eventsStore';
import EventCard from '@/components/ui/EventCard';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { isEventLive, isEventUpcoming, isEventPast } from '@/types/event';

const TABS = ['All', 'Upcoming', 'Live', 'Past'];

export default function AllEventsPage() {
  const { events, isLoading, error, loadEvents } = useEventsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (events.length === 0) loadEvents();
  }, []);

  const categories = useMemo(() => {
    const cats = events
      .map((e) => e.category.trim())
      .filter((c) => c && c.toLowerCase() !== 'other')
      .reduce((acc: string[], c) => (acc.includes(c) ? acc : [...acc, c]), [])
      .sort();
    return ['All', ...cats];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Tab filter
      if (activeTab === 'Live' && !isEventLive(e)) return false;
      if (activeTab === 'Upcoming' && (!isEventUpcoming(e) || isEventLive(e))) return false;
      if (activeTab === 'Past' && !isEventPast(e)) return false;

      // Category filter
      if (activeCategory !== 'All' && e.category !== activeCategory) return false;

      // Search filter
      const q = searchQuery.toLowerCase();
      if (q) {
        return (
          e.title.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          e.clubName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, activeTab, activeCategory, searchQuery]);

  if (isLoading && events.length === 0) return <PageLoader />;

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 20, letterSpacing: '-0.3px' }}>
        All Events
      </h1>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--subtext)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          placeholder="Search events…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{ paddingLeft: 40 }}
        />
      </div>

      {/* Tab row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 18px',
              borderRadius: 99,
              border: '1.5px solid',
              borderColor: activeTab === tab ? 'var(--color-crimson)' : 'var(--border)',
              background: activeTab === tab ? 'var(--color-crimson)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--subtext)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Category chips */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '5px 14px',
                borderRadius: 99,
                border: '1px solid',
                borderColor: activeCategory === cat ? 'var(--color-crimson)' : 'var(--border)',
                background: activeCategory === cat ? 'var(--color-crimson-dim)' : 'transparent',
                color: activeCategory === cat ? 'var(--color-crimson)' : 'var(--subtext)',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={loadEvents} />}

      {filteredEvents.length === 0 ? (
        <EmptyState
          svgSrc="/svg/empty_events.svg"
          title={
            searchQuery
              ? `No events match "${searchQuery}"`
              : activeTab !== 'All'
                ? `No ${activeTab} events found`
                : 'No upcoming events'
          }
          description={
            searchQuery
              ? 'Try checking for typos or searching a different term.'
              : 'Check back later for exciting campus events!'
          }
          action={
            searchQuery ? (
              <button
                onClick={() => { setSearchQuery(''); setActiveTab('All'); }}
                className="btn-primary"
              >
                Clear Search
              </button>
            ) : undefined
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filteredEvents.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
