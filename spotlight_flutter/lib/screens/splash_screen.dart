import 'package:flutter/material.dart';
import '../core/theme.dart';
import 'package:google_fonts/google_fonts.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SpotlightTheme.deepBlack,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.person_pin_circle,
                color: SpotlightTheme.pureWhite,
                size: 64,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'spotlight',
              style: GoogleFonts.inter(
                color: SpotlightTheme.pureWhite,
                fontSize: 40,
                fontWeight: FontWeight.bold,
                letterSpacing: -1.5,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'DISCOVER EVENTS',
              style: GoogleFonts.inter(
                color: Colors.white70,
                fontSize: 14,
                letterSpacing: 4,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
