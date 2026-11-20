import 'package:flutter/material.dart';
import '../core/sk_colors.dart';
import 'package:google_fonts/google_fonts.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final cardBg = Sk.of(context).surface;
    final subText = Sk.of(context).muted;

    Widget para(String text) => Text(
          text,
          style: GoogleFonts.inter(fontSize: 13, height: 1.5, color: subText),
        );

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
                color: Sk.of(context).muted,
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: Sk.of(context).canvas,
      appBar: AppBar(
        title: Text(
          'Terms & Privacy Policy',
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
                'Last Updated: November 21, 2026',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: cs.primary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'This page explains what Spotlight collects, how it is used, who can see it, and the terms for using Spotlight.',
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
                child: para(
                  'Spotlight is a college event discovery and registration platform. Clubs create and manage events through the Spotlight Club Dashboard after the Spotlight admin approves them. Students use this app or the Spotlight website to browse events, register and get entry tickets.',
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
                      title: 'Account & Profile',
                      body: 'Your name, email address, phone number, USN, branch, year and semester. If you sign up with email, your password is stored only as a secure hash. With Google Sign-In we receive your name and email from Google and store no password.',
                    ),
                    buildSubSection(
                      title: 'Registrations, Teams & Tickets',
                      body: 'The events you register for and their status, your team name, team members and team passkey, the time your ticket is scanned at the event, and in-app notifications about your registrations.',
                    ),
                    buildSubSection(
                      title: 'No Payments',
                      body: 'All events on Spotlight are free, so we never ask for or store any payment details.',
                    ),
                    buildSubSection(
                      title: 'Stored Only on Your Phone',
                      body: 'Your sign-in session, a cached copy of your profile, tickets and clubs, your saved events and your theme choice. Saved events are never sent to our servers. Signing out or clearing app data removes them.',
                    ),
                    buildSubSection(
                      title: 'Technical',
                      body: 'Our servers and hosting providers keep standard request logs (such as IP address and time) for security. We do not use analytics, advertising or tracking tools.',
                    ),
                  ],
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.insights_outlined,
                title: '3. How We Use Data',
                cardBg: cardBg,
                child: para(
                  'To create your account and keep your sign-in secure, register you for events and teams, issue QR entry tickets and check you in, show in-app notifications about your registrations and events, and prevent duplicate registrations and misuse. We do not send push notifications or marketing emails.',
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.share_outlined,
                title: '4. Who Can See Your Information',
                cardBg: cardBg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    buildSubSection(
                      title: 'The Club Running the Event',
                      body: 'Your name, email, phone, USN, branch, year, semester, team name, and registration and check-in status. Clubs may use this only to run that event.',
                    ),
                    buildSubSection(
                      title: 'The Spotlight Admin',
                      body: 'May access data for support and moderation.',
                    ),
                    buildSubSection(
                      title: 'Service Providers',
                      body: 'Render hosts our server, GoDaddy hosts our database, website and images, and Google provides Google Sign-In.',
                    ),
                    buildSubSection(
                      title: 'No Selling of Data',
                      body: 'We never sell, rent or share your information with advertisers or data brokers. We may disclose it only if required by law or by college authorities.',
                    ),
                  ],
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.phonelink_setup_rounded,
                title: '5. App Permissions',
                cardBg: cardBg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    buildSubSection(
                      title: 'Internet Access',
                      body: 'The only permission the app asks for. It does not access your camera, location, contacts, files or photos.',
                    ),
                    buildSubSection(
                      title: 'Copy to Clipboard',
                      body: 'When you tap copy, a team passkey is copied. The app does not read your clipboard.',
                    ),
                    buildSubSection(
                      title: 'Opening Other Apps',
                      body: 'Links can open your email app or browser.',
                    ),
                  ],
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.security_outlined,
                title: '6. Data Security & Retention',
                cardBg: cardBg,
                child: para(
                  'All data travels over HTTPS, passwords are stored only as secure hashes, and sign-in sessions use signed tokens. Each club can see registrations for its own events only. We keep your account, registrations and tickets while your account is active.',
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.delete_outline_rounded,
                title: '7. Account Deletion',
                cardBg: cardBg,
                child: para(
                  'Email spotlightapp.help@gmail.com with the subject "Account Deletion Request" from your registered email and include your USN. Your account, profile, registrations and team memberships are permanently deleted within 7 business days.',
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.gavel_rounded,
                title: '8. Using Spotlight',
                cardBg: cardBg,
                child: para(
                  'Give accurate details; clubs rely on them to verify you. All events are free; venue, timings and entry rules are set by the organizing club, so contact the club about a specific event. Keep your password and team passkeys private. Do not create fake registrations or misuse the platform; we may suspend accounts that do. Spotlight is meant for college students and does not knowingly collect data from children under 13.',
                ),
              ),
              _buildSectionCard(
                context,
                icon: Icons.mail_outline_rounded,
                title: '9. Contact Us',
                cardBg: cardBg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    para('For questions, privacy concerns or deletion requests, email the Spotlight team:'),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.email_outlined, size: 16, color: Sk.of(context).ok),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'spotlightapp.help@gmail.com',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Sk.of(context).ok,
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

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Sk.of(context).line),
        boxShadow: null,
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

}
