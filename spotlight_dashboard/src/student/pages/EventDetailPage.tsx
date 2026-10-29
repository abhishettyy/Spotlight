import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ChevronLeft, Share2, Bookmark, BookmarkCheck, Loader2, Calendar, Users, Clock, X,
} from 'lucide-react';
import { useEventsStore } from '@student/store/eventsStore';
import { useSavedEventsStore } from '@student/store/savedEventsStore';
import { useAuthStore } from '@student/store/authStore';
import { fetchUserTickets } from '@student/api/registrations';
import {
  isEventLive, isEventFull, isTicketConfirmed, ticketHasPaid, TicketModel, EventModel,
} from '@student/types/event';
import { PageLoader } from '@student/components/ui/LoadingSpinner';
import EventImage from '@student/components/ui/EventImage';
import { ErrorState } from '@student/components/ui/States';
import type { PaymentRouteState } from '@student/pages/PaymentPage';
import { toast } from 'sonner';

function formatDeadlineStr(deadline: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hourInt = deadline.getHours() % 12;
  if (hourInt === 0) hourInt = 12;
  const amPm = deadline.getHours() >= 12 ? 'PM' : 'AM';
  const minStr = String(deadline.getMinutes()).padStart(2, '0');
  return `${months[deadline.getMonth()]} ${deadline.getDate()}, ${deadline.getFullYear()} · ${hourInt}:${minStr} ${amPm}`;
}

function formatDateTimeRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return 'TBD';
  const st = start ?? new Date();
  const en = end ?? new Date(st.getTime() + 3 * 60 * 60 * 1000);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatTime = (d: Date) => {
    let hourInt = d.getHours() % 12;
    if (hourInt === 0) hourInt = 12;
    const amPm = d.getHours() >= 12 ? 'PM' : 'AM';
    const minStr = String(d.getMinutes()).padStart(2, '0');
    return `${hourInt}:${minStr} ${amPm}`;
  };

  const formatDate = (d: Date) => {
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  if (st.getFullYear() === en.getFullYear() && st.getMonth() === en.getMonth() && st.getDate() === en.getDate()) {
    return `${formatDate(st)} · ${formatTime(st)} - ${formatTime(en)}`;
  } else {
    return `${formatDate(st)} · ${formatTime(st)} → ${formatDate(en)} · ${formatTime(en)}`;
  }
}

function parseDates(event: EventModel) {
  let start: Date | null = event.eventDate instanceof Date ? event.eventDate : null;
  if (!start && event.date) {
    const d = new Date(event.date);
    if (!isNaN(d.getTime())) start = d;
  }
  let end: Date | null = event.eventEndDate instanceof Date ? event.eventEndDate : null;
  if (!end && start) {
    end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  }
  return { start, end };
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, isLoading, loadEvents } = useEventsStore();
  const { isSaved, toggle } = useSavedEventsStore();
  const { isAuthenticated } = useAuthStore();

  // null = still checking (mirrors Flutter's `bool? _isRegistered`)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [pendingPaymentTicket, setPendingPaymentTicket] = useState<TicketModel | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);
  const [posterOk, setPosterOk] = useState(false);
  const [, setTick] = useState(0);

  const event = events.find((e) => e.id === id);

  useEffect(() => {
    if (events.length === 0) loadEvents();
    // Re-evaluate the deadline every second, like Flutter's _deadlineTimer
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) checkRegistration();
  }, [id, isAuthenticated]);

  // Ported from EventDetailsScreen._checkRegistration
  const checkRegistration = async () => {
    try {
      const currentUserId = localStorage.getItem('userId') ?? '';
      const tickets = await fetchUserTickets();
      let pendingTicket: TicketModel | null = null;
      let confirmedTicket: TicketModel | null = null;

      for (const t of tickets) {
        if (t.event?.id !== id) continue;
        if (t.status.toUpperCase() === 'REJECTED') continue;

        const isFree = (t.event?.price ?? 0) === 0;
        const isTeamMember = t.team != null;
        const isLeader = isTeamMember && (t.team!.leaderId
          ? t.team!.leaderId === currentUserId
          : t.team!.members.some((m) => m.isLeader && m.id === currentUserId));

        if (isFree || isTicketConfirmed(t) || ticketHasPaid(t) || (isTeamMember && !isLeader)) {
          confirmedTicket = t;
        } else {
          pendingTicket = t;
        }
      }

      if (confirmedTicket) {
        setIsRegistered(true);
        setPendingPaymentTicket(null);
      } else {
        setIsRegistered(false);
        setPendingPaymentTicket(pendingTicket);
      }
    } catch {
      setIsRegistered(false);
      setPendingPaymentTicket(null);
    }
  };

  if (isLoading && !event) return <PageLoader />;
  if (!event) return <ErrorState message="Event not found." onRetry={loadEvents} />;

  const saved = isSaved(event.id);
  const live = isEventLive(event);
  const full = isEventFull(event);

  const { start: startDate, end: endDate } = parseDates(event);

  const checkingRegistration = isRegistered === null;
  const alreadyRegistered = isRegistered === true;
  const isPendingPayment = pendingPaymentTicket != null;
  const isDeadlinePassed = event.registrationDeadline ? new Date() > event.registrationDeadline : false;
  const isClosed = isDeadlinePassed || full;

  const isTeam = (event.eventType ?? '').toLowerCase() === 'team';

  const handleShare = async () => {
    const formattedPrice = event.price > 0 ? `₹${event.price}` : 'Free';
    const shareText = `Hey! Check out this event "${event.title}"${
      event.clubName ? ` hosted by ${event.clubName}` : ''
    } on Spotlight!\n\n📍 Venue: ${event.venue}\n📅 Date: ${
      event.date ?? 'TBA'
    }\n🏷️ Price: ${formattedPrice}\n\nCheck it out here: ${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // cancelled share
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Event link copied to clipboard!');
    }
  };

  // ── Bottom CTA state (mirrors Flutter) ───────────────────────────────────
  let btnLabel = 'Register Now';
  let btnColor = 'var(--sk-brand)';
  let btnTextColor = 'var(--sk-on-brand)';
  const btnDisabled = isClosed || alreadyRegistered || checkingRegistration;

  if (checkingRegistration) {
    btnLabel = '';
    btnColor = 'var(--raised)';
    btnTextColor = 'var(--sk-faint)';
  } else if (alreadyRegistered) {
    btnLabel = 'Already Registered';
    btnColor = 'var(--sk-ok-soft)';
    btnTextColor = 'var(--sk-ok)';
  } else if (isPendingPayment) {
    btnLabel = 'Complete Payment';
    btnColor = '#F59E0B';
    btnTextColor = '#000000';
  } else if (full) {
    btnLabel = 'Registration Full';
    btnColor = 'var(--raised)';
    btnTextColor = 'var(--sk-faint)';
  } else if (isClosed) {
    btnLabel = 'Registration Closed';
    btnColor = 'var(--raised)';
    btnTextColor = 'var(--sk-faint)';
  }

  return (
    <div className="stu-ed" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Mobile: poster on top, content below. Desktop: poster left (sticky), content right. */}
      <div className="stu-ed-grid">

        {/* ── Poster ────────────────────────────────────────────────────── */}
        <div
          className="stu-ed-poster"
          style={{ cursor: posterOk ? 'zoom-in' : 'default' }}
          onClick={() => posterOk && setPosterOpen(true)}
        >
          <EventImage
            src={event.imageUrl}
            alt={event.title}
            className="stu-ed-poster-img"
            style={{ objectFit: undefined }}
            onStatusChange={setPosterOk}
          />

          {/* Circle back button (top-left) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(-1);
            }}
            aria-label="Back"
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              zIndex: 10,
              padding: 0,
            }}
          >
            <ChevronLeft size={22} strokeWidth={2.5} style={{ marginRight: 2 }} />
          </button>

          {/* Circle share button (top-right) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            aria-label="Share"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              zIndex: 10,
              padding: 0,
            }}
          >
            <Share2 size={18} strokeWidth={2} />
          </button>
        </div>

        {/* ── Content Container ─────────────────────────────────────────── */}
        <div className="stu-ed-content">

          {/* Category pill + Price pill row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Glass pill – category / solo / team */}
              <span
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  background: 'var(--raised)',
                  border: '1px solid var(--border)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text)',
                  display: 'inline-block',
                }}
              >
                {event.category}
              </span>

              {/* LIVE badge */}
              {live && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 10px',
                    borderRadius: 20,
                    background: 'transparent',
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--sk-danger)',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--sk-danger)',
                      animation: 'pulse-dot 1.2s infinite',
                    }}
                  />
                  LIVE NOW
                </span>
              )}
            </div>

            {/* Price pill */}
            <span
              style={{
                padding: '6px 12px',
                borderRadius: 14,
                background: 'var(--raised)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                display: 'inline-block',
              }}
            >
              {event.price > 0 ? 'Paid' : 'Free'}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.5px',
              lineHeight: 1.3,
              marginBottom: 6,
            }}
          >
            {event.title}
          </h1>

          {/* Venue */}
          <p
            style={{
              fontSize: 15,
              color: 'var(--subtext)',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Venue: {event.venue}
          </p>

          {/* Hosted by */}
          {event.clubName && (
            <p
              onClick={() => event.clubId && navigate(`/clubs/${event.clubId}`)}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--sk-brand)',
                marginBottom: 6,
                cursor: event.clubId ? 'pointer' : 'default',
              }}
            >
              Hosted by: {event.clubName}
            </p>
          )}

          {/* Deadline */}
          {event.registrationDeadline && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                marginBottom: 28,
              }}
            >
              <Clock size={13} color="var(--sk-warn)" strokeWidth={2.5} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--sk-warn)',
                }}
              >
                Deadline:{' '}
                {formatDeadlineStr(event.registrationDeadline)}
              </span>
            </div>
          )}
          {!event.registrationDeadline && <div style={{ marginBottom: 28 }} />}

          {/* Date & Time card */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--sk-radius-lg)',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--raised)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar size={20} color="var(--subtext)" strokeWidth={1.5} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginBottom: 4,
                }}
              >
                Date &amp; Time
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--subtext)',
                  lineHeight: 1.4,
                }}
              >
                {formatDateTimeRange(startDate, endDate)}
              </p>
            </div>
          </div>

          {/* Team Format card (only for team events) */}
          {isTeam && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--sk-radius-lg)',
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Users size={20} color="var(--subtext)" strokeWidth={1.5} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 4,
                  }}
                >
                  Team Format
                </p>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--subtext)',
                  }}
                >
                  Min {event.minTeamSize ?? 1} · Max {event.teamSizeLimit ?? 'No limit'} members per team
                </p>
              </div>
            </div>
          )}

          {/* About this event */}
          <div style={{ marginTop: 28 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 12,
              }}
            >
              About this event
            </h2>
            <p
              style={{
                fontSize: 16,
                color: 'var(--subtext)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {event.description ?? 'No Description'}
            </p>
          </div>

        {/* ── Action bar: fixed to the screen bottom on mobile (Flutter bottomNavigationBar),
               sticky at the bottom of the details column on desktop ─────────────── */}
        <div className="event-detail-bottom-bar">
          {/* Bookmark circle */}
          <button
            onClick={() => {
              const wasSaved = isSaved(event.id);
              toggle(event.id);
              toast(wasSaved ? 'Event removed from saved list' : 'Event saved to your list');
            }}
            aria-label="Bookmark event"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              flexShrink: 0,
              background: 'var(--raised)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: saved ? 'var(--sk-brand)' : 'var(--text)',
              transition: 'transform 0.15s ease',
            }}
          >
            {saved ? (
              <BookmarkCheck size={22} strokeWidth={2} />
            ) : (
              <Bookmark size={22} strokeWidth={2} />
            )}
          </button>

          {/* Register Now pill */}
          <button
            disabled={btnDisabled}
            onClick={() => {
              if (btnDisabled) return;
              if (pendingPaymentTicket) {
                const info = pendingPaymentTicket.event;
                const state: PaymentRouteState = {
                  eventName: info?.title ?? event.title,
                  price: info?.price ?? event.price,
                  qrUrl: info?.qrUrl ?? event.qrUrl ?? null,
                  upiId: info?.upiId ?? event.upiId ?? null,
                  teamSizeLimit: info?.teamSizeLimit ?? event.teamSizeLimit ?? null,
                  referenceCode: pendingPaymentTicket.id.slice(0, 6).toUpperCase(),
                };
                navigate(`/events/${id}/payment?registrationId=${pendingPaymentTicket.id}`, { state });
              } else {
                navigate(`/events/${id}/register`);
              }
            }}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 'var(--sk-radius-lg)',
              background: btnColor,
              border: 'none',
              cursor: btnDisabled ? 'default' : 'pointer',
              color: btnTextColor,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              boxShadow: 'none',
            }}
          >
            {checkingRegistration ? (
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : (
              btnLabel
            )}
          </button>
        </div>
        </div>

        {/* ── Full-screen poster overlay ───────────────────────────────────── */}
        {posterOpen && posterOk && event.imageUrl && (
          <div
            onClick={() => setPosterOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000,
              background: 'rgba(0, 0, 0, 0.94)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'zoom-out',
              padding: 16,
            }}
          >
            <img
              src={event.imageUrl}
              alt={event.title}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
            <button
              onClick={() => setPosterOpen(false)}
              aria-label="Close poster preview"
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: 40,
                height: 40,
                borderRadius: '50%',
                // Theme chip, same as the club dashboard's banner viewer: dark X in light theme, light X in dark
                background: 'var(--sk-raised)',
                border: 'none',
                color: 'var(--sk-fg)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
