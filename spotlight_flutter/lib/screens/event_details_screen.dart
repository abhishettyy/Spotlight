import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'register_screen.dart';
import 'payment_screen.dart';
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
  TicketModel? _pendingPaymentTicket;
  Timer? _deadlineTimer;

  @override
  void initState() {
    super.initState();
    _checkRegistration();
    _deadlineTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _deadlineTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkRegistration() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final currentUserId = prefs.getString('userId') ?? '';

      final tickets = await ApiService().fetchUserTickets();
      if (mounted) {
        TicketModel? pendingTicket;
        TicketModel? confirmedTicket;

        for (final t in tickets) {
          if (t.event?.id == widget.eventId) {
            final isRejected = t.status.toUpperCase() == 'REJECTED';
            if (isRejected) continue; // Allow rejected users to register again!

            final isFree = (t.event?.price ?? 0) == 0;
            final isTeamMember = t.team != null;
            final isLeader = isTeamMember && (t.team!.leaderId.isNotEmpty ? t.team!.leaderId == currentUserId : t.team!.members.any((m) => m.isLeader && m.id == currentUserId));

            if (isFree || t.isConfirmed || (isTeamMember && !isLeader)) {
              confirmedTicket = t;
            } else {
              pendingTicket = t;
            }
          }
        }

        setState(() {
          if (confirmedTicket != null) {
            _isRegistered = true;
            _pendingPaymentTicket = null;
          } else if (pendingTicket != null) {
            _isRegistered = false;
            _pendingPaymentTicket = pendingTicket;
          } else {
            _isRegistered = false;
            _pendingPaymentTicket = null;
          }
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isRegistered = false;
          _pendingPaymentTicket = null;
        });
      }
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

    final bool isFull = event.isFull;
    final bool isClosed = (event.registrationDeadline != null && DateTime.now().isAfter(event.registrationDeadline!)) || isFull;

    // Still checking registration status
    final bool isChecking = _isRegistered == null;
    final bool alreadyRegistered = _isRegistered == true;
    final bool hasPendingPayment = _pendingPaymentTicket != null;

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
    } else if (hasPendingPayment) {
      btnBg = const Color(0xFFF59E0B);
      btnTextColor = Colors.black;
      btnLabel = 'Complete Payment';
    } else if (isFull) {
      btnBg = isDark ? Colors.grey[800]! : Colors.grey[300]!;
      btnTextColor = isDark ? Colors.grey[500]! : Colors.grey[600]!;
      btnLabel = 'Registration Full';
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
                                _glassPill(event.category, isDark: isDark),
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
                        if ((event.eventType ?? '').toLowerCase() == 'team') ...[
                          const SizedBox(height: 12),
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
                                    Icons.groups_rounded,
                                    size: 20,
                                    color: cs.primary,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Team Format',
                                        style: GoogleFonts.inter(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                          color: textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Min ${event.minTeamSize ?? 2} · Max ${event.teamSizeLimit ?? 'No limit'} members per team',
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
                        ],
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
                  final formattedPrice = event.price > 0 ? '₹${event.price.toStringAsFixed(0)}' : 'Free';
                  final shareText = 'Hey! Check out this event "${event.title}"'
                      '${event.clubName != null && event.clubName!.isNotEmpty ? ' hosted by ${event.clubName}' : ''} '
                      'on Spotlight!\n\n'
                      '📍 Venue: ${event.venue}\n'
                      '📅 Date: ${event.date ?? 'TBA'}\n'
                      '🏷️ Price: $formattedPrice\n\n'
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
                        isSaved ? Icons.bookmark : Icons.bookmark_border,
                        color: isSaved ? cs.primary : (isDark ? Colors.white : Colors.black87),
                        size: 22,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(width: 16),

              Expanded(
                child: ElevatedButton(
                  onPressed: buttonDisabled ? null : () {
                    if (_pendingPaymentTicket != null) {
                      final ticket = _pendingPaymentTicket!;
                      final eventInfo = ticket.event;
                      final refCode = ticket.id.length > 6 ? ticket.id.substring(0, 6).toUpperCase() : ticket.id.toUpperCase();
                      Navigator.push(
                        context,
                        SmoothRoute(
                          builder: (_) => PaymentScreen(
                            eventName: eventInfo?.title ?? event.title,
                            price: eventInfo?.price ?? event.price,
                            qrUrl: eventInfo?.qrUrl ?? event.qrUrl,
                            registrationId: ticket.id,
                            referenceCode: refCode,
                            upiId: eventInfo?.upiId ?? event.upiId,
                            teamSizeLimit: eventInfo?.teamSizeLimit ?? event.teamSizeLimit,
                          ),
                        ),
                      ).then((_) => _checkRegistration());
                    } else {
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
                      ).then((_) => _checkRegistration());
                    }
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

  Widget _glassPill(String text, {required bool isDark}) => ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withOpacity(0.12) : Colors.black.withOpacity(0.06),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark ? Colors.white.withOpacity(0.15) : Colors.black.withOpacity(0.1),
              ),
            ),
            child: Text(
              text,
              style: GoogleFonts.inter(
                color: isDark ? Colors.white : Colors.black87,
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
            decoration: const BoxDecoration(
              color: Colors.transparent,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Color(0xFFEF4444),
                        blurRadius: 4,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  'LIVE NOW',
                  style: GoogleFonts.inter(
                    color: const Color(0xFFEF4444),
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}
