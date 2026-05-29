import 'dart:convert';
import 'package:flutter/material.dart';

class CustomImage extends StatelessWidget {
  final String url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Widget Function(BuildContext, Object, StackTrace?)? errorBuilder;

  const CustomImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.errorBuilder,
  });

  @override
  Widget build(BuildContext context) {
    if (url.startsWith('data:image/')) {
      try {
        final base64String = url.split(',').last;
        return Image.memory(
          base64Decode(base64String),
          fit: fit,
          width: width,
          height: height,
          errorBuilder: errorBuilder ?? (_, __, ___) => Container(color: Colors.grey[800]),
        );
      } catch (e) {
        return errorBuilder?.call(context, e, null) ?? Container(color: Colors.grey[800]);
      }
    }
    
    return Image.network(
      url,
      fit: fit,
      width: width,
      height: height,
      errorBuilder: errorBuilder ?? (_, __, ___) => Container(color: Colors.grey[800]),
    );
  }
}
