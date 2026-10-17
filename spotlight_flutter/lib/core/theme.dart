import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class _SmoothPageTransitionsBuilder extends PageTransitionsBuilder {
  const _SmoothPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {

    if (route.transitionDuration <= const Duration(milliseconds: 50)) {
      return child;
    }
    return FadeTransition(
      opacity: CurvedAnimation(
        parent: animation,
        curve: Curves.easeIn,
      ),
      child: child,
    );
  }
}

const _pageTransitionsTheme = PageTransitionsTheme(
  builders: {
    TargetPlatform.android: _SmoothPageTransitionsBuilder(),
    TargetPlatform.iOS: _SmoothPageTransitionsBuilder(),
  },
);

class SpotlightTheme {
  // Skyline design tokens. Light: Radix "Sand"; dark: neutral near-black. Brand: Spotlight crimson.
  static const Color pureWhite    = Color(0xFFFFFFFF);
  static const Color deepBlack    = Color(0xFF21201C); // light-mode foreground
  static const Color subtleGray   = Color(0xFFE9E8E6); // light raised
  static const Color darkGray     = Color(0xFF161618); // dark surface
  static const Color darkBg       = Color(0xFF0E0E10); // dark canvas
  static const Color lightGray    = Color(0xFFA0A0A8); // dark muted
  static const Color crimsonRed   = Color(0xFFE63946); // brand (name kept so existing call sites keep working)

  static const Color _lightCanvas  = Color(0xFFF1F0EF);
  static const Color _lightSurface = Color(0xFFF9F9F8);
  static const Color _lightLine    = Color(0xFFE2E1DE);
  static const Color _darkRaised   = Color(0xFF1D1D20);
  static const Color _darkLine     = Color(0xFF2A2A2E);
  static const Color _darkFg       = Color(0xFFEDEDEF);

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: crimsonRed,
      scaffoldBackgroundColor: _lightCanvas,
      pageTransitionsTheme: _pageTransitionsTheme,
      colorScheme: const ColorScheme.light(
        primary: crimsonRed,
        secondary: deepBlack,
        surface: _lightSurface,
        background: _lightCanvas,
        onPrimary: pureWhite,
        onSecondary: pureWhite,
        onSurface: deepBlack,
        onBackground: deepBlack,
      ),
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: deepBlack,
        displayColor: deepBlack,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: _lightSurface,
        elevation: 0,
        iconTheme: const IconThemeData(color: deepBlack),
        titleTextStyle: GoogleFonts.inter(
          color: deepBlack,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: const CardThemeData(
        color: _lightSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          side: BorderSide(color: _lightLine),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: crimsonRed,
          foregroundColor: pureWhite,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: subtleGray,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        hintStyle: GoogleFonts.inter(color: const Color(0xFF82827C)),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: deepBlack,
        contentTextStyle: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: crimsonRed,
      scaffoldBackgroundColor: darkBg,
      pageTransitionsTheme: _pageTransitionsTheme,
      colorScheme: const ColorScheme.dark(
        primary: crimsonRed,
        secondary: darkGray,
        surface: darkGray,
        background: darkBg,
        onPrimary: pureWhite,
        onSurface: _darkFg,
        onBackground: _darkFg,
      ),
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: _darkFg,
        displayColor: _darkFg,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: darkGray,
        elevation: 0,
        iconTheme: const IconThemeData(color: _darkFg),
        titleTextStyle: GoogleFonts.inter(
          color: _darkFg,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: const CardThemeData(
        color: darkGray,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          side: BorderSide(color: _darkLine),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: crimsonRed,
          foregroundColor: pureWhite,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _darkRaised,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        hintStyle: GoogleFonts.inter(color: lightGray),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: _darkRaised,
        contentTextStyle: GoogleFonts.inter(
          color: _darkFg,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: _darkLine, width: 1),
        ),
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      ),
    );
  }
}
