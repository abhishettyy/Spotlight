import 'package:flutter_test/flutter_test.dart';
import 'package:spotlight_flutter/models/models.dart';

void main() {
  group('Spotlight Data Models Deserialization Tests', () {
    test('ClubModel parsing test', () {
      final json = {
        'id': 'club_123',
        'name': 'Coding Club',
        'logoUrl': 'https://example.com/logo.png',
      };
      final club = ClubModel.fromJson(json);
      expect(club.id, equals('club_123'));
      expect(club.name, equals('Coding Club'));
      expect(club.logoUrl, equals('https://example.com/logo.png'));
    });

    test('EventModel parsing test', () {
      final json = {
        'id': 'evt_999',
        'title': 'AI Hackathon',
        'venue': 'Auditorium A',
        'image_url': 'https://example.com/banner.png',
        'category': 'Technical',
        'price': 100.0,
        'description': 'AI Challenge',
        'date': '2026-08-15',
        'qr_url': 'https://example.com/qr.png',
        'event_type': 'Team',
        'team_size_limit': 4,
        'registration_count': 12,
        'registration_deadline': '2026-08-10T23:59:59.000Z',
        'club': {
          'id': 'club_123',
          'name': 'Coding Club',
          'upi_id': 'codingclub@upi',
        }
      };

      final event = EventModel.fromJson(json);
      expect(event.id, equals('evt_999'));
      expect(event.title, equals('AI Hackathon'));
      expect(event.venue, equals('Auditorium A'));
      expect(event.price, equals(100.0));
      expect(event.eventType, equals('Team'));
      expect(event.teamSizeLimit, equals(4));
      expect(event.clubName, equals('Coding Club'));
      expect(event.upiId, equals('codingclub@upi'));
    });

    test('TicketModel parsing test', () {
      final json = {
        'id': 'reg_777',
        'status': 'CONFIRMED',
        'payment_proof_url': null,
        'created_at': '2026-07-29T12:00:00.000Z',
        'event': {
          'id': 'evt_999',
          'title': 'AI Hackathon',
          'venue': 'Auditorium A',
          'date': '2026-08-15',
          'price': 100.0,
          'qr_url': 'https://example.com/ticket_qr.png',
          'club': {
            'id': 'club_123',
            'name': 'Coding Club',
            'logoUrl': 'https://example.com/logo.png',
          }
        },
        'team': {
          'id': 'team_444',
          'name': 'ByteBusters',
          'passkey': 'ABC12',
          'members': [
            {'id': 'u1', 'name': 'Alice', 'isLeader': true},
            {'id': 'u2', 'name': 'Bob', 'isLeader': false},
          ]
        }
      };

      final ticket = TicketModel.fromJson(json);
      expect(ticket.id, equals('reg_777'));
      expect(ticket.isConfirmed, isTrue);
      expect(ticket.isPending, isFalse);
      expect(ticket.event?.title, equals('AI Hackathon'));
      expect(ticket.team?.name, equals('ByteBusters'));
      expect(ticket.team?.passkey, equals('ABC12'));
      expect(ticket.team?.members.length, equals(2));
      expect(ticket.team?.members.first.isLeader, isTrue);
    });

    test('NotificationModel parsing test', () {
      final json = {
        'id': 'notif_100',
        'type': 'registration_approved',
        'title': '🎉 Registration Confirmed!',
        'body': 'Your ticket for AI Hackathon is ready.',
        'is_read': false,
        'created_at': '2026-07-29T12:30:00.000Z',
      };

      final notif = NotificationModel.fromJson(json);
      expect(notif.id, equals('notif_100'));
      expect(notif.type, equals('registration_approved'));
      expect(notif.isRead, isFalse);
      expect(notif.title.contains('Registration Confirmed!'), isTrue);
    });
  });
}
