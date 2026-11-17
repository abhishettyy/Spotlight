import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'notifications_screen.dart';
import '../core/events_provider.dart';
import '../core/user_provider.dart';
import '../core/notifications_provider.dart';
import '../core/clubs_provider.dart';
import '../core/theme_provider.dart';
import 'all_events_screen.dart';
import 'package:spotlight_flutter/models/models.dart';
import '../core/smooth_route.dart';
import 'package:provider/provider.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../widgets/custom_image.dart';
import '../widgets/event_card.dart';
import '../core/sk_colors.dart';
import 'clubs_screen.dart';

// The home page shows a preview; "See all" opens the full, paged lists
const int _homeEventLimit = 8;
const int _homeClubLimit = 12;

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
    return 'Good evening 👋';
  }

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
    final sk = Sk.of(context);
    final isDark = sk.isDark;
    final primaryColor = sk.brand;
    final textColor = sk.fg;
    final subTextColor = sk.muted;
    final cardBg = sk.surface;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      behavior: HitTestBehavior.translucent,
      child: Scaffold(
        body: SafeArea(
          child: RefreshIndicator(
            onRefresh: _handleRefresh,
          color: primaryColor,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

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
                              return FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerLeft,
                                child: Text(
                                name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: textColor,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                        GestureDetector(
                          onTap: () => context.read<ThemeProvider>().toggleDarkMode(),
                          child: Semantics(
                            button: true,
                            label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: cardBg,
                                shape: BoxShape.circle,
                                border: Border.all(color: sk.line),
                                boxShadow: sk.shadow,
                              ),
                              child: Icon(
                                  isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                                  color: textColor,
                                  size: 20),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
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
                                      border: Border.all(color: sk.line),
                                      boxShadow: sk.shadow,
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
                                          color: sk.brand,
                                          shape: BoxShape.circle,
                                        ),
                                        constraints: const BoxConstraints(
                                            minWidth: 18, minHeight: 18),
                                        child: Text(
                                          notifProvider.unreadCount > 99
                                              ? '99+'
                                              : '${notifProvider.unreadCount}',
                                          style: GoogleFonts.inter(
                                              color: Sk.of(context).onBrand,
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
                  ],
                ),
              ),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: TextField(
                  controller: _searchController,
                  style: GoogleFonts.inter(color: textColor),
                  onChanged: (v) => setState(() => _searchQuery = v.toLowerCase().trim()),
                  decoration: InputDecoration(
                    hintText: 'Search events...',
                    hintStyle: GoogleFonts.inter(color: sk.faint),
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
                    fillColor: sk.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: sk.brand, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              Consumer<EventsProvider>(
                builder: (context, provider, _) {
                  final filters = _buildFilters(provider.events);

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
                                color: isActive ? sk.brand : sk.surface,
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: isActive ? sk.brand : sk.line),
                              ),
                              child: Text(filters[i],
                                  style: GoogleFonts.inter(
                                      color: isActive ? sk.onBrand : sk.muted,
                                      fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
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
                      child: Text('See all →',
                          style: GoogleFonts.inter(
                              fontSize: 14,
                              color: primaryColor,
                              fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Consumer<EventsProvider>(
                builder: (context, provider, child) {
                  if (provider.isLoading) {
                    return SizedBox(
                      height: 280,
                      child: Center(
                        child: CircularProgressIndicator(color: primaryColor),
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
                              provider.isLoading
                                  ? SizedBox(
                                      height: 36,
                                      child: Center(
                                        child: SizedBox(
                                          width: 24,
                                          height: 24,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            color: primaryColor,
                                          ),
                                        ),
                                      ),
                                    )
                                  : ElevatedButton(
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
                                          color: Sk.of(context).onBrand,
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
                    return SizedBox(
                      height: 240,
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 170,
                              height: 110,
                              child: SvgPicture.asset(
                                'assets/svg/empty_events.svg',
                                fit: BoxFit.contain,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              'No upcoming or live events',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: textColor,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Check back later for exciting campus events!',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: subTextColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  final filters = _buildFilters(provider.events);
                  final filteredEvents = provider.events.where((e) {
                    final isUpcoming = e.isUpcoming;
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
                      height: 240,
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 170,
                              height: 110,
                              child: SvgPicture.asset(
                                'assets/svg/empty_events.svg',
                                fit: BoxFit.contain,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              _searchQuery.isNotEmpty
                                  ? 'No events match "$_searchQuery"'
                                  : 'No upcoming events in this category',
                              style: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: textColor,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Try clearing your search or switching categories',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: subTextColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return SizedBox(
                    height: 280,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.only(left: 24.0, right: 8.0),
                      itemCount: filteredEvents.length < _homeEventLimit ? filteredEvents.length : _homeEventLimit,
                      itemBuilder: (context, index) {
                        final screenWidth = MediaQuery.of(context).size.width;
                        return EventCard(
                          event: filteredEvents[index],
                          width: (screenWidth * 0.80).clamp(270.0, 340.0),
                          margin: const EdgeInsets.only(right: 16),
                        );
                      },
                    ),
                  );
                },
              ),
              const SizedBox(height: 60),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Active Clubs',
                        style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: textColor)),
                    Consumer<ClubsProvider>(
                      builder: (context, clubsProvider, _) => clubsProvider.clubs.length > _homeClubLimit
                          ? GestureDetector(
                              onTap: () => Navigator.push(
                                context,
                                SmoothRoute(builder: (_) => const ClubsScreen()),
                              ),
                              child: Text('See all →',
                                  style: GoogleFonts.inter(
                                      fontSize: 14,
                                      color: primaryColor,
                                      fontWeight: FontWeight.w600)),
                            )
                          : const SizedBox.shrink(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Consumer<ClubsProvider>(
                builder: (context, clubsProvider, _) {
                  if (clubsProvider.isLoading) {
                    return SizedBox(
                      height: 90,
                      child: Center(child: CircularProgressIndicator(color: primaryColor)),
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
                              clubsProvider.isLoading
                                  ? SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: primaryColor,
                                      ),
                                    )
                                  : TextButton(
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
                  final allClubs = clubsProvider.clubs;

                  if (allClubs.isEmpty) {
                    return SizedBox(
                      height: 140,
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(
                              width: 160,
                              height: 90,
                              child: SvgPicture.asset(
                                'assets/svg/empty_clubs.svg',
                                fit: BoxFit.contain,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text('No clubs available',
                                style: GoogleFonts.inter(color: subTextColor, fontSize: 13, fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ),
                    );
                  }
                  return SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Row(
                      children: allClubs.take(_homeClubLimit).map((club) {
                        return Container(
                          margin: const EdgeInsets.only(right: 20),
                          width: 80,
                          child: Column(
                            children: [
                              Container(
                                width: 64,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: sk.raised,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: sk.line),
                                ),
                                child: (club.logoUrl != null &&
                                        club.logoUrl!.isNotEmpty)
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
                                maxLines: 1,
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
              const SizedBox(height: 160),
            ],
          ),
        ),
        ),
      ),
    ),
    );
  }
}
