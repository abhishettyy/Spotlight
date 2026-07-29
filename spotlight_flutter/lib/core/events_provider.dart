import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/models.dart';

class EventsProvider with ChangeNotifier {
  static const _cacheKey = 'cached_events_json';
  final ApiService _apiService = ApiService();

  List<EventModel> _events = [];
  bool _isLoading = false;
  String _errorMessage = '';

  List<EventModel> get events => _events;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;

  EventsProvider() {
    _init();
  }

  Future<void> _init() async {
    await _loadFromCache();
    await loadEvents();
  }

  Future<void> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_cacheKey);
      if (cachedJson != null && cachedJson.isNotEmpty) {
        final List<dynamic> decoded = json.decode(cachedJson);
        _events = decoded.map((e) => EventModel.fromJson(e as Map<String, dynamic>)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error loading cached events: $e');
    }
  }

  Future<void> _saveToCache(List<EventModel> events) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = json.encode(events.map((e) => e.toJson()).toList());
      await prefs.setString(_cacheKey, encoded);
    } catch (e) {
      debugPrint('Error caching events: $e');
    }
  }

  Future<void> loadEvents() async {
    if (_events.isEmpty) {
      _isLoading = true;
      notifyListeners();
    }
    _errorMessage = '';

    try {
      final fetched = await _apiService.fetchEvents();
      _events = fetched;
      await _saveToCache(fetched);
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshEvents() => loadEvents();
}
