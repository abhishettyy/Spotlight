import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, RefreshCw, Calendar, MapPin, Copy, Users, Check } from 'lucide-react';
import { fetchUserTickets } from '@/api/registrations';
import { TicketModel, isTicketUpcoming, isTicketConfirmed } from '@/types/event';
import { useSavedEventsStore } from '@/store/savedEventsStore';
import { useEventsStore } from '@/store/eventsStore';
import EventCard from '@/components/ui/EventCard';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { formatEventHeaderDate } from '@/utils/dateUtils';

const TABS = ['Upcoming', 'Saved', 'Past'] as const;
type TabType = typeof TABS[number];

export default function TicketsPage() {
  const navigate = useNavigate();
  const { savedIds } = useSavedEventsStore();
  const { events, loadEvents } = useEventsStore();
  const [tickets, setTickets] = useState<TicketModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('Upcoming');

  useEffect(() => {
    loadTickets();
    if (events.length === 0) {
      loadEvents();
    }
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUserTickets();
      setTickets(data);
    } catch (e) {
      setError(String(e).replace('Error: ', ''));
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingTickets = tickets.filter((t) => isTicketUpcoming(t));
  const pastTickets = tickets.filter((t) => !isTicketUpcoming(t));
  const savedEvents = events.filter((e) => savedIds.has(e.id));
  const savedCount = savedIds.size;

  const displayed: TicketModel[] =
    activeTab === 'Upcoming' ? upcomingTickets : activeTab === 'Past' ? pastTickets : [];

  if (isLoading) return <PageLoader />;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>
          My Events
        </h1>
        <button
          onClick={loadTickets}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--subtext)',
            transition: 'all 0.15s ease',
          }}
          aria-label="Refresh"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* Stats line */}
      <p style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 20, fontWeight: 500 }}>
        {upcomingTickets.length} upcoming · {savedCount} saved · {pastTickets.length} past
      </p>

      {/* Tab switcher — pill style */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 50,
          padding: '4px',
          marginBottom: 24,
          width: '100%',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px 0',
              borderRadius: 50,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 14,
              background: activeTab === tab ? 'var(--color-crimson)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--subtext)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={loadTickets} />}

      {/* Saved tab */}
      {activeTab === 'Saved' && (
        savedEvents.length === 0 ? (
          <EmptyState
            svgSrc="/svg/empty_saved.svg"
            title="No Saved Events Yet"
            description="Tap the bookmark icon on any event to save it to your list"
            action={
              <button onClick={() => navigate('/')} className="btn-primary">
                Browse Events
              </button>
            }
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {savedEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )
      )}

      {activeTab !== 'Saved' && displayed.length === 0 && !error && (
        <EmptyState
          svgSrc={activeTab === 'Upcoming' ? '/svg/empty_upcoming.svg' : '/svg/empty_past.svg'}
          title={activeTab === 'Upcoming' ? 'No Upcoming Events' : 'No Past Events'}
          description={
            activeTab === 'Upcoming'
              ? 'Your registered upcoming event passes will show up here'
              : 'Events you attended previously will appear here'
          }
          action={
            activeTab === 'Upcoming' ? (
              <button onClick={() => navigate('/')} className="btn-primary">
                Browse Events
              </button>
            ) : undefined
          }
        />
      )}

      {activeTab !== 'Saved' && displayed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {displayed.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onViewTicket={() => navigate(`/tickets/${ticket.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, onViewTicket }: { ticket: TicketModel; onViewTicket: () => void }) {
  const [copied, setCopied] = useState(false);
  const event = ticket.event;
  const confirmed = isTicketConfirmed(ticket);

  const dateStr = event?.eventDate?.toISOString() ?? event?.date ?? null;
  const endDateStr = event?.eventEndDate?.toISOString() ?? null;

  // Is live?
  const live = event?.eventDate
    ? (() => {
        const start = event.eventDate!;
        const end = event.eventEndDate ?? new Date(start.getTime() + 3 * 60 * 60 * 1000);
        const now = new Date();
        return now >= start && now <= end;
      })()
    : false;

  const joinedCount =
    ticket.team?.members?.filter((m) => m.status === 'CONFIRMED' || m.status === 'JOINED').length ??
    (confirmed ? 1 : 0);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ticket.team?.passkey) {
      navigator.clipboard.writeText(ticket.team.passkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        background: '#121215',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* Banner */}
      <div style={{ height: 180, background: '#1a1b20', position: 'relative', overflow: 'hidden' }}>
        {event?.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event?.title ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1c1d22 0%, #0d0e12 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={40} style={{ opacity: 0.15, color: '#fff' }} />
          </div>
        )}

        {/* Top-left badges */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          <span
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 999,
            }}
          >
            {event?.clubName || 'Spotlight'}
          </span>

          {live && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(255,77,79,0.15)',
                border: '1px solid rgba(255,77,79,0.4)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#ff4d4f',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                letterSpacing: '0.4px',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#ff4d4f',
                  boxShadow: '0 0 6px #ff4d4f',
                }}
              />
              LIVE NOW
            </span>
          )}
        </div>

        {/* Top-right status badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
          }}
        >
          {confirmed ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(22, 163, 74, 0.18)',
                border: '1.5px solid rgba(74, 222, 128, 0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#4ade80',
                fontSize: 12,
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: 999,
                letterSpacing: '0.2px',
              }}
            >
              <Check size={13} strokeWidth={3} />
              Confirmed
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(245,158,11,0.15)',
                border: '1.5px solid rgba(245,158,11,0.35)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#f59e0b',
                fontSize: 12,
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: 999,
              }}
            >
              Pending
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '16px 18px' }}>
        {/* Club name */}
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--subtext)', marginBottom: 3 }}>
          {event?.clubName || 'Spotlight'}
        </p>

        {/* Title */}
        <h3
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 12,
            letterSpacing: '-0.3px',
          }}
        >
          {event?.title ?? 'Unknown Event'}
        </h3>

        {/* Date */}
        {dateStr && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--subtext)',
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            <Calendar size={14} />
            <span>{formatEventHeaderDate(dateStr, endDateStr)}</span>
          </div>
        )}

        {/* Venue */}
        {event?.venue && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--subtext)',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            <MapPin size={14} />
            <span>{event.venue}</span>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

        {/* Team row */}
        {ticket.team ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={15} color="var(--subtext)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {ticket.team.name}
              </span>
              {ticket.team.passkey && (
                <span
                  style={{
                    background: 'var(--color-crimson)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: 999,
                    letterSpacing: '1px',
                  }}
                >
                  {ticket.team.passkey}
                </span>
              )}
            </div>
            {ticket.team.passkey && (
              <button
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '6px 14px',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 14 }} />
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {ticket.team && (
              <>
                <p style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 500, marginBottom: 2 }}>
                  Team Members
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#4ade80' }}>
                  {joinedCount} Joined
                </p>
              </>
            )}
          </div>

          <button
            onClick={onViewTicket}
            style={{
              background: 'var(--color-crimson)',
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = '#c0303b')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'var(--color-crimson)')
            }
          >
            View Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
