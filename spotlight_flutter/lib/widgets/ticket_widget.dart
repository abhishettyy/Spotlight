import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme.dart';

class TicketWidget extends StatelessWidget {
  final String status; // 'pending' or 'confirmed'
  final String eventName;
  final String dateStr;
  final String location;
  final String registrationId;

  const TicketWidget({
    Key? key,
    required this.status,
    required this.eventName,
    required this.dateStr,
    required this.location,
    required this.registrationId,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isConfirmed = status == 'confirmed';
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: isConfirmed ? const Color(0xFFFFD700).withOpacity(0.1) : SpotlightTheme.pureWhite,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isConfirmed ? const Color(0xFFFFD700) : Colors.grey[200]!,
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: isConfirmed ? const Color(0xFFFFD700).withOpacity(0.2) : Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          // Top Part
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isConfirmed ? const Color(0xFFFFD700) : SpotlightTheme.subtleGray,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        isConfirmed ? 'CONFIRMED' : 'PENDING',
                        style: GoogleFonts.inter(
                          color: isConfirmed ? SpotlightTheme.deepBlack : Colors.grey[600],
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    Icon(
                      isConfirmed ? Icons.verified_rounded : Icons.hourglass_empty_rounded,
                      color: isConfirmed ? const Color(0xFFDAA520) : Colors.grey[400],
                    )
                  ],
                ),
                const SizedBox(height: 24),
                Text(
                  eventName,
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: SpotlightTheme.deepBlack,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Text(dateStr, style: GoogleFonts.inter(color: Colors.grey[700])),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Text(location, style: GoogleFonts.inter(color: Colors.grey[700])),
                  ],
                ),
              ],
            ),
          ),
          
          // Perforation Line
          Row(
            children: [
              SizedBox(
                height: 20,
                width: 10,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: SpotlightTheme.subtleGray, // Match scaffold background
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(10),
                      bottomRight: Radius.circular(10),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return Flex(
                      direction: Axis.horizontal,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      mainAxisSize: MainAxisSize.max,
                      children: List.generate(
                        (constraints.constrainWidth() / 15).floor(),
                        (index) => SizedBox(
                          width: 8,
                          height: 2,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: Colors.grey[300],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              SizedBox(
                height: 20,
                width: 10,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: SpotlightTheme.subtleGray,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(10),
                      bottomLeft: Radius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
          
          // Bottom Part
          Padding(
            padding: const EdgeInsets.all(24),
            child: isConfirmed
                ? Column(
                    children: [
                      Center(
                        child: QrImageView(
                          data: registrationId,
                          version: QrVersions.auto,
                          size: 150.0,
                          foregroundColor: SpotlightTheme.deepBlack,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Scan at entry',
                        style: GoogleFonts.inter(
                          color: Colors.grey[500],
                          fontSize: 14,
                        ),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: SpotlightTheme.subtleGray,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.admin_panel_settings_outlined, color: Colors.grey),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Awaiting Admin Approval for payment. Check back soon.',
                                style: GoogleFonts.inter(
                                  color: Colors.grey[600],
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
