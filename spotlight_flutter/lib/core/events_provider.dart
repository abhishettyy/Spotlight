import 'package:flutter/material.dart';
import 'api_service.dart';
import '../models/models.dart';

class EventsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<EventModel> _events = [];
  bool _isLoading = false;
  String _errorMessage = '';

  List<EventModel> get events => _events;
  bool get isLoading => _isLoading;
  String get errorMessage => _errorMessage;

  EventsProvider() {
    loadEvents();
  }

  Future<void> loadEvents() async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      _events = await _apiService.fetchEvents();
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshEvents() => loadEvents();
}
