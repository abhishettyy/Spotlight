// Ported from dashboard's parseLocalDate and formatDateTime12H
// Equivalent to Flutter's parseLocalDate in models.dart

export function parseLocalDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const str = raw.trim();
  if (!str) return null;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const [, year, month, day, hour = '0', min = '0', sec = '0'] = match;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(min, 10),
      parseInt(sec, 10)
    );
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatTime12H(date: Date): string {
  let h = date.getHours() % 12;
  if (h === 0) h = 12;
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${h}:${m} ${ampm}`;
}

export function formatDateTime12H(dateStr?: string | null, includeTime = true): string {
  const d = parseLocalDate(dateStr);
  if (!d) return 'TBD';
  const dateFormatted = formatDate(d);
  if (!includeTime) return dateFormatted;
  return `${dateFormatted} · ${formatTime12H(d)}`;
}

export function formatEventHeaderDate(
  eventDateStr?: string | null,
  endDateStr?: string | null
): string {
  const start = parseLocalDate(eventDateStr);
  if (!start) return 'TBD';

  const end = parseLocalDate(endDateStr);
  if (!end) {
    return `${formatDate(start)} · ${formatTime12H(start)}`;
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${formatDate(start)} · ${formatTime12H(start)} - ${formatTime12H(end)}`;
  }
  return `${formatDate(start)} · ${formatTime12H(start)} → ${formatDate(end)} · ${formatTime12H(end)}`;
}

export function formatDeadline(deadline: Date): string {
  const h = deadline.getHours() % 12 === 0 ? 12 : deadline.getHours() % 12;
  const ampm = deadline.getHours() >= 12 ? 'PM' : 'AM';
  const min = String(deadline.getMinutes()).padStart(2, '0');
  return `${MONTHS[deadline.getMonth()]} ${deadline.getDate()}, ${deadline.getFullYear()} · ${h}:${min} ${ampm}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning 👋';
  if (hour < 17) return 'Good afternoon 👋';
  return 'Good evening 👋';
}

export function timeAgo(date: Date | null): string {
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}
