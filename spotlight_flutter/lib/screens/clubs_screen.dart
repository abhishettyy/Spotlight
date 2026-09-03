import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/api_service.dart';
import '../core/events_provider.dart';
import '../core/clubs_provider.dart';
import '../core/smooth_route.dart';
import '../models/models.dart';
import '../widgets/custom_image.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'club_events_screen.dart';

class ClubsScreen extends StatefulWidget {
  const ClubsScreen({super.key});

  @override
  State<ClubsScreen> createState() => _ClubsScreenState();
}

class _ClubsScreenState extends State<ClubsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  List<ClubModel> _allClubs = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadClubs();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadClubs() async {
    final cachedProviderClubs = Provider.of<ClubsProvider>(context, listen: false).clubs;
    if (cachedProviderClubs.isNotEmpty) {
      if (mounted) {
        setState(() {
          _allClubs = List.from(cachedProviderClubs);
          _isLoading = false;
        });
      }
    } else {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final clubs = await ApiService().fetchClubs();
      
      final events = Provider.of<EventsProvider>(context, listen: false).events;
      final seen = clubs.map((c) => c.id).toSet();

      for (final e in events) {
        final clubId = e.clubId ?? e.clubName;
        final clubName = e.clubName;
        final logoUrl = e.clubLogoUrl;
        if (clubId != null && clubId.isNotEmpty && seen.add(clubId)) {
          clubs.add(ClubModel(
            id: clubId,
            name: clubName ?? 'Unknown Club',
            logoUrl: logoUrl,
          ));
        }
      }

      if (mounted) {
        setState(() {
          _allClubs = clubs;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      final events = Provider.of<EventsProvider>(context, listen: false).events;
      final seen = _allClubs.map((c) => c.id).toSet();
      final fallbackClubs = List<ClubModel>.from(_allClubs);

      for (final e in events) {
        final clubId = e.clubId ?? e.clubName;
        final clubName = e.clubName;
        final logoUrl = e.clubLogoUrl;
        if (clubId != null && clubId.isNotEmpty && seen.add(clubId)) {
          fallbackClubs.add(ClubModel(
            id: clubId,
            name: clubName ?? 'Unknown Club',
            logoUrl: logoUrl,
          ));
        }
      }

      if (mounted) {
        setState(() {
          _allClubs = fallbackClubs;
          _isLoading = false;
          if (fallbackClubs.isEmpty) {
            _error = e.toString();
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;
    final eventsProvider = Provider.of<EventsProvider>(context);

    final filteredClubs = _searchQuery.isEmpty
        ? _allClubs
        : _allClubs.where((c) => c.name.toLowerCase().contains(_searchQuery)).toList();

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadClubs,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 4),
                child: Text(
                  'Explore Clubs',
                  style: GoogleFonts.inter(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: cs.onBackground,
                    letterSpacing: -0.5,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Discover campus clubs and explore their events',
                  style: GoogleFonts.inter(fontSize: 14, color: subText),
                ),
              ),
              const SizedBox(height: 16),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: TextField(
                  controller: _searchController,
                  style: GoogleFonts.inter(color: cs.onBackground),
                  onChanged: (v) => setState(() => _searchQuery = v.toLowerCase().trim()),
                  decoration: InputDecoration(
                    hintText: 'Search clubs...',
                    hintStyle: GoogleFonts.inter(
                      color: isDark ? const Color(0xFF666666) : Colors.grey[500],
                      fontSize: 15,
                    ),
                    prefixIcon: Icon(
                      Icons.search_rounded,
                      color: isDark ? const Color(0xFF666666) : Colors.grey[500],
                    ),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: isDark ? const Color(0xFF141416) : Colors.grey[100],
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
              const SizedBox(height: 20),

              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null && _allClubs.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.wifi_off_rounded, size: 48, color: Colors.grey[400]),
                                const SizedBox(height: 12),
                                Text(
                                  'Could not load clubs',
                                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                const SizedBox(height: 8),
                                _isLoading
                                    ? SizedBox(
                                        height: 36,
                                        child: Center(
                                          child: SizedBox(
                                            width: 24,
                                            height: 24,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.5,
                                              color: Theme.of(context).colorScheme.primary,
                                            ),
                                          ),
                                        ),
                                      )
                                    : ElevatedButton(
                                        onPressed: _loadClubs,
                                        child: const Text('Retry'),
                                      ),
                              ],
                            ),
                          )
                        : filteredClubs.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    SizedBox(
                                      width: 220,
                                      height: 150,
                                      child: SvgPicture.asset(
                                        'assets/svg/empty_clubs.svg',
                                        fit: BoxFit.contain,
                                      ),
                                    ),
                                    const SizedBox(height: 20),
                                    Text(
                                      _searchQuery.isEmpty ? 'No clubs registered yet' : 'No clubs matching "$_searchQuery"',
                                      style: GoogleFonts.inter(
                                        color: Colors.grey,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.fromLTRB(24, 0, 24, 110),
                                itemCount: filteredClubs.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 12),
                                itemBuilder: (context, i) {
                                  final club = filteredClubs[i];
                                  final clubEventsCount = eventsProvider.events.where((e) {
                                    final cid = e.clubId ?? e.clubName;
                                    final isThisClub = cid == club.id ||
                                        (e.clubName != null && e.clubName!.toLowerCase() == club.name.toLowerCase());
                                    return isThisClub && e.isUpcoming;
                                  }).length;

                                  final hasLogo = club.logoUrl != null && club.logoUrl!.trim().isNotEmpty;

                                  return InkWell(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        SmoothRoute(
                                          builder: (_) => ClubEventsScreen(
                                            clubId: club.id,
                                            clubName: club.name,
                                            clubLogoUrl: club.logoUrl,
                                          ),
                                        ),
                                      );
                                    },
                                    borderRadius: BorderRadius.circular(16),
                                    child: Container(
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF141416) : Colors.white,
                                        borderRadius: BorderRadius.circular(16),
                                        border: isDark
                                            ? null
                                            : Border.all(
                                                color: Colors.grey.shade200,
                                                width: 1.0,
                                              ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(isDark ? 0.2 : 0.08),
                                            blurRadius: 16,
                                            offset: const Offset(0, 6),
                                          ),
                                        ],
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 52,
                                            height: 52,
                                            decoration: BoxDecoration(
                                              color: isDark ? const Color(0xFF1E1E22) : Colors.grey[100],
                                              shape: BoxShape.circle,
                                              border: isDark
                                                  ? null
                                                  : Border.all(color: Colors.grey[200]!),
                                            ),
                                            child: hasLogo
                                                ? ClipOval(
                                                    child: CustomImage(
                                                      url: club.logoUrl!,
                                                      fit: BoxFit.cover,
                                                      errorBuilder: (_, __, ___) => Icon(
                                                        Icons.groups_outlined,
                                                        color: subText,
                                                      ),
                                                    ),
                                                  )
                                                : Icon(Icons.groups_outlined, color: subText),
                                          ),
                                          const SizedBox(width: 16),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  club.name,
                                                  style: GoogleFonts.inter(
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.w600,
                                                    color: cs.onBackground,
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  '$clubEventsCount active event${clubEventsCount == 1 ? '' : 's'}',
                                                  style: GoogleFonts.inter(
                                                    fontSize: 12,
                                                    color: subText,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Icon(Icons.chevron_right, color: subText),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
