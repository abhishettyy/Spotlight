import 'package:flutter/material.dart';

/// 150ms fade transition — feels like an instant web page render.
/// Use this instead of MaterialPageRoute everywhere.
class SmoothRoute<T> extends MaterialPageRoute<T> {
  SmoothRoute({required super.builder});

  @override
  Duration get transitionDuration => const Duration(milliseconds: 150);

  @override
  Duration get reverseTransitionDuration => const Duration(milliseconds: 120);

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return FadeTransition(
      opacity: CurvedAnimation(
        parent: animation,
        curve: Curves.easeOut,
      ),
      child: child,
    );
  }
}
