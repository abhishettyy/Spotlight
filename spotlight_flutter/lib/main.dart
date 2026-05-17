import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/auth_provider.dart';
import 'core/theme.dart';
import 'core/theme_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/main_layout.dart';
import 'screens/auth_screen.dart';

import 'core/saved_events_provider.dart';
import 'core/events_provider.dart';
import 'core/user_provider.dart';
import 'core/api_service.dart';
import 'core/notifications_provider.dart';
import 'core/clubs_provider.dart';
import 'core/notification_prefs_provider.dart';
import 'screens/onboarding_screen.dart';

void main() {
  runApp(const SpotlightApp());
}

class SpotlightApp extends StatelessWidget {
  const SpotlightApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => SavedEventsProvider()),
        ChangeNotifierProvider(create: (_) => EventsProvider()),
        ChangeNotifierProvider(create: (_) => UserProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
        ChangeNotifierProvider(create: (_) => ClubsProvider()),
        ChangeNotifierProvider(create: (_) => NotificationPrefsProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return MaterialApp(
            title: 'Spotlight',
            theme: SpotlightTheme.lightTheme,
            darkTheme: SpotlightTheme.darkTheme,
            themeMode: themeProvider.isDarkMode ? ThemeMode.dark : ThemeMode.light,
            debugShowCheckedModeBanner: false,
            home: const AppInitializer(),
            routes: {
              '/main': (context) => const MainLayout(),
              '/onboarding': (context) => const OnboardingScreen(),
            },
          );
        },
      ),
    );
  }
}

class AppInitializer extends StatefulWidget {
  const AppInitializer({Key? key}) : super(key: key);

  @override
  _AppInitializerState createState() => _AppInitializerState();
}

class _AppInitializerState extends State<AppInitializer> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // Show splash screen for at least 2 seconds
    await Future.delayed(const Duration(seconds: 2));
    
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.tryAutoLogin();

    if (authProvider.isAuthenticated) {
      final userProvider = Provider.of<UserProvider>(context, listen: false);
      final apiService = ApiService();
      
      // 1. Fetch the existing profile (READ-ONLY)
      // We no longer call 'sync' here because it was overwriting data.
      final user = await apiService.getProfile(authProvider.userId!);

      if (user != null) {
        userProvider.setCurrentUser(user);
      }
    }

    setState(() {
      _initialized = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const SplashScreen();
    }
    
    return Consumer2<AuthProvider, UserProvider>(
      builder: (context, auth, userProvider, child) {
        if (auth.isAuthenticated) {
          if (userProvider.currentUser != null && userProvider.currentUser!.isProfileIncomplete) {
            return const OnboardingScreen();
          }
          return const MainLayout();
        } else {
          return const AuthScreen();
        }
      },
    );
  }
}
