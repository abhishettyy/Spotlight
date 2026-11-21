import 'package:flutter/material.dart';

class Sk {
  final bool isDark;

  final Color canvas;

  final Color surface;

  final Color raised;

  final Color line;

  final Color lineStrong;

  final Color fg;

  final Color muted;

  final Color faint;

  final Color brand;
  final Color brandSoft;

  final Color onBrand;

  final Color ok;
  final Color okSoft;

  final Color warn;
  final Color warnSoft;

  final Color info;
  final Color infoSoft;

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
    canvas: Color(0xFFF5F4F2),
    surface: Color(0xFFFDFCFA),
    raised: Color(0xFFF0EFEC),
    line: Color(0xFFE7E5E1),
    lineStrong: Color(0xFFD6D3CD),
    fg: Color(0xFF1C1917),
    muted: Color(0xFF57534E),
    faint: Color(0xFF78716C),
    brand: Color(0xFFE63946),
    brandSoft: Color(0x1AE63946),
    onBrand: Color(0xFFFFFFFF),
    ok: Color(0xFF15803D),
    okSoft: Color(0x1A16A34A),
    warn: Color(0xFFB45309),
    warnSoft: Color(0x24F59E0B),
    info: Color(0xFF52525B),
    infoSoft: Color(0x1452525B),
    danger: Color(0xFFD93025),
    dangerSoft: Color(0x1AD93025),
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
    brand: Color(0xFFE63946),
    brandSoft: Color(0x29E63946),
    onBrand: Color(0xFFFFFFFF),
    ok: Color(0xFF81C995),
    okSoft: Color(0x2481C995),
    warn: Color(0xFFFDD663),
    warnSoft: Color(0x24FDD663),
    info: Color(0xFFA0A0A8),
    infoSoft: Color(0x24A0A0A8),
    danger: Color(0xFFF28B82),
    dangerSoft: Color(0x24F28B82),
  );

  static Sk of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? dark : light;

  List<BoxShadow>? get shadow => isDark
      ? null
      : const [
          BoxShadow(color: Color(0x0A18181B), blurRadius: 2, offset: Offset(0, 1)),
          BoxShadow(color: Color(0x0D18181B), blurRadius: 3, offset: Offset(0, 1)),
        ];

  List<BoxShadow>? get shadowLg => isDark
      ? null
      : const [
          BoxShadow(color: Color(0x2918181B), blurRadius: 32, offset: Offset(0, 12), spreadRadius: -10),
          BoxShadow(color: Color(0x0D18181B), blurRadius: 6, offset: Offset(0, 2)),
        ];
}
