import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:intl/intl.dart';

class TicketDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> ticket;

  const TicketDetailsScreen({super.key, required this.ticket});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cs = Theme.of(context).colorScheme;
    final cardBg = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;

    final title = ticket['title'] ?? 'No Title';
    final dateStr = ticket['date'] ?? '';
    DateTime? dateTime;
    try {
      dateTime = DateTime.parse(dateStr);
    } catch (_) {}

    final formattedDate = dateTime != null
        ? DateFormat('dd MMM, yyyy').format(dateTime)
        : (dateStr.isNotEmpty ? dateStr : 'TBD');
    final formattedTime =
        dateTime != null ? DateFormat('h:mm a').format(dateTime) : '';

    final venue = ticket['venue'] ?? 'No Venue';
    final qrCodeString = ticket['qr_code_string'] ?? 'unknown';
    final price = (ticket['price'] ?? 0).toDouble();
    final team = ticket['team'] as Map<String, dynamic>?;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('My Ticket',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: cs.onBackground,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [

            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
                    blurRadius: 24,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [

                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                    child: Column(
                      children: [
                        Text(title,
                            style: GoogleFonts.inter(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: cs.onBackground),
                            textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _infoChip(
                                context, Icons.calendar_today_outlined, formattedDate),
                            if (formattedTime.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              _infoChip(context, Icons.access_time, formattedTime),
                            ],
                          ],
                        ),
                        const SizedBox(height: 8),
                        _infoChip(context, Icons.location_on_outlined, venue),
                        if (team != null) ...[
                          const SizedBox(height: 8),
                          _infoChip(
                              context,
                              Icons.group_outlined,
                              '${team['name']}  ·  ${team['passkey']}'),
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2A2A2A) : Colors.grey[50]!,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isDark ? Colors.white12 : Colors.grey[200]!),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.people_alt_outlined, size: 14, color: cs.primary),
                                    const SizedBox(width: 6),
                                    Text('Team Members', 
                                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: cs.primary)
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                ...((team['members'] as List<dynamic>? ?? []).map((m) {
                                  final isLeader = m['isLeader'] == true;
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 6),
                                    child: Row(
                                      children: [
                                        Icon(Icons.person, size: 14, color: subText),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            m['name'] ?? '', 
                                            style: GoogleFonts.inter(fontSize: 13, color: cs.onBackground)
                                          )
                                        ),
                                        if (isLeader)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: cs.primary.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text('Leader', style: GoogleFonts.inter(fontSize: 10, color: cs.primary, fontWeight: FontWeight.w600)),
                                          ),
                                      ],
                                    ),
                                  );
                                }).toList()),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  _PerforationDivider(isDark: isDark),

                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: QrImageView(
                            data: qrCodeString,
                            version: QrVersions.auto,
                            size: 180,
                            backgroundColor: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text('Scan at the venue',
                            style: GoogleFonts.inter(
                                fontSize: 12, color: subText)),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Registration Fee',
                                style: GoogleFonts.inter(
                                    fontSize: 13, color: subText)),
                            Text(
                              price > 0
                                  ? '₹${price.toStringAsFixed(0)}'
                                  : 'Free',
                              style: GoogleFonts.inter(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: cs.primary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoChip(BuildContext context, IconData icon, String text) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF2A2A2A) : Colors.grey[100]!;
    final textColor = isDark ? Colors.white70 : Colors.grey[700]!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 13, color: textColor),
        const SizedBox(width: 6),
        Text(text,
            style: GoogleFonts.inter(fontSize: 12, color: textColor)),
      ]),
    );
  }
}

class _PerforationDivider extends StatelessWidget {
  final bool isDark;
  const _PerforationDivider({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final scaffoldBg = Theme.of(context).scaffoldBackgroundColor;
    return Row(
      children: [
        _notch(scaffoldBg),
        Expanded(
          child: CustomPaint(
            size: const Size(double.infinity, 1),
            painter: _DashPainter(isDark: isDark),
          ),
        ),
        _notch(scaffoldBg),
      ],
    );
  }

  Widget _notch(Color bg) {
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: bg,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _DashPainter extends CustomPainter {
  final bool isDark;
  _DashPainter({required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isDark ? Colors.white12 : Colors.grey.shade300
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    double x = 0;
    while (x < size.width) {
      canvas.drawLine(Offset(x, 0), Offset(x + 6, 0), paint);
      x += 12;
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.isDark != isDark;
}
