import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/api_service.dart';
import '../core/user_provider.dart';
import '../models/models.dart';
import '../widgets/custom_image.dart';

class RegisteredClubsScreen extends StatefulWidget {
  const RegisteredClubsScreen({super.key});

  @override
  State<RegisteredClubsScreen> createState() => _RegisteredClubsScreenState();
}

class _RegisteredClubsScreenState extends State<RegisteredClubsScreen> {
  List<ClubModel> _clubs = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final userId =
          Provider.of<UserProvider>(context, listen: false).currentUser?.id;
      if (userId == null) throw AppException('Not logged in');

      final tickets = await ApiService().fetchUserTickets();
      final seen = <String>{};
      final clubs = <ClubModel>[];
      for (final t in tickets) {
        final clubId = t.event?.clubId ?? t.event?.clubName;
        final clubName = t.event?.clubName;
        final clubLogoUrl = t.event?.clubLogoUrl;
        if (clubId != null && clubId.isNotEmpty && seen.add(clubId)) {
          clubs.add(ClubModel(
            id: clubId,
            name: clubName ?? 'Unknown Club',
            logoUrl: clubLogoUrl,
          ));
        }
      }
      if (mounted) setState(() { _clubs = clubs; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;

    return Scaffold(
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
                  Text('My Clubs',
                      style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: cs.onBackground,
                          letterSpacing: -0.5)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text('Clubs you\'ve registered events with',
                  style: GoogleFonts.inter(fontSize: 13, color: subText)),
            ),
            const SizedBox(height: 20),

            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.wifi_off_rounded,
                                  size: 48, color: Colors.grey[400]),
                              const SizedBox(height: 12),
                              Text('Could not load clubs',
                                  style: GoogleFonts.inter(
                                      fontWeight: FontWeight.bold, fontSize: 16)),
                              const SizedBox(height: 8),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                                child: Text(
                                    (_error != null &&
                                            (_error!.toLowerCase().contains('socketexception') ||
                                                _error!.toLowerCase().contains('connection') ||
                                                _error!.toLowerCase().contains('timeout') ||
                                                _error!.toLowerCase().contains('clientexception')))
                                        ? 'Please check your internet connection and try again.'
                                        : (_error ?? ''),
                                    style: GoogleFonts.inter(color: Colors.grey, fontSize: 12),
                                    textAlign: TextAlign.center),
                              ),
                              const SizedBox(height: 24),
                              ElevatedButton(
                                  onPressed: _load,
                                  child: const Text('Retry')),
                            ],
                          ),
                        )
                      : _clubs.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.groups_outlined,
                                      size: 56, color: Colors.grey[300]),
                                  const SizedBox(height: 16),
                                  Text('No clubs yet',
                                      style: GoogleFonts.inter(
                                          color: Colors.grey,
                                          fontSize: 16,
                                          fontWeight: FontWeight.w500)),
                                  const SizedBox(height: 8),
                                  Text(
                                      'Register for events to see clubs here',
                                      style: GoogleFonts.inter(
                                          color: Colors.grey[400],
                                          fontSize: 13)),
                                ],
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                              itemCount: _clubs.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 12),
                              itemBuilder: (context, i) =>
                                  _buildClubTile(_clubs[i]),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClubTile(ClubModel club) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
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
              color: isDark ? const Color(0xFF2A2A2A) : Colors.grey[100],
              shape: BoxShape.circle,
              border: Border.all(
                  color: isDark ? Colors.white12 : Colors.grey[200]!),
            ),
            child: (club.logoUrl != null &&
                    club.logoUrl!.isNotEmpty &&
                    club.logoUrl !=
                        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3')
                ? ClipOval(
                    child: CustomImage(url: club.logoUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Icon(
                            Icons.groups_outlined,
                            color: subText)),
                  )
                : Icon(Icons.groups_outlined, color: subText),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(club.name,
                style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: cs.onBackground)),
          ),
          Icon(Icons.chevron_right, color: subText),
        ],
      ),
    );
  }
}
