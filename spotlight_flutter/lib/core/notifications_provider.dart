import 'package:flutter/material.dart';
import 'api_service.dart';
import '../models/models.dart';

class NotificationsProvider with ChangeNotifier {
  final ApiService _api = ApiService();

  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;
  String _error = '';

  List<NotificationModel> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;
  String get error => _error;

  Future<void> load() async {
    _isLoading = true;
    _error = '';
    notifyListeners();

    try {
      final result = await _api.fetchNotifications();
      _notifications = result['notifications'] as List<NotificationModel>;
      _unreadCount = result['unreadCount'] as int;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAllRead() async {
    await _api.markAllNotificationsRead();
    for (int i = 0; i < _notifications.length; i++) {
      _notifications[i] = NotificationModel(
        id: _notifications[i].id,
        type: _notifications[i].type,
        title: _notifications[i].title,
        body: _notifications[i].body,
        isRead: true,
        createdAt: _notifications[i].createdAt,
      );
    }
    _unreadCount = 0;
    notifyListeners();
  }
}
