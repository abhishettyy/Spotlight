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
  final String? clubId;
  final String? clubName;
  final int registrationCount;
  final DateTime? registrationDeadline;
  final DateTime? eventDate;
  final DateTime? eventEndDate;

  DateTime? get startDate {
    if (eventDate != null) return eventDate;
    if (date == null || date!.trim().isEmpty) return null;
    return DateTime.tryParse(date!);
  }

  DateTime? get effectiveEndDate {
    if (eventEndDate != null) return eventEndDate;
    final st = startDate;
    if (st == null) return null;
    return DateTime(st.year, st.month, st.day, 23, 59, 59, 999);
  }

  bool get isLive {
    final st = startDate;
    final end = effectiveEndDate;
    if (st == null || end == null) return false;
    final now = DateTime.now();
    return (now.isAfter(st) || now.isAtSameMomentAs(st)) && (now.isBefore(end) || now.isAtSameMomentAs(end));
  }

  bool get isUpcoming {
    final end = effectiveEndDate;
    if (end == null) return true;
    final now = DateTime.now();
    return now.isBefore(end);
  }

  bool get isPast {
    final end = effectiveEndDate;
    if (end == null) return false;
    final now = DateTime.now();
    return now.isAfter(end);
  }

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
    this.clubId,
    this.clubName,
    required this.registrationCount,
    this.registrationDeadline,
    this.eventDate,
    this.eventEndDate,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    final club = json['club'] as Map<String, dynamic>?;
    String categoryStr = json['category'] ?? 'Other';
    if (categoryStr == 'Individual') categoryStr = 'Solo';
    String? typeStr = json['eventType'] ?? json['event_type'];
    if (typeStr == 'Individual') typeStr = 'Solo';

    return EventModel(
      id: json['id'],
      title: json['title'] ?? 'No Title',
      venue: json['venue'] ?? 'No Venue',
      imageUrl: json['image_url'] ?? json['imageUrl'],
      category: categoryStr,
      price: (json['price'] ?? 0).toDouble(),
      description: json['description'],
      date: json['date'],
      qrUrl: json['qrUrl'] ?? json['qr_url'],
      eventType: typeStr,
      teamSizeLimit: json['teamSizeLimit'] ?? json['team_size_limit'],
      upiId: json['upiId'] ?? json['upi_id'] ?? club?['upiId'] ?? club?['upi_id'],
      clubId: club?['id'],
      clubName: club?['name'],
      registrationCount: json['registrationCount'] ?? json['registration_count'] ?? 0,
      registrationDeadline: json['registration_deadline'] != null
          ? DateTime.tryParse(json['registration_deadline'].toString())?.toLocal()
          : json['registrationDeadline'] != null
              ? DateTime.tryParse(json['registrationDeadline'].toString())?.toLocal()
              : null,
      eventDate: json['eventDate'] != null
          ? DateTime.tryParse(json['eventDate'].toString())?.toLocal()
          : json['event_date'] != null
              ? DateTime.tryParse(json['event_date'].toString())?.toLocal()
              : json['date'] != null
                  ? DateTime.tryParse(json['date'].toString())?.toLocal()
                  : null,
      eventEndDate: json['eventEndDate'] != null
          ? DateTime.tryParse(json['eventEndDate'].toString())?.toLocal()
          : json['event_end_date'] != null
              ? DateTime.tryParse(json['event_end_date'].toString())?.toLocal()
              : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'venue': venue,
        'imageUrl': imageUrl,
        'category': category,
        'price': price,
        'description': description,
        'date': date,
        'qrUrl': qrUrl,
        'eventType': eventType,
        'teamSizeLimit': teamSizeLimit,
        'registrationCount': registrationCount,
        'registrationDeadline': registrationDeadline?.toIso8601String(),
        'eventDate': eventDate?.toIso8601String(),
        'eventEndDate': eventEndDate?.toIso8601String(),
        'club': {
          'id': clubId,
          'name': clubName,
          'upiId': upiId,
        },
      };
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

class TicketEventInfo {
  final String id;
  final String title;
  final String venue;
  final String? date;
  final double price;
  final String? qrUrl;
  final String? upiId;
  final int? teamSizeLimit;
  final String? clubId;
  final String? clubName;
  final String? clubLogoUrl;
  final String? imageUrl;
  final DateTime? eventDate;
  final DateTime? eventEndDate;

  DateTime? get startDate {
    if (eventDate != null) return eventDate;
    if (date == null || date!.trim().isEmpty) return null;
    return DateTime.tryParse(date!);
  }

  DateTime? get effectiveEndDate {
    if (eventEndDate != null) return eventEndDate;
    final st = startDate;
    if (st == null) return null;
    return DateTime(st.year, st.month, st.day, 23, 59, 59, 999);
  }

  bool get isLive {
    final st = startDate;
    final end = effectiveEndDate;
    if (st == null || end == null) return false;
    final now = DateTime.now();
    return (now.isAfter(st) || now.isAtSameMomentAs(st)) && (now.isBefore(end) || now.isAtSameMomentAs(end));
  }

  bool get isUpcoming {
    final end = effectiveEndDate;
    if (end == null) return true;
    final now = DateTime.now();
    return now.isBefore(end);
  }

  bool get isPast {
    final end = effectiveEndDate;
    if (end == null) return false;
    final now = DateTime.now();
    return now.isAfter(end);
  }

  TicketEventInfo({
    required this.id,
    required this.title,
    required this.venue,
    this.date,
    required this.price,
    this.qrUrl,
    this.upiId,
    this.teamSizeLimit,
    this.clubId,
    this.clubName,
    this.clubLogoUrl,
    this.imageUrl,
    this.eventDate,
    this.eventEndDate,
  });

  factory TicketEventInfo.fromJson(Map<String, dynamic> json) {
    final club = json['club'] as Map<String, dynamic>?;
    return TicketEventInfo(
      id: json['id'] ?? '',
      title: json['title'] ?? 'No Title',
      venue: json['venue'] ?? 'TBD',
      date: json['date'],
      price: (json['price'] ?? 0).toDouble(),
      qrUrl: json['qr_url'] ?? json['qrUrl'],
      upiId: json['upi_id'] ?? json['upiId'] ?? club?['upiId'] ?? club?['upi_id'],
      teamSizeLimit: json['team_size_limit'] ?? json['teamSizeLimit'],
      clubId: club?['id'],
      clubName: club?['name'],
      clubLogoUrl: club?['logoUrl'] ?? club?['logo_url'],
      imageUrl: json['image_url'] ?? json['imageUrl'],
      eventDate: json['eventDate'] != null
          ? DateTime.tryParse(json['eventDate'].toString())?.toLocal()
          : json['event_date'] != null
              ? DateTime.tryParse(json['event_date'].toString())?.toLocal()
              : null,
      eventEndDate: json['eventEndDate'] != null
          ? DateTime.tryParse(json['eventEndDate'].toString())?.toLocal()
          : json['event_end_date'] != null
              ? DateTime.tryParse(json['event_end_date'].toString())?.toLocal()
              : null,
    );
  }
}

class TicketTeamMember {
  final String id;
  final String name;
  final bool isLeader;
  final String status;

  TicketTeamMember({
    required this.id,
    required this.name,
    required this.isLeader,
    this.status = 'PENDING',
  });

  factory TicketTeamMember.fromJson(Map<String, dynamic> json) {
    return TicketTeamMember(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      isLeader: json['isLeader'] ?? false,
      status: json['status'] ?? 'PENDING',
    );
  }
}

class TicketTeamInfo {
  final String id;
  final String name;
  final String passkey;
  final String leaderId;
  final List<TicketTeamMember> members;

  TicketTeamInfo({
    required this.id,
    required this.name,
    required this.passkey,
    this.leaderId = '',
    this.members = const [],
  });

  factory TicketTeamInfo.fromJson(Map<String, dynamic> json) {
    return TicketTeamInfo(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      passkey: json['passkey'] ?? '',
      leaderId: json['leaderId'] ?? '',
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

  bool get isUpcoming {
    if (event == null) return true;
    return event!.isUpcoming;
  }

  bool get isConfirmed =>
      status.toUpperCase() == 'CONFIRMED';

  bool get isPending =>
      status.toUpperCase() == 'PENDING';
}

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

  static String _cleanEmoji(String text) {
    final emojiRegex = RegExp(
      r'[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]',
      unicode: true,
    );
    return text.replaceAll(emojiRegex, '').replaceAll(RegExp(r'\s+'), ' ').trim();
  }

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    final rawTitle = json['title'] ?? '';
    final rawBody = json['body'] ?? '';
    return NotificationModel(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      title: _cleanEmoji(rawTitle),
      body: _cleanEmoji(rawBody),
      isRead: json['is_read'] ?? json['isRead'] ?? false,
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
