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

export function campusNow(): Date {
  const p = campusParts();
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

export function campusTodayStart(): Date {
  const p = campusParts();
  return new Date(p.year, p.month - 1, p.day);
}

const DEFAULT_EVENT_LENGTH_MS = 3 * 60 * 60 * 1000;

export function campusEventHasEnded(event: { eventDate: Date | null; eventEndDate: Date | null }): boolean {
  if (!event.eventDate) return false;
  const end = event.eventEndDate ?? new Date(event.eventDate.getTime() + DEFAULT_EVENT_LENGTH_MS);
  return campusNow() > end;
}

const HOUR_MS = 60 * 60 * 1000;

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
