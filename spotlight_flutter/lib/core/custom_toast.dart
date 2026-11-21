import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'sk_colors.dart';

void showSpotlightToast(
  BuildContext context,
  String message, {
  IconData? icon,
  bool isError = false,
  bool isWarning = false,
  Duration duration = const Duration(seconds: 2),
}) {
  final sk = Sk.of(context);

  final IconData effectiveIcon = icon ??
      (isError
          ? Icons.error_outline_rounded
          : isWarning
              ? Icons.warning_amber_rounded
              : Icons.check_circle_rounded);
  final Color accentColor = isError ? sk.danger : (isWarning ? sk.warn : sk.ok);

  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      behavior: SnackBarBehavior.floating,
      backgroundColor: sk.surface,
      elevation: 0,
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: sk.line, width: 1),
      ),
      content: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(effectiveIcon, color: accentColor, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.inter(
                color: sk.fg,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
      duration: duration,
    ),
  );
}
