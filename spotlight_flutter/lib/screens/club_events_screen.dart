import 'dart:ui';
import 'package:flutter/material.dart';
import '../core/sk_colors.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/events_provider.dart';
import '../core/smooth_route.dart';
import '../core/custom_toast.dart';
import '../core/date_format.dart';
import '../core/saved_events_provider.dart';
import '../models/models.dart';
import '../widgets/custom_image.dart';
import 'event_details_screen.dart';
import '../widgets/paged_list_view.dart';

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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final textColor = Sk.of(context).fg;
    final subTextColor = Sk.of(context).muted;
    final cardBg = Sk.of(context).surface;

    final eventsProvider = Provider.of<EventsProvider>(context);

    final clubEvents = eventsProvider.events.where((e) {
      final isThisClub = e.clubId == clubId ||
          (e.clubName != null && e.clubName!.toLowerCase() == clubName.toLowerCase());
      if (!isThisClub) return false;
      return e.isUpcoming;
    }).toList()
      ..sort((a, b) {
        final da = a.startDate;
        final db = b.startDate;
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
                      color: Sk.of(context).raised,
                      border: Border.all(color: Sk.of(context).line),
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
                      : PagedListView(
                          items: clubEvents,
                          pageSize: 12,
                          spacing: 16,
                          padding: const EdgeInsets.fromLTRB(24, 4, 24, 100),
                          itemBuilder: (context, event) {
                            return _EventCard(
                              event: event,
                              isDark: isDark,
                              cardBg: cardBg,
                              textColor: textColor,
                              subTextColor: subTextColor,
                              primaryColor: cs.primary,
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

  const _EventCard({
    required this.event,
    required this.isDark,
    required this.cardBg,
    required this.textColor,
    required this.subTextColor,
    required this.primaryColor,
  });

  @override
  Widget build(BuildContext context) {
    final price = event.price > 0 ? '₹${event.price.toStringAsFixed(0)}' : 'Free';
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
          border: Border.all(color: Sk.of(context).line),
          boxShadow: null,
        ),
        // The image fills the card's full height, however many detail lines it has
        child: IntrinsicHeight(
          child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(20)),
              child: SizedBox(
                width: 90,
                child: (imageUrl != null && imageUrl.isNotEmpty)
                    ? CustomImage(
                        url: imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _placeholder(Sk.of(context)),
                      )
                    : _placeholder(Sk.of(context)),
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
                        if (event.isLive) ...[
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: Sk.of(context).danger,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'LIVE',
                                style: GoogleFonts.inter(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: Sk.of(context).danger,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 8),
                        ],
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Sk.of(context).raised,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            price,
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Sk.of(context).fg,
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
                        Expanded(
                          child: Text(
                            formatEventHeaderDate(event.startDate, event.eventEndDate),
                            style: GoogleFonts.inter(
                                fontSize: 11, color: subTextColor),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Icon(Icons.location_on_outlined,
                            size: 11, color: subTextColor),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            event.venue,
                            style: GoogleFonts.inter(
                                fontSize: 11, color: subTextColor),
                            maxLines: 1,
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
                              size: 11, color: Sk.of(context).warn),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'Deadline: ${formatDeadline(event.registrationDeadline!)}',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                color: Sk.of(context).warn,
                                fontWeight: FontWeight.w600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${event.registrationCount} ${event.registrationCount == 1 ? 'registration' : 'registrations'}',
                            style: GoogleFonts.inter(
                                fontSize: 11,
                                color: subTextColor,
                                fontWeight: FontWeight.w500),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Consumer<SavedEventsProvider>(
                          builder: (context, savedProvider, _) {
                            final isSaved = savedProvider.isSaved(event.id);
                            return GestureDetector(
                              onTap: () {
                                savedProvider.toggleSave(event.id);
                                showSpotlightToast(
                                  context,
                                  isSaved ? 'Event removed from saved list' : 'Event saved to your list',
                                  icon: isSaved ? Icons.bookmark_remove_rounded : Icons.bookmark_added_rounded,
                                );
                              },
                              child: Icon(
                                isSaved ? Icons.bookmark : Icons.bookmark_border,
                                color: isSaved ? primaryColor : subTextColor,
                                size: 18,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        ),
      ),
    );
  }

  Widget _placeholder(Sk sk) => Container(
        color: sk.raised,
        child: Center(
          child: Icon(Icons.calendar_today_outlined, color: sk.faint, size: 28),
        ),
      );
}
