import 'package:flutter/material.dart';

/// The web app's Skyline colour tokens (spotlight_dashboard/src/student/student.css,
/// `--sk-*`), for both themes. Screens take colours from here instead of hard-coding
/// them, so the app and the website always look the same.
///
///   final sk = Sk.of(context);
///   Container(color: sk.surface, child: Text('Hi', style: TextStyle(color: sk.fg)));
class Sk {
  final bool isDark;

  /// Page background (--sk-canvas / --bg)
  final Color canvas;

  /// Cards, panels, bottom bar (--sk-surface / --surface)
  final Color surface;

  /// Inputs, hover rows, segmented-control track, image placeholders (--sk-raised / --raised)
  final Color raised;

  /// Borders and dividers (--sk-line / --border)
  final Color line;

  /// Input and search borders (--sk-line-strong)
  final Color lineStrong;

  /// Primary text (--sk-fg / --text)
  final Color fg;

  /// Secondary text (--sk-muted / --subtext)
  final Color muted;

  /// Hints, placeholders, disabled text (--sk-faint)
  final Color faint;

  /// Buttons, links, accents (--sk-brand): the inverse of the page, black on light and
  /// white on dark. Red is kept for errors only (danger).
  final Color brand;
  final Color brandSoft;

  /// Text and icons on a brand fill (--sk-on-brand)
  final Color onBrand;

  /// Success: confirmed, approved (--sk-ok)
  final Color ok;
  final Color okSoft;

  /// Warnings: deadlines, pending (--sk-warn)
  final Color warn;
  final Color warnSoft;

  /// Neutral status (--sk-info)
  final Color info;
  final Color infoSoft;

  /// Errors, destructive actions, LIVE (--sk-danger)
  final Color danger;
  final Color dangerSoft;

  const Sk._({
    required this.isDark,
    required this.canvas,
    required this.surface,
    required this.raised,
    required this.line,
    required this.lineStrong,
    required this.fg,
    required this.muted,
    required this.faint,
    required this.brand,
    required this.brandSoft,
    required this.onBrand,
    required this.ok,
    required this.okSoft,
    required this.warn,
    required this.warnSoft,
    required this.info,
    required this.infoSoft,
    required this.danger,
    required this.dangerSoft,
  });

  static const light = Sk._(
    isDark: false,
    canvas: Color(0xFFF7F7F8),
    surface: Color(0xFFFFFFFF),
    raised: Color(0xFFF1F1F3),
    line: Color(0xFFE4E4E7),
    lineStrong: Color(0xFFD1D1D6),
    fg: Color(0xFF18181B),
    muted: Color(0xFF52525B),
    faint: Color(0xFF71717A),
    brand: Color(0xFF18181B),
    brandSoft: Color(0x0F18181B), // 6%
    onBrand: Color(0xFFFFFFFF),
    ok: Color(0xFF15803D),
    okSoft: Color(0x1A16A34A), // 10%
    warn: Color(0xFFB45309),
    warnSoft: Color(0x24F59E0B), // 14%
    info: Color(0xFF52525B),
    infoSoft: Color(0x1452525B), // 8%
    danger: Color(0xFFD93025),
    dangerSoft: Color(0x1AD93025), // 10%
  );

  static const dark = Sk._(
    isDark: true,
    canvas: Color(0xFF0E0E10),
    surface: Color(0xFF161618),
    raised: Color(0xFF1D1D20),
    line: Color(0xFF2A2A2E),
    lineStrong: Color(0xFF3A3A3F),
    fg: Color(0xFFEDEDEF),
    muted: Color(0xFFA0A0A8),
    faint: Color(0xFF74747C),
    brand: Color(0xFFEDEDEF),
    brandSoft: Color(0x1AEDEDEF), // 10%
    onBrand: Color(0xFF0E0E10),
    ok: Color(0xFF81C995),
    okSoft: Color(0x2481C995), // 14%
    warn: Color(0xFFFDD663),
    warnSoft: Color(0x24FDD663), // 14%
    info: Color(0xFFA0A0A8),
    infoSoft: Color(0x24A0A0A8), // 14%
    danger: Color(0xFFF28B82),
    dangerSoft: Color(0x24F28B82), // 14%
  );

  static Sk of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? dark : light;

  /// Card / bottom-bar shadow (--sk-shadow); none in dark mode, like the web
  List<BoxShadow>? get shadow => isDark
      ? null
      : const [
          BoxShadow(color: Color(0x0A18181B), blurRadius: 2, offset: Offset(0, 1)),
          BoxShadow(color: Color(0x0D18181B), blurRadius: 3, offset: Offset(0, 1)),
        ];

  /// Large floating shadow (--sk-shadow-lg); none in dark mode
  List<BoxShadow>? get shadowLg => isDark
      ? null
      : const [
          BoxShadow(color: Color(0x2918181B), blurRadius: 32, offset: Offset(0, 12), spreadRadius: -10),
          BoxShadow(color: Color(0x0D18181B), blurRadius: 6, offset: Offset(0, 2)),
        ];
}
