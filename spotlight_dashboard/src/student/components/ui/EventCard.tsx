import { useNavigate } from 'react-router';
import { Bookmark, Calendar, MapPin, Clock } from 'lucide-react';
import { EventModel, isEventLive, getEventStartDate } from '@student/types/event';
import { formatEventHeaderDate, formatDeadline } from '@student/utils/dateUtils';
import { useSavedEventsStore } from '@student/store/savedEventsStore';
import { toast } from 'sonner';

interface EventCardProps {
  event: EventModel;
  compact?: boolean;
}

/** Event tile used in lists. Shows the same details as the Flutter app's event card. */
export default function EventCard({ event, compact = false }: EventCardProps) {
  const navigate = useNavigate();
  const { isSaved, toggle } = useSavedEventsStore();
  const saved = isSaved(event.id);
  const live = isEventLive(event);

  const dateStr = event.eventDate?.toISOString() ?? event.date ?? null;
  const endDateStr = event.eventEndDate?.toISOString() ?? null;
  const start = getEventStartDate(event) ?? event.registrationDeadline ?? null;
  const day = start ? String(start.getDate()).padStart(2, '0') : null;
  const month = start ? start.toLocaleString('en-US', { month: 'short' }).toUpperCase() : null;
  const deadline = event.registrationDeadline ?? null;

  const toggleSaved = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(event.id);
    toast(saved ? 'Event removed from saved list' : 'Event saved to your list');
  };

  return (
    <article
      className="spotlight-card"
      onClick={() => navigate(`/events/${event.id}`)}
      style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div style={{ position: 'relative', height: compact ? 150 : 180, width: '100%', overflow: 'hidden', flexShrink: 0, background: 'var(--raised)' }}>
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--sk-faint)' }}>
            <Calendar size={28} />
          </div>
        )}
        {day && month && (
          <div
            aria-hidden
            className="stu-img-chip"
            style={{
              position: 'absolute', top: 10, right: 10, minWidth: 44, padding: '5px 8px', borderRadius: 8,
              textAlign: 'center', lineHeight: 1.05,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700 }}>{day}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--subtext)', letterSpacing: '0.5px' }}>{month}</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 70, display: 'flex', gap: 6, alignItems: 'center' }}>
          {event.clubName && (
            <span className="stu-img-chip" style={{
              fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 20,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
              {event.clubName}
            </span>
          )}
          {live && (
            <span className="stu-img-chip" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
              color: 'var(--sk-danger)', fontSize: 9, fontWeight: 800,
              letterSpacing: '0.6px', padding: '5px 8px', borderRadius: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }} />
              LIVE
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: compact ? 14 : 16, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', color: 'var(--sk-brand)' }}>
          {event.category.toUpperCase()}
        </span>

        <h3
          style={{
            fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, letterSpacing: '-0.01em',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0,
            minHeight: '2.6em', // always reserve two lines so every card is the same height
          }}
        >
          {event.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--subtext)', minWidth: 0 }}>
          <Calendar size={13} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dateStr ? formatEventHeaderDate(dateStr, endDateStr) : 'TBD'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--subtext)', minWidth: 0 }}>
          <MapPin size={13} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.venue}</span>
        </div>
        {deadline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--sk-warn)', minWidth: 0 }}>
            <Clock size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Deadline: {formatDeadline(deadline)}</span>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 500 }}>
            {event.registrationCount} {event.registrationCount === 1 ? 'registration' : 'registrations'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {event.price > 0 ? `₹${event.price.toFixed(0)}` : 'Free'}
            </span>
            <button
              type="button"
              onClick={toggleSaved}
              aria-label={saved ? 'Remove bookmark' : 'Bookmark event'}
              aria-pressed={saved}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none', display: 'grid', placeItems: 'center',
                cursor: 'pointer', background: 'transparent', color: saved ? 'var(--sk-brand)' : 'var(--subtext)',
              }}
            >
              <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </span>
        </div>
      </div>
    </article>
  );
}
