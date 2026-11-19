import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'sk_colors.dart';

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
  // Skyline design tokens. Light: cool neutral greys on white (matches the web); dark: neutral near-black. Brand: Spotlight crimson.
  static const Color pureWhite    = Color(0xFFFFFFFF);
  static const Color deepBlack    = Color(0xFF1C1917); // light-mode foreground
  static const Color subtleGray   = Color(0xFFF0EFEC); // light raised
  static const Color darkGray     = Color(0xFF161618); // dark surface
  static const Color darkBg       = Color(0xFF0E0E10); // dark canvas
  static const Color lightGray    = Color(0xFFA0A0A8); // dark muted
  static const Color crimsonRed   = Color(0xFFE63946); // brand (name kept so existing call sites keep working)

  static const Color _lightCanvas  = Color(0xFFF5F4F2); // warm cream, as on the website
  static const Color _lightSurface = Color(0xFFFDFCFA);
  static const Color _lightLine    = Color(0xFFE7E5E1);
  static const Color _darkLine     = Color(0xFF2A2A2E);
  static const Color _darkFg       = Color(0xFFEDEDEF);

  // Web .input-field: surface fill, line-strong border, brand border on focus, faint placeholder
  static InputDecorationTheme _inputTheme(Sk sk) {
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: c, width: w),
        );
    return InputDecorationTheme(
      filled: true,
      fillColor: sk.surface,
      border: border(Colors.transparent, 0),
      enabledBorder: border(Colors.transparent, 0),
      focusedBorder: border(sk.brand, 1.5),
      errorBorder: border(sk.danger),
      focusedErrorBorder: border(sk.danger, 1.5),
      hintStyle: GoogleFonts.inter(color: sk.faint),
      labelStyle: GoogleFonts.inter(color: sk.muted),
      prefixIconColor: sk.muted,
      suffixIconColor: sk.muted,
      errorStyle: GoogleFonts.inter(color: sk.danger),
    );
  }

  // Web toasts: surface background, primary text, thin border
  static SnackBarThemeData _snackTheme(Sk sk) => SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: sk.surface,
        contentTextStyle: GoogleFonts.inter(color: sk.fg, fontSize: 14, fontWeight: FontWeight.w500),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: sk.line, width: 1),
        ),
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      );

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: crimsonRed,
      scaffoldBackgroundColor: _lightCanvas,
      pageTransitionsTheme: _pageTransitionsTheme,
      colorScheme: const ColorScheme.light(
        primary: crimsonRed,
        secondary: crimsonRed,
        surface: _lightSurface,
        background: _lightCanvas,
        onPrimary: pureWhite,
        onSecondary: pureWhite,
        onSurface: deepBlack,
        onBackground: deepBlack,
        onSurfaceVariant: Color(0xFF57534E),
        outline: Color(0xFFE7E5E1),
        error: Color(0xFFD93025),
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
          backgroundColor: Sk.light.brand,
          foregroundColor: Sk.light.onBrand,
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
      inputDecorationTheme: _inputTheme(Sk.light),
      dividerColor: Sk.light.line,
      dividerTheme: DividerThemeData(color: Sk.light.line, thickness: 1),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: Sk.light.brand, circularTrackColor: Sk.light.line),
      iconTheme: IconThemeData(color: Sk.light.fg),
      snackBarTheme: _snackTheme(Sk.light),
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
        onSurfaceVariant: lightGray,
        outline: _darkLine,
        error: Color(0xFFF28B82),
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
          backgroundColor: Sk.dark.brand,
          foregroundColor: Sk.dark.onBrand,
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
      inputDecorationTheme: _inputTheme(Sk.dark),
      dividerColor: Sk.dark.line,
      dividerTheme: DividerThemeData(color: Sk.dark.line, thickness: 1),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: Sk.dark.brand, circularTrackColor: Sk.dark.line),
      iconTheme: IconThemeData(color: Sk.dark.fg),
      snackBarTheme: _snackTheme(Sk.dark),
    );
  }
}
