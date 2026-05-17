import 'package:flutter/material.dart';
import 'api_service.dart';
import '../models/models.dart';

class ClubsProvider with ChangeNotifier {
  final ApiService _api = ApiService();

  List<ClubModel> _clubs = [];
  bool _isLoading = false;
  String _error = '';

  List<ClubModel> get clubs => _clubs;
  bool get isLoading => _isLoading;
  String get error => _error;

  ClubsProvider() {
    load();
  }

  Future<void> load() async {
    _isLoading = true;
    _error = '';
    notifyListeners();
    try {
      _clubs = await _api.fetchClubs();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
