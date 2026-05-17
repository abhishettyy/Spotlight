import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spotlight_flutter/models/models.dart';
import 'user_provider.dart';

class ApiService {
  static const String baseUrl = 'http://10.20.52.194:5000/api';

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
        throw Exception('Failed to load events: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching events: $e');
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
        throw Exception('Failed to load clubs: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching clubs: $e');
    }
  }

  // ── Registration ─────────────────────────────────────────────────────────

  /// Solo registration for an event.
  Future<void> registerSolo({
    required String eventId,
    required String name,
    required String usn,
  }) async {
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

    if (response.statusCode != 200 && response.statusCode != 201) {
      final data = json.decode(response.body);
      throw Exception(data['error'] ?? 'Registration failed');
    }
  }

  /// Create a team for an event. Returns the generated passkey.
  Future<String> createTeam({
    required String eventId,
    required String teamName,
    required String leaderUsn,
  }) async {
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
      return data['passkey'] as String;
    } else {
      throw Exception(data['error'] ?? 'Failed to create team');
    }
  }

  /// Join an existing team using a passkey.
  Future<void> joinTeam({
    required String eventId,
    required String passkey,
  }) async {
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
      throw Exception(data['error'] ?? 'Failed to join team');
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
        throw Exception('Failed to load tickets: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching tickets: $e');
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
        throw Exception('Failed to load notifications: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching notifications: $e');
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
        throw Exception(data['error'] ?? 'Signup failed');
      }
    } catch (e) {
      rethrow;
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
        throw Exception(data['error'] ?? 'Login failed');
      }
    } catch (e) {
      rethrow;
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
        throw Exception(data['error'] ?? 'Failed to sync profile');
      }
    } catch (e) {
      // ignore: avoid_print
      print('Profile sync error: $e');
      rethrow;
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
        throw Exception(data['error'] ?? 'Failed to update profile');
      }
    } catch (e) {
      throw Exception('Error updating profile: $e');
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
      throw Exception(data['error'] ?? 'Incorrect password.');
    } catch (e) {
      rethrow;
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
        throw Exception(data['error'] ?? 'Failed to update profile');
      }
    } catch (e) {
      throw Exception('Error updating profile: $e');
    }
  }
}
