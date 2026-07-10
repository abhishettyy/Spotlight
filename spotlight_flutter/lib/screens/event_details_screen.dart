import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'register_screen.dart';
import 'payment_screen.dart';
import '../core/smooth_route.dart';
import '../core/events_provider.dart';
import '../core/saved_events_provider.dart';
import '../models/models.dart';
import '../widgets/custom_image.dart';
import 'package:share_plus/share_plus.dart';

class EventDetailsScreen extends StatelessWidget {
  final String eventId;

  const EventDetailsScreen({super.key, required this.eventId});

  Map<String, String> _parseDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) {
      return {'day': '01', 'month': 'JAN', 'weekday': 'Monday', 'year': '2026'};
    }
    try {
      final parsed = DateTime.tryParse(dateStr);
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

    // Fallback if parsing fails but string has hyphen/slash format (e.g. "2026-08-05")
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
    
    // Rich dark/charcoal background for dark mode, subtle grey for light mode
    final pageBg = isDark ? const Color(0xFF0F0E0E) : const Color(0xFFF9F9F9);
    final cardBg = isDark ? const Color(0xFF1E1C1C) : Colors.grey[100]!;
    final textPrimary = isDark ? Colors.white : Colors.black;
    final textSecondary = isDark ? const Color(0xFFA09B9B) : Colors.grey[600]!;
    final footerBg = isDark ? const Color(0xFF181515) : Colors.white;

    final eventsProvider = Provider.of<EventsProvider>(context);
    final event = eventsProvider.events.firstWhere(
      (e) => e.id == eventId,
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
    final price = event.price > 0 ? '₹${event.price.toStringAsFixed(0)}' : 'Free';
    final imageUrl = event.imageUrl ?? 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&auto=format&fit=crop';

    final dateData = _parseDate(date);

    return Scaffold(
      backgroundColor: pageBg,
      body: Stack(
        children: [
          // Layer 1 — Hero Image with Smooth Fade Blend
          Positioned(
            top: 0, left: 0, right: 0,
            height: MediaQuery.of(context).size.height * 0.48,
            child: ShaderMask(
              shaderCallback: (rect) {
                return const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black, Colors.transparent],
                  stops: [0.65, 1.0], // smooth transition to pageBg
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

          // Layer 2 — Scrollable Content
          Positioned.fill(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: MediaQuery.of(context).padding.top + 16,
                bottom: 120,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Spacer to push content below the top header image area
                  SizedBox(height: MediaQuery.of(context).size.height * 0.28),

                  // Category Pills
                  Row(
                    children: [
                      _glassPill(event.category),
                      const SizedBox(width: 12),
                      _glassPill('Event'),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Title, Subtitle and Price Tag in Row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: GoogleFonts.inter(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: textPrimary,
                                letterSpacing: -1,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Concert: $venue',
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
                           ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          price,
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : cs.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Redesigned Date/Time Section
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
                        // Calendar Block
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: cardBg,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            children: [
                              Text(
                                dateData['day']!,
                                style: GoogleFonts.inter(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: textPrimary,
                                ),
                              ),
                              Text(
                                dateData['month']!,
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.0,
                                  color: textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Time Info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                dateData['weekday']!,
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: textPrimary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '9:00 AM - End',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Circular Map/Share Icon
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
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // About this event
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
                  const SizedBox(height: 32),

                  // Description List (Feature Points)
                  Text(
                    'Description',
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _bulletItem(context, 'Category: ${event.category} Event', Icons.check_circle_rounded),
                  _bulletItem(context, 'Registration: ${event.registrationCount} going', Icons.check_circle_rounded),
                  if (event.teamSizeLimit != null)
                    _bulletItem(context, 'Team Limit: Up to ${event.teamSizeLimit} members', Icons.check_circle_rounded)
                  else
                    _bulletItem(context, 'Solo participation or individual entry', Icons.check_circle_rounded),
                ],
              ),
            ),
          ),

          // Pinned Top Back & Share buttons
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
                      'Price: ${event.price > 0 ? '₹${event.price.toStringAsFixed(0)}' : 'Free'}\n\n'
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
              // Heart/Favorite Button
              Consumer<SavedEventsProvider>(
                builder: (context, savedProvider, _) {
                  final isSaved = savedProvider.isSaved(eventId);
                  return GestureDetector(
                    onTap: () => savedProvider.toggleSave(eventId),
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
              // Register Now Button
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
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
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    'Register Now',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
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

  Widget _bulletItem(BuildContext context, String text, IconData icon) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textSecondary = isDark ? const Color(0xFFA09B9B) : Colors.grey[600]!;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(
            icon,
            size: 20,
            color: Theme.of(context).colorScheme.primary.withOpacity(0.8),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.inter(
                fontSize: 15,
                color: textSecondary,
              ),
            ),
          ),
        ],
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
}

