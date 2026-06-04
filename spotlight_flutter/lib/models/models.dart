import 'package:flutter/material.dart';

class Club {
  final String id;
  final String name;
  final String email;

  Club({required this.id, required this.name, required this.email});

  factory Club.fromJson(Map<String, dynamic> json) {
    return Club(
      id: json['id'],
      name: json['name'],
      email: json['email'],
    );
  }
}

class Event {
  final String id;
  final String clubId;
  final String name;
  final String? description;
  final String eventType;
  final int fee;
  final int? registrationLimit;
  final DateTime? registrationDeadline;
  final DateTime? eventDate;
  final String? qrUrl;
  final Club? club;

  Event({
    required this.id,
    required this.clubId,
    required this.name,
    this.description,
    required this.eventType,
    required this.fee,
    this.registrationLimit,
    this.registrationDeadline,
    this.eventDate,
    this.qrUrl,
    this.club,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'],
      clubId: json['club_id'],
      name: json['name'],
      description: json['description'],
      eventType: json['event_type'],
      fee: json['fee'] ?? 0,
      registrationLimit: json['registration_limit'],
      registrationDeadline: json['registration_deadline'] != null
          ? DateTime.parse(json['registration_deadline'])
          : null,
      eventDate: json['event_date'] != null
          ? DateTime.parse(json['event_date'])
          : null,
      qrUrl: json['qr_url'],
      club: json['clubs'] != null ? Club.fromJson(json['clubs']) : null,
    );
  }
}

class Team {
  final String id;
  final String eventId;
  final String leaderId;
  final String teamName;
  final String passkey;

  Team({
    required this.id,
    required this.eventId,
    required this.leaderId,
    required this.teamName,
    required this.passkey,
  });

  factory Team.fromJson(Map<String, dynamic> json) {
    return Team(
      id: json['id'],
      eventId: json['event_id'],
      leaderId: json['leader_id'],
      teamName: json['team_name'],
      passkey: json['passkey'],
    );
  }
}

class Registration {
  final String id;
  final String eventId;
  final String userId;
  final String? teamId;
  final String status;
  final String? paymentProofUrl;
  final DateTime createdAt;

  Registration({
    required this.id,
    required this.eventId,
    required this.userId,
    this.teamId,
    required this.status,
    this.paymentProofUrl,
    required this.createdAt,
  });

  factory Registration.fromJson(Map<String, dynamic> json) {
    return Registration(
      id: json['id'],
      eventId: json['event_id'],
      userId: json['user_id'],
      teamId: json['team_id'],
      status: json['status'],
      paymentProofUrl: json['payment_proof_url'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}

class EventModel {
  final String id;
  final String title;
  final String venue;
  final String? imageUrl;
  final String category;
  final double price;
  final String? description;
  final String? date;
  final String? qrUrl;
  final String? eventType;
  final int? teamSizeLimit;
  final String? upiId;
  final int registrationCount;

  EventModel({
    required this.id,
    required this.title,
    required this.venue,
    this.imageUrl,
    required this.category,
    required this.price,
    this.description,
    this.date,
    this.qrUrl,
    this.eventType,
    this.teamSizeLimit,
    this.upiId,
    required this.registrationCount,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    final club = json['club'] as Map<String, dynamic>?;
    return EventModel(
      id: json['id'],
      title: json['title'] ?? 'No Title',
      venue: json['venue'] ?? 'No Venue',
      imageUrl: json['image_url'],
      category: json['category'] ?? 'Other',
      price: (json['price'] ?? 0).toDouble(),
      description: json['description'],
      date: json['date'],
      qrUrl: json['qrUrl'] ?? json['qr_url'],
      eventType: json['eventType'],
      teamSizeLimit: json['teamSizeLimit'],
      upiId: club?['upiId'] ?? club?['upi_id'],
      registrationCount: json['registrationCount'] ?? 0,
    );
  }
}

class ClubModel {
  final String id;
  final String name;
  final String? logoUrl;

  ClubModel({
    required this.id,
    required this.name,
    this.logoUrl,
  });

  factory ClubModel.fromJson(Map<String, dynamic> json) {
    return ClubModel(
      id: json['id'],
      name: json['name'] ?? 'No Name',
      logoUrl: json['logoUrl'] ?? json['logo_url'],
    );
  }
}

// ── Ticket (registration + event + team) ─────────────────────────────────────

class TicketEventInfo {
  final String id;
  final String title;
  final String venue;
  final String? date;
  final double price;
  final String? qrUrl;
  final String? clubName;
  final String? imageUrl;

  TicketEventInfo({
    required this.id,
    required this.title,
    required this.venue,
    this.date,
    required this.price,
    this.qrUrl,
    this.clubName,
    this.imageUrl,
  });

  factory TicketEventInfo.fromJson(Map<String, dynamic> json) {
    final club = json['club'] as Map<String, dynamic>?;
    return TicketEventInfo(
      id: json['id'] ?? '',
      title: json['title'] ?? 'No Title',
      venue: json['venue'] ?? 'TBD',
      date: json['date'],
      price: (json['price'] ?? 0).toDouble(),
      qrUrl: json['qr_url'],
      clubName: club?['name'],
      imageUrl: json['image_url'],
    );
  }
}

class TicketTeamMember {
  final String id;
  final String name;
  final bool isLeader;

  TicketTeamMember({
    required this.id,
    required this.name,
    required this.isLeader,
  });

  factory TicketTeamMember.fromJson(Map<String, dynamic> json) {
    return TicketTeamMember(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      isLeader: json['isLeader'] ?? false,
    );
  }
}

class TicketTeamInfo {
  final String id;
  final String name;
  final String passkey;
  final List<TicketTeamMember> members;

  TicketTeamInfo({
    required this.id,
    required this.name,
    required this.passkey,
    this.members = const [],
  });

  factory TicketTeamInfo.fromJson(Map<String, dynamic> json) {
    return TicketTeamInfo(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      passkey: json['passkey'] ?? '',
      members: (json['members'] as List<dynamic>?)
              ?.map((e) => TicketTeamMember.fromJson(e))
              .toList() ??
          [],
    );
  }
}

class TicketModel {
  final String id;
  final String status;
  final String? paymentProofUrl;
  final DateTime? createdAt;
  final TicketEventInfo? event;
  final TicketTeamInfo? team;

  TicketModel({
    required this.id,
    required this.status,
    this.paymentProofUrl,
    this.createdAt,
    this.event,
    this.team,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      id: json['id'] ?? '',
      status: json['status'] ?? 'pending',
      paymentProofUrl: json['payment_proof_url'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
      event: json['event'] != null
          ? TicketEventInfo.fromJson(json['event'] as Map<String, dynamic>)
          : null,
      team: json['team'] != null
          ? TicketTeamInfo.fromJson(json['team'] as Map<String, dynamic>)
          : null,
    );
  }

  /// True if the event date is in the future (or unknown).
  bool get isUpcoming {
    if (event?.date == null) return true;
    final date = DateTime.tryParse(event!.date!);
    if (date == null) return true;
    return date.isAfter(DateTime.now());
  }

  bool get isConfirmed =>
      status.toUpperCase() == 'CONFIRMED';

  bool get isPending =>
      status.toUpperCase() == 'PENDING';
}

// ── Notification ──────────────────────────────────────────────────────────────

class NotificationModel {
  final String id;
  final String type;
  final String title;
  final String body;
  final bool isRead;
  final DateTime? createdAt;

  NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      isRead: json['is_read'] ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
    );
  }

  IconData get icon {
    switch (type) {
      case 'event_reminder':
        return Icons.calendar_today_outlined;
      case 'registration_approved':
        return Icons.check_circle_outline;
      case 'registration_pending':
        return Icons.pending_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }
}
