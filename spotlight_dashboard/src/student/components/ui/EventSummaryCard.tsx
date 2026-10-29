import { Calendar, MapPin } from 'lucide-react';
import { EventModel } from '@student/types/event';
import { formatEventHeaderDate } from '@student/utils/dateUtils';
import EventImage from '@student/components/ui/EventImage';

/** Compact event overview shown beside forms on desktop (register, payment). */
export default function EventSummaryCard({ event }: { event: EventModel }) {
  const dateStr = event.eventDate?.toISOString() ?? event.date ?? null;
  const endDateStr = event.eventEndDate?.toISOString() ?? null;

  return (
    <div className="spotlight-card" style={{ overflow: 'hidden' }}>
      <div style={{ aspectRatio: '4 / 3', background: 'var(--raised)' }}>
        <EventImage src={event.imageUrl} />
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', color: 'var(--sk-brand)' }}>
          {event.category.toUpperCase()}
          {event.clubName ? ` · ${event.clubName.toUpperCase()}` : ''}
        </span>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
          {event.title}
        </h2>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--subtext)' }}>
          <Calendar size={14} style={{ flexShrink: 0 }} />
          {dateStr ? formatEventHeaderDate(dateStr, endDateStr) : 'TBD'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--subtext)' }}>
          <MapPin size={14} style={{ flexShrink: 0 }} />
          {event.venue}
        </span>
        <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, color: 'var(--subtext)' }}>Registration fee</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {event.price > 0 ? `₹${event.price.toFixed(0)}` : 'Free'}
          </span>
        </div>
      </div>
    </div>
  );
}
