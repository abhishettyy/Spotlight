
const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String formatDate(DateTime d) => '${_months[d.month - 1]} ${d.day}, ${d.year}';

String formatTime12H(DateTime d) {
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute.toString().padLeft(2, '0');
  return '$h:$m ${d.hour >= 12 ? 'PM' : 'AM'}';
}

String formatDateTime12H(DateTime? d, {bool includeTime = true}) {
  if (d == null) return 'TBD';
  return includeTime ? '${formatDate(d)} · ${formatTime12H(d)}' : formatDate(d);
}

String formatEventHeaderDate(DateTime? start, DateTime? end) {
  if (start == null) return 'TBD';
  if (end == null) return '${formatDate(start)} · ${formatTime12H(start)}';
  final sameDay = start.year == end.year && start.month == end.month && start.day == end.day;
  if (sameDay) return '${formatDate(start)} · ${formatTime12H(start)} - ${formatTime12H(end)}';
  return '${formatDate(start)} · ${formatTime12H(start)} → ${formatDate(end)} · ${formatTime12H(end)}';
}

String formatDeadline(DateTime deadline) => '${formatDate(deadline)} · ${formatTime12H(deadline)}';

String timeAgo(DateTime? date) {
  if (date == null) return '';
  final diff = DateTime.now().difference(date);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return formatDate(date);
}
