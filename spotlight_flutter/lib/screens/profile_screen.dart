import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/theme_provider.dart';
import '../core/auth_provider.dart';
import '../core/user_provider.dart';
import '../core/api_service.dart';
import '../core/saved_events_provider.dart';
import '../core/notification_prefs_provider.dart';
import 'auth_screen.dart';
import 'ticket_screen.dart';
import 'registered_clubs_screen.dart';
import '../core/smooth_route.dart';
import 'package:url_launcher/url_launcher.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  int _eventsCount = 0;
  int _clubsCount = 0;
  bool _statsLoading = true;

  Future<void> _launchPlayStore() async {
    final appId = 'com.example.spotlight_flutter'; // Change this to your production package name once deployed
    final url = Uri.parse('market://details?id=$appId');
    final webUrl = Uri.parse('https://play.google.com/store/apps/details?id=$appId');
    
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(webUrl)) {
        await launchUrl(webUrl, mode: LaunchMode.externalApplication);
      } else {
        throw 'Could not launch store link';
      }
    } catch (e) {
      print('Error launching Play Store: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open Play Store. App is not published yet.')),
        );
      }
    }
  }

  Future<void> _contactSupport() async {
    final userProvider = Provider.of<UserProvider>(context, listen: false);
    final user = userProvider.currentUser;
    final userName = user?.name ?? 'User';
    final userEmail = user?.email ?? 'Unknown Email';
    final userUsn = user?.usn ?? 'N/A';
    
    final Uri emailLaunchUri = Uri(
      scheme: 'mailto',
      path: 'spotlightapp.help@gmail.com',
      query: _encodeQueryParameters(<String, String>{
        'subject': '[Spotlight Support] Help Request',
        'body': 'Hi Spotlight Support,\n\n'
            'I am having an issue with the app. Here are my details:\n'
            '- Name: $userName\n'
            '- Email: $userEmail\n'
            '- USN: $userUsn\n\n'
            'Please describe your issue below:\n'
            '---------------------------------\n'
      }),
    );

    try {
      final launched = await launchUrl(emailLaunchUri, mode: LaunchMode.externalApplication);
      if (!launched) {
        throw 'Could not launch mail app';
      }
    } catch (e) {
      print('Error launching support email: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open email app. Please email support at spotlightapp.help@gmail.com'),
          ),
        );
      }
    }
  }

  String? _encodeQueryParameters(Map<String, String> params) {
    return params.entries
        .map((MapEntry<String, String> e) =>
            '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
        .join('&');
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadStats());
  }

  Future<void> _loadStats() async {
    final userId = Provider.of<UserProvider>(context, listen: false).currentUser?.id;
    if (userId == null) return;
    try {
      final stats = await ApiService().fetchProfileStats(userId);
      if (mounted) {
        setState(() {
          _eventsCount = stats['eventsCount'] ?? 0;
          _clubsCount  = stats['clubsCount'] ?? 0;
          _statsLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _statsLoading = false);
    }
  }

  void _showEditSheet() {
    final userProvider = Provider.of<UserProvider>(context, listen: false);
    final user = userProvider.currentUser;

    final nameController    = TextEditingController(text: user?.name ?? '');
    final usnController     = TextEditingController(text: user?.usn ?? '');
    final branchController  = TextEditingController(text: user?.branch ?? '');
    final phoneController   = TextEditingController(text: user?.phone ?? '');
    final yearController    = TextEditingController(text: user?.year ?? '');
    final semController     = TextEditingController(text: user?.sem ?? '');

    final formKey = GlobalKey<FormState>();
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        final cs = Theme.of(sheetContext).colorScheme;
        final isDark = Theme.of(sheetContext).brightness == Brightness.dark;
        final sheetBg = isDark ? const Color(0xFF1A1A1A) : Colors.white;
        final fieldBg = isDark ? const Color(0xFF2A2A2A) : Colors.grey[100]!;
        final labelColor = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;

        InputDecoration fieldDecoration(String label, {String? hint}) {
          return InputDecoration(
            labelText: label,
            hintText: hint,
            labelStyle: GoogleFonts.inter(color: labelColor, fontSize: 13),
            hintStyle: GoogleFonts.inter(color: labelColor.withOpacity(0.5), fontSize: 14),
            filled: true,
            fillColor: fieldBg,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: cs.primary, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.red, width: 1.5),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.red, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          );
        }

        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: Container(
                decoration: BoxDecoration(
                  color: sheetBg,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                  child: Form(
                    key: formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Handle bar
                        Center(
                          child: Container(
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white24 : Colors.grey[300],
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        Text(
                          'Edit Profile',
                          style: GoogleFonts.inter(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: cs.onBackground,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Changes are saved to your account',
                          style: GoogleFonts.inter(fontSize: 13, color: labelColor),
                        ),
                        const SizedBox(height: 28),

                        // Name
                        TextFormField(
                          controller: nameController,
                          style: GoogleFonts.inter(color: cs.onBackground),
                          decoration: fieldDecoration('Full Name', hint: 'Enter your full name'),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                        ),
                        const SizedBox(height: 16),

                        // USN
                        TextFormField(
                          controller: usnController,
                          style: GoogleFonts.inter(color: cs.onBackground),
                          textCapitalization: TextCapitalization.characters,
                          decoration: fieldDecoration('USN', hint: 'e.g. 4MH23IS001'),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'USN is required';
                            if (v.trim().length < 5) return 'Enter a valid USN';
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        // Branch
                        TextFormField(
                          controller: branchController,
                          style: GoogleFonts.inter(color: cs.onBackground),
                          textCapitalization: TextCapitalization.characters,
                          decoration: fieldDecoration('Branch', hint: 'e.g. ISE, CSE, ECE'),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Branch is required' : null,
                        ),
                        const SizedBox(height: 16),

                        // Year & Sem side by side
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: yearController,
                                style: GoogleFonts.inter(color: cs.onBackground),
                                keyboardType: TextInputType.number,
                                decoration: fieldDecoration('Year', hint: 'e.g. 2'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                controller: semController,
                                style: GoogleFonts.inter(color: cs.onBackground),
                                keyboardType: TextInputType.number,
                                decoration: fieldDecoration('Semester', hint: 'e.g. 4'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Phone
                        TextFormField(
                          controller: phoneController,
                          style: GoogleFonts.inter(color: cs.onBackground),
                          keyboardType: TextInputType.phone,
                          decoration: fieldDecoration('Phone Number', hint: '10-digit number'),
                          validator: (v) {
                            if (v != null && v.isNotEmpty && v.length != 10) {
                              return 'Must be 10 digits';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 32),

                        // Save button
                        SizedBox(
                          width: double.infinity,
                          height: 54,
                          child: ElevatedButton(
                            onPressed: isSaving
                                ? null
                                : () async {
                                    if (!formKey.currentState!.validate()) return;

                                    // ── Step 1: ask for password confirmation ──
                                    final confirmed = await _showPasswordConfirmDialog(
                                      context,
                                      user!.id,
                                      isDark,
                                      cs,
                                    );
                                    if (!confirmed) return;

                                    // ── Step 2: save to DB ──
                                    setSheetState(() => isSaving = true);

                                    try {
                                      final apiService = ApiService();
                                      final updatedUser = await apiService.editProfile(
                                        userId: user.id,
                                        name: nameController.text.trim(),
                                        usn: usnController.text.trim().toUpperCase(),
                                        branch: branchController.text.trim().toUpperCase(),
                                        phone: phoneController.text.trim(),
                                        year: yearController.text.trim(),
                                        sem: semController.text.trim(),
                                      );

                                      if (updatedUser != null) {
                                        userProvider.setCurrentUser(updatedUser);
                                      }

                                      if (context.mounted) Navigator.pop(context);
                                    } catch (e) {
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Error: $e'),
                                            backgroundColor: Colors.red,
                                          ),
                                        );
                                      }
                                    } finally {
                                      setSheetState(() => isSaving = false);
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: cs.primary,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 0,
                            ),
                            child: isSaving
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : Text(
                                    'Save Changes',
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  /// Shows a password confirmation dialog. Returns true if password is verified.
  Future<bool> _showPasswordConfirmDialog(
    BuildContext context,
    String userId,
    bool isDark,
    ColorScheme cs,
  ) async {
    final passwordController = TextEditingController();
    bool obscure = true;
    bool isVerifying = false;
    String? errorText;

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        final fieldBg = isDark ? const Color(0xFF2A2A2A) : Colors.grey[100]!;

        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: cs.primary.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.lock_outline, color: cs.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Confirm Password',
                    style: GoogleFonts.inter(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: cs.onBackground,
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Enter your current password to save changes.',
                    style: GoogleFonts.inter(fontSize: 14, color: isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: passwordController,
                    obscureText: obscure,
                    autofocus: true,
                    style: GoogleFonts.inter(color: cs.onBackground),
                    decoration: InputDecoration(
                      hintText: 'Enter password',
                      hintStyle: GoogleFonts.inter(
                        color: (isDark ? const Color(0xFFA0A0A0) : Colors.grey[500]!).withOpacity(0.6),
                      ),
                      filled: true,
                      fillColor: fieldBg,
                      errorText: errorText,
                      errorStyle: GoogleFonts.inter(color: Colors.red, fontSize: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: errorText != null
                            ? const BorderSide(color: Colors.red, width: 1.5)
                            : BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(
                          color: errorText != null ? Colors.red : cs.primary,
                          width: 1.5,
                        ),
                      ),
                      suffixIcon: IconButton(
                        icon: Icon(
                          obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          color: isDark ? const Color(0xFFA0A0A0) : Colors.grey[500],
                          size: 20,
                        ),
                        onPressed: () => setDialogState(() => obscure = !obscure),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    onSubmitted: (_) async {
                      if (passwordController.text.isEmpty) {
                        setDialogState(() => errorText = 'Password cannot be empty');
                        return;
                      }
                      setDialogState(() { isVerifying = true; errorText = null; });
                      try {
                        await ApiService().verifyPassword(userId: userId, password: passwordController.text);
                        if (dialogContext.mounted) Navigator.pop(dialogContext, true);
                      } catch (e) {
                        setDialogState(() {
                          isVerifying = false;
                          errorText = 'Incorrect password';
                        });
                      }
                    },
                  ),
                ],
                ), // Column
              ), // SingleChildScrollView
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext, false),
                  child: Text('Cancel', style: GoogleFonts.inter(color: isDark ? const Color(0xFFA0A0A0) : Colors.grey[600])),
                ),
                ElevatedButton(
                  onPressed: isVerifying
                      ? null
                      : () async {
                          if (passwordController.text.isEmpty) {
                            setDialogState(() => errorText = 'Password cannot be empty');
                            return;
                          }
                          setDialogState(() { isVerifying = true; errorText = null; });
                          try {
                            await ApiService().verifyPassword(userId: userId, password: passwordController.text);
                            if (dialogContext.mounted) Navigator.pop(dialogContext, true);
                          } catch (e) {
                            setDialogState(() {
                              isVerifying = false;
                              errorText = 'Incorrect password';
                            });
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: cs.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  child: isVerifying
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text('Confirm', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );

    return result == true;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;
    final dividerColor = isDark ? Colors.white12 : Colors.grey[200]!;
    // cardTheme.color: white in light (pops off #F9F9F9 scaffold), #1E1E1E in dark
    final tileColor = Theme.of(context).cardTheme.color ?? surfaceColor;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──────────────────────────────────────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: cs.primary,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    alignment: Alignment.center,
                    child: Consumer<UserProvider>(
                      builder: (context, userProvider, child) {
                        final name = userProvider.currentUser?.name ?? '';
                        final initials = name.trim().isEmpty
                            ? '?'
                            : name.trim().split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase();
                        return Text(initials,
                            style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.bold));
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(Provider.of<UserProvider>(context).currentUser?.name ?? "User",
                            style: GoogleFonts.inter(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: cs.onBackground)),
                        const SizedBox(height: 4),
                        Text(Provider.of<UserProvider>(context).currentUser?.email ?? "Not logged in",
                            style: GoogleFonts.inter(
                                fontSize: 13, color: subText)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF2A2A2A)
                                : Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Consumer<UserProvider>(
                            builder: (context, up, _) {
                              final u = up.currentUser;
                              if (u == null) return const SizedBox.shrink();
                              final parts = <String>[
                                if (u.branch != null && u.branch!.isNotEmpty) u.branch!,
                                if (u.usn != null && u.usn!.isNotEmpty) u.usn!,
                                if (u.year != null && u.year!.isNotEmpty) 'Year ${u.year}',
                                if (u.sem != null && u.sem!.isNotEmpty) 'Sem ${u.sem}',
                              ];
                              return Text(
                                parts.isEmpty ? 'Incomplete Profile' : parts.join(' · '),
                                style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: subText),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: _showEditSheet,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF2A2A2A)
                            : Colors.grey[100],
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text('Edit',
                          style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: cs.onBackground)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ── USN Card ─────────────────────────────────────
              Consumer<UserProvider>(
                builder: (context, userProvider, child) {
                  final usn = userProvider.currentUser?.usn;
                  final hasUsn = usn != null && usn.isNotEmpty;
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E1E1E) : Colors.grey[100],
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('USN',
                                style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: subText)),
                            const SizedBox(height: 4),
                            Text(
                              hasUsn ? usn : 'Not set',
                              style: GoogleFonts.inter(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: hasUsn ? cs.onBackground : subText),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: hasUsn ? cs.primary : (isDark ? const Color(0xFF2A2A2A) : Colors.grey[300]),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                hasUsn ? Icons.check : Icons.pending_outlined,
                                color: Colors.white,
                                size: 16,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                hasUsn ? 'Verified' : 'Pending',
                                style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),

              // ── Stats Row ─────────────────────────────────────
              Consumer<SavedEventsProvider>(
                builder: (context, savedProvider, _) {
                  final savedCount = savedProvider.savedEventIds.length;
                  return Row(
                    children: [
                      _buildStatCard(
                        context,
                        Icons.workspace_premium_outlined,
                        _statsLoading ? '—' : '$_eventsCount',
                        'Events',
                        onTap: () => Navigator.push(
                          context,
                          SmoothRoute(
                            builder: (_) => const TicketScreen(initialTab: 0),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      _buildStatCard(
                        context,
                        Icons.bookmark_border,
                        '$savedCount',
                        'Saved',
                        onTap: () => Navigator.push(
                          context,
                          SmoothRoute(
                            builder: (_) => const TicketScreen(initialTab: 1),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      _buildStatCard(
                        context,
                        Icons.people_outline,
                        _statsLoading ? '—' : '$_clubsCount',
                        'Clubs',
                        onTap: () => Navigator.push(
                          context,
                          SmoothRoute(
                            builder: (_) => const RegisteredClubsScreen(),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 32),

              // ── Preferences ───────────────────────────────────
              Text('PREFERENCES',
                  style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                      color: subText)),
              const SizedBox(height: 16),
              _buildListTile(context, Icons.notifications_outlined,
                  'Notifications',
                  trailingText: context.watch<NotificationPrefsProvider>().enabled ? 'On' : 'Off',
                  tileColor: tileColor,
                  onTap: () => context.read<NotificationPrefsProvider>().toggle()),
              _buildListTile(context, Icons.dark_mode_outlined, 'Dark Mode',
                  trailingText:
                      context.watch<ThemeProvider>().isDarkMode ? 'On' : 'Off',
                  tileColor: tileColor,
                  onTap: () =>
                      context.read<ThemeProvider>().toggleDarkMode()),
              _buildListTile(
                context,
                Icons.star_outline_rounded,
                'Rate Us',
                tileColor: tileColor,
                onTap: _launchPlayStore,
              ),
              const SizedBox(height: 32),

              // ── Support ───────────────────────────────────────
              Text('SUPPORT',
                  style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                      color: subText)),
              const SizedBox(height: 16),
              _buildListTile(
                context,
                Icons.help_outline,
                'Help Center',
                tileColor: tileColor,
                onTap: _contactSupport,
              ),
              const SizedBox(height: 32),

              // ── Sign Out ───────────────────────────────────────
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    await context.read<AuthProvider>().logout();
                    if (context.mounted) {
                      Navigator.pushAndRemoveUntil(
                        context,
                        SmoothRoute(builder: (_) => const AuthScreen()),
                        (route) => false,
                      );
                    }
                  },
                  icon: const Icon(Icons.logout_rounded,
                      size: 20, color: Color(0xFFD90429)),
                  label: Text('Sign Out',
                      style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFFD90429))),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).cardTheme.color,
                    elevation: 0,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(
      BuildContext context, IconData icon, String count, String label,
      {VoidCallback? onTap}) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
                color: isDark ? Colors.white12 : Colors.grey.shade200),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2A2A2A) : Colors.grey[100],
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: cs.primary, size: 20),
              ),
              const SizedBox(height: 12),
              Text(count,
                  style: GoogleFonts.inter(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: cs.onBackground)),
              const SizedBox(height: 4),
              Text(label,
                  style: GoogleFonts.inter(
                      fontSize: 12,
                      color: isDark
                          ? const Color(0xFFA0A0A0)
                          : Colors.grey[500])),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildListTile(
    BuildContext context,
    IconData icon,
    String title, {
    String? trailingText,
    Color? tileColor,
    VoidCallback? onTap,
  }) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[500]!;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: tileColor,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(icon, color: cs.onBackground, size: 24),
            const SizedBox(width: 16),
            Expanded(
              child: Text(title,
                  style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: cs.onBackground)),
            ),
            if (trailingText != null)
              Text(trailingText,
                  style: GoogleFonts.inter(
                      fontSize: 14,
                      color: subText,
                      fontWeight: FontWeight.w500)),
            if (trailingText != null) const SizedBox(width: 8),
            Icon(Icons.chevron_right, color: subText, size: 20),
          ],
        ),
      ),
    );
  }
}
