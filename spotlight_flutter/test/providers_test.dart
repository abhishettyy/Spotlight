import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spotlight_flutter/core/auth_provider.dart';
import 'package:spotlight_flutter/core/user_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Spotlight Provider State Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('AuthProvider initial state is unauthenticated', () {
      final authProvider = AuthProvider();
      expect(authProvider.isAuthenticated, isFalse);
      expect(authProvider.token, isNull);
      expect(authProvider.userId, isNull);
    });

    test('AuthProvider setSession updates state & persistent storage', () async {
      final authProvider = AuthProvider();
      await authProvider.setSession('test_token_123', 'user_456');

      expect(authProvider.isAuthenticated, isTrue);
      expect(authProvider.token, equals('test_token_123'));
      expect(authProvider.userId, equals('user_456'));

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('auth_token'), equals('test_token_123'));
      expect(prefs.getString('userId'), equals('user_456'));
    });

    test('AuthProvider logout clears state & storage', () async {
      final authProvider = AuthProvider();
      await authProvider.setSession('test_token_123', 'user_456');
      expect(authProvider.isAuthenticated, isTrue);

      await authProvider.logout();
      expect(authProvider.isAuthenticated, isFalse);
      expect(authProvider.token, isNull);
      expect(authProvider.userId, isNull);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('auth_token'), isNull);
      expect(prefs.getString('userId'), isNull);
    });

    test('AuthProvider tryAutoLogin restores session', () async {
      SharedPreferences.setMockInitialValues({
        'auth_token': 'saved_token_abc',
        'userId': 'saved_user_789',
      });

      final authProvider = AuthProvider();
      await authProvider.tryAutoLogin();

      expect(authProvider.isAuthenticated, isTrue);
      expect(authProvider.token, equals('saved_token_abc'));
      expect(authProvider.userId, equals('saved_user_789'));
    });

    test('UserModel incomplete profile check', () {
      final incompleteUser = UserModel(
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        usn: '',
        branch: null,
        phone: null,
      );
      expect(incompleteUser.isProfileIncomplete, isTrue);

      final completeUser = UserModel(
        id: 'u2',
        name: 'Bob',
        email: 'bob@example.com',
        usn: '1SP23CS001',
        branch: 'CSE',
        phone: '9876543210',
      );
      expect(completeUser.isProfileIncomplete, isFalse);

      final clubAdminUser = UserModel(
        id: 'u3',
        name: 'Club Admin',
        email: 'club@example.com',
        clubId: 'club_999',
      );
      expect(clubAdminUser.isProfileIncomplete, isFalse);
    });

    test('UserProvider state notification', () {
      final userProvider = UserProvider();
      expect(userProvider.currentUser, isNull);

      bool notified = false;
      userProvider.addListener(() {
        notified = true;
      });

      final user = UserModel(
        id: 'u100',
        name: 'Charlie',
        email: 'charlie@example.com',
      );
      userProvider.setCurrentUser(user);

      expect(userProvider.currentUser?.name, equals('Charlie'));
      expect(notified, isTrue);
    });
  });
}
