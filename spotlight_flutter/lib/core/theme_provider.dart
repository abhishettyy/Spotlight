import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeProvider extends ChangeNotifier {
  static const _themeKey = 'spotlight_theme';

  bool _isDarkMode = true;

  bool get isDarkMode => _isDarkMode;

  ThemeProvider() {
    _loadSavedTheme();
  }

  // Same key and values as the web app ('dark' / 'light'); dark stays the default
  Future<void> _loadSavedTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final savedDark = prefs.getString(_themeKey) != 'light';
    if (savedDark != _isDarkMode) {
      _isDarkMode = savedDark;
      notifyListeners();
    }
  }

  void toggleDarkMode() {
    _isDarkMode = !_isDarkMode;
    notifyListeners();
    SharedPreferences.getInstance()
        .then((prefs) => prefs.setString(_themeKey, _isDarkMode ? 'dark' : 'light'));
  }
}
