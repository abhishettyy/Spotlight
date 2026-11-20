import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/custom_toast.dart';
import '../core/date_format.dart';
import '../core/saved_events_provider.dart';
import '../core/sk_colors.dart';
import '../core/smooth_route.dart';
import '../models/models.dart';
import '../screens/event_details_screen.dart';
import 'custom_image.dart';

const _months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/// Event tile used on Home, All Events and Saved. Shows the same details as the web app's
/// EventCard: date chip, club, LIVE, category, title, date/time, venue, deadline,
/// registrations, price and bookmark.
class EventCard extends StatelessWidget {
  final EventModel event;
  final double? width;
  final double height;
  final EdgeInsetsGeometry? margin;

  const EventCard({
    super.key,
    required this.event,
    this.width,
    this.height = 280,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final sk = Sk.of(context);
    // Text sits on the image's dark gradient in both themes, so it uses the dark-theme text colours
    const onImage = Sk.dark;

    // Same source as the web card: event start, else the registration deadline
    final chipDate = event.startDate ?? event.registrationDeadline;
    final price = event.price > 0 ? '₹${event.price.toStringAsFixed(0)}' : 'Free';
    final hasClub = event.clubName != null && event.clubName!.isNotEmpty;

    return GestureDetector(
      onTap: () {
        FocusScope.of(context).unfocus();
        Navigator.push(
          context,
          SmoothRoute(builder: (_) => EventDetailsScreen(eventId: event.id)),
        );
      },
      child: Container(
        width: width,
        height: height,
        margin: margin,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomImage(url: event.imageUrl, fit: BoxFit.cover),
              ),
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Colors.black.withOpacity(0.85),
                        Colors.black.withOpacity(0.2),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
              ),

              if (chipDate != null)
                Positioned(
                  top: 14,
                  right: 14,
                  child: _chip(
                    sk,
                    radius: 12,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    minWidth: 52,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          chipDate.day.toString().padLeft(2, '0'),
                          style: GoogleFonts.inter(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: sk.fg,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _months[chipDate.month - 1],
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: sk.muted,
                            letterSpacing: 0.5,
                            height: 1.1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              Positioned(
                top: 14,
                left: 14,
                right: 86,
                child: Row(
                  children: [
                    if (hasClub)
                      Flexible(
                        child: _chip(
                          sk,
                          radius: 20,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          child: Text(
                            event.clubName!,
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: sk.fg,
                              letterSpacing: 0.8,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    if (event.isLive) ...[
                      if (hasClub) const SizedBox(width: 6),
                      _chip(
                        sk,
                        radius: 20,
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(color: sk.danger, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'LIVE',
                              style: GoogleFonts.inter(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: sk.danger,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              Positioned(
                bottom: 18,
                left: 18,
                right: 18,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.category.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                        color: onImage.brand,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      event.title,
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: onImage.fg,
                        letterSpacing: -0.4,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    _infoLine(
                      Icons.calendar_today_outlined,
                      formatEventHeaderDate(event.startDate, event.eventEndDate),
                    ),
                    const SizedBox(height: 3),
                    _infoLine(Icons.location_on_outlined, event.venue),
                    if (event.registrationDeadline != null) ...[
                      const SizedBox(height: 3),
                      _infoLine(
                        Icons.access_time_rounded,
                        'Deadline: ${formatDeadline(event.registrationDeadline!)}',
                        color: onImage.warn,
                        bold: true,
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            event.eventType == 'Team'
                                ? '${event.registrationCount} ${event.registrationCount == 1 ? 'team' : 'teams'}'
                                : '${event.registrationCount} ${event.registrationCount == 1 ? 'registration' : 'registrations'}',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: onImage.muted,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          price,
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: onImage.fg,
                          ),
                        ),
                        const SizedBox(width: 8),
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
                                color: isSaved ? onImage.brand : onImage.muted,
                                size: 19,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoLine(IconData icon, String text, {Color color = const Color(0xFFA0A0A8), bool bold = false}) {
    return Row(
      children: [
        Icon(icon, size: 11, color: color),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.inter(
              fontSize: bold ? 10 : 11,
              color: color,
              fontWeight: bold ? FontWeight.w600 : FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  // Web .stu-img-chip: surface fill, small shadow
  Widget _chip(
    Sk sk, {
    required Widget child,
    required double radius,
    required EdgeInsetsGeometry padding,
    double minWidth = 0,
  }) {
    return Container(
      constraints: BoxConstraints(minWidth: minWidth),
      padding: padding,
      decoration: BoxDecoration(
        color: sk.surface,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: const [BoxShadow(color: Color(0x1F000000), blurRadius: 3, offset: Offset(0, 1))],
      ),
      child: child,
    );
  }
}
