import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF141416) : Colors.white;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;

    Widget buildSubSection({required String title, required String body}) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: cs.onBackground,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              body,
              style: GoogleFonts.inter(
                fontSize: 12,
                height: 1.4,
                color: isDark ? const Color(0xFFA0A0A0) : Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: isDark ? Colors.black : const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: Text(
          'Privacy Policy',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.bold,
            fontSize: 20,
            color: cs.onBackground,
          ),
        ),
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: Icon(Icons.arrow_back_ios_new, color: cs.onBackground, size: 20),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Last Updated: July 26, 2026',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: cs.primary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Spotlight respects your privacy. This policy explains what information we collect, how it is used, and the third-party integrations we rely on to run the platform.',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  height: 1.5,
                  color: cs.onBackground.withOpacity(0.8),
                ),
              ),
              const SizedBox(height: 24),
              _buildSectionCard(
                context,
                icon: Icons.info_outline_rounded,
                title: '1. About Spotlight',
                cardBg: cardBg,
                child: Text(
                  'Spotlight is a college event discovery and registration platform. Events are created and managed by authorized college clubs through the Spotlight Club Dashboard. General users use this mobile app to search, browse, and register for events.',
                  style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: subText),
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.person_search_outlined,
                title: '2. Information We Collect',
                cardBg: cardBg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    buildSubSection(
                      title: 'Account & Profile Data',
                      body: 'Full name, email, phone number, and academic details (USN/Roll number, Branch, Year, and Semester). Password hashes are securely stored if registered manually.',
                    ),
                    buildSubSection(
                      title: 'Event Registrations & Teams',
                      body: 'Metadata showing which events you join, generated team passkeys, and team member relationships.',
                    ),
                    buildSubSection(
                      title: 'Payment & UTR Verification',
                      body: 'For paid events, we collect your entered UPI Transaction ID (UTR) and an image upload of the payment proof/screenshot.',
                    ),
                  ],
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.insights_outlined,
                title: '3. How We Use Data',
                cardBg: cardBg,
                child: Text(
                  'We process your information to create your account, process registrations, confirm payments, send internal notifications, combat spam/abuse, and verify academic eligibility for student events.',
                  style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: subText),
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.share_outlined,
                title: '4. Information Shared With Clubs',
                cardBg: cardBg,
                child: Text(
                  'When you register for an event, your profile data (Name, USN, Phone, Email), team name, and proof of payment are shared directly with the club organizing that specific event via their Club Dashboard so they can verify your entry.',
                  style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: subText),
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.phonelink_setup_rounded,
                title: '5. Device Permissions',
                cardBg: cardBg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    buildSubSection(
                      title: 'Camera & Photo Library',
                      body: 'To select and upload screenshots of payment proofs during event registration.',
                    ),
                    buildSubSection(
                      title: 'Clipboard Access',
                      body: 'To copy club UPI IDs and registration passkeys to your clipboard.',
                    ),
                    buildSubSection(
                      title: 'External App Launch',
                      body: 'To open external UPI payment apps (Google Pay, PhonePe, Paytm) and web links.',
                    ),
                  ],
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.security_outlined,
                title: '6. Data Security & Retention',
                cardBg: cardBg,
                child: Text(
                  'We use secure JWT authentication and encrypted HTTPS endpoints. We retain account and event registration data while your account remains active as required for college event verification and record-keeping.',
                  style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: subText),
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.mail_outline_rounded,
                title: '7. Contact Us',
                cardBg: cardBg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'If you have any questions regarding this Privacy Policy or need assistance, contact our support team:',
                      style: GoogleFonts.inter(fontSize: 13, height: 1.4, color: subText),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.email_outlined, size: 16, color: Color(0xFF10B981)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'spotlightapp.help@gmail.com',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF10B981),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required Color cardBg,
    required Widget child,
  }) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: isDark ? null : Border.all(color: Colors.grey.shade200),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: cs.primary, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: cs.onBackground,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const Divider(height: 24, thickness: 1),
          child,
        ],
      ),
    );
  }

  Widget _buildBulletItem(String prefix, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: GoogleFonts.inter(fontSize: 12, height: 1.4, color: Colors.grey[600]),
                children: [
                  TextSpan(
                    text: '$prefix ',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  TextSpan(text: body),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
