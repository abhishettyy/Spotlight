import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SavedEventsProvider with ChangeNotifier {
  static const _key = 'saved_event_ids';
  List<String> _savedEventIds = [];

  List<String> get savedEventIds => List.unmodifiable(_savedEventIds);

  SavedEventsProvider() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    _savedEventIds = prefs.getStringList(_key) ?? [];
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_key, _savedEventIds);
  }

  bool isSaved(String id) => _savedEventIds.contains(id);

  Future<void> toggleSave(String id) async {
    if (_savedEventIds.contains(id)) {
      _savedEventIds.remove(id);
    } else {
      _savedEventIds.add(id);
    }
    notifyListeners();
    await _persist();
  }

  Future<void> clear() async {
    _savedEventIds.clear();
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
