import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _swingController1;
  late AnimationController _swingController2;
  late AnimationController _haloController;
  late AnimationController _introController;

  late Animation<double> _swingAnimation1;
  late Animation<double> _swingAnimation2;
  late Animation<double> _haloScaleAnimation;
  late Animation<double> _haloOpacityAnimation;

  late Animation<double> _iconScaleAnim;
  late Animation<double> _iconOpacityAnim;
  late Animation<double> _logoRiseAnim;
  late Animation<double> _logoOpacityAnim;
  late Animation<double> _progressWidthAnim;
  late Animation<double> _progressOpacityAnim;

  @override
  void initState() {
    super.initState();

    // 1. Swing controllers for searchlights
    _swingController1 = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    );
    _swingAnimation1 = Tween<double>(
      begin: -38 * math.pi / 180,
      end: 38 * math.pi / 180,
    ).animate(CurvedAnimation(
      parent: _swingController1,
      curve: Curves.easeInOut,
    ));

    _swingController2 = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3100),
    );
    _swingAnimation2 = Tween<double>(
      begin: 32 * math.pi / 180,
      end: -32 * math.pi / 180,
    ).animate(CurvedAnimation(
      parent: _swingController2,
      curve: Curves.easeInOut,
    ));

    // Start swing loops
    _swingController1.repeat(reverse: true);
    _swingController2.repeat(reverse: true);

    // 2. Halo controller (pulsing)
    _haloController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1250),
    );
    _haloScaleAnimation = Tween<double>(
      begin: 0.88,
      end: 1.14,
    ).animate(CurvedAnimation(
      parent: _haloController,
      curve: Curves.easeInOut,
    ));
    _haloOpacityAnimation = Tween<double>(
      begin: 0.5,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _haloController,
      curve: Curves.easeInOut,
    ));
    _haloController.repeat(reverse: true);

    // 3. Intro entrance orchestrator
    _introController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2700),
    );

    // cubic-bezier(0.22, 1, 0.36, 1)
    const cubicBezier = Cubic(0.22, 1.0, 0.36, 1.0);

    // 3.a. Icon box scale & opacity (delay 0.15s/150ms, duration 0.7s/700ms)
    _iconScaleAnim = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
        parent: _introController,
        curve: const Interval(0.0555, 0.3148, curve: cubicBezier),
      ),
    );
    _iconOpacityAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _introController,
        curve: const Interval(0.0555, 0.3148, curve: Curves.easeOut),
      ),
    );

    // 3.b. Logo group rise & opacity (delay 0.25s/250ms, duration 0.9s/900ms)
    _logoRiseAnim = Tween<double>(begin: 24.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _introController,
        curve: const Interval(0.0926, 0.4259, curve: cubicBezier),
      ),
    );
    _logoOpacityAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _introController,
        curve: const Interval(0.0926, 0.4259, curve: Curves.easeOut),
      ),
    );

    // 3.c. Progress bar width (delay 0.55s/550ms, duration 2.1s/2100ms)
    _progressWidthAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _introController,
        curve: const Interval(0.2037, 0.9815, curve: Curves.linear),
      ),
    );

    // 3.d. Progress bar container opacity fade-in (delay 0.7s/700ms, duration 0.3s/300ms)
    _progressOpacityAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _introController,
        curve: const Interval(0.2592, 0.3703, curve: Curves.easeOut),
      ),
    );

    _introController.forward();
  }

  @override
  void dispose() {
    _swingController1.dispose();
    _swingController2.dispose();
    _haloController.dispose();
    _introController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Size screenSize = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: const Color(0xFF090909),
      body: Stack(
        children: [
          // ── Searchlight beams layer ──
          Positioned.fill(
            child: IgnorePointer(
              child: Stack(
                children: [
                  // 1. Counter-swing ambient glow
                  Align(
                    alignment: Alignment.topCenter,
                    child: AnimatedBuilder(
                      animation: _swingAnimation2,
                      builder: (context, child) {
                        return Transform(
                          transform: Matrix4.identity()
                            ..translate(0.0, -screenSize.height * 0.08)
                            ..rotateZ(_swingAnimation2.value),
                          alignment: Alignment.topCenter,
                          child: child,
                        );
                      },
                      child: ImageFiltered(
                        imageFilter: ImageFilter.blur(sigmaX: 28.0, sigmaY: 28.0),
                        child: CustomPaint(
                          size: Size(220, screenSize.height * 0.95),
                          painter: BeamPainter(
                            colors: [
                              Colors.transparent,
                              Colors.white.withOpacity(0.035),
                              Colors.transparent,
                            ],
                            stops: const [0.0, 0.35, 0.80],
                          ),
                        ),
                      ),
                    ),
                  ),

                  // 2. Wide diffuse beam
                  Align(
                    alignment: Alignment.topCenter,
                    child: AnimatedBuilder(
                      animation: _swingAnimation1,
                      builder: (context, child) {
                        return Transform(
                          transform: Matrix4.identity()
                            ..translate(0.0, -screenSize.height * 0.08)
                            ..rotateZ(_swingAnimation1.value),
                          alignment: Alignment.topCenter,
                          child: child,
                        );
                      },
                      child: ImageFiltered(
                        imageFilter: ImageFilter.blur(sigmaX: 22.0, sigmaY: 22.0),
                        child: CustomPaint(
                          size: Size(320, screenSize.height * 1.15),
                          painter: BeamPainter(
                            colors: [
                              Colors.transparent,
                              Colors.white.withOpacity(0.055),
                              Colors.white.withOpacity(0.03),
                              Colors.transparent,
                            ],
                            stops: const [0.0, 0.25, 0.65, 1.0],
                          ),
                        ),
                      ),
                    ),
                  ),

                  // 3. Sharp core beam
                  Align(
                    alignment: Alignment.topCenter,
                    child: AnimatedBuilder(
                      animation: _swingAnimation1,
                      builder: (context, child) {
                        return Transform(
                          transform: Matrix4.identity()
                            ..translate(0.0, -screenSize.height * 0.08)
                            ..rotateZ(_swingAnimation1.value),
                          alignment: Alignment.topCenter,
                          child: child,
                        );
                      },
                      child: ImageFiltered(
                        imageFilter: ImageFilter.blur(sigmaX: 5.0, sigmaY: 5.0),
                        child: CustomPaint(
                          size: Size(90, screenSize.height * 0.85),
                          painter: BeamPainter(
                            colors: [
                              Colors.transparent,
                              Colors.white.withOpacity(0.22),
                              Colors.white.withOpacity(0.07),
                              Colors.transparent,
                            ],
                            stops: const [0.0, 0.20, 0.65, 1.0],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Pulsing halo ──
          Center(
            child: AnimatedBuilder(
              animation: _haloController,
              builder: (context, child) {
                return Transform.scale(
                  scale: _haloScaleAnimation.value,
                  child: Opacity(
                    opacity: _haloOpacityAnimation.value,
                    child: Container(
                      width: 260,
                      height: 260,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            Colors.white.withOpacity(0.09),
                            Colors.white.withOpacity(0.025),
                            Colors.transparent,
                          ],
                          stops: const [0.0, 0.5, 0.7],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // ── Logo group ──
          Center(
            child: AnimatedBuilder(
              animation: _introController,
              builder: (context, child) {
                return Opacity(
                  opacity: _logoOpacityAnim.value,
                  child: Transform.translate(
                    offset: Offset(0.0, _logoRiseAnim.value),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Icon Box
                        Opacity(
                          opacity: _iconOpacityAnim.value,
                          child: Transform.scale(
                            scale: _iconScaleAnim.value,
                            child: Container(
                              width: 68,
                              height: 68,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.07),
                                borderRadius: BorderRadius.circular(22),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.13),
                                  width: 1.0,
                                ),
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: BackdropFilter(
                                filter: ImageFilter.blur(sigmaX: 12.0, sigmaY: 12.0),
                                child: const Center(
                                  child: SizedBox(
                                    width: 34,
                                    height: 34,
                                    child: CustomPaint(
                                      painter: SpotlightLogoPainter(),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        // Wordmark
                        Text(
                          'spotlight',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 44,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -2.2,
                            height: 1.0,
                            shadows: [
                              Shadow(
                                color: Colors.white.withOpacity(0.35),
                                blurRadius: 48,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        // Tagline
                        Text(
                          'discover events'.toUpperCase(),
                          style: GoogleFonts.inter(
                            color: Colors.white.withOpacity(0.38),
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                            letterSpacing: 4.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // ── Progress bar ──
          Positioned(
            bottom: 64,
            left: 0,
            right: 0,
            child: Center(
              child: AnimatedBuilder(
                animation: _introController,
                builder: (context, child) {
                  return Opacity(
                    opacity: _progressOpacityAnim.value,
                    child: Container(
                      width: 56,
                      height: 3,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                      alignment: Alignment.centerLeft,
                      child: FractionallySizedBox(
                        widthFactor: _progressWidthAnim.value,
                        heightFactor: 1.0,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.55),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class BeamPainter extends CustomPainter {
  final List<Color> colors;
  final List<double> stops;

  BeamPainter({required this.colors, required this.stops});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: colors,
        stops: stops,
      ).createShader(Offset.zero & size);

    canvas.drawRect(Offset.zero & size, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class SpotlightLogoPainter extends CustomPainter {
  const SpotlightLogoPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final double scaleX = size.width / 34.0;
    final double scaleY = size.height / 34.0;

    // 1. Circle: cx=17, cy=11, r=5.5, fill=white (opacity 0.92)
    final circlePaint = Paint()
      ..color = Colors.white.withOpacity(0.92)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(17 * scaleX, 11 * scaleY), 5.5 * scaleX, circlePaint);

    // 2. Path: M17 16.5 L4 33 L17 26 L30 33 Z, fill=white (opacity 0.88)
    final pathPaint = Paint()
      ..color = Colors.white.withOpacity(0.88)
      ..style = PaintingStyle.fill;
    final path = Path()
      ..moveTo(17 * scaleX, 16.5 * scaleY)
      ..lineTo(4 * scaleX, 33 * scaleY)
      ..lineTo(17 * scaleX, 26 * scaleY)
      ..lineTo(30 * scaleX, 33 * scaleY)
      ..close();
    canvas.drawPath(path, pathPaint);

    // 3. Ellipse: cx=17, cy=11, rx=11, ry=4, fill=white (opacity 0.12)
    final ellipsePaint = Paint()
      ..color = Colors.white.withOpacity(0.12)
      ..style = PaintingStyle.fill;
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(17 * scaleX, 11 * scaleY),
        width: 22 * scaleX,
        height: 8 * scaleY,
      ),
      ellipsePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
