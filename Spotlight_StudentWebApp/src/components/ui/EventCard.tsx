import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Bookmark } from 'lucide-react';
import { EventModel, isEventLive, isEventPast, isEventFull, getEventStartDate } from '@/types/event';
import { formatEventHeaderDate, formatDeadline } from '@/utils/dateUtils';
import { useSavedEventsStore } from '@/store/savedEventsStore';

interface EventCardProps {
  event: EventModel;
  compact?: boolean;
}

export default function EventCard({ event, compact = false }: EventCardProps) {
  const navigate = useNavigate();
  const { isSaved, toggle } = useSavedEventsStore();
  const saved = isSaved(event.id);
  const live = isEventLive(event);
  const past = isEventPast(event);
  const full = isEventFull(event);

  const dateStr = event.eventDate?.toISOString() ?? event.date ?? null;
  const endDateStr = event.eventEndDate?.toISOString() ?? null;

  const startDate = getEventStartDate(event);
  const startDay = startDate ? String(startDate.getDate()).padStart(2, '0') : null;
  const startMonth = startDate
    ? startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    : null;

  const deadlineDate = event.registrationDeadline
    ? (event.registrationDeadline instanceof Date ? event.registrationDeadline : new Date(event.registrationDeadline))
    : null;

  return (
    <div
      className="spotlight-card"
      onClick={() => navigate(`/events/${event.id}`)}
      style={{
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: 20,
        background: '#121215',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        opacity: past ? 0.75 : 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Banner image */}
      <div
        style={{
          height: compact ? 150 : 180,
          background: '#16171b',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
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
              background: 'linear-gradient(135deg, #1c1d22 0%, #121316 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={36} style={{ opacity: 0.18, color: '#ffffff' }} />
          </div>
        )}

        {/* Top left badges: Club/Spotlight text pill + Live badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 2,
          }}
        >
          {/* Spotlight / Club text pill */}
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 999,
              letterSpacing: '0.2px',
            }}
          >
            {event.clubName || 'Spotlight'}
          </span>

          {/* LIVE status badge */}
          {live && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#ff4d4f',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                letterSpacing: '0.5px',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#ff4d4f',
                  display: 'inline-block',
                  boxShadow: '0 0 6px #ff4d4f',
                }}
              />
              LIVE
            </span>
          )}
        </div>

        {/* Top right date box */}
        {startDay && startMonth && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(30, 30, 36, 0.8)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 14,
              padding: '6px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 46,
              zIndex: 2,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.1,
              }}
            >
              {startDay}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.7)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginTop: 1,
              }}
            >
              {startMonth}
            </span>
          </div>
        )}

        {/* Full badge */}
        {full && !past && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 0',
              backdropFilter: 'blur(4px)',
            }}
          >
            FULL
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: compact ? '14px 14px' : '16px' }}>
        {/* Event Type / Category */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-crimson)',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: 4,
          }}
        >
          {event.eventType || event.category || 'EVENT'}
        </p>

        {/* Title */}
        <h3
          style={{
            fontSize: compact ? 17 : 18,
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: 8,
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {event.title}
        </h3>

        {/* Deadline or Date info */}
        {deadlineDate && !isNaN(deadlineDate.getTime()) ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#f59e0b',
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            <Clock size={13} color="#f59e0b" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Deadline: {formatDeadline(deadlineDate)}
            </span>
          </div>
        ) : dateStr ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--subtext)',
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            <Calendar size={13} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatEventHeaderDate(dateStr, endDateStr)}
            </span>
          </div>
        ) : null}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
          }}
        >
          <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>
            {event.registrationCount ?? 0}{' '}
            {(event.registrationCount ?? 0) === 1 ? 'registration' : 'registrations'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              {event.price > 0 ? `₹${event.price}` : 'Free'}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(event.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: saved ? 'var(--color-crimson)' : 'rgba(255, 255, 255, 0.7)',
                transition: 'color 0.15s ease',
              }}
              aria-label={saved ? 'Remove bookmark' : 'Bookmark event'}
            >
              <Bookmark size={18} fill={saved ? 'var(--color-crimson)' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
