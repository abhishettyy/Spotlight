// Date text shared by every screen. Mirrors the web app's utils/dateUtils.ts so both apps
// print events identically.

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/// "Oct 22, 2026"
String formatDate(DateTime d) => '${_months[d.month - 1]} ${d.day}, ${d.year}';

/// "6:30 AM"
String formatTime12H(DateTime d) {
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute.toString().padLeft(2, '0');
  return '$h:$m ${d.hour >= 12 ? 'PM' : 'AM'}';
}

/// "Oct 22, 2026 · 6:30 AM", or "TBD" when there is no date
String formatDateTime12H(DateTime? d, {bool includeTime = true}) {
  if (d == null) return 'TBD';
  return includeTime ? '${formatDate(d)} · ${formatTime12H(d)}' : formatDate(d);
}

/// Event date line used on cards and the event page:
/// "Oct 22, 2026 · 6:30 AM", "Oct 22, 2026 · 6:30 AM - 9:00 PM" or
/// "Oct 22, 2026 · 6:30 AM → Oct 23, 2026 · 6:29 PM"
String formatEventHeaderDate(DateTime? start, DateTime? end) {
  if (start == null) return 'TBD';
  if (end == null) return '${formatDate(start)} · ${formatTime12H(start)}';
  final sameDay = start.year == end.year && start.month == end.month && start.day == end.day;
  if (sameDay) return '${formatDate(start)} · ${formatTime12H(start)} - ${formatTime12H(end)}';
  return '${formatDate(start)} · ${formatTime12H(start)} → ${formatDate(end)} · ${formatTime12H(end)}';
}

/// "Oct 22, 2026 · 11:59 PM"
String formatDeadline(DateTime deadline) => '${formatDate(deadline)} · ${formatTime12H(deadline)}';

/// "just now", "5m ago", "3h ago", "2d ago", then the date
String timeAgo(DateTime? date) {
  if (date == null) return '';
  final diff = DateTime.now().difference(date);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return formatDate(date);
}
