import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Share2, Bookmark, BookmarkCheck, Loader2, Calendar, Users, Clock, X,
} from 'lucide-react';
import { useEventsStore } from '@/store/eventsStore';
import { useSavedEventsStore } from '@/store/savedEventsStore';
import { useAuthStore } from '@/store/authStore';
import { fetchUserTickets } from '@/api/registrations';
import {
  isEventLive, isEventPast, isEventFull, TicketModel, EventModel,
} from '@/types/event';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/States';
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

  const [existingTicket, setExistingTicket] = useState<TicketModel | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);

  const event = events.find((e) => e.id === id);

  useEffect(() => {
    if (events.length === 0) loadEvents();
  }, []);

  useEffect(() => {
    if (event && isAuthenticated) checkRegistration();
  }, [event, isAuthenticated]);

  const checkRegistration = async () => {
    setCheckingRegistration(true);
    try {
      const tickets = await fetchUserTickets();
      const ticket = tickets.find(
        (t) => t.event?.id === id && t.status.toUpperCase() !== 'REJECTED'
      );
      setExistingTicket(ticket ?? null);
    } catch {
      // silently fail
    } finally {
      setCheckingRegistration(false);
    }
  };

  if (isLoading && !event) return <PageLoader />;
  if (!event) return <ErrorState message="Event not found." onRetry={loadEvents} />;

  const saved = isSaved(event.id);
  const live = isEventLive(event);
  const past = isEventPast(event);
  const full = isEventFull(event);

  const { start: startDate, end: endDate } = parseDates(event);

  const isRegistered = !!existingTicket;
  const isPendingPayment =
    existingTicket && !existingTicket.paymentProofUrl && !existingTicket.transactionId && event.price > 0;
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
  let btnColor = 'var(--color-crimson, #e63946)';
  let btnTextColor = '#ffffff';
  let btnDisabled = isClosed || isRegistered || past;

  if (checkingRegistration) {
    btnLabel = '';
    btnColor = '#27272a';
    btnTextColor = '#71717a';
    btnDisabled = true;
  } else if (isRegistered) {
    btnLabel = 'Already Registered';
    btnColor = '#1a2e1a';
    btnTextColor = '#4caf50';
    btnDisabled = true;
  } else if (isPendingPayment) {
    btnLabel = 'Complete Payment';
    btnColor = '#f59e0b';
    btnTextColor = '#000000';
    btnDisabled = false;
  } else if (full) {
    btnLabel = 'Registration Full';
    btnColor = '#27272a';
    btnTextColor = '#71717a';
    btnDisabled = true;
  } else if (past || isClosed) {
    btnLabel = past ? 'Event has ended' : 'Registration Closed';
    btnColor = '#27272a';
    btnTextColor = '#71717a';
    btnDisabled = true;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#ffffff', paddingBottom: 110 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ── Full-width Poster ─────────────────────────────────────────── */}
        <div
          style={{
            position: 'relative',
            height: 320,
            width: '100%',
            background: '#0a0a0a',
            overflow: 'hidden',
            cursor: event.imageUrl ? 'zoom-in' : 'default',
          }}
          onClick={() => event.imageUrl && setPosterOpen(true)}
        >
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: '#111111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 64,
                userSelect: 'none',
              }}
            >
              🎪
            </div>
          )}

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
        <div style={{ padding: '24px 20px 32px' }}>

          {/* Category pill + Price pill row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Glass pill – category / solo / team */}
              <span
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#ffffff',
                  display: 'inline-block',
                }}
              >
                {event.eventType ?? event.category}
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
                    color: '#ef4444',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 4px 1px #ef4444',
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
                background: 'rgba(255, 255, 255, 0.1)',
                fontSize: 13,
                fontWeight: 600,
                color: '#ffffff',
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
              color: '#ffffff',
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
              color: '#a09b9b',
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
                color: 'var(--color-crimson, #e63946)',
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
              <Clock size={13} color="#eab308" strokeWidth={2.5} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#eab308',
                }}
              >
                {isDeadlinePassed ? 'Deadline passed: ' : 'Deadline: '}
                {formatDeadlineStr(event.registrationDeadline)}
              </span>
            </div>
          )}
          {!event.registrationDeadline && <div style={{ marginBottom: 28 }} />}

          {/* Date & Time card */}
          <div
            style={{
              background: '#161414',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 24,
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
                background: '#1e1c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Calendar size={20} color="#a09b9b" strokeWidth={1.5} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: 4,
                }}
              >
                Date &amp; Time
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#a09b9b',
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
                background: '#161414',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 24,
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
                  background: '#1e1c1c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Users size={20} color="#a09b9b" strokeWidth={1.5} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#ffffff',
                    marginBottom: 4,
                  }}
                >
                  Team Format
                </p>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#a09b9b',
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
                color: '#ffffff',
                marginBottom: 12,
              }}
            >
              About this event
            </h2>
            <p
              style={{
                fontSize: 16,
                color: '#a09b9b',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {event.description || 'No description available.'}
            </p>
          </div>
        </div>

        {/* ── Sticky bottom bar (Flutter bottomNavigationBar equivalent) ─── */}
        <div
          className="event-detail-bottom-bar"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#000000',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '14px 24px',
            paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 100,
            maxWidth: 720,
            margin: '0 auto',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.3)',
          }}
        >
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
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: saved ? 'var(--color-crimson, #e63946)' : '#ffffff',
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
              if (!btnDisabled) {
                if (isPendingPayment) {
                  navigate(`/events/${id}/payment?registrationId=${existingTicket!.id}`);
                } else {
                  navigate(`/events/${id}/register`);
                }
              }
            }}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 30,
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
              boxShadow: btnDisabled ? 'none' : '0 4px 12px rgba(230, 57, 70, 0.25)',
            }}
          >
            {checkingRegistration ? (
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : (
              btnLabel
            )}
          </button>
        </div>

        {/* ── Full-screen poster overlay ───────────────────────────────────── */}
        {posterOpen && event.imageUrl && (
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
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
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
