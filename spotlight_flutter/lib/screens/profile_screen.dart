import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import 'privacy_policy_screen.dart';
import '../core/smooth_route.dart';
import '../core/custom_toast.dart';
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
    final appId = 'com.example.spotlight_flutter'; 
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
        showSpotlightToast(
          context,
          'Could not open Play Store. App is not published yet.',
          isError: true,
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
        showSpotlightToast(
          context,
          'Could not open email app. Please email support at spotlightapp.help@gmail.com',
          isError: true,
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

    final initialName   = user?.name ?? '';
    final initialUsn    = user?.usn ?? '';
    final initialBranch = user?.branch ?? '';
    final initialPhone  = user?.phone ?? '';
    final initialYear   = user?.year ?? '';
    final initialSem    = user?.sem ?? '';

    final nameController    = TextEditingController(text: initialName);
    final usnController     = TextEditingController(text: initialUsn);
    final branchController  = TextEditingController(text: initialBranch);
    final phoneController   = TextEditingController(text: initialPhone);
    final yearController    = TextEditingController(text: initialYear);
    final semController     = TextEditingController(text: initialSem);

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

        InputDecoration fieldDecoration(String label, {String? hint, String? helperText}) {
          return InputDecoration(
            labelText: label,
            hintText: hint,
            helperText: helperText,
            helperStyle: GoogleFonts.inter(color: Colors.amber[800], fontSize: 11, fontWeight: FontWeight.w500),
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
            disabledBorder: OutlineInputBorder(
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

        final bool hasUsnSet = user?.usn != null && user!.usn!.isNotEmpty;

        return StatefulBuilder(
          builder: (context, setSheetState) {
            void notifyChanged() => setSheetState(() {});

            nameController.removeListener(notifyChanged);
            nameController.addListener(notifyChanged);

            usnController.removeListener(notifyChanged);
            usnController.addListener(notifyChanged);

            branchController.removeListener(notifyChanged);
            branchController.addListener(notifyChanged);

            phoneController.removeListener(notifyChanged);
            phoneController.addListener(notifyChanged);

            yearController.removeListener(notifyChanged);
            yearController.addListener(notifyChanged);

            semController.removeListener(notifyChanged);
            semController.addListener(notifyChanged);

            final bool hasChanges =
                nameController.text.trim() != initialName.trim() ||
                (!hasUsnSet && usnController.text.trim().toUpperCase() != initialUsn.trim().toUpperCase()) ||
                branchController.text.trim().toUpperCase() != initialBranch.trim().toUpperCase() ||
                phoneController.text.trim() != initialPhone.trim() ||
                yearController.text.trim() != initialYear.trim() ||
                semController.text.trim() != initialSem.trim();
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

                        TextFormField(
                          controller: nameController,
                          style: GoogleFonts.inter(color: cs.onBackground),
                          decoration: fieldDecoration('Full Name', hint: 'Enter your full name'),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                        ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: usnController,
                          enabled: !hasUsnSet,
                          style: GoogleFonts.inter(color: hasUsnSet ? labelColor : cs.onBackground),
                          textCapitalization: TextCapitalization.characters,
                          decoration: fieldDecoration(
                            'USN',
                            hint: hasUsnSet ? 'USN is locked' : 'e.g. 4MH23IS001',
                            helperText: hasUsnSet ? '🔒 USN cannot be edited once set' : 'Note: USN cannot be edited once set',
                          ),
                          validator: (v) {
                            if (!hasUsnSet) {
                              if (v == null || v.trim().isEmpty) return 'USN is required';
                              if (v.trim().length < 5) return 'Enter a valid USN';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: branchController,
                          style: GoogleFonts.inter(color: cs.onBackground),
                          textCapitalization: TextCapitalization.characters,
                          decoration: fieldDecoration('Branch', hint: 'e.g. ISE, CSE, ECE'),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Branch is required' : null,
                        ),
                        const SizedBox(height: 16),

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

                        SizedBox(
                          width: double.infinity,
                          height: 54,
                          child: ElevatedButton(
                            onPressed: (isSaving || !hasChanges)
                                ? null
                                : () async {
                                    if (!formKey.currentState!.validate()) return;

                                    final confirmed = await _showPasswordConfirmDialog(
                                      context,
                                      user!.id,
                                      isDark,
                                      cs,
                                    );
                                    if (!confirmed) return;

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

                                      if (context.mounted) {
                                        Navigator.pop(context);
                                        showSpotlightToast(
                                          context,
                                          'Changes saved',
                                          icon: Icons.check_circle_rounded,
                                        );
                                      }
                                    } catch (e) {
                                      if (context.mounted) {
                                        showSpotlightToast(
                                          context,
                                          'Failed to update profile: $e',
                                          isError: true,
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
                ), 
              ), 
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

    final tileColor = Theme.of(context).cardTheme.color ?? surfaceColor;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 72,
                    height: 72,
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
                                fontSize: 28,
                                fontWeight: FontWeight.bold));
                      },
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(
                              child: Text(
                                Provider.of<UserProvider>(context).currentUser?.name ?? "User",
                                style: GoogleFonts.inter(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: cs.onBackground,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: _showEditSheet,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF2A2A2A) : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: isDark ? null : Border.all(color: Colors.grey.shade300, width: 1),
                                  boxShadow: isDark ? null : [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.06),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Text(
                                  'Edit',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: cs.onBackground,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          Provider.of<UserProvider>(context).currentUser?.email ?? "Not logged in",
                          style: GoogleFonts.inter(fontSize: 12, color: subText),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

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

              Text('ACADEMIC PROFILE',
                  style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                      color: subText)),
              const SizedBox(height: 16),
              Consumer<UserProvider>(
                builder: (context, up, _) {
                  final u = up.currentUser;
                  final usn = (u?.usn != null && u!.usn!.isNotEmpty) ? u.usn! : 'Not set';
                  final branch = (u?.branch != null && u!.branch!.isNotEmpty) ? u.branch! : 'Not set';
                  final year = (u?.year != null && u!.year!.isNotEmpty) ? 'Year ${u.year}' : 'Not set';
                  final sem = (u?.sem != null && u!.sem!.isNotEmpty) ? 'Sem ${u.sem}' : 'Not set';

                  return Column(
                    children: [
                      _buildListTile(context, Icons.badge_outlined, 'USN', trailingText: usn, tileColor: tileColor),
                      _buildListTile(context, Icons.school_outlined, 'Branch', trailingText: branch, tileColor: tileColor),
                      _buildListTile(context, Icons.calendar_today_outlined, 'Academic Year', trailingText: year, tileColor: tileColor),
                      _buildListTile(context, Icons.auto_stories_outlined, 'Semester', trailingText: sem, tileColor: tileColor),
                    ],
                  );
                },
              ),
              const SizedBox(height: 32),

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
              _buildListTile(
                context,
                Icons.privacy_tip_outlined,
                'Privacy Policy',
                tileColor: tileColor,
                onTap: () => Navigator.push(
                  context,
                  SmoothRoute(builder: (_) => const PrivacyPolicyScreen()),
                ),
              ),
              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    await context.read<AuthProvider>().logout();
                    if (context.mounted) {
                      await context.read<SavedEventsProvider>().clear();
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
                    elevation: isDark ? 0 : 3,
                    shadowColor: isDark ? Colors.transparent : Colors.black.withOpacity(0.1),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: isDark
                            ? BorderSide.none
                            : BorderSide(
                                color: Colors.grey.shade200,
                                width: 1.0,
                              )),
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
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
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
          border: isDark
              ? null
              : Border.all(
                  color: Colors.grey.shade200,
                  width: 1.0,
                ),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.07),
                    blurRadius: 14,
                    offset: const Offset(0, 5),
                  ),
                ],
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
            if (onTap != null) ...[
              if (trailingText != null) const SizedBox(width: 8),
              Icon(Icons.chevron_right, color: subText, size: 20),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildThemeTag(BuildContext context, String label, String value, bool isDark, ColorScheme cs) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 9,
            fontWeight: FontWeight.w800,
            color: cs.primary,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: cs.onBackground,
          ),
        ),
      ],
    );
  }
}
