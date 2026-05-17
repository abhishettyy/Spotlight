import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SpotlightTheme {
  static const Color pureWhite    = Color(0xFFFFFFFF);
  static const Color deepBlack    = Color(0xFF000000);
  static const Color subtleGray   = Color(0xFFF5F5F5);
  static const Color darkGray     = Color(0xFF1E1E1E);
  static const Color darkBg       = Color(0xFF121212);
  static const Color lightGray    = Color(0xFFA0A0A0);
  static const Color crimsonRed   = Color(0xFFE63946); // Vibrant Crimson — primary dark accent

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: deepBlack,
      scaffoldBackgroundColor: const Color(0xFFF9F9F9), // light gray so white cards pop
      colorScheme: const ColorScheme.light(
        primary: deepBlack,
        secondary: darkGray,
        surface: pureWhite,
        background: Color(0xFFF9F9F9),
      ),
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: deepBlack,
        displayColor: deepBlack,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: pureWhite,
        elevation: 0,
        iconTheme: const IconThemeData(color: deepBlack),
        titleTextStyle: GoogleFonts.inter(
          color: deepBlack,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: const CardThemeData(
        color: pureWhite,
        elevation: 2,
        shadowColor: Color(0x0C000000), // Colors.black.withOpacity(0.05)
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: deepBlack,
          foregroundColor: pureWhite,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
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
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        hintStyle: GoogleFonts.inter(color: Colors.grey[500]),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: crimsonRed,
      scaffoldBackgroundColor: darkBg,
      colorScheme: const ColorScheme.dark(
        primary: crimsonRed,
        secondary: darkGray,
        surface: darkGray,
        background: darkBg,
        onPrimary: pureWhite,
        onSurface: pureWhite,
        onBackground: pureWhite,
      ),
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: pureWhite,
        displayColor: pureWhite,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: darkGray,
        elevation: 0,
        iconTheme: const IconThemeData(color: pureWhite),
        titleTextStyle: GoogleFonts.inter(
          color: pureWhite,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: const CardThemeData(
        color: darkGray,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: crimsonRed,
          foregroundColor: pureWhite,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkGray,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        hintStyle: GoogleFonts.inter(color: lightGray),
      ),
    );
  }
}
