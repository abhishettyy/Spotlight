import 'dart:convert';
import 'package:flutter/material.dart';

class CustomImage extends StatelessWidget {
  final String? url;
  final BoxFit fit;
  final Alignment alignment;
  final double? width;
  final double? height;
  final Widget Function(BuildContext, Object, StackTrace?)? errorBuilder;

  const CustomImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.alignment = Alignment.center,
    this.width,
    this.height,
    this.errorBuilder,
  });

  static Widget buildPlaceholder({double? width, double? height, IconData icon = Icons.event_outlined}) {
    return Container(
      width: width,
      height: height,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1E1E24), Color(0xFF0F0F12), Color(0xFF141419)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Icon(icon, color: Colors.white24, size: 32),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.trim().isEmpty) {
      return errorBuilder?.call(context, 'Empty URL', null) ?? buildPlaceholder(width: width, height: height);
    }

    final cleanUrl = url!.trim();

    if (cleanUrl.startsWith('data:image/')) {
      try {
        final base64String = cleanUrl.split(',').last;
        return Image.memory(
          base64Decode(base64String),
          fit: fit,
          alignment: alignment,
          width: width,
          height: height,
          errorBuilder: errorBuilder ?? (_, __, ___) => buildPlaceholder(width: width, height: height),
        );
      } catch (e) {
        return errorBuilder?.call(context, e, null) ?? buildPlaceholder(width: width, height: height);
      }
    }

    return Image.network(
      cleanUrl,
      fit: fit,
      alignment: alignment,
      width: width,
      height: height,
      errorBuilder: errorBuilder ?? (_, __, ___) => buildPlaceholder(width: width, height: height),
    );
  }
}
