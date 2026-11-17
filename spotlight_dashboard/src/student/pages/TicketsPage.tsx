import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  RefreshCw, Calendar, Clock, MapPin, Copy, Users, CheckCircle2, XCircle, CreditCard, Hourglass, WifiOff,
} from 'lucide-react';
import { fetchUserTickets, loadCachedTickets } from '@student/api/registrations';
import {
  TicketModel, isTicketUpcoming, isTicketConfirmed, ticketHasPaid, ticketIsLive,
} from '@student/types/event';
import { useSavedEventsStore } from '@student/store/savedEventsStore';
import { useEventsStore } from '@student/store/eventsStore';
import EventCard from '@student/components/ui/EventCard';
import EventImage from '@student/components/ui/EventImage';
import { PageLoader } from '@student/components/ui/LoadingSpinner';
import { EmptyState } from '@student/components/ui/States';
import { formatDate, formatTime12H } from '@student/utils/dateUtils';
import { toast } from 'sonner';
import Paginated from '@student/components/ui/Paginated';

const TABS = ['Upcoming', 'Saved', 'Past'] as const;
type TabType = typeof TABS[number];

export default function TicketsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { savedIds } = useSavedEventsStore();
  const { events, loadEvents } = useEventsStore();
  const [tickets, setTickets] = useState<TicketModel[]>(() => loadCachedTickets());
  const [isLoading, setIsLoading] = useState(() => loadCachedTickets().length === 0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab');
    return tab === 'saved' ? 'Saved' : tab === 'past' ? 'Past' : 'Upcoming';
  });
  const currentUserId = localStorage.getItem('userId') ?? '';

  useEffect(() => {
    loadTickets();
    if (events.length === 0) loadEvents();
  }, []);

  // Cache-first, then network — mirrors TicketScreen._loadTickets
  const loadTickets = async () => {
    const hasCached = tickets.length > 0;
    if (!hasCached) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await fetchUserTickets();
      setTickets(data);
      setError(null);
    } catch (e) {
      if (!hasCached) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingTickets = tickets.filter((t) => isTicketUpcoming(t));
  const pastTickets = tickets.filter((t) => !isTicketUpcoming(t) && isTicketConfirmed(t));
  const savedEvents = [...savedIds]
    .map((id) => events.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e);

  const displayed = activeTab === 'Upcoming' ? upcomingTickets : pastTickets;

  const renderBody = () => {
    if (isLoading) return <PageLoader />;
    if (error) {
      const m = error.toLowerCase();
      const isConnection = m.includes('connection') || m.includes('timeout') || m.includes('network');
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', padding: '48px 32px' }}>
          <WifiOff size={48} color="var(--subtext)" style={{ opacity: 0.6, marginBottom: 8 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Could not load tickets</h3>
          <p style={{ fontSize: 12, color: 'var(--subtext)' }}>
            {isConnection ? 'Please check your internet connection and try again.' : error}
          </p>
          <button onClick={loadTickets} className="btn-primary" style={{ marginTop: 16, padding: '8px 20px' }}>
            Retry
          </button>
        </div>
      );
    }

    if (activeTab === 'Saved') {
      if (savedIds.size === 0) {
        return (
          <EmptyState
            svgSrc="/svg/empty_saved.svg"
            title="No Saved Events Yet"
            description="Tap the bookmark icon on any event to save it to your list"
          />
        );
      }
      if (savedEvents.length === 0) return <PageLoader />;
      return (
        <Paginated items={savedEvents} pageSize={12}>{(pageSaved) => (
        <div className="stu-card-grid">
          {pageSaved.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
        )}</Paginated>
      );
    }

    if (displayed.length === 0) {
      return (
        <EmptyState
          svgSrc={activeTab === 'Upcoming' ? '/svg/empty_upcoming.svg' : '/svg/empty_past.svg'}
          title={activeTab === 'Upcoming' ? 'No Upcoming Events' : 'No Past Events'}
          description={
            activeTab === 'Upcoming'
              ? 'Your registered upcoming event passes will show up here'
              : 'Events you attended previously will appear here'
          }
        />
      );
    }

    return (
      <Paginated items={displayed} pageSize={10} resetKey={activeTab}>{(pageTickets) => (
      <div className="stu-list stu-list--tickets">
        {pageTickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            currentUserId={currentUserId}
            onOpen={() => navigate(`/tickets/${ticket.id}`)}
          />
        ))}
      </div>
      )}</Paginated>
    );
  };

  return (
    <div className="stu-page stu-page--list">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-1px' }}>
            My Events
          </h1>
          <p style={{ fontSize: 14, color: 'var(--subtext)', fontWeight: 500, marginTop: 4 }}>
            {isLoading
              ? 'Loading...'
              : `${upcomingTickets.length} upcoming · ${savedIds.size} saved · ${pastTickets.length} past`}
          </p>
        </div>
        <button
          onClick={loadTickets}
          aria-label="Refresh"
          title="Refresh"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtext)', display: 'flex', padding: 8 }}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="stu-seg" role="tablist" style={{ marginBottom: 24 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            className="stu-seg-btn"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {renderBody()}
    </div>
  );
}

// ── Ticket card (ported from TicketScreen._buildTicketCard) ───────────────────
function TicketCard({ ticket, currentUserId, onOpen }: { ticket: TicketModel; currentUserId: string; onOpen: () => void }) {
  const event = ticket.event;
  const status = ticket.status.toUpperCase();
  const confirmed = status === 'CONFIRMED' || status === 'APPROVED';

  const isFreeEvent = (event?.price ?? 0) === 0;
  const isLeader = ticket.team == null || (ticket.team.leaderId
    ? ticket.team.leaderId === currentUserId
    : ticket.team.members.some((m) => m.isLeader && m.id === currentUserId));
  const isPaymentPending = !isFreeEvent && !ticketHasPaid(ticket) && isLeader && !confirmed;
  const isViewDisabled = status === 'REJECTED' || isPaymentPending;

  const minRequired = event?.minTeamSize ?? 1;
  const joinedCount = ticket.team ? ticket.team.members.filter((m) => m.status.toUpperCase() !== 'REJECTED').length : 1;
  const confirmedCount = ticket.team
    ? ticket.team.members.filter((m) => ['CONFIRMED', 'APPROVED'].includes(m.status.toUpperCase())).length
    : confirmed ? 1 : 0;
  const effectiveCount = isFreeEvent ? joinedCount : confirmedCount;
  const isTeamIncomplete = ticket.team != null && effectiveCount < minRequired;

  // Date / time lines, same formatting as the Flutter card
  const start = event?.eventDate ?? null;
  const end = event?.eventEndDate ?? null;
  let dateStr = 'TBD';
  let timeStr = '';
  if (start) {
    dateStr = formatDate(start);
    if (end) {
      const sameDay = start.toDateString() === end.toDateString();
      timeStr = sameDay
        ? `${formatTime12H(start)} - ${formatTime12H(end)}`
        : `${formatTime12H(start)} → ${end.toLocaleString('en-US', { month: 'short' })} ${end.getDate()}, ${formatTime12H(end)}`;
    } else {
      timeStr = formatTime12H(start);
    }
  } else if (event?.date) {
    dateStr = event.date;
  }

  const openTicket = () => {
    if (isViewDisabled) return;
    if (isTeamIncomplete) {
      toast.warning(isFreeEvent
        ? `A minimum of ${minRequired} members must join to get the ticket.`
        : `A minimum of ${minRequired} members must be approved to get the ticket.`);
      return;
    }
    if (isTicketConfirmed(ticket)) {
      onOpen();
    } else {
      toast.warning('Your registration is pending organizer approval.');
    }
  };

  const copyPasskey = () => {
    if (!ticket.team?.passkey) return;
    navigator.clipboard.writeText(ticket.team.passkey);
    toast.success(`Passkey copied: ${ticket.team.passkey}`);
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden' }}>
      {/* Banner */}
      <div style={{ height: 140, background: 'var(--raised)', position: 'relative', overflow: 'hidden' }}>
        <EventImage src={event?.imageUrl} loading="lazy" />
        <div style={{ position: 'absolute', top: 14, right: 14 }}>
          <StatusBadge ticket={ticket} />
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {event?.clubName && (
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: 'var(--subtext)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.clubName}
          </p>
        )}
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
          {event?.title ?? 'Unknown Event'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10, fontSize: 12, color: 'var(--subtext)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={13} /> {dateStr}</span>
          {timeStr && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={13} /> {timeStr}</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={13} /> {event?.venue ?? 'TBD'}</span>
        </div>

        {ticket.team?.passkey && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 12, background: 'var(--raised)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <Users size={14} color="var(--subtext)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ticket.team.name}
              </span>
              <span style={{
                padding: '2px 6px', borderRadius: 6, background: 'var(--sk-brand-soft)', color: 'var(--sk-brand)',
                fontSize: 12, fontWeight: 700, letterSpacing: '1px', fontFamily: 'var(--sk-mono)',
              }}>
                {ticket.team.passkey}
              </span>
            </div>
            <button
              onClick={copyPasskey}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: 'none',
                background: 'var(--surface)', color: 'var(--text)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', flexShrink: 0,
              }}
            >
              <Copy size={12} /> Copy
            </button>
          </div>
        )}

        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {ticket.team && (
              <>
                <p style={{ fontSize: 10, color: 'var(--subtext)' }}>
                  {isFreeEvent ? 'Team Members' : 'Approved Members'}
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: isTeamIncomplete ? '#FBBF24' : 'var(--sk-ok)' }}>
                  {isFreeEvent ? `${joinedCount} Joined` : `${confirmedCount} Approved`}
                </p>
              </>
            )}
          </div>

          <button
            onClick={openTicket}
            disabled={isViewDisabled}
            style={{
              background: isViewDisabled ? 'var(--raised)' : 'var(--color-crimson)',
              color: isViewDisabled ? 'var(--sk-faint)' : 'var(--sk-on-brand)',
              border: 'none',
              borderRadius: 20,
              padding: '10px 20px',
              fontSize: 12,
              fontWeight: 700,
              cursor: isViewDisabled ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            View Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status badge (ported from TicketScreen._statusBadge) ──────────────────────
function StatusBadge({ ticket }: { ticket: TicketModel }) {
  const pill = (color: string, icon: React.ReactNode, label: string) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 20,
      background: 'rgba(0,0,0,0.55)', border: `1px solid ${color}55`, color, fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
    }}>
      {icon}{label}
    </span>
  );

  if (ticketIsLive(ticket)) {
    return pill('#FF5252', <span style={{ width: 6, height: 6, borderRadius: 99, background: '#FF5252' }} />, 'LIVE NOW');
  }

  const upper = ticket.status.toUpperCase();
  const isPaid = (ticket.event?.price ?? 0) > 0;
  const hasTeamPasskey = !!ticket.team?.passkey.trim();
  const isPaymentPending = isPaid && !ticketHasPaid(ticket) && !hasTeamPasskey && upper !== 'CONFIRMED' && upper !== 'APPROVED';

  if (upper === 'CONFIRMED' || upper === 'APPROVED') return pill('#81C995', <CheckCircle2 size={12} />, 'Confirmed');
  if (upper === 'REJECTED') return pill('#F87171', <XCircle size={12} />, 'Rejected');
  if (isPaymentPending) return pill('#FBBF24', <CreditCard size={12} />, 'Payment Pending');
  return pill('#A0A0A8', <Hourglass size={12} />, 'Approval Pending');
}
