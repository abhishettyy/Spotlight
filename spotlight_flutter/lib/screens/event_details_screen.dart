import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'register_screen.dart';
import '../core/smooth_route.dart';
import '../core/events_provider.dart';
import '../core/saved_events_provider.dart';
import '../core/api_service.dart';
import '../models/models.dart';
import '../widgets/custom_image.dart';
import '../core/custom_toast.dart';
import 'package:share_plus/share_plus.dart';

class EventDetailsScreen extends StatefulWidget {
  final String eventId;

  const EventDetailsScreen({super.key, required this.eventId});

  @override
  State<EventDetailsScreen> createState() => _EventDetailsScreenState();
}

class _EventDetailsScreenState extends State<EventDetailsScreen> {
  // null = still checking, true = registered, false = not registered
  bool? _isRegistered;

  @override
  void initState() {
    super.initState();
    _checkRegistration();
  }

  Future<void> _checkRegistration() async {
    try {
      final tickets = await ApiService().fetchUserTickets();
      if (mounted) {
        setState(() {
          _isRegistered = tickets.any((t) => t.event?.id == widget.eventId);
        });
      }
    } catch (_) {
      // On error, assume not registered so the button stays usable
      if (mounted) setState(() => _isRegistered = false);
    }
  }

  String _formatDeadline(DateTime deadline) {
    final local = deadline.toLocal();
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '${months[local.month - 1]} ${local.day}, ${local.year}  $hour:$minute';
  }

  String _formatDateTimeRange(DateTime? start, DateTime? end) {
    if (start == null && end == null) return 'TBD';
    final st = start ?? DateTime.now();
    final en = end ?? DateTime(st.year, st.month, st.day, 23, 59);

    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    String formatTime(DateTime d) {
      final hourInt = d.hour % 12 == 0 ? 12 : d.hour % 12;
      final amPm = d.hour >= 12 ? 'PM' : 'AM';
      final minStr = d.minute.toString().padLeft(2, '0');
      return '$hourInt:$minStr $amPm';
    }

    String formatDate(DateTime d) {
      return '${months[d.month - 1]} ${d.day}, ${d.year}';
    }

    if (st.year == en.year && st.month == en.month && st.day == en.day) {
      return '${formatDate(st)}  ·  ${formatTime(st)} - ${formatTime(en)}';
    } else {
      return '${formatDate(st)} (${formatTime(st)}) → ${formatDate(en)} (${formatTime(en)})';
    }
  }

  Map<String, String> _parseDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) {
      return {'day': '01', 'month': 'JAN', 'weekday': 'Monday', 'year': '2026'};
    }
    try {
      final parsed = DateTime.tryParse(dateStr)?.toLocal();
      if (parsed != null) {
        final months = [
          'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
          'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
        ];
        final weekdays = [
          'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
        ];
        return {
          'day': parsed.day.toString().padLeft(2, '0'),
          'month': months[parsed.month - 1],
          'weekday': weekdays[parsed.weekday - 1],
          'year': parsed.year.toString(),
        };
      }
    } catch (_) {}

    final parts = dateStr.split('-');
    if (parts.length == 3) {
      final day = parts[2];
      final monthIndex = int.tryParse(parts[1]);
      if (monthIndex != null && monthIndex >= 1 && monthIndex <= 12) {
        final months = [
          'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
          'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
        ];
        return {
          'day': day.padLeft(2, '0'),
          'month': months[monthIndex - 1],
          'weekday': 'Date',
          'year': parts[0],
        };
      }
    }

    return {'day': '??', 'month': 'DATE', 'weekday': dateStr, 'year': ''};
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final pageBg = isDark ? const Color(0xFF0F0E0E) : const Color(0xFFF9F9F9);
    final cardBg = isDark ? const Color(0xFF1E1C1C) : Colors.grey[100]!;
    final textPrimary = isDark ? Colors.white : Colors.black;
    final textSecondary = isDark ? const Color(0xFFA09B9B) : Colors.grey[600]!;
    final footerBg = isDark ? const Color(0xFF181515) : Colors.white;

    final eventsProvider = Provider.of<EventsProvider>(context);
    final event = eventsProvider.events.firstWhere(
      (e) => e.id == widget.eventId,
      orElse: () => EventModel(
        id: 'unknown',
        title: 'Event Not Found',
        venue: 'Unknown',
        category: 'Other',
        price: 0,
        description: 'No details available.',
        date: 'No Date',
        registrationCount: 0,
      ),
    );

    final title = event.title;
    final description = event.description ?? 'No Description';
    final date = event.date ?? 'No Date';
    final venue = event.venue;
    final price = event.price > 0 ? 'Paid' : 'Free';
    final imageUrl = event.imageUrl;

    final bool isClosed = event.registrationDeadline != null && DateTime.now().isAfter(event.registrationDeadline!);

    // Still checking registration status
    final bool isChecking = _isRegistered == null;
    final bool alreadyRegistered = _isRegistered == true;

    final dateData = _parseDate(event.startDate?.toIso8601String() ?? date);

    // Determine button state
    final bool buttonDisabled = isClosed || alreadyRegistered || isChecking;

    Color btnBg;
    Color btnTextColor;
    String btnLabel;

    if (isChecking) {
      btnBg = isDark ? Colors.grey[800]! : Colors.grey[300]!;
      btnTextColor = isDark ? Colors.grey[500]! : Colors.grey[600]!;
      btnLabel = '';
    } else if (alreadyRegistered) {
      btnBg = isDark ? const Color(0xFF1A2E1A) : const Color(0xFFE8F5E9);
      btnTextColor = isDark ? const Color(0xFF4CAF50) : const Color(0xFF2E7D32);
      btnLabel = 'Already Registered';
    } else if (isClosed) {
      btnBg = isDark ? Colors.grey[800]! : Colors.grey[300]!;
      btnTextColor = isDark ? Colors.grey[500]! : Colors.grey[600]!;
      btnLabel = 'Registration Closed';
    } else {
      btnBg = cs.primary;
      btnTextColor = Colors.white;
      btnLabel = 'Register Now';
    }

    return Scaffold(
      backgroundColor: pageBg,
      body: Stack(
        children: [

          Positioned(
            top: 0, left: 0, right: 0,
            height: MediaQuery.of(context).size.height * 0.48,
            child: ShaderMask(
              shaderCallback: (rect) {
                return const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black, Colors.transparent],
                  stops: [0.65, 1.0], 
                ).createShader(rect);
              },
              blendMode: BlendMode.dstIn,
              child: CustomImage(
                url: imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: Colors.grey[800]),
              ),
            ),
          ),

          Positioned.fill(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 16,
                bottom: 120,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.28),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                    decoration: BoxDecoration(
                      color: pageBg,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                _glassPill(event.category),
                                if (event.isLive) ...[
                                  const SizedBox(width: 8),
                                  _liveTag(),
                                ],
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.06),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Text(
                                price,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : cs.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: GoogleFonts.inter(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: textPrimary,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Venue: $venue',
                              style: GoogleFonts.inter(
                                fontSize: 15,
                                color: textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            if (event.clubName != null && event.clubName!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                'Hosted by: ${event.clubName}',
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  color: cs.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                            if (event.registrationDeadline != null) ...[
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Icon(
                                    Icons.access_time_rounded,
                                    size: 13,
                                    color: Colors.yellow[600],
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Deadline: ${_formatDeadline(event.registrationDeadline!)}',
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      color: Colors.yellow[600],
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 28),

                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF161414) : Colors.grey[50]!,
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: cardBg,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.calendar_today_outlined,
                                  size: 20,
                                  color: textSecondary,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Date & Time',
                                      style: GoogleFonts.inter(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _formatDateTimeRange(event.startDate, event.effectiveEndDate),
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 32),

                        Text(
                          'About this event',
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          description,
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            color: textSecondary,
                            height: 1.6,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 16, right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _circleBtn(Icons.arrow_back_ios_new, () => Navigator.pop(context)),
                _circleBtn(Icons.share_outlined, () {
                  final shareText = 'Hey! Check out this event "${event.title}"'
                      '${event.clubName != null && event.clubName!.isNotEmpty ? ' hosted by ${event.clubName}' : ''} '
                      'on Spotlight!\n\n'
                      'Venue: ${event.venue}\n'
                      'Date: ${event.date ?? 'TBA'}\n'
                      'Price: ${event.price > 0 ? 'â‚¹${event.price.toStringAsFixed(0)}' : 'Free'}\n\n'
                      'Download the Spotlight app to register now!';
                  Share.share(shareText);
                }),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        decoration: BoxDecoration(
          color: footerBg,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              offset: const Offset(0, -4),
              blurRadius: 16,
            )
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [

              Consumer<SavedEventsProvider>(
                builder: (context, savedProvider, _) {
                  final isSaved = savedProvider.isSaved(widget.eventId);
                  return GestureDetector(
                    onTap: () {
                      final wasSaved = savedProvider.isSaved(widget.eventId);
                      savedProvider.toggleSave(widget.eventId);
                      showSpotlightToast(
                        context,
                        wasSaved ? 'Event removed from saved list' : 'Event saved to your list',
                        icon: wasSaved ? Icons.bookmark_remove_rounded : Icons.bookmark_added_rounded,
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isSaved ? Icons.favorite : Icons.favorite_border,
                        color: isSaved ? Colors.redAccent : (isDark ? Colors.white : Colors.black),
                        size: 24,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(width: 16),

              Expanded(
                child: ElevatedButton(
                  onPressed: buttonDisabled ? null : () {
                    Navigator.push(
                      context,
                      SmoothRoute(
                        builder: (_) => RegisterScreen(
                          eventId: event.id,
                          eventName: event.title,
                          price: event.price,
                          qrUrl: event.qrUrl,
                          eventType: event.eventType,
                          teamSizeLimit: event.teamSizeLimit,
                          upiId: event.upiId,
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: btnBg,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    elevation: 0,
                  ),
                  child: isChecking
                    ? SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            isDark ? Colors.grey[400]! : Colors.grey[500]!,
                          ),
                        ),
                      )
                    : Text(
                        btnLabel,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: btnTextColor,
                        ),
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _circleBtn(IconData icon, VoidCallback onTap) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.5),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      );

  Widget _glassPill(String text) => ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.2)),
            ),
            child: Text(
              text,
              style: GoogleFonts.inter(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      );

  Widget _liveTag() => ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.5), width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Color(0xFFEF4444),
                        blurRadius: 6,
                        spreadRadius: 1.5,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  'LIVE NOW',
                  style: GoogleFonts.inter(
                    color: const Color(0xFFEF4444),
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}
