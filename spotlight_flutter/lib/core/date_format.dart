const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const _campusUtcOffset = Duration(hours: 5, minutes: 30);
final _dateOnly = RegExp(r'^[+-]?\d{4,6}-?\d{2}-?\d{2}$');

/// Parses a schedule value into a UTC instant. Without an offset, API values
/// use campus time. The old event cache saved UTC clock values without the Z.
DateTime? parseEventDate(Object? raw, {bool assumeUtc = false}) {
  if (raw is! String) return null;
  final value = raw.trim();
  if (value.isEmpty) return null;

  final timestamp = _dateOnly.hasMatch(value) ? '${value}T00:00' : value;
  final wallTime = DateTime.tryParse('${timestamp}Z');
  if (wallTime != null) {
    return assumeUtc ? wallTime : wallTime.subtract(_campusUtcOffset);
  }

  return DateTime.tryParse(timestamp);
}

/// Campus calendar and clock fields for display. Use the original instant for
/// comparisons and serialization.
DateTime campusDateParts(DateTime instant) =>
    instant.toUtc().add(_campusUtcOffset);

String _formatDate(DateTime d) => '${_months[d.month - 1]} ${d.day}, ${d.year}';

String formatEventDate(DateTime instant) =>
    _formatDate(campusDateParts(instant));

String _formatTime12H(DateTime d) {
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute.toString().padLeft(2, '0');
  return '$h:$m ${d.hour >= 12 ? 'PM' : 'AM'}';
}

String formatDateTime12H(DateTime? d, {bool includeTime = true}) {
  if (d == null) return 'TBD';
  final campusDate = campusDateParts(d);
  return includeTime
      ? '${_formatDate(campusDate)} · ${_formatTime12H(campusDate)}'
      : _formatDate(campusDate);
}

String formatEventHeaderDate(DateTime? start, DateTime? end) {
  if (start == null) return 'TBD';
  return '${formatEventDate(start)} · ${formatEventTimeRange(start, end)}';
}

String formatEventTimeRange(DateTime? start, DateTime? end) {
  if (start == null) return '';
  final campusStart = campusDateParts(start);
  final startTime = _formatTime12H(campusStart);
  if (end == null) return startTime;

  final campusEnd = campusDateParts(end);
  final endTime = _formatTime12H(campusEnd);
  final sameDay =
      campusStart.year == campusEnd.year &&
      campusStart.month == campusEnd.month &&
      campusStart.day == campusEnd.day;
  if (sameDay) return '$startTime - $endTime';
  return '$startTime → ${_formatDate(campusEnd)} · $endTime';
}

String formatDeadline(DateTime deadline) => formatDateTime12H(deadline);

String timeAgo(DateTime? date) {
  if (date == null) return '';
  final diff = DateTime.now().difference(date);
  if (diff.inMinutes < 1) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return _formatDate(date);
}
