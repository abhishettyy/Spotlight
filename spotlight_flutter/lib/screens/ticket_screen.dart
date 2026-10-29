import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import '../core/sk_colors.dart';
import '../core/custom_toast.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/custom_image.dart';
import '../widgets/event_card.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'ticket_details_screen.dart';
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
  int _selectedTab = 0;
  List<TicketModel> _tickets = [];
  bool _isLoading = true;
  String? _error;
  String _currentUserId = '';

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTab;
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _currentUserId = prefs.getString('userId') ?? '';
      final cachedJson = prefs.getString('cached_user_tickets_json');
      if (cachedJson != null && cachedJson.isNotEmpty) {
        final List<dynamic> raw = json.decode(cachedJson);
        final cachedTickets = raw.map((t) => TicketModel.fromJson(t as Map<String, dynamic>)).toList();
        if (mounted && _tickets.isEmpty) {
          setState(() {
            _tickets = cachedTickets;
            _isLoading = false;
          });
        }
      }
    } catch (_) {}

    if (_tickets.isEmpty) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final tickets = await ApiService().fetchUserTickets();
      if (mounted) {
        setState(() {
          _tickets = tickets;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        if (_tickets.isEmpty) {
          setState(() {
            _error = e.toString();
            _isLoading = false;
          });
        } else {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  List<TicketModel> get _upcoming =>
      _tickets.where((t) => t.isUpcoming).toList();

  List<TicketModel> get _past =>
      _tickets.where((t) => !t.isUpcoming && t.isConfirmed).toList();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final subText = Sk.of(context).muted;
    final toggleBg = Sk.of(context).raised;

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
            Icon(Icons.wifi_off_rounded, size: 48, color: Sk.of(context).faint),
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
                style: GoogleFonts.inter(color: Sk.of(context).muted, fontSize: 12),
                textAlign: TextAlign.center),
            const SizedBox(height: 24),
            _isLoading
                ? SizedBox(
                    height: 36,
                    child: Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Sk.of(context).brand,
                        ),
                      ),
                    ),
                  )
                : ElevatedButton(
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
      final svgPath = _selectedTab == 0
          ? 'assets/svg/empty_upcoming.svg'
          : 'assets/svg/empty_past.svg';
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 220,
              height: 150,
              child: SvgPicture.asset(
                svgPath,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              _selectedTab == 0 ? 'No Upcoming Events' : 'No Past Events',
              style: GoogleFonts.inter(
                  color: Sk.of(context).muted,
                  fontSize: 16,
                  fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              _selectedTab == 0
                  ? 'Your registered upcoming event passes will show up here'
                  : 'Events you attended previously will appear here',
              style: GoogleFonts.inter(
                  color: Sk.of(context).faint, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTickets,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 160),
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
            SizedBox(
              width: 220,
              height: 150,
              child: SvgPicture.asset(
                'assets/svg/empty_saved.svg',
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(height: 20),
            Text('No Saved Events Yet',
                style: GoogleFonts.inter(
                    color: Sk.of(context).muted,
                    fontSize: 16,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32.0),
              child: Text('Tap the bookmark icon on any event to save it to your list',
                  style: GoogleFonts.inter(
                      color: Sk.of(context).faint, fontSize: 13, height: 1.4),
                  textAlign: TextAlign.center),
            ),
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
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 160),
      itemCount: savedEvents.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) => EventCard(event: savedEvents[index]),
    );
  }

  Widget _buildTab(int index, String label) {
    final sk = Sk.of(context);
    final isSelected = _selectedTab == index;

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedTab = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? (sk.isDark ? sk.lineStrong : sk.surface) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            boxShadow: isSelected ? sk.shadow : null,
          ),
          alignment: Alignment.center,
          child: Text(label,
              style: GoogleFonts.inter(
                  color: isSelected ? sk.fg : sk.muted,
                  fontWeight:
                      isSelected ? FontWeight.w600 : FontWeight.w500,
                  fontSize: 14)),
        ),
      ),
    );
  }

  Widget _buildTicketCard(TicketModel ticket) {

    final subText = Sk.of(context).muted;
    final dividerColor = Sk.of(context).line;
    final mainText = Sk.of(context).fg;

    final sk = Sk.of(context);
    final cardDecoration = BoxDecoration(
      color: sk.surface,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: sk.line),
    );

    final event = ticket.event;
    final title = event?.title ?? 'Unknown Event';
    final clubName = event?.clubName ?? '';
    final venue = event?.venue ?? 'TBD';

    String dateStr = 'TBD';
    String timeStr = '';
    final st = event?.startDate;
    final end = event?.eventEndDate;

    if (st != null) {
      dateStr = DateFormat('MMM d, yyyy').format(st);
      final startTimeStr = DateFormat('h:mm a').format(st);
      if (end != null) {
        final endTimeStr = DateFormat('h:mm a').format(end);
        if (st.year == end.year && st.month == end.month && st.day == end.day) {
          timeStr = '$startTimeStr - $endTimeStr';
        } else {
          timeStr = '$startTimeStr → ${DateFormat('MMM d, h:mm a').format(end)}';
        }
      } else {
        timeStr = startTimeStr;
      }
    } else if (event?.date != null) {
      final dt = DateTime.tryParse(event!.date!);
      if (dt != null) {
        dateStr = DateFormat('MMM d, yyyy').format(dt);
        timeStr = DateFormat('h:mm a').format(dt);
      } else {
        dateStr = event.date!;
      }
    }

    final isFreeEvent = (event?.price ?? 0) == 0;
    final isPaidEvent = !isFreeEvent;
    final isLeader = ticket.team == null || (ticket.team!.leaderId.isNotEmpty ? ticket.team!.leaderId == _currentUserId : ticket.team!.members.any((m) => m.isLeader && m.id == _currentUserId));
    final isPaymentPending = isPaidEvent && !ticket.hasPaid && isLeader && ticket.status.toUpperCase() != 'CONFIRMED' && ticket.status.toUpperCase() != 'APPROVED';
    final isViewTicketDisabled = ticket.status.toUpperCase() == 'REJECTED' || isPaymentPending;

    final minRequired = event?.minTeamSize ?? 1;
    final joinedCount = ticket.team?.members.where((m) => m.status.toUpperCase() != 'REJECTED').length ?? 1;
    final confirmedCount = ticket.team?.members.where((m) => m.status.toUpperCase() == 'CONFIRMED' || m.status.toUpperCase() == 'APPROVED').length ?? (ticket.isConfirmed ? 1 : 0);
    final effectiveCount = isFreeEvent ? joinedCount : confirmedCount;
    final isTeamIncomplete = (ticket.team != null) && (effectiveCount < minRequired);

    void openTicket() {
      if (isViewTicketDisabled) {
        return; 
      }

      if (isTeamIncomplete) {
        showSpotlightToast(
          context,
          isFreeEvent ? 'A minimum of $minRequired members must join to get the ticket.' : 'A minimum of $minRequired members must be approved to get the ticket.',
          isWarning: true,
        );
        return;
      }

      if (ticket.isConfirmed) {
        Navigator.push(
          context,
          SmoothRoute(
            builder: (_) => TicketDetailsScreen(ticket: {
              'title': title,
              'venue': venue,
              'date': event?.date ?? '',
              'eventDate': event?.eventDate?.toIso8601String() ?? event?.startDate?.toIso8601String(),
              'eventEndDate': event?.eventEndDate?.toIso8601String(),
              'qr_code_string': (ticket.team != null && ticket.team!.passkey.isNotEmpty)
                  ? ticket.team!.passkey
                  : ticket.id,
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
        );
      } else {
        showSpotlightToast(context, 'Your registration is pending organizer approval.', isWarning: true);
      }
    }

    return Container(
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
                      ),
                    ),
                  ),
                  Positioned(
                    top: 14,
                    right: 14,
                    child: _statusBadge(ticket),
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
                    Text(clubName,
                        style: GoogleFonts.inter(
                            color: subText,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Text(title,
                      style: GoogleFonts.inter(
                          color: mainText,
                          fontSize: 18,
                          fontWeight: FontWeight.bold),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 10),
                  Row(children: [
                    Icon(Icons.calendar_today_outlined,
                        color: subText, size: 13),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(dateStr,
                          style:
                              GoogleFonts.inter(color: subText, fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ),
                  ]),
                  if (timeStr.isNotEmpty) ...[
                    const SizedBox(height: 5),
                    Row(children: [
                      Icon(Icons.access_time, color: subText, size: 13),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(timeStr,
                            style: GoogleFonts.inter(
                                color: subText, fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ),
                    ]),
                  ],
                  const SizedBox(height: 5),
                  Row(children: [
                    Icon(Icons.location_on_outlined,
                        color: subText, size: 13),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(venue,
                          style: GoogleFonts.inter(color: subText, fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                    ),
                  ]),
                  if (ticket.team != null && ticket.team!.passkey.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: sk.raised,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Icon(Icons.group_outlined, color: subText, size: 14),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    ticket.team!.name,
                                    style: GoogleFonts.inter(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: mainText,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: sk.brandSoft,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    ticket.team!.passkey,
                                    style: GoogleFonts.robotoMono(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: sk.brand,
                                      letterSpacing: 1.0,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: ticket.team!.passkey));
                              showSpotlightToast(context, 'Passkey copied: ${ticket.team!.passkey}');
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: sk.surface,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.copy_rounded, size: 12, color: mainText),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Copy',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: mainText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  Divider(color: dividerColor),
                  const SizedBox(height: 14),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (ticket.team != null)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isFreeEvent ? 'Team Members' : 'Approved Members',
                              style: GoogleFonts.inter(color: subText, fontSize: 10),
                            ),
                            Text(
                              isFreeEvent ? '$joinedCount Joined' : '$confirmedCount Approved',
                              style: GoogleFonts.inter(
                                color: isTeamIncomplete ? const Color(0xFFFBBF24) : sk.ok,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        )
                      else
                        const SizedBox(),
                      ElevatedButton(
                        onPressed: isViewTicketDisabled ? null : openTicket,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: sk.brand,
                          foregroundColor: Sk.of(context).onBrand,
                          disabledBackgroundColor: sk.raised,
                          disabledForegroundColor: sk.faint,
                          elevation: (ticket.isConfirmed && !isViewTicketDisabled) ? 2 : 0,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20)),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 10),
                        ),
                        child: Text('View Ticket',
                            style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      );
  }

  // Same pill as the web StatusBadge: fixed colours on a dark translucent fill in both themes
  Widget _statusBadge(TicketModel ticket) {
    Widget pill(Color color, Widget icon, String label) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.55),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withOpacity(0.33), width: 1),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              icon,
              const SizedBox(width: 4),
              Text(
                label,
                style: GoogleFonts.inter(
                  color: color,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        );

    if (ticket.event != null && ticket.event!.isLive) {
      const live = Color(0xFFFF5252);
      return pill(
        live,
        Container(width: 6, height: 6, decoration: const BoxDecoration(color: live, shape: BoxShape.circle)),
        'LIVE NOW',
      );
    }

    final upper = ticket.status.toUpperCase();
    final isPaid = (ticket.event?.price ?? 0) > 0;
    final hasTeamPasskey = ticket.team != null && ticket.team!.passkey.trim().isNotEmpty;
    final isPaymentPending = isPaid && !ticket.hasPaid && !hasTeamPasskey && upper != 'CONFIRMED' && upper != 'APPROVED';

    if (upper == 'CONFIRMED' || upper == 'APPROVED') {
      const c = Color(0xFF81C995);
      return pill(c, const Icon(Icons.check_circle_outline_rounded, size: 12, color: c), 'Confirmed');
    }
    if (upper == 'REJECTED') {
      const c = Color(0xFFF87171);
      return pill(c, const Icon(Icons.cancel_outlined, size: 12, color: c), 'Rejected');
    }
    if (isPaymentPending) {
      const c = Color(0xFFFBBF24);
      return pill(c, const Icon(Icons.credit_card_rounded, size: 12, color: c), 'Payment Pending');
    }
    const c = Color(0xFFA0A0A8);
    return pill(c, const Icon(Icons.hourglass_empty_rounded, size: 12, color: c), 'Approval Pending');
  }
}
