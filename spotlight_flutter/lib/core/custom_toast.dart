import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

void showSpotlightToast(
  BuildContext context,
  String message, {
  IconData? icon,
  bool isError = false,
  Duration duration = const Duration(seconds: 2),
}) {
  final cs = Theme.of(context).colorScheme;
  final isDark = Theme.of(context).brightness == Brightness.dark;

  final IconData effectiveIcon = icon ?? (isError ? Icons.error_outline_rounded : Icons.check_circle_rounded);

  final bgColor = isError
      ? const Color(0xFFC62828)
      : (isDark ? const Color(0xFF242222) : const Color(0xFF1E1E1E));

  final accentColor = isError ? Colors.white : cs.primary;

  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      behavior: SnackBarBehavior.floating,
      backgroundColor: bgColor,
      elevation: 10,
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isError
              ? Colors.redAccent.withOpacity(0.4)
              : (isDark ? Colors.white.withOpacity(0.12) : Colors.white.withOpacity(0.15)),
          width: 1,
        ),
      ),
      content: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: accentColor.withOpacity(0.18),
              shape: BoxShape.circle,
            ),
            child: Icon(
              effectiveIcon,
              color: accentColor,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.inter(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.1,
              ),
            ),
          ),
        ],
      ),
      duration: duration,
    ),
  );
}
