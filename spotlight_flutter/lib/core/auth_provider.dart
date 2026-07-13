import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthProvider with ChangeNotifier {
  String? _token;
  String? _userId;

  String? get token => _token;
  String? get userId => _userId;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  Future<void> setSession(String token, String userId) async {
    _token = token;
    _userId = userId;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    await prefs.setString('userId', userId);

    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _userId = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('userId');

    notifyListeners();
  }

  Future<void> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    final userId = prefs.getString('userId');

    if (token == null || token.isEmpty || userId == null || userId.isEmpty) {
      return;
    }

    _token = token;
    _userId = userId;
    notifyListeners();
  }
}
