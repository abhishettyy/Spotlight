import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spotlight_flutter/models/models.dart';
import 'user_provider.dart';

class AppException implements Exception {
  final String message;
  AppException(this.message);

  @override
  String toString() => message;
}

class ApiService {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.1.42:5000/api',
  );

  static String formatExceptionMessage(dynamic error, String defaultMsg) {
    final errStr = error.toString().toLowerCase();
    
    if (errStr.contains('socketexception') || 
        errStr.contains('connection timed out') || 
        errStr.contains('clientexception') ||
        errStr.contains('connection refused') ||
        errStr.contains('handshake failed') ||
        errStr.contains('failed host lookup') ||
        errStr.contains('host lookup failed')) {
      return 'Connection error. Please check your internet connection and try again.';
    }
    
    if (errStr.contains('500') || errStr.contains('internal server error')) {
      return 'Internal server error. Please try again later.';
    }
    
    String cleanMsg = error.toString();
    if (cleanMsg.startsWith('Exception: ')) {
      cleanMsg = cleanMsg.substring('Exception: '.length);
    }
    if (cleanMsg.startsWith('Error fetching')) {
      final parts = cleanMsg.split(': ');
      if (parts.length > 1) {
        cleanMsg = parts.sublist(1).join(': ');
      }
    }
    
    return cleanMsg.isNotEmpty ? cleanMsg : defaultMsg;
  }

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');

    final headers = <String, String>{
      'Content-Type': 'application/json',
    };

    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  // ── Events ──────────────────────────────────────────────────────────────

  Future<List<EventModel>> fetchEvents() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/events'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        List<dynamic> eventsJson = [];
        if (data is List) {
          eventsJson = data;
        } else if (data is Map && data.containsKey('events')) {
          eventsJson = data['events'] as List<dynamic>;
        }
        return eventsJson.map((e) => EventModel.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        throw AppException('Failed to load events: ${response.statusCode}');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to fetch events.'));
    }
  }

  // ── Clubs ────────────────────────────────────────────────────────────────

  Future<List<ClubModel>> fetchClubs() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/clubs'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        List<dynamic> clubsJson = [];
        if (data is List) {
          clubsJson = data;
        } else if (data is Map && data.containsKey('clubs')) {
          clubsJson = data['clubs'] as List<dynamic>;
        }
        return clubsJson.map((e) => ClubModel.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        throw AppException('Failed to load clubs: ${response.statusCode}');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to fetch clubs.'));
    }
  }

  // ── Registration ─────────────────────────────────────────────────────────

  /// Solo registration for an event. Returns registration ID.
  Future<String> registerSolo({
    required String eventId,
    required String name,
    required String usn,
  }) async {
    try {
      final headers = await _getHeaders();
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId') ?? '';

      final response = await http.post(
        Uri.parse('$baseUrl/register'),
        headers: headers,
        body: json.encode({
          'eventId': eventId,
          'name': name,
          'usn': usn,
          'clerkUserId': userId,
        }),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return data['registration']['id'] as String;
      } else {
        throw AppException(data['error'] ?? 'Registration failed');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Registration failed. Please check your connection.'));
    }
  }

  /// Create a team for an event. Returns the passkey and leader's registrationId.
  Future<Map<String, String>> createTeam({
    required String eventId,
    required String teamName,
    required String leaderUsn,
  }) async {
    try {
      final headers = await _getHeaders();
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId') ?? '';

      final response = await http.post(
        Uri.parse('$baseUrl/teams/create'),
        headers: headers,
        body: json.encode({
          'eventId': eventId,
          'teamName': teamName,
          'leaderUsn': leaderUsn,
          'clerkUserId': userId,
        }),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 201) {
        return {
          'passkey': data['passkey'] as String,
          'registrationId': data['registrationId'] as String,
        };
      } else {
        throw AppException(data['error'] ?? 'Failed to create team');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to create team. Please check your connection.'));
    }
  }

  /// Join an existing team using a passkey.
  Future<void> joinTeam({
    required String eventId,
    required String passkey,
  }) async {
    try {
      final headers = await _getHeaders();
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId') ?? '';

      final response = await http.post(
        Uri.parse('$baseUrl/teams/join'),
        headers: headers,
        body: json.encode({
          'eventId': eventId,
          'passkey': passkey,
          'clerkUserId': userId,
        }),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        final data = json.decode(response.body);
        throw AppException(data['error'] ?? 'Failed to join team');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to join team. Please check your connection.'));
    }
  }

  /// Uploads the payment proof screenshot and transaction ID for a registration.
  Future<void> uploadPaymentProof({
    required String registrationId,
    required String base64Image,
    required String transactionId,
  }) async {
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$baseUrl/registrations/$registrationId/payment'),
        headers: headers,
        body: json.encode({
          'paymentProof': base64Image,
          'transactionId': transactionId,
        }),
      );

      if (response.statusCode != 200) {
        final data = json.decode(response.body);
        throw AppException(data['error'] ?? 'Failed to upload payment proof');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to upload payment proof. Please check your connection.'));
    }
  }

  // ── Tickets ──────────────────────────────────────────────────────────────

  Future<List<TicketModel>> fetchUserTickets() async {
    try {
      final headers = await _getHeaders();
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId') ?? '';

      final response = await http.get(
        Uri.parse('$baseUrl/user/tickets?userId=$userId'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        List<dynamic> raw = [];
        if (data is List) {
          raw = data;
        } else if (data is Map && data.containsKey('tickets')) {
          raw = data['tickets'] as List<dynamic>;
        }
        return raw
            .map((t) => TicketModel.fromJson(t as Map<String, dynamic>))
            .toList();
      } else {
        throw AppException('Failed to load tickets: ${response.statusCode}');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to fetch tickets.'));
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> fetchNotifications() async {
    try {
      final headers = await _getHeaders();
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId') ?? '';

      final response = await http.get(
        Uri.parse('$baseUrl/notifications?userId=$userId'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> raw = data['notifications'] ?? [];
        return {
          'notifications': raw
              .map((n) => NotificationModel.fromJson(n as Map<String, dynamic>))
              .toList(),
          'unreadCount': data['unreadCount'] ?? 0,
        };
      } else {
        throw AppException('Failed to load notifications: ${response.statusCode}');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to fetch notifications.'));
    }
  }

  Future<void> markAllNotificationsRead() async {
    try {
      final headers = await _getHeaders();
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId') ?? '';

      await http.put(
        Uri.parse('$baseUrl/notifications/read'),
        headers: headers,
        body: json.encode({'userId': userId}),
      );
    } catch (_) {}
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  /// Manual Signup — creates a new account and persists the session.
  Future<UserModel?> signup({
    required String email,
    required String password,
    required String name,
    String? usn,
    String? branch,
    String? phone,
    String? year,
    String? sem,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/signup'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
          'name': name,
          'usn': usn,
          'branch': branch,
          'phone': phone,
          'year': year,
          'sem': sem,
        }),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 201) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', data['token'] as String);
        await prefs.setString('userId', data['profile']['id'] as String);
        return UserModel.fromJson(data['profile'] as Map<String, dynamic>);
      } else {
        throw AppException(data['error'] ?? 'Signup failed');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Signup failed. Please check your connection.'));
    }
  }

  /// Manual Login — verifies credentials and persists the session.
  Future<UserModel?> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', data['token'] as String);
        await prefs.setString('userId', data['profile']['id'] as String);
        return UserModel.fromJson(data['profile'] as Map<String, dynamic>);
      } else {
        throw AppException(data['error'] ?? 'Login failed');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Login failed. Please check your connection.'));
    }
  }

  /// Fetch profile stats — events registered count and clubs count.
  Future<Map<String, int>> fetchProfileStats(String userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/profiles/$userId/stats'),
        headers: {'Content-Type': 'application/json'},
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'eventsCount': (data['eventsCount'] ?? 0) as int,
          'clubsCount': (data['clubsCount'] ?? 0) as int,
        };
      }
      return {'eventsCount': 0, 'clubsCount': 0};
    } catch (_) {
      return {'eventsCount': 0, 'clubsCount': 0};
    }
  }

  /// Get Profile by userId (READ-ONLY).
  Future<UserModel?> getProfile(String userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/profiles/$userId'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return UserModel.fromJson(data['profile'] as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      // ignore: avoid_print
      print('Error fetching profile: $e');
      return null;
    }
  }

  /// Sync profile for social (Clerk/Google) logins.
  Future<UserModel?> checkAndSyncProfile(
    String clerkUserId,
    String email,
    String name, {
    String? usn,
    String? branch,
    String? phone,
  }) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/auth/sync'),
        headers: headers,
        body: json.encode({
          'clerkUserId': clerkUserId,
          'email': email,
          'name': name,
          'usn': usn,
          'branch': branch,
          'phone': phone,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return UserModel.fromJson(data['profile'] as Map<String, dynamic>);
      } else {
        final data = json.decode(response.body);
        throw AppException(data['error'] ?? 'Failed to sync profile');
      }
    } catch (e) {
      // ignore: avoid_print
      print('Profile sync error: $e');
      throw AppException(formatExceptionMessage(e, 'Failed to sync profile.'));
    }
  }

  /// Update profile details (used during onboarding).
  Future<UserModel?> updateProfile({
    required String clerkUserId,
    required String usn,
    required String branch,
    required String phone,
  }) async {
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$baseUrl/profiles/update'),
        headers: headers,
        body: json.encode({
          'clerkUserId': clerkUserId,
          'usn': usn,
          'branch': branch,
          'phone': phone,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return UserModel.fromJson(data['profile'] as Map<String, dynamic>);
      } else {
        final data = json.decode(response.body);
        throw AppException(data['error'] ?? 'Failed to update profile');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to update profile.'));
    }
  }

  /// Verify the user's current password before allowing profile edits.
  /// Returns true if correct, throws an exception with the error message if not.
  Future<bool> verifyPassword({
    required String userId,
    required String password,
  }) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/auth/verify-password'),
        headers: headers,
        body: json.encode({
          'userId': userId,
          'password': password,
        }),
      );

      if (response.statusCode == 200) return true;

      final data = json.decode(response.body);
      throw AppException(data['error'] ?? 'Incorrect password.');
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to verify password.'));
    }
  }

  /// Full profile edit — name, USN, branch, phone, year, sem.
  Future<UserModel?> editProfile({
    required String userId,
    String? name,
    String? usn,
    String? branch,
    String? phone,
    String? year,
    String? sem,
  }) async {
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$baseUrl/profiles/edit'),
        headers: headers,
        body: json.encode({
          'userId': userId,
          'full_name': name,
          'usn': usn,
          'branch': branch,
          'phone': phone,
          'year': year,
          'sem': sem,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return UserModel.fromJson(data['profile'] as Map<String, dynamic>);
      } else {
        final data = json.decode(response.body);
        throw AppException(data['error'] ?? 'Failed to update profile');
      }
    } catch (e) {
      throw AppException(formatExceptionMessage(e, 'Failed to update profile.'));
    }
  }
}
