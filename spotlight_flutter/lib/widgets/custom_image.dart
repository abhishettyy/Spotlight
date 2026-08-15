import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

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

  static bool _isBase64(String str) {
    if (str.startsWith('data:image/')) return true;
    if (str.startsWith('/9j/') || str.startsWith('iVBORw0') || str.startsWith('R0lGOD') || str.startsWith('PHN2Zw')) return true;
    if (!str.contains('://') && !str.startsWith('http') && !str.startsWith('/uploads') && !str.startsWith('uploads/') && !str.startsWith('/static') && !str.startsWith('/images') && str.length > 100) {
      try {
        final sanitized = str.contains(',') ? str.split(',').last : str;
        base64Decode(sanitized.replaceAll(RegExp(r'\s+'), ''));
        return true;
      } catch (_) {}
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.trim().isEmpty) {
      return errorBuilder?.call(context, 'Empty URL', null) ?? buildPlaceholder(width: width, height: height);
    }

    // Strip all linebreaks and whitespace from URL string
    String cleanUrl = url!.replaceAll(RegExp(r'[\r\n\s]+'), '').trim();

    if (_isBase64(cleanUrl)) {
      try {
        final rawBase64 = cleanUrl.contains(',') ? cleanUrl.split(',').last : cleanUrl;
        final sanitized = rawBase64.replaceAll(RegExp(r'\s+'), '');
        final bytes = base64Decode(sanitized);
        return Image.memory(
          bytes,
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

    if (cleanUrl.startsWith('/uploads') || cleanUrl.startsWith('/static') || cleanUrl.startsWith('/images') || cleanUrl.startsWith('/public')) {
      cleanUrl = 'https://spotlight-production-74d4.up.railway.app$cleanUrl';
    } else if (cleanUrl.startsWith('uploads/') || cleanUrl.startsWith('static/') || cleanUrl.startsWith('images/') || cleanUrl.startsWith('public/')) {
      cleanUrl = 'https://spotlight-production-74d4.up.railway.app/$cleanUrl';
    }

    return _SmartHttpImage(
      url: cleanUrl,
      fit: fit,
      alignment: alignment,
      width: width,
      height: height,
      errorBuilder: errorBuilder,
    );
  }
}

class _SmartHttpImage extends StatefulWidget {
  final String url;
  final BoxFit fit;
  final Alignment alignment;
  final double? width;
  final double? height;
  final Widget Function(BuildContext, Object, StackTrace?)? errorBuilder;

  const _SmartHttpImage({
    required this.url,
    required this.fit,
    required this.alignment,
    this.width,
    this.height,
    this.errorBuilder,
  });

  @override
  State<_SmartHttpImage> createState() => _SmartHttpImageState();
}

class _SmartHttpImageState extends State<_SmartHttpImage> {
  static final Map<String, Uint8List> _cache = {};
  Uint8List? _bytes;
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _fetchImage();
  }

  @override
  void didUpdateWidget(covariant _SmartHttpImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url) {
      _fetchImage();
    }
  }

  Future<void> _fetchImage() async {
    final cleanUriStr = widget.url.replaceAll(RegExp(r'[\r\n\s]+'), '').trim();
    if (_cache.containsKey(cleanUriStr)) {
      if (mounted) {
        setState(() {
          _bytes = _cache[cleanUriStr];
          _isLoading = false;
          _hasError = false;
        });
      }
      return;
    }

    try {
      final parsedUri = Uri.parse(cleanUriStr);
      final response = await http.get(parsedUri).timeout(const Duration(seconds: 12));

      if (response.statusCode == 200 && response.bodyBytes.isNotEmpty) {
        _cache[cleanUriStr] = response.bodyBytes;
        if (mounted) {
          setState(() {
            _bytes = response.bodyBytes;
            _isLoading = false;
            _hasError = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _hasError = true;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_bytes != null && !_hasError) {
      return Image.memory(
        _bytes!,
        fit: widget.fit,
        alignment: widget.alignment,
        width: widget.width,
        height: widget.height,
        errorBuilder: (ctx, err, stack) =>
            widget.errorBuilder?.call(ctx, err, stack) ??
            CustomImage.buildPlaceholder(width: widget.width, height: widget.height),
      );
    }

    if (_hasError) {
      return Image.network(
        widget.url.replaceAll(RegExp(r'[\r\n\s]+'), '').trim(),
        fit: widget.fit,
        alignment: widget.alignment,
        width: widget.width,
        height: widget.height,
        errorBuilder: (ctx, err, stack) =>
            widget.errorBuilder?.call(ctx, err, stack) ??
            CustomImage.buildPlaceholder(width: widget.width, height: widget.height),
      );
    }

    return CustomImage.buildPlaceholder(width: widget.width, height: widget.height);
  }
}
