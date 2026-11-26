import 'package:flutter_test/flutter_test.dart';
import 'package:spotlight_flutter/core/date_format.dart';
import 'package:spotlight_flutter/models/models.dart';

void main() {
  const eventJson = {
    'id': 'gtm-arena',
    'title': 'GTM Arena',
    'date': '2026-11-26T08:00:00.000Z',
    'eventDate': '2026-11-26T08:00:00.000Z',
    'eventEndDate': '2026-11-26T11:00:00.000Z',
    'registration_deadline': '2026-11-26T07:59:00.000Z',
  };

  test('the published event and its ticket use the same campus schedule', () {
    final event = EventModel.fromJson(eventJson);
    final ticket = TicketModel.fromJson({'event': eventJson}).event!;

    expect(event.startDate, DateTime.utc(2026, 11, 26, 8));
    expect(ticket.startDate, event.startDate);
    expect(ticket.eventEndDate, event.eventEndDate);
    expect(
      formatEventHeaderDate(event.startDate, event.eventEndDate),
      'Nov 26, 2026 · 1:30 PM - 4:30 PM',
    );
    expect(
      formatEventTimeRange(ticket.startDate, ticket.eventEndDate),
      '1:30 PM - 4:30 PM',
    );
    expect(
      formatDeadline(event.registrationDeadline!),
      'Nov 26, 2026 · 1:29 PM',
    );
  });

  test(
    'UTC, explicit offsets, and campus wall times preserve the same instant',
    () {
      final start = DateTime.utc(2026, 11, 30, 5, 30);

      expect(parseEventDate('2026-11-30T05:30:00Z'), start);
      expect(parseEventDate('2026-11-30T11:00:00+05:30'), start);
      expect(parseEventDate('2026-11-30T00:30:00-05:00'), start);
      expect(parseEventDate('2026-11-30 11:00:00'), start);
      expect(formatEventTimeRange(start, null), '11:00 AM');
    },
  );

  test('the legacy date field uses campus midnight for a date-only value', () {
    final ticket = TicketEventInfo.fromJson({'date': '2026-11-26'});

    expect(ticket.startDate, DateTime.utc(2026, 11, 25, 18, 30));
    expect(formatEventDate(ticket.startDate!), 'Nov 26, 2026');
    expect(parseEventDate('TBD'), isNull);
  });

  test(
    'a campus midnight boundary changes the calendar date and time range',
    () {
      final start = parseEventDate('2026-11-26T18:00:00Z');
      final end = parseEventDate('2026-11-26T19:00:00Z');

      expect(campusDateParts(end!).day, 27);
      expect(
        formatEventHeaderDate(start, end),
        'Nov 26, 2026 · 11:30 PM → Nov 27, 2026 · 12:30 AM',
      );
    },
  );

  test('old cached values without Z and newly cached values agree', () {
    final oldCache = EventModel.fromJson({
      ...eventJson,
      'eventDate': '2026-11-26T08:00:00.000',
      'eventEndDate': '2026-11-26T11:00:00.000',
      'registration_deadline': null,
      'registrationDeadline': '2026-11-26T07:59:00.000',
    }, fromCache: true);
    final saved = oldCache.toJson();
    final reloaded = EventModel.fromJson(saved, fromCache: true);

    expect(saved['eventDate'], eventJson['eventDate']);
    expect(saved['eventEndDate'], eventJson['eventEndDate']);
    expect(saved['registrationDeadline'], eventJson['registration_deadline']);
    expect(reloaded.startDate, oldCache.startDate);
    expect(reloaded.eventEndDate, oldCache.eventEndDate);
    expect(reloaded.registrationDeadline, oldCache.registrationDeadline);
    expect(
      formatEventTimeRange(parseEventDate(saved['eventDate']), null),
      '1:30 PM',
    );
  });

  test('event and ticket status compare UTC instants to the current clock', () {
    final now = DateTime.now().toUtc();
    final start = now.subtract(const Duration(hours: 1));
    final event = EventModel.fromJson({
      'id': 'live',
      'eventDate': start.toIso8601String(),
    });
    final ticket = TicketEventInfo.fromJson({
      'eventDate': start.toIso8601String(),
    });

    expect(event.isLive, isTrue);
    expect(ticket.isLive, isTrue);
    expect(event.effectiveEndDate, start.add(const Duration(hours: 3)));
    expect(ticket.effectiveEndDate, event.effectiveEndDate);
  });
}
