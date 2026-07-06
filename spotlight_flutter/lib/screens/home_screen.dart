import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'event_details_screen.dart';
import 'profile_screen.dart';
import 'register_screen.dart';
import 'notifications_screen.dart';
import '../core/saved_events_provider.dart';
import '../core/events_provider.dart';
import '../core/user_provider.dart';
import '../core/notifications_provider.dart';
import '../core/clubs_provider.dart';
import 'all_events_screen.dart';
import 'package:spotlight_flutter/models/models.dart';
import '../core/smooth_route.dart';
import 'package:provider/provider.dart';
import '../widgets/custom_image.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _activeFilter = 0;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning 👋';
    if (hour < 17) return 'Good afternoon 👋';
    if (hour < 21) return 'Good evening 👋';
    return 'Good night 🌙';
  }

  /// Build filter list dynamically from loaded events.
  /// Always starts with 'All', then unique categories sorted alphabetically.
  List<String> _buildFilters(List<EventModel> events) {
    final categories = events
        .map((e) => e.category.trim())
        .where((c) => c.isNotEmpty && c.toLowerCase() != 'other')
        .toSet()
        .toList()
      ..sort();
    return ['All', ...categories];
  }

  Future<void> _handleRefresh() async {
    await Future.wait<void>([
      context.read<EventsProvider>().loadEvents(),
      context.read<ClubsProvider>().load(),
      context.read<NotificationsProvider>().load(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;
    final textColor = isDark ? Colors.white : Colors.black;
    final subTextColor = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;
    final cardBg = isDark ? const Color(0xFF1E1E1E) : Colors.white;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _handleRefresh,
          color: primaryColor,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_getGreeting(),
                              style: GoogleFonts.inter(
                                  fontSize: 14,
                                  color: subTextColor,
                                  fontWeight: FontWeight.w500)),
                          const SizedBox(height: 4),
                          Consumer<UserProvider>(
                            builder: (context, userProvider, child) {
                              final name = userProvider.currentUser?.name ?? "User";
                              return Text(
                                name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: textColor,
                                  letterSpacing: -0.5,
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              SmoothRoute(builder: (_) => const NotificationsScreen()),
                            );
                          },
                          child: Consumer<NotificationsProvider>(
                            builder: (context, notifProvider, _) {
                              return Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: cardBg,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                          color: isDark
                                              ? Colors.white12
                                              : Colors.grey[200]!),
                                    ),
                                    child: Icon(Icons.notifications_outlined,
                                        color: textColor, size: 20),
                                  ),
                                  if (notifProvider.unreadCount > 0)
                                    Positioned(
                                      top: -2,
                                      right: -2,
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: BoxDecoration(
                                          color: Theme.of(context).colorScheme.primary,
                                          shape: BoxShape.circle,
                                        ),
                                        constraints: const BoxConstraints(
                                            minWidth: 18, minHeight: 18),
                                        child: Text(
                                          notifProvider.unreadCount > 99
                                              ? '99+'
                                              : '${notifProvider.unreadCount}',
                                          style: GoogleFonts.inter(
                                              color: Colors.white,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold),
                                          textAlign: TextAlign.center,
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              SmoothRoute(builder: (_) => const ProfileScreen()),
                            );
                          },
                          child: Consumer<UserProvider>(
                            builder: (context, userProvider, child) {
                              final name = userProvider.currentUser?.name ?? '';
                              final initials = name.trim().isEmpty
                                  ? '?'
                                  : name.trim().split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase();
                              return Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: primaryColor,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                alignment: Alignment.center,
                                child: Text(initials,
                                    style: GoogleFonts.inter(
                                        color: Colors.white,
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold)),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // ── Search Bar ──────────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: TextField(
                  controller: _searchController,
                  style: GoogleFonts.inter(color: textColor),
                  onChanged: (v) => setState(() => _searchQuery = v.toLowerCase().trim()),
                  decoration: InputDecoration(
                    hintText: 'Search events, clubs...',
                    hintStyle: GoogleFonts.inter(color: subTextColor),
                    prefixIcon: Icon(Icons.search, color: subTextColor),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: Icon(Icons.clear, color: subTextColor, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: isDark ? const Color(0xFF1E1E1E) : Colors.grey[100],
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ── Filter Pills ────────────────────────────────────
              Consumer<EventsProvider>(
                builder: (context, provider, _) {
                  final filters = _buildFilters(provider.events);
                  // Clamp active filter index in case events reload with fewer categories
                  if (_activeFilter >= filters.length) {
                    WidgetsBinding.instance.addPostFrameCallback(
                        (_) => setState(() => _activeFilter = 0));
                  }
                  return SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Row(
                      children: List.generate(filters.length, (i) {
                        final isActive = _activeFilter == i;
                        return Padding(
                          padding: EdgeInsets.only(
                              right: i < filters.length - 1 ? 12 : 0),
                          child: GestureDetector(
                            onTap: () => setState(() => _activeFilter = i),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 20, vertical: 10),
                              decoration: BoxDecoration(
                                color: isActive
                                    ? primaryColor
                                    : (isDark
                                        ? const Color(0xFF1E1E1E)
                                        : Colors.white),
                                borderRadius: BorderRadius.circular(24),
                                border: isActive
                                    ? null
                                    : Border.all(
                                        color: isDark
                                            ? Colors.white12
                                            : Colors.grey[300]!),
                              ),
                              child: Text(filters[i],
                                  style: GoogleFonts.inter(
                                      color: isActive
                                          ? Colors.white
                                          : (isDark
                                              ? const Color(0xFFA0A0A0)
                                              : Colors.black),
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14)),
                            ),
                          ),
                        );
                      }),
                    ),
                  );
                },
              ),
              const SizedBox(height: 32),

              // ── Featured Events Header ─────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Featured Events',
                        style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: textColor)),
                    GestureDetector(
                      onTap: () => Navigator.push(
                        context,
                        SmoothRoute(
                            builder: (_) => const AllEventsScreen()),
                      ),
                      child: Text('See all >',
                          style: GoogleFonts.inter(
                              fontSize: 14,
                              color: primaryColor,
                              fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── Featured Events Carousel ───────────────────────
              Consumer<EventsProvider>(
                builder: (context, provider, child) {
                  if (provider.isLoading) {
                    return const SizedBox(
                      height: 280,
                      child: Center(
                        child: CircularProgressIndicator(color: Colors.black),
                      ),
                    );
                  }
                  if (provider.errorMessage.isNotEmpty) {
                    return SizedBox(
                      height: 280,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.wifi_off_rounded,
                                size: 48,
                                color: subTextColor.withOpacity(0.6),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Unable to load events',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: textColor,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                provider.errorMessage.toLowerCase().contains('socketexception') ||
                                        provider.errorMessage.toLowerCase().contains('connection') ||
                                        provider.errorMessage.toLowerCase().contains('timeout') ||
                                        provider.errorMessage.toLowerCase().contains('clientexception')
                                    ? 'Please check your internet connection and try again.'
                                    : 'Something went wrong. Please try again later.',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: subTextColor,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: provider.loadEvents,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: primaryColor,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 20, vertical: 10),
                                ),
                                child: Text(
                                  'Retry',
                                  style: GoogleFonts.inter(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }
                  if (provider.events.isEmpty) {
                    return const SizedBox(
                      height: 280,
                      child: Center(
                        child: Text('No events found'),
                      ),
                    );
                  }
                  final now = DateTime.now();
                  final filters = _buildFilters(provider.events);
                  final filteredEvents = provider.events.where((e) {
                    final date =
                        e.date != null ? DateTime.tryParse(e.date!) : null;
                    final isUpcoming =
                        date == null || date.isAfter(now);
                    final matchesCategory = _activeFilter == 0 ||
                        (_activeFilter < filters.length &&
                            e.category.toLowerCase() ==
                                filters[_activeFilter].toLowerCase());
                    final matchesSearch = _searchQuery.isEmpty ||
                        e.title.toLowerCase().contains(_searchQuery) ||
                        e.venue.toLowerCase().contains(_searchQuery) ||
                        e.category.toLowerCase().contains(_searchQuery);
                    return isUpcoming && matchesCategory && matchesSearch;
                  }).toList();

                  if (filteredEvents.isEmpty) {
                    return SizedBox(
                      height: 280,
                      child: Center(
                        child: Text(
                          _searchQuery.isNotEmpty
                              ? 'No results for "$_searchQuery"'
                              : 'No events in this category',
                          style: GoogleFonts.inter(color: subTextColor),
                        ),
                      ),
                    );
                  }

                  return SizedBox(
                    height: 280,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.only(left: 24.0, right: 8.0),
                      itemCount: filteredEvents.length,
                      itemBuilder: (context, index) {
                        final event = filteredEvents[index];
                        return GestureDetector(
                          onTap: () => Navigator.push(
                              context,
                              SmoothRoute(
                                  builder: (_) =>
                                      EventDetailsScreen(eventId: event.id))),
                          child: _buildEventCard(event),
                        );
                      },
                    ),
                  );
                },
              ),
              const SizedBox(height: 32),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Text('Active Clubs',
                    style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: textColor)),
              ),
              const SizedBox(height: 16),

              // ── Clubs Row ─────────────────────────────────────
              Consumer<ClubsProvider>(
                builder: (context, clubsProvider, _) {
                  if (clubsProvider.isLoading) {
                    return const SizedBox(
                      height: 90,
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (clubsProvider.error.isNotEmpty) {
                    return SizedBox(
                      height: 90,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.cloud_off_rounded, size: 16, color: subTextColor),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  clubsProvider.error.toLowerCase().contains('socketexception') ||
                                          clubsProvider.error.toLowerCase().contains('connection') ||
                                          clubsProvider.error.toLowerCase().contains('timeout') ||
                                          clubsProvider.error.toLowerCase().contains('clientexception')
                                      ? 'Connection error. Please try again.'
                                      : 'Unable to load active clubs.',
                                  style: GoogleFonts.inter(color: subTextColor, fontSize: 12),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              TextButton(
                                onPressed: clubsProvider.load,
                                style: TextButton.styleFrom(
                                  foregroundColor: primaryColor,
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  'Retry',
                                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }
                  if (clubsProvider.clubs.isEmpty) {
                    return SizedBox(
                      height: 90,
                      child: Center(
                        child: Text('No clubs yet',
                            style: GoogleFonts.inter(color: subTextColor)),
                      ),
                    );
                  }
                  return SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Row(
                      children: clubsProvider.clubs.map((club) {
                        return Container(
                          margin: const EdgeInsets.only(right: 20),
                          width: 72,
                          child: Column(
                            children: [
                              Container(
                                width: 64,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? const Color(0xFF1E1E1E)
                                      : Colors.grey[100],
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                      color: isDark
                                          ? Colors.white12
                                          : Colors.grey[200]!),
                                ),
                                child: club.logoUrl != null
                                    ? ClipOval(
                                        child: CustomImage(
                                          url: club.logoUrl!,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) =>
                                              Icon(Icons.groups_outlined,
                                                  color: subTextColor),
                                        ),
                                      )
                                    : Icon(Icons.groups_outlined,
                                        color: subTextColor),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                club.name,
                                style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: textColor),
                                maxLines: 2,
                                textAlign: TextAlign.center,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  );
                },
              ),
              const SizedBox(height: 120),
            ],
          ),
        ),
        ),
      ),
    );
  }

  Widget _buildEventCard(EventModel event) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    String day = '01';
    String month = 'JAN';
    if (event.date != null) {
      final parsed = DateTime.tryParse(event.date!);
      if (parsed != null) {
        day = parsed.day.toString().padLeft(2, '0');
        final months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        month = months[parsed.month - 1];
      } else {
        final parts = event.date!.split('-');
        if (parts.length == 3) {
          day = parts[2].padLeft(2, '0');
          final mIndex = int.tryParse(parts[1]);
          if (mIndex != null && mIndex >= 1 && mIndex <= 12) {
            final months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            month = months[mIndex - 1];
          }
        }
      }
    }

    final imageUrl = event.imageUrl ?? 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop';
    final price = event.price > 0 ? '₹${event.price.toStringAsFixed(0)}' : 'Free';

    return Container(
      width: 320,
      margin: const EdgeInsets.only(right: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        image: DecorationImage(
          image: NetworkImage(imageUrl),
          fit: BoxFit.cover,
        ),
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
            // Dark gradient overlay
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

            // Date Box at top right (Glassmorphic)
            Positioned(
              top: 16,
              right: 16,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
                      children: [
                        Text(
                          day,
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          month,
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: Colors.white70,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Text details at bottom
            Positioned(
              bottom: 20,
              left: 20,
              right: 20,
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
                  const SizedBox(height: 4),
                  Text(
                    event.title,
                    style: GoogleFonts.inter(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${event.registrationCount} Participants going',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: Colors.white70,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
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
                          const SizedBox(width: 10),
                          Consumer<SavedEventsProvider>(
                            builder: (context, savedProvider, _) {
                              final isSaved = savedProvider.isSaved(event.id);
                              return GestureDetector(
                                onTap: () => savedProvider.toggleSave(event.id),
                                child: Icon(
                                  isSaved ? Icons.bookmark : Icons.bookmark_border,
                                  color: isSaved ? cs.primary : Colors.white70,
                                  size: 20,
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
    );
  }
}

