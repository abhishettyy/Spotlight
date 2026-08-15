import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/auth_provider.dart';
import 'core/theme.dart';
import 'core/theme_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/main_layout.dart';
import 'screens/auth_screen.dart';
import 'package:google_fonts/google_fonts.dart';

import 'core/saved_events_provider.dart';
import 'core/events_provider.dart';
import 'core/user_provider.dart';
import 'core/api_service.dart';
import 'core/notifications_provider.dart';
import 'core/clubs_provider.dart';
import 'core/notification_prefs_provider.dart';
import 'screens/onboarding_screen.dart';

class SpotlightHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() {
  HttpOverrides.global = SpotlightHttpOverrides();
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

            builder: (context, child) => child!,
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
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    setState(() { _hasError = false; });

    try {

      final minSplash = Future.value(); 

      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.tryAutoLogin();

      if (authProvider.isAuthenticated) {
        final userProvider = Provider.of<UserProvider>(context, listen: false);
        final apiService = ApiService();

        try {
          final user = await apiService.getProfile(authProvider.userId!)
              .timeout(const Duration(seconds: 4));
          if (user != null) userProvider.setCurrentUser(user);
        } catch (_) {

        }
      }

      await minSplash; 

      if (mounted) setState(() => _initialized = true);
    } catch (e) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      if (authProvider.isAuthenticated) {
        if (mounted) setState(() => _initialized = true);
      } else {
        if (mounted) setState(() => _hasError = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    Widget currentScreen;

    if (_hasError) {
      currentScreen = _NoInternetScreen(
        key: const ValueKey('no_internet_screen'),
        onRetry: _initializeApp,
      );
    } else if (!_initialized) {
      currentScreen = const SplashScreen(
        key: ValueKey('splash_screen'),
      );
    } else {
      currentScreen = Consumer2<AuthProvider, UserProvider>(
        key: const ValueKey('app_content'),
        builder: (context, auth, userProvider, child) {
          if (auth.isAuthenticated) {
            if (userProvider.currentUser != null &&
                userProvider.currentUser!.isProfileIncomplete) {
              return const OnboardingScreen();
            }
            return const MainLayout();
          } else {
            return const AuthScreen();
          }
        },
      );
    }

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 550),
      switchInCurve: Curves.easeInOut,
      switchOutCurve: Curves.easeInOut,
      child: currentScreen,
    );
  }
}

class _NoInternetScreen extends StatelessWidget {
  final VoidCallback onRetry;
  const _NoInternetScreen({Key? key, required this.onRetry}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SpotlightTheme.deepBlack,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.06),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.wifi_off_rounded,
                  color: Colors.white54,
                  size: 52,
                ),
              ),
              const SizedBox(height: 28),
              Text(
                'No Connection',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Please check your internet connection and try again.',
                style: GoogleFonts.inter(
                  color: Colors.white38,
                  fontSize: 14,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 36),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: onRetry,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: SpotlightTheme.crimsonRed,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    'Try Again',
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
