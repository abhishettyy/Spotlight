import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'register_screen.dart';
import 'payment_screen.dart';
import '../core/events_provider.dart';
import '../core/saved_events_provider.dart';
import '../models/models.dart';

class EventDetailsScreen extends StatelessWidget {
  final String eventId;

  const EventDetailsScreen({super.key, required this.eventId});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetColor = isDark ? const Color(0xFF121212) : Colors.white;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[500]!;
    final pillBg = isDark ? const Color(0xFF1E1E1E) : Colors.grey[100]!;
    final pillText = isDark ? Colors.white : Colors.black;
    final pillIcon = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;
    final footerBg = isDark ? const Color(0xFF1E1E1E) : Colors.white;

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
      ),
    );

    final title = event.title;
    final description = event.description ?? 'No Description';
    final date = event.date ?? 'No Date';
    final venue = event.venue;
    final price = event.price > 0 ? '\$${event.price.toStringAsFixed(2)}' : 'Free';
    final imageUrl = event.imageUrl ?? 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&auto=format&fit=crop';

    return Scaffold(
      body: Stack(
        children: [
          // Layer 1 — Hero Image
          Positioned(
            top: 0, left: 0, right: 0,
            height: MediaQuery.of(context).size.height * 0.45,
            child: Image.network(
              imageUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(color: Colors.grey[800]),
            ),
          ),

          // Top Buttons
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 16, right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _circleBtn(Icons.arrow_back_ios_new, () => Navigator.pop(context)),
                Consumer<SavedEventsProvider>(
                  builder: (context, savedProvider, _) {
                    final isSaved = savedProvider.isSaved(eventId);
                    return Row(children: [
                      GestureDetector(
                        onTap: () => savedProvider.toggleSave(eventId),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.5),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isSaved ? Icons.bookmark : Icons.bookmark_border,
                            color: isSaved
                                ? Theme.of(context).colorScheme.primary
                                : Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      _circleBtn(Icons.share_outlined, () {}),
                    ]);
                  },
                ),
              ],
            ),
          ),

          // Glass Pills
          Positioned(
            top: MediaQuery.of(context).size.height * 0.45 - 80,
            left: 24,
            child: Row(children: [
              _glassPill(event.category),
              const SizedBox(width: 12),
              _glassPill('Event'),
            ]),
          ),

          // Layer 2 — Content Sheet
          Positioned.fill(
            top: MediaQuery.of(context).size.height * 0.45 - 30,
            child: Container(
              decoration: BoxDecoration(
                color: sheetColor,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(30)),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(
                    left: 24, right: 24, top: 32, bottom: 120),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('VENUE',
                            style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.2,
                                color: subText)),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: pillBg,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(children: [
                            Icon(Icons.people_outline,
                                size: 14, color: pillIcon),
                            const SizedBox(width: 4),
                            Text('247 going',
                                style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: pillIcon)),
                          ]),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(title,
                        style: GoogleFonts.inter(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: cs.onBackground,
                            letterSpacing: -1)),
                    const SizedBox(height: 24),
                    Wrap(spacing: 12, runSpacing: 12, children: [
                      _detailPill(context, Icons.calendar_today_outlined, date),
                      _detailPill(context, Icons.access_time, '9:00 AM'),
                      _detailPill(context, Icons.location_on_outlined, venue),
                    ]),
                    const SizedBox(height: 32),
                    Text('About this event',
                        style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: cs.onBackground)),
                    const SizedBox(height: 12),
                    Text(
                        description,
                        style: GoogleFonts.inter(
                            fontSize: 16, color: subText, height: 1.6)),
                  ],
                ),
              ),
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
                blurRadius: 16)
          ],
        ),
        child: SafeArea(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Registration Fee',
                        style: GoogleFonts.inter(
                            fontSize: 12, color: subText)),
                    const SizedBox(height: 4),
                    Text(price,
                        style: GoogleFonts.inter(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: cs.primary)),
                  ],
                ),
              ),
              ElevatedButton(
                onPressed: () {
                  if (event.price > 0) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PaymentScreen(
                          eventName: event.title,
                          price: event.price,
                        ),
                      ),
                    );
                  } else {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => RegisterScreen(
                          eventId: event.id,
                        ),
                      ),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                child: Text('Register Now',
                    style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _circleBtn(IconData icon, VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.5), shape: BoxShape.circle),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      );

  Widget _glassPill(String text) =>
      ClipRRect(
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
            child: Text(text,
                style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600)),
          ),
        ),
      );

  Widget _detailPill(BuildContext context, IconData icon, String text) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pillBg = isDark ? const Color(0xFF1E1E1E) : Colors.grey[100]!;
    final pillText = isDark ? Colors.white : Colors.black;
    final pillIcon = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
          color: pillBg, borderRadius: BorderRadius.circular(24)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: pillIcon),
        const SizedBox(width: 8),
        Text(text,
            style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: pillText)),
      ]),
    );
  }
}
