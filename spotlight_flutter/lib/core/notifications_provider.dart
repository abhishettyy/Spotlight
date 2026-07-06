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

  Future<void> markAsRead(String id) async {
    await _api.markSingleNotificationRead(id);
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1 && !_notifications[index].isRead) {
      _notifications[index] = NotificationModel(
        id: _notifications[index].id,
        type: _notifications[index].type,
        title: _notifications[index].title,
        body: _notifications[index].body,
        isRead: true,
        createdAt: _notifications[index].createdAt,
      );
      if (_unreadCount > 0) {
        _unreadCount--;
      }
      notifyListeners();
    }
  }

  Future<void> deleteNotification(String id) async {
    await _api.deleteNotification(id);
    _notifications.removeWhere((n) => n.id == id);
    _unreadCount = _notifications.where((n) => !n.isRead).length;
    notifyListeners();
  }
}
