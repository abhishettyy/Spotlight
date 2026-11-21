import 'package:flutter/material.dart';
import '../core/sk_colors.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/custom_toast.dart';

class AboutUsScreen extends StatelessWidget {
  const AboutUsScreen({super.key});

  Future<void> _openLinkedIn(BuildContext context, String urlString) async {
    final uri = Uri.parse(urlString);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        throw 'Could not launch URL';
      }
    } catch (e) {
      if (context.mounted) {
        showSpotlightToast(
          context,
          'Could not open LinkedIn profile',
          isError: true,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final bgColor = Sk.of(context).canvas;
    final cardColor = Sk.of(context).surface;
    final textColor = Sk.of(context).fg;
    final subTextColor = Sk.of(context).muted;
    final borderColor = Sk.of(context).line;
    final accentRed = Sk.of(context).brand;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: bgColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: textColor, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'About Spotlight',
          style: GoogleFonts.inter(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 0.0, bottom: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Column(
                  children: [
                    Text(
                      'SPOTLIGHT',
                      style: GoogleFonts.cinzel(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: textColor,
                        letterSpacing: 4,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'The Unified Campus Event Hub',
                      style: GoogleFonts.inter(
                        fontSize: 11.5,
                        color: subTextColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: accentRed.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: accentRed.withOpacity(0.2)),
                      ),
                      child: Text(
                        'Version 1.0.0',
                        style: GoogleFonts.inter(
                          fontSize: 10.5,
                          color: accentRed,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              Text(
                'WHY SPOTLIGHT?',
                style: GoogleFonts.inter(
                  fontSize: 10.5,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                  color: subTextColor,
                ),
              ),
              const SizedBox(height: 6),

              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: cardColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: borderColor),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "An event gets announced in class.",
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        color: textColor.withOpacity(0.9),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "The announcement's rushed, half the room isn't really listening, and by the time the organizers ask someone to click a pic of the poster and forward it, it's buried under a hundred other messages in the group.",
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        color: textColor.withOpacity(0.9),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      "Posters scattered across a dozen WhatsApp groups. No single place to check what's happening on campus this week. You'd find out about a hackathon a day after registrations closed, from a friend, by accident.",
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        color: textColor.withOpacity(0.9),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      "Spotlight fixes that. One app. Every event, every club, in one feed. Register, pay, get your ticket, show up. Never let another event get buried.",
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: accentRed,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              Text(
                'DEVELOPERS',
                style: GoogleFonts.inter(
                  fontSize: 10.5,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                  color: subTextColor,
                ),
              ),
              const SizedBox(height: 6),

              _buildDeveloperTile(
                context,
                name: 'Abhish Shetty',
                role: 'Full Stack Developer (MERN)',
                branch: 'Information Science & Engineering',
                college: 'Ramaiah Institute of Technology, Bangalore',
                linkedInUrl: 'https://www.linkedin.com/in/abhish-shetty-10b39232b/',
                cardColor: cardColor,
                borderColor: borderColor,
                textColor: textColor,
                subTextColor: subTextColor,
                isDark: isDark,
              ),

              _buildDeveloperTile(
                context,
                name: 'Shyamanth Nagaraja Shetty',
                role: 'Frontend Developer',
                branch: 'Information Science & Engineering',
                college: 'Ramaiah Institute of Technology, Bangalore',
                linkedInUrl: 'https://www.linkedin.com/in/shyamanth-shetty-864b61311',
                cardColor: cardColor,
                borderColor: borderColor,
                textColor: textColor,
                subTextColor: subTextColor,
                isDark: isDark,
              ),

              const SizedBox(height: 10),

              Text(
                'TESTING',
                style: GoogleFonts.inter(
                  fontSize: 10.5,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                  color: subTextColor,
                ),
              ),
              const SizedBox(height: 6),

              _buildDeveloperTile(
                context,
                name: 'Patel Jashmin Kumar',
                role: 'Manual Testing & UX',
                branch: 'Information Science & Engineering',
                college: 'Ramaiah Institute of Technology, Bangalore',
                linkedInUrl: 'https://www.linkedin.com/in/pateljashmin/',
                cardColor: cardColor,
                borderColor: borderColor,
                textColor: textColor,
                subTextColor: subTextColor,
                isDark: isDark,
              ),

              const SizedBox(height: 16),
              Center(
                child: Text(
                  'Spotlight v1.0.0',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: subTextColor.withOpacity(0.6),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDeveloperTile(
    BuildContext context, {
    required String name,
    required String role,
    required String branch,
    required String college,
    required String linkedInUrl,
    required Color cardColor,
    required Color borderColor,
    required Color textColor,
    required Color subTextColor,
    required bool isDark,
  }) {
    final avatarBg = Sk.of(context).brandSoft;
    final badgeBg = Sk.of(context).raised;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _openLinkedIn(context, linkedInUrl),
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: avatarBg,
                    shape: BoxShape.circle,
                    border: Border.all(color: borderColor),
                  ),
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.person_rounded,
                    size: 20,
                    color: textColor.withOpacity(0.9),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          name,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: textColor,
                          ),
                          maxLines: 1,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: badgeBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: borderColor),
                        ),
                        child: Text(
                          role,
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: textColor.withOpacity(0.8),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          branch,
                          style: GoogleFonts.inter(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w500,
                            color: subTextColor,
                          ),
                        ),
                      ),
                      const SizedBox(height: 1),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          college,
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            color: subTextColor.withOpacity(0.8),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    color: Sk.of(context).brandSoft,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Sk.of(context).brand.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.open_in_new_rounded,
                        size: 12,
                        color: Sk.of(context).brand,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        'LinkedIn',
                        style: GoogleFonts.inter(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: Sk.of(context).brand,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
