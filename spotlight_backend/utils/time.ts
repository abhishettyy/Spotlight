/**
 * Event times (start, end, registration deadline) are campus wall-clock times. The dashboard sends
 * them without a zone ("2026-10-29T10:00"), the server parses them in its own zone, and every client
 * reads them back ignoring the zone. So "now" must be built the same way before comparing: on a UTC
 * server, new Date() would run 5h30m behind IST and deadlines would close late.
 */
const CAMPUS_TIME_ZONE = process.env.CAMPUS_TIME_ZONE || 'Asia/Kolkata';

const campusClock = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hourCycle: 'h23',
});

function campusParts() {
  const parts: Record<string, number> = {};
  for (const p of campusClock.formatToParts(new Date())) {
    if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
  }
  return parts;
}

/** The current campus time, in the same form as stored event times. */
export function campusNow(): Date {
  const p = campusParts();
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Midnight at the start of today on campus, in the same form as stored event times. */
export function campusTodayStart(): Date {
  const p = campusParts();
  return new Date(p.year, p.month - 1, p.day);
}

const DEFAULT_EVENT_LENGTH_MS = 3 * 60 * 60 * 1000;

/**
 * Whether an event's end time has passed on campus. With no end time saved, the event is taken to
 * last 3 hours, the same rule the dashboard and the apps use to show an event as finished.
 */
export function campusEventHasEnded(event: { eventDate: Date | null; eventEndDate: Date | null }): boolean {
  if (!event.eventDate) return false;
  const end = event.eventEndDate ?? new Date(event.eventDate.getTime() + DEFAULT_EVENT_LENGTH_MS);
  return campusNow() > end;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Whether tickets can be scanned now. Same window as the dashboard's scanner button: from 7:00 AM on
 * the start day (or 2 hours before the start, if it begins earlier) until 6 hours after the end. With
 * no end time saved, the event is taken to end 6 hours after it starts.
 */
export function campusScanWindowOpen(event: { eventDate: Date | null; eventEndDate: Date | null }): boolean {
  if (!event.eventDate) return false;
  const start = event.eventDate;
  const morning = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 7, 0, 0, 0);
  const opens = start < morning ? new Date(start.getTime() - 2 * HOUR_MS) : morning;
  const end = event.eventEndDate ?? new Date(start.getTime() + 6 * HOUR_MS);
  const closes = new Date(end.getTime() + 6 * HOUR_MS);
  const now = campusNow();
  return now >= opens && now <= closes;
}
