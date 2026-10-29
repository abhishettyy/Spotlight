import 'dart:ui';
import 'package:flutter/material.dart';
import '../core/sk_colors.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/events_provider.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../widgets/event_card.dart';

class AllEventsScreen extends StatefulWidget {
  const AllEventsScreen({super.key});

  @override
  State<AllEventsScreen> createState() => _AllEventsScreenState();
}

class _AllEventsScreenState extends State<AllEventsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';
  String _selectedFormatFilter = 'All'; // 'All', 'Solo', 'Team'

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final subText = Sk.of(context).muted;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      behavior: HitTestBehavior.translucent,
      child: Scaffold(
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
                  hintStyle: GoogleFonts.inter(color: Sk.of(context).faint),
                  prefixIcon: Icon(Icons.search, color: subText),
                  suffixIcon: _query.isNotEmpty
                      ? IconButton(
                          icon: Icon(Icons.clear, color: subText, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _query = '');
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: Sk.of(context).surface,
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
            const SizedBox(height: 12),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: ['All', 'Solo', 'Team'].map((filter) {
                  final isSelected = _selectedFormatFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedFormatFilter = filter;
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 9),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? cs.primary
                              : (Sk.of(context).raised),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          filter,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected
                                ? Sk.of(context).onBrand
                                : (Sk.of(context).muted),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
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
                    final textColor = Sk.of(context).fg;
                    final subTextColor = Sk.of(context).muted;
                    final primaryColor = Sk.of(context).brand;

                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
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
                                    ),
                                    child: const Text('Retry'),
                                  ),
                          ],
                        ),
                      ),
                    );
                  }

                  var events = provider.events.where((e) {
                    final isUpcoming = e.isUpcoming;
                    final matchesQuery = _query.isEmpty ||
                        e.title.toLowerCase().contains(_query) ||
                        e.venue.toLowerCase().contains(_query) ||
                        e.category.toLowerCase().contains(_query);

                    final isTeamEvent = (e.eventType ?? '').toLowerCase() == 'team' ||
                        (e.minTeamSize != null && e.minTeamSize! > 1) ||
                        (e.teamSizeLimit != null && e.teamSizeLimit! > 1);

                    bool matchesFormat = true;
                    if (_selectedFormatFilter == 'Solo') {
                      matchesFormat = !isTeamEvent;
                    } else if (_selectedFormatFilter == 'Team') {
                      matchesFormat = isTeamEvent;
                    }

                    return isUpcoming && matchesQuery && matchesFormat;
                  }).toList();

                  if (events.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32.0),
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
                            const SizedBox(height: 16),
                            Text(
                              _query.isNotEmpty
                                  ? 'No events match "$_query"'
                                  : _selectedFormatFilter != 'All'
                                      ? 'No $_selectedFormatFilter events found'
                                      : 'No upcoming events',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: cs.onBackground,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _query.isNotEmpty
                                  ? 'Try searching with a different keyword or format'
                                  : 'Check back later for exciting campus events!',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: subText,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
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
                      itemBuilder: (context, i) => EventCard(event: events[i]),
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
