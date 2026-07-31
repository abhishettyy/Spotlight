import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../core/events_provider.dart';
import '../core/saved_events_provider.dart';
import '../models/models.dart';
import 'event_details_screen.dart';
import '../core/smooth_route.dart';
import '../core/custom_toast.dart';
import '../widgets/custom_image.dart';

class AllEventsScreen extends StatefulWidget {
  const AllEventsScreen({super.key});

  @override
  State<AllEventsScreen> createState() => _AllEventsScreenState();
}

class _AllEventsScreenState extends State<AllEventsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 24, 0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(Icons.arrow_back_ios_new,
                        color: cs.onBackground, size: 20),
                  ),
                  Text('All Events',
                      style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: cs.onBackground,
                          letterSpacing: -0.5)),
                ],
              ),
            ),
            const SizedBox(height: 12),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: TextField(
                controller: _searchController,
                style: GoogleFonts.inter(color: cs.onBackground),
                onChanged: (v) => setState(() => _query = v.toLowerCase()),
                decoration: InputDecoration(
                  hintText: 'Search events...',
                  hintStyle: GoogleFonts.inter(color: subText),
                  prefixIcon: Icon(Icons.search, color: subText),
                  filled: true,
                  fillColor:
                      isDark ? const Color(0xFF1E1E1E) : Colors.grey[100],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 16),

            Expanded(
              child: Consumer<EventsProvider>(
                builder: (context, provider, _) {
                  if (provider.isLoading) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (provider.errorMessage.isNotEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.wifi_off_rounded,
                              size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          Text('Could not load events',
                              style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(height: 16),
                          ElevatedButton(
                              onPressed: provider.loadEvents,
                              child: const Text('Retry')),
                        ],
                      ),
                    );
                  }

                  final now = DateTime.now();
                  var events = provider.events.where((e) {
                    final isUpcoming = e.isUpcoming;
                    final matchesQuery = _query.isEmpty ||
                        e.title.toLowerCase().contains(_query) ||
                        e.venue.toLowerCase().contains(_query) ||
                        e.category.toLowerCase().contains(_query);
                    return isUpcoming && matchesQuery;
                  }).toList();

                  if (events.isEmpty) {
                    return Center(
                      child: Text(
                        _query.isEmpty
                            ? 'No upcoming events'
                            : 'No results for "$_query"',
                        style:
                            GoogleFonts.inter(color: subText, fontSize: 15),
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: provider.loadEvents,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                      itemCount: events.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: 14),
                      itemBuilder: (context, i) =>
                          _buildEventTile(context, events[i]),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventTile(BuildContext context, EventModel event) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    String day = '01';
    String month = 'JAN';
    final months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    final st = event.startDate;
    if (st != null) {
      day = st.day.toString().padLeft(2, '0');
      month = months[st.month - 1];
    } else if (event.date != null && event.date!.trim().isNotEmpty) {
      final parsed = DateTime.tryParse(event.date!);
      if (parsed != null) {
        day = parsed.day.toString().padLeft(2, '0');
        month = months[parsed.month - 1];
      } else {
        final parts = event.date!.split('-');
        if (parts.length == 3) {
          day = parts[2].padLeft(2, '0');
          final mIndex = int.tryParse(parts[1]);
          if (mIndex != null && mIndex >= 1 && mIndex <= 12) {
            month = months[mIndex - 1];
          }
        }
      }
    } else if (event.registrationDeadline != null) {
      day = event.registrationDeadline!.day.toString().padLeft(2, '0');
      month = months[event.registrationDeadline!.month - 1];
    }

    month = month.length > 3 ? month.substring(0, 3).toUpperCase() : month.toUpperCase();

    final imageUrl = event.imageUrl;
    final price = event.price > 0 ? '₹${event.price.toStringAsFixed(0)}' : 'Free';

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        SmoothRoute(builder: (_) => EventDetailsScreen(eventId: event.id)),
      ),
      child: Container(
        height: 280,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          image: imageUrl != null && imageUrl.isNotEmpty
              ? DecorationImage(
                  image: NetworkImage(imageUrl),
                  fit: BoxFit.cover,
                )
              : null,
          gradient: imageUrl == null || imageUrl.isEmpty
              ? const LinearGradient(
                  colors: [Color(0xFF1E1E24), Color(0xFF0F0F12), Color(0xFF141419)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.35 : 0.08),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Stack(
            children: [

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

              Positioned(
                top: 14,
                right: 14,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 52, maxWidth: 64),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.2),
                          width: 1,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              day,
                              style: GoogleFonts.inter(
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                height: 1.1,
                              ),
                              maxLines: 1,
                              softWrap: false,
                            ),
                          ),
                          const SizedBox(height: 2),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              month,
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: Colors.white70,
                                letterSpacing: 0.5,
                                height: 1.1,
                              ),
                              maxLines: 1,
                              softWrap: false,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              Positioned(
                top: 14,
                left: 14,
                right: 86,
                child: Row(
                  children: [
                    if (event.clubName != null && event.clubName!.isNotEmpty)
                      Flexible(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.2),
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                event.clubName!.toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: 0.8,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ),
                      ),
                    if (event.isLive) ...[
                      if (event.clubName != null && event.clubName!.isNotEmpty)
                        const SizedBox(width: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'LIVE',
                                  style: GoogleFonts.inter(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFFEF4444),
                                    letterSpacing: 0.6,
                                  ),
                                ),
                              ],
                            ),
                          ),
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
                        color: cs.primary,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      event.title,
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: -0.4,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (event.registrationDeadline != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.access_time_rounded, size: 11, color: Color(0xFFF59E0B)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'Deadline: ${DateFormat('MMM d, yyyy HH:mm').format(event.registrationDeadline!)}',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                color: const Color(0xFFF59E0B),
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${event.registrationCount} ${event.registrationCount == 1 ? 'registration' : 'registrations'}',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: Colors.white70,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              price,
                              style: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Consumer<SavedEventsProvider>(
                              builder: (context, savedProvider, _) {
                                final isSaved = savedProvider.isSaved(event.id);
                                return GestureDetector(
                                  onTap: () {
                                    final wasSaved = savedProvider.isSaved(event.id);
                                    savedProvider.toggleSave(event.id);
                                    showSpotlightToast(
                                      context,
                                      wasSaved ? 'Event removed from saved list' : 'Event saved to your list',
                                      icon: wasSaved ? Icons.bookmark_remove_rounded : Icons.bookmark_added_rounded,
                                    );
                                  },
                                  child: Icon(
                                    isSaved ? Icons.bookmark : Icons.bookmark_border,
                                    color: isSaved ? cs.primary : Colors.white70,
                                    size: 19,
                                  ),
                                );
                              },
                            ),
                          ],
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
}
