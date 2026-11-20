import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../core/sk_colors.dart';
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
import '../core/user_provider.dart';
import 'package:share_plus/share_plus.dart';

class EventDetailsScreen extends StatefulWidget {
  final String eventId;

  const EventDetailsScreen({super.key, required this.eventId});

  @override
  State<EventDetailsScreen> createState() => _EventDetailsScreenState();
}

class _EventDetailsScreenState extends State<EventDetailsScreen> {
  
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
            if (isRejected) continue; 

            final isFree = (t.event?.price ?? 0) == 0;
            final isTeamMember = t.team != null;
            final isLeader = isTeamMember && (t.team!.leaderId.isNotEmpty ? t.team!.leaderId == currentUserId : t.team!.members.any((m) => m.isLeader && m.id == currentUserId));
            final hasPaid = t.hasPaid;

            if (isFree || t.isConfirmed || hasPaid || (isTeamMember && !isLeader)) {
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
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hourInt = deadline.hour % 12 == 0 ? 12 : deadline.hour % 12;
    final amPm = deadline.hour >= 12 ? 'PM' : 'AM';
    final minStr = deadline.minute.toString().padLeft(2, '0');
    return '${months[deadline.month - 1]} ${deadline.day}, ${deadline.year} · $hourInt:$minStr $amPm';
  }

  String _formatDateTimeRange(DateTime? start, DateTime? end) {
    if (start == null && end == null) return 'TBD';
    final st = start ?? DateTime.now();
    final en = end ?? st.add(const Duration(hours: 3));

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
      return '${formatDate(st)} · ${formatTime(st)} - ${formatTime(en)}';
    } else {
      return '${formatDate(st)} · ${formatTime(st)} → ${formatDate(en)} · ${formatTime(en)}';
    }
  }

  void _openFullPoster(String? url) {
    if (url == null || url.isEmpty) return;
    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.92),
      builder: (dialogContext) {
        return Dialog.fullscreen(
          backgroundColor: Colors.black,
          child: Stack(
            children: [
              Center(
                child: CustomImage(
                  url: url,
                  fit: BoxFit.contain,
                  width: double.infinity,
                  height: double.infinity,
                  errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: Colors.white54, size: 64),
                ),
              ),
              Positioned(
                top: MediaQuery.of(dialogContext).padding.top + 16,
                right: 16,
                child: GestureDetector(
                  onTap: () => Navigator.pop(dialogContext),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close, color: Colors.white, size: 22),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final sk = Sk.of(context);

    final pageBg = sk.canvas;
    final cardBg = sk.raised; // icon circles in the info cards
    final textPrimary = sk.fg;
    final textSecondary = sk.muted;
    final footerBg = sk.surface;

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
    final venue = event.venue;
    final price = event.price > 0 ? 'Paid' : 'Free';
    final imageUrl = event.imageUrl;

    final bool isFull = event.isFull;
    final bool deadlinePassed = event.registrationDeadline != null && DateTime.now().isAfter(event.registrationDeadline!);
    // A full team event takes no new teams, but members can still join a team that already holds a place
    final bool joinOnly = isFull && event.eventType == 'Team' && !deadlinePassed;
    final bool isClosed = deadlinePassed || (isFull && !joinOnly);

    final bool isChecking = _isRegistered == null;
    final bool alreadyRegistered = _isRegistered == true;
    final bool hasPendingPayment = _pendingPaymentTicket != null;

    final bool buttonDisabled = isClosed || alreadyRegistered || isChecking;

    Color btnBg;
    Color btnTextColor;
    String btnLabel;

    if (isChecking) {
      btnBg = sk.raised;
      btnTextColor = sk.faint;
      btnLabel = '';
    } else if (alreadyRegistered) {
      btnBg = sk.okSoft;
      btnTextColor = sk.ok;
      btnLabel = 'Already Registered';
    } else if (hasPendingPayment) {
      btnBg = const Color(0xFFF59E0B);
      btnTextColor = Colors.black;
      btnLabel = 'Complete Payment';
    } else if (joinOnly) {
      btnBg = sk.brand;
      btnTextColor = Sk.of(context).onBrand;
      btnLabel = 'Join a Team';
    } else if (isFull) {
      btnBg = sk.raised;
      btnTextColor = sk.faint;
      btnLabel = 'Registration Full';
    } else if (isClosed) {
      btnBg = sk.raised;
      btnTextColor = sk.faint;
      btnLabel = 'Registration Closed';
    } else {
      btnBg = sk.brand;
      btnTextColor = Sk.of(context).onBrand;
      btnLabel = 'Register Now';
    }    
    
    return Scaffold(
      backgroundColor: pageBg,
      body: Stack(
        children: [
          SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Poster
                GestureDetector(
                  onTap: () => _openFullPoster(imageUrl),
                  child: Container(
                    // About 4:3.5 of the screen width, so small phones keep room for the details
                    height: (MediaQuery.sizeOf(context).width * 0.85).clamp(240.0, 420.0),
                    width: double.infinity,
                    color: sk.raised,
                    child: CustomImage(
                      url: imageUrl,
                      fit: BoxFit.cover,
                      alignment: Alignment.topCenter,
                      width: double.infinity,
                      height: double.infinity,
                      errorBuilder: (_, __, ___) => CustomImage.buildPlaceholder(),
                    ),
                  ),
                ),

                // Event Details Container
                Container(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              _glassPill(event.category, sk),
                              if (event.isLive) ...[
                                const SizedBox(width: 8),
                                _liveTag(),
                              ],
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: sk.raised,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Text(
                              price,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: sk.fg,
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
                                color: sk.brand,
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
                                  color: Sk.of(context).warn,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Deadline: ${_formatDeadline(event.registrationDeadline!)}',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    color: Sk.of(context).warn,
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
                          color: sk.surface,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: sk.line),
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
                            color: sk.surface,
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: sk.line),
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
                                  Icons.groups_outlined,
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
                                      'Team Format',
                                      style: GoogleFonts.inter(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Min ${event.minTeamSize ?? 1} · Max ${event.teamSizeLimit ?? 'No limit'} members per team',
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
                      // Who can register: all branches, or only the ones the club selected
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: sk.surface,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: sk.line),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: cardBg, shape: BoxShape.circle),
                              child: Icon(Icons.school_outlined, size: 20, color: textSecondary),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Who Can Register',
                                    style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: textPrimary),
                                  ),
                                  const SizedBox(height: 4),
                                  if (event.allowedBranches == null || event.allowedBranches!.isEmpty)
                                    Text(
                                      'Open to all branches',
                                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: textSecondary),
                                    )
                                  else
                                    for (final b in event.allowedBranches!)
                                      Padding(
                                        padding: const EdgeInsets.only(bottom: 3),
                                        child: Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text('•  ', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: textSecondary)),
                                            Expanded(
                                              child: Text(
                                                '$b students only',
                                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: textSecondary),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),

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
        padding: EdgeInsets.fromLTRB(
          24,
          14,
          24,
          MediaQuery.of(context).padding.bottom + 12,
        ),
        decoration: BoxDecoration(
          color: footerBg,
          border: Border(top: BorderSide(color: sk.line)),
        ),
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
                        color: sk.raised,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isSaved ? Icons.bookmark : Icons.bookmark_border,
                        color: isSaved ? sk.brand : sk.fg,
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
                      // Events limited to selected branches: say why instead of opening registration
                      final studentBranch = Provider.of<UserProvider>(context, listen: false).currentUser?.branch;
                      final notAllowed = event.branchNotAllowedMessage(studentBranch);
                      if (notAllowed != null) {
                        showSpotlightToast(context, notAllowed, isError: true, duration: const Duration(seconds: 4));
                        return;
                      }
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
                            joinOnly: joinOnly,
                          ),
                        ),
                      ).then((_) => _checkRegistration());
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: btnBg,
                    disabledBackgroundColor: btnBg,
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
                            sk.faint,
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

  Widget _glassPill(String text, Sk sk) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: sk.raised,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: sk.line),
        ),
        child: Text(
          text,
          style: GoogleFonts.inter(
            color: sk.fg,
            fontSize: 12,
            fontWeight: FontWeight.w600,
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
                  decoration: BoxDecoration(
                    color: Sk.of(context).danger,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  'LIVE NOW',
                  style: GoogleFonts.inter(
                    color: Sk.of(context).danger,
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
