import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../widgets/custom_image.dart';
import 'ticket_details_screen.dart';
import 'event_details_screen.dart';
import '../core/smooth_route.dart';
import '../core/api_service.dart';
import '../core/saved_events_provider.dart';
import '../core/events_provider.dart';
import '../models/models.dart';

class TicketScreen extends StatefulWidget {
  final int initialTab;
  const TicketScreen({super.key, this.initialTab = 0});

  @override
  State<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends State<TicketScreen> {
  late int _selectedTab;
  List<TicketModel> _tickets = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTab;
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final tickets = await ApiService().fetchUserTickets();
      if (mounted) {
        setState(() {
          _tickets = tickets;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  List<TicketModel> get _upcoming =>
      _tickets.where((t) => t.isUpcoming).toList();

  List<TicketModel> get _past =>
      _tickets.where((t) => !t.isUpcoming).toList();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[500]!;
    final toggleBg = isDark ? const Color(0xFF1E1E1E) : Colors.grey[200]!;

    final upcomingCount = _upcoming.length;
    final pastCount = _past.length;
    final savedCount = Provider.of<SavedEventsProvider>(context).savedEventIds.length;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('My Events',
                          style: GoogleFonts.inter(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: cs.onBackground,
                              letterSpacing: -1)),
                      const SizedBox(height: 4),
                      Text(
                        _isLoading
                            ? 'Loading...'
                            : '$upcomingCount upcoming · $savedCount saved · $pastCount past',
                        style: GoogleFonts.inter(
                            fontSize: 14,
                            color: subText,
                            fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: _loadTickets,
                    icon: Icon(Icons.refresh_rounded, color: subText),
                    tooltip: 'Refresh',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: toggleBg,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  children: [
                    _buildTab(0, 'Upcoming'),
                    _buildTab(1, 'Saved'),
                    _buildTab(2, 'Past'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? _buildError()
                      : _buildTicketList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Could not load tickets',
                style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            Text(
                (_error != null &&
                        (_error!.toLowerCase().contains('socketexception') ||
                            _error!.toLowerCase().contains('connection') ||
                            _error!.toLowerCase().contains('timeout') ||
                            _error!.toLowerCase().contains('clientexception')))
                    ? 'Please check your internet connection and try again.'
                    : (_error ?? ''),
                style: GoogleFonts.inter(color: Colors.grey, fontSize: 12),
                textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loadTickets,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketList() {

    if (_selectedTab == 1) {
      return _buildSavedTab();
    }

    final list = _selectedTab == 0 ? _upcoming : _past;
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.confirmation_number_outlined,
                size: 56, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              _selectedTab == 0 ? 'No upcoming events' : 'No past events',
              style: GoogleFonts.inter(
                  color: Colors.grey,
                  fontSize: 16,
                  fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTickets,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
        itemCount: list.length,
        separatorBuilder: (_, __) => const SizedBox(height: 20),
        itemBuilder: (context, index) => _buildTicketCard(list[index]),
      ),
    );
  }

  Widget _buildSavedTab() {
    final savedProvider = Provider.of<SavedEventsProvider>(context);
    final eventsProvider = Provider.of<EventsProvider>(context);
    final savedIds = savedProvider.savedEventIds;

    if (savedIds.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.bookmark_border, size: 56, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text('No saved events yet',
                style: GoogleFonts.inter(
                    color: Colors.grey,
                    fontSize: 16,
                    fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            Text('Tap the bookmark icon on any event to save it',
                style: GoogleFonts.inter(
                    color: Colors.grey[400], fontSize: 13),
                textAlign: TextAlign.center),
          ],
        ),
      );
    }

    final savedEvents = savedIds
        .map((id) {
          try {
            return eventsProvider.events.firstWhere((e) => e.id == id);
          } catch (_) {
            return null;
          }
        })
        .whereType<EventModel>()
        .toList();

    if (savedEvents.isEmpty) {

      return const Center(child: CircularProgressIndicator());
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
      itemCount: savedEvents.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) =>
          _buildSavedEventCard(savedEvents[index]),
    );
  }

  Widget _buildSavedEventCard(EventModel event) {
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
          boxShadow: isDark
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 24,
                    offset: const Offset(0, 12),
                  ),
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
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

              Positioned(
                bottom: 18,
                left: 20,
                right: 20,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${event.category.toUpperCase()}${event.clubName != null && event.clubName!.isNotEmpty ? ' • ${event.clubName!.toUpperCase()}' : ''}',
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
                            '${event.registrationCount} ${event.registrationCount == 1 ? 'registration' : 'registrations'}',
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
      ),
    );
  }

  Widget _buildTab(int index, String label) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSelected = _selectedTab == index;
    final inactiveText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[500]!;

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedTab = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? cs.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          alignment: Alignment.center,
          child: Text(label,
              style: GoogleFonts.inter(
                  color: isSelected ? Colors.white : inactiveText,
                  fontWeight:
                      isSelected ? FontWeight.w600 : FontWeight.w500,
                  fontSize: 14)),
        ),
      ),
    );
  }

  Widget _buildTicketCard(TicketModel ticket) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;
    final dividerColor = isDark ? Colors.white12 : Colors.grey[200]!;
    final processingBg = isDark ? const Color(0xFF2A2A2A) : Colors.grey[100]!;
    final mainText = isDark ? Colors.white : const Color(0xFF111111);

    final cardDecoration = isDark
        ? BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF1E1E1E),
                Color(0xFF0F0F0F),
              ],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: Colors.white.withOpacity(0.06),
              width: 1.0,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.35),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          )
        : BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: Colors.black.withOpacity(0.04),
              width: 1.0,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 28,
                offset: const Offset(0, 14),
              ),
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          );

    final event = ticket.event;
    final title = event?.title ?? 'Unknown Event';
    final clubName = event?.clubName ?? '';
    final venue = event?.venue ?? 'TBD';
    final isPending = ticket.isPending;

    String dateStr = 'TBD';
    String timeStr = '';
    if (event?.date != null) {
      final dt = DateTime.tryParse(event!.date!);
      if (dt != null) {
        dateStr = DateFormat('MMM d, yyyy').format(dt);
        timeStr = DateFormat('h:mm a').format(dt);
      } else {
        dateStr = event.date!;
      }
    }

    final shortId = 'SPT-${ticket.id.substring(0, 8).toUpperCase()}';

    return GestureDetector(
      onTap: ticket.isConfirmed
          ? () => Navigator.push(
                context,
                SmoothRoute(
                  builder: (_) => TicketDetailsScreen(ticket: {
                    'title': title,
                    'venue': venue,
                    'date': event?.date ?? '',
                    'qr_code_string': ticket.id,
                    'price': event?.price ?? 0,
                    'team': ticket.team != null
                        ? {
                            'name': ticket.team!.name,
                            'passkey': ticket.team!.passkey,
                            'members': ticket.team!.members
                                .map((m) => {
                                      'name': m.name,
                                      'isLeader': m.isLeader,
                                    })
                                .toList(),
                          }
                        : null,
                  }),
                ),
              )
          : null,
      child: Container(
        decoration: cardDecoration,
        child: Column(
          children: [

            SizedBox(
              height: 140,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(24)),
                      child: CustomImage(
                        url: event?.imageUrl,
                        width: double.infinity,
                        height: 140,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            Container(color: Colors.grey[800]),
                      ),
                    ),
                  ),
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(24)),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withOpacity(0.5),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 14,
                    right: 14,
                    child: _statusBadge(ticket.status),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (clubName.isNotEmpty)
                    Text(clubName.toUpperCase(),
                        style: GoogleFonts.inter(
                            color: subText,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2)),
                  const SizedBox(height: 4),
                  Text(title,
                      style: GoogleFonts.inter(
                          color: mainText,
                          fontSize: 18,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Row(children: [
                    Icon(Icons.calendar_today_outlined,
                        color: subText, size: 13),
                    const SizedBox(width: 4),
                    Text(dateStr,
                        style:
                            GoogleFonts.inter(color: subText, fontSize: 12)),
                    if (timeStr.isNotEmpty) ...[
                      const SizedBox(width: 12),
                      Icon(Icons.access_time, color: subText, size: 13),
                      const SizedBox(width: 4),
                      Text(timeStr,
                          style: GoogleFonts.inter(
                              color: subText, fontSize: 12)),
                    ],
                  ]),
                  const SizedBox(height: 4),
                  Row(children: [
                    Icon(Icons.location_on_outlined,
                        color: subText, size: 13),
                    const SizedBox(width: 4),
                    Text(venue,
                        style:
                            GoogleFonts.inter(color: subText, fontSize: 12)),
                  ]),
                  if (ticket.team != null) ...[
                    const SizedBox(height: 4),
                    Row(children: [
                      Icon(Icons.group_outlined, color: subText, size: 13),
                      const SizedBox(width: 4),
                      Text(
                          '${ticket.team!.name}  ·  ${ticket.team!.passkey}',
                          style: GoogleFonts.inter(
                              color: subText, fontSize: 12)),
                    ]),
                  ],
                  const SizedBox(height: 14),
                  Divider(color: dividerColor),
                  const SizedBox(height: 14),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (ticket.isConfirmed) ...[
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Ticket ID',
                                style: GoogleFonts.inter(
                                    color: subText, fontSize: 10)),
                            Text(shortId,
                                style: GoogleFonts.inter(
                                    color: mainText,
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold)),
                          ],
                        ),
                        ElevatedButton(
                          onPressed: () => Navigator.push(
                            context,
                            SmoothRoute(
                              builder: (_) => TicketDetailsScreen(ticket: {
                                'title': title,
                                'venue': venue,
                                'date': event?.date ?? '',
                                'qr_code_string': ticket.id,
                                'price': event?.price ?? 0,
                                'team': ticket.team != null
                                    ? {
                                        'name': ticket.team!.name,
                                        'passkey': ticket.team!.passkey,
                                        'members': ticket.team!.members
                                            .map((m) => {
                                                  'name': m.name,
                                                  'isLeader': m.isLeader,
                                                })
                                            .toList(),
                                      }
                                    : null,
                              }),
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: cs.primary,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20)),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 10),
                          ),
                          child: Text('View Ticket',
                              style: GoogleFonts.inter(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ] else ...[
                        const SizedBox(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 10),
                          decoration: BoxDecoration(
                            color: processingBg,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text('Awaiting Payment',
                              style: GoogleFonts.inter(
                                  color: subText,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ],
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

  Widget _statusBadge(String status) {
    final upper = status.toUpperCase();
    Color bg;
    IconData icon;
    String label;

    switch (upper) {
      case 'CONFIRMED':
        bg = Colors.green.withOpacity(0.9);
        icon = Icons.check_circle_outline;
        label = 'Confirmed';
        break;
      case 'PENDING':
        bg = Colors.orange.withOpacity(0.85);
        icon = Icons.pending_outlined;
        label = 'Pending';
        break;
      default:
        bg = Colors.black.withOpacity(0.6);
        icon = Icons.info_outline;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 13),
          const SizedBox(width: 4),
          Text(label,
              style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
