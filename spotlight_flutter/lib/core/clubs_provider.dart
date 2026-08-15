import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/models.dart';

class ClubsProvider with ChangeNotifier {
  static const String _cacheKey = 'cached_clubs_json';
  final ApiService _api = ApiService();

  List<ClubModel> _clubs = [];
  bool _isLoading = false;
  String _error = '';

  List<ClubModel> get clubs => _clubs;
  bool get isLoading => _isLoading;
  String get error => _error;

  ClubsProvider() {
    _init();
  }

  Future<void> _init() async {
    await _loadFromCache();
    await load();
  }

  Future<void> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_cacheKey);
      if (cachedJson != null && cachedJson.isNotEmpty) {
        final List<dynamic> decoded = json.decode(cachedJson);
        _clubs = decoded.map((e) => ClubModel.fromJson(e as Map<String, dynamic>)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error loading cached clubs: $e');
    }
  }

  Future<void> _saveToCache(List<ClubModel> clubs) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = json.encode(clubs.map((e) => e.toJson()).toList());
      await prefs.setString(_cacheKey, encoded);
    } catch (e) {
      debugPrint('Error caching clubs: $e');
    }
  }

  Future<void> load() async {
    if (_clubs.isEmpty) {
      _isLoading = true;
      notifyListeners();
    }
    _error = '';
    try {
      final fetched = await _api.fetchClubs();
      _clubs = fetched;
      await _saveToCache(_clubs);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
