import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/events_provider.dart';
import '../core/smooth_route.dart';
import '../models/models.dart';
import '../widgets/custom_image.dart';
import 'event_details_screen.dart';

class ClubEventsScreen extends StatelessWidget {
  final String clubId;
  final String clubName;
  final String? clubLogoUrl;

  const ClubEventsScreen({
    super.key,
    required this.clubId,
    required this.clubName,
    this.clubLogoUrl,
  });

  String _formatDeadline(DateTime deadline) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hourInt = deadline.hour % 12 == 0 ? 12 : deadline.hour % 12;
    final amPm = deadline.hour >= 12 ? 'PM' : 'AM';
    final minStr = deadline.minute.toString().padLeft(2, '0');
    return '${months[deadline.month - 1]} ${deadline.day}, ${deadline.year} · $hourInt:$minStr $amPm';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black;
    final subTextColor = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;
    final cardBg = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final now = DateTime.now();

    final eventsProvider = Provider.of<EventsProvider>(context);

    final clubEvents = eventsProvider.events.where((e) {
      final isThisClub = e.clubId == clubId ||
          (e.clubName != null && e.clubName!.toLowerCase() == clubName.toLowerCase());
      if (!isThisClub) return false;
      return e.isUpcoming;
    }).toList()
      ..sort((a, b) {
        final da = a.date != null ? DateTime.tryParse(a.date!) : null;
        final db = b.date != null ? DateTime.tryParse(b.date!) : null;
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da.compareTo(db);
      });

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 16, 24, 0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(Icons.arrow_back_ios_new, color: textColor, size: 20),
                  ),
                  const SizedBox(width: 4),
                  
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDark ? const Color(0xFF2A2A2A) : Colors.grey[100],
                      border: Border.all(
                        color: isDark ? Colors.white12 : Colors.grey[200]!,
                      ),
                    ),
                    child: (clubLogoUrl != null && clubLogoUrl!.isNotEmpty)
                        ? ClipOval(
                            child: CustomImage(
                              url: clubLogoUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Icon(
                                Icons.groups_outlined,
                                color: subTextColor,
                                size: 20,
                              ),
                            ),
                          )
                        : Icon(Icons.groups_outlined, color: subTextColor, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          clubName,
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: textColor,
                            letterSpacing: -0.5,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          'Upcoming Events',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: subTextColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            Expanded(
              child: eventsProvider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : clubEvents.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.event_busy_outlined,
                                  size: 56, color: subTextColor.withOpacity(0.4)),
                              const SizedBox(height: 16),
                              Text(
                                'No upcoming events',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: subTextColor,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Check back later for new events from $clubName',
                                style: GoogleFonts.inter(
                                    fontSize: 13, color: subTextColor.withOpacity(0.7)),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(24, 4, 24, 100),
                          itemCount: clubEvents.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 16),
                          itemBuilder: (context, index) {
                            final event = clubEvents[index];
                            return _EventCard(
                              event: event,
                              isDark: isDark,
                              cardBg: cardBg,
                              textColor: textColor,
                              subTextColor: subTextColor,
                              primaryColor: cs.primary,
                              formatDeadline: _formatDeadline,
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final EventModel event;
  final bool isDark;
  final Color cardBg;
  final Color textColor;
  final Color subTextColor;
  final Color primaryColor;
  final String Function(DateTime) formatDeadline;

  const _EventCard({
    required this.event,
    required this.isDark,
    required this.cardBg,
    required this.textColor,
    required this.subTextColor,
    required this.primaryColor,
    required this.formatDeadline,
  });

  @override
  Widget build(BuildContext context) {
    String day = '??';
    String month = 'DATE';
    if (event.date != null) {
      final parsed = DateTime.tryParse(event.date!);
      if (parsed != null) {
        day = parsed.day.toString().padLeft(2, '0');
        const months = ['JAN','FEB','MAR','APR','MAY','JUN',
                        'JUL','AUG','SEP','OCT','NOV','DEC'];
        month = months[parsed.month - 1];
      }
    }

    final price = event.price > 0 ? 'Paid' : 'Free';
    final imageUrl = event.imageUrl;

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        SmoothRoute(builder: (_) => EventDetailsScreen(eventId: event.id)),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? Colors.white.withOpacity(0.06) : Colors.grey[200]!,
          ),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Row(
          children: [
            
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(20)),
              child: SizedBox(
                width: 90,
                height: 100,
                child: (imageUrl != null && imageUrl.isNotEmpty)
                    ? CustomImage(
                        url: imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _placeholder(isDark),
                      )
                    : _placeholder(isDark),
              ),
            ),

            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            event.category.toUpperCase(),
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.1,
                              color: primaryColor,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: event.price > 0
                                ? primaryColor.withOpacity(0.12)
                                : Colors.green.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            price,
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: event.price > 0 ? primaryColor : Colors.green,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    Text(
                      event.title,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: textColor,
                        letterSpacing: -0.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),

                    Row(
                      children: [
                        Icon(Icons.calendar_today_outlined,
                            size: 11, color: subTextColor),
                        const SizedBox(width: 4),
                        Text(
                          event.date != null
                              ? '$day $month'
                              : 'TBA',
                          style: GoogleFonts.inter(
                              fontSize: 11, color: subTextColor),
                        ),
                        const SizedBox(width: 12),
                        Icon(Icons.location_on_outlined,
                            size: 11, color: subTextColor),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            event.venue,
                            style: GoogleFonts.inter(
                                fontSize: 11, color: subTextColor),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),

                    if (event.registrationDeadline != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.access_time_rounded,
                              size: 11, color: Colors.amber[600]),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'Deadline: ${formatDeadline(event.registrationDeadline!)}',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                color: Colors.amber[600],
                                fontWeight: FontWeight.w600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder(bool isDark) => Container(
        color: isDark ? const Color(0xFF2A2A2A) : Colors.grey[200],
        child: Center(
          child: Icon(Icons.image_outlined,
              color: isDark ? Colors.white24 : Colors.grey[400], size: 28),
        ),
      );
}
