import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/api_service.dart';
import '../core/user_provider.dart';
import '../core/smooth_route.dart';
import '../core/custom_toast.dart';
import '../core/saved_events_provider.dart';
import '../core/events_provider.dart';
import '../core/notifications_provider.dart';
import 'payment_screen.dart';

enum RegistrationType { solo, createTeam, joinTeam }

class RegisterScreen extends StatefulWidget {
  final String eventId;
  final String eventName;
  final double price;
  final String? qrUrl;
  final String? eventType;
  final int? teamSizeLimit;
  final String? upiId;

  const RegisterScreen({
    super.key,
    required this.eventId,
    required this.eventName,
    this.price = 0,
    this.qrUrl,
    this.eventType = 'Solo',
    this.teamSizeLimit,
    this.upiId,
  });

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  RegistrationType _selectedType = RegistrationType.solo;
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _usnController = TextEditingController();
  final _phoneController = TextEditingController();
  final _teamNameController = TextEditingController();
  final _passkeyController = TextEditingController();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.eventType == 'Team') {
      _selectedType = RegistrationType.createTeam;
    } else {
      _selectedType = RegistrationType.solo;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = Provider.of<UserProvider>(context, listen: false).currentUser;
      if (user != null) {
        if (_nameController.text.isEmpty && user.name.isNotEmpty) {
          _nameController.text = user.name;
        }
        if (_usnController.text.isEmpty && (user.usn?.isNotEmpty ?? false)) {
          _usnController.text = user.usn!;
        }
        if (_phoneController.text.isEmpty && (user.phone?.isNotEmpty ?? false)) {
          _phoneController.text = user.phone!;
        }
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final apiService = ApiService();
      String? registrationId;
      String? referenceCode;

      if (_selectedType == RegistrationType.solo) {
        final regId = await apiService.registerSolo(
          eventId: widget.eventId,
          name: _nameController.text.trim(),
          usn: _usnController.text.trim(),
        );
        registrationId = regId;
        referenceCode = regId;
      } else if (_selectedType == RegistrationType.createTeam) {
        final result = await apiService.createTeam(
          eventId: widget.eventId,
          teamName: _teamNameController.text.trim(),
          leaderUsn: _usnController.text.trim(),
        );
        final passkey = result['passkey'] ?? '';
        final regId = result['registrationId']!;
        registrationId = regId;
        referenceCode = passkey.isNotEmpty ? passkey : regId;

        if (mounted) {
          if (passkey.isNotEmpty) {
            await showDialog(
              context: context,
              barrierDismissible: false,
              builder: (dialogContext) => AlertDialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                title: const Text('Team Created!'),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Share this passkey with your teammates:'),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: passkey));
                        showSpotlightToast(
                          context,
                          'Passkey copied to clipboard!',
                          icon: Icons.copy_rounded,
                        );
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              passkey,
                              style: GoogleFonts.inter(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 4,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Icon(
                              Icons.copy_rounded,
                              color: Theme.of(context).colorScheme.primary,
                              size: 22,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tap to copy passkey',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: const Text('Got it'),
                  ),
                ],
              ),
            );
          } else {
            await showDialog(
              context: context,
              barrierDismissible: false,
              builder: (dialogContext) => AlertDialog(
                backgroundColor: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF141416) : Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                title: const Text('Team Created!'),
                content: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Your team has been created. Next, submit your payment details to receive your Team Passkey.'),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(dialogContext),
                    child: const Text('Proceed to Payment'),
                  ),
                ],
              ),
            );
          }
        }
      } else {
        await apiService.joinTeam(
          eventId: widget.eventId,
          passkey: _passkeyController.text.trim(),
        );
      }

      if (mounted) {
        if (widget.price > 0 && _selectedType != RegistrationType.joinTeam) {
          Navigator.pushReplacement(
            context,
            SmoothRoute(
              builder: (_) => PaymentScreen(
                eventName: widget.eventName,
                price: widget.price,
                qrUrl: widget.qrUrl,
                registrationId: registrationId!,
                referenceCode: referenceCode!,
                upiId: widget.upiId,
                teamSizeLimit: widget.teamSizeLimit,
              ),
            ),
          );
        } else {
          try {
            Provider.of<SavedEventsProvider>(context, listen: false).load();
            Provider.of<EventsProvider>(context, listen: false).loadEvents();
            Provider.of<NotificationsProvider>(context, listen: false).load();
          } catch (_) {}

          showSpotlightToast(
            context,
            'Registration submitted successfully!',
            icon: Icons.check_circle_rounded,
          );
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
      }
    } catch (e) {
      if (mounted) {
        showSpotlightToast(
          context,
          '$e',
          isError: true,
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final warningBg = isDark ? const Color(0xFF141416) : Colors.red[50]!;
    final warningText = isDark ? const Color(0xFFA0A0A0) : Colors.grey[700]!;

    return Scaffold(
      appBar: AppBar(
        title: Text('Register', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [

                  if (widget.eventType == 'Team') ...[
                    Container(
                      height: 54,
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF141416) : Colors.grey[200],
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedType = RegistrationType.createTeam;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                decoration: BoxDecoration(
                                  color: _selectedType == RegistrationType.createTeam
                                      ? cs.primary
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  'Create Team',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: _selectedType == RegistrationType.createTeam
                                        ? Colors.white
                                        : (isDark ? Colors.grey[400] : Colors.grey[700]),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedType = RegistrationType.joinTeam;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                decoration: BoxDecoration(
                                  color: _selectedType == RegistrationType.joinTeam
                                      ? cs.primary
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  'Join Team',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: _selectedType == RegistrationType.joinTeam
                                        ? Colors.white
                                        : (isDark ? Colors.grey[400] : Colors.grey[700]),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],

                  if (_selectedType == RegistrationType.solo) ...[
                    _buildTextField(
                      controller: _nameController,
                      label: 'Full Name',
                      hint: 'Full name from profile',
                      enabled: false,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _usnController,
                      label: 'USN',
                      hint: 'USN from profile',
                      enabled: false,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _phoneController,
                      label: 'Phone Number',
                      hint: 'Phone number from profile',
                      enabled: false,
                    ),
                  ] else if (_selectedType == RegistrationType.createTeam) ...[
                    _buildTextField(
                      controller: _teamNameController,
                      label: 'Team Name',
                      hint: 'Enter team name',
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Team name is required' : null,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _usnController,
                      label: 'Your USN',
                      hint: 'USN from profile',
                      enabled: false,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _phoneController,
                      label: 'Phone Number',
                      hint: 'Phone number from profile',
                      enabled: false,
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: warningBg,
                        borderRadius: BorderRadius.circular(16),
                        border: isDark ? null : Border.all(color: Colors.red[100]!),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary, size: 22),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              'A unique passkey will be generated after you submit. Share it with your teammates. ${widget.teamSizeLimit != null ? 'Team size limit is ${widget.teamSizeLimit} members.' : ''}',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: warningText,
                                height: 1.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    _buildTextField(
                      controller: _passkeyController,
                      label: 'Team Passkey',
                      hint: 'Enter 5-character passkey',
                      validator: (v) => (v == null || v.trim().length != 5) ? 'Passkey must be 5 characters' : null,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _phoneController,
                      label: 'Phone Number',
                      hint: 'Phone number from profile',
                      enabled: false,
                    ),
                  ],

                  const SizedBox(height: 40),

                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: cs.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    child: Text('Confirm Registration', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ],
              ),
            ),
          ),

          if (_isSubmitting)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    bool enabled = true,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textSecondary = isDark ? const Color(0xFFA09B9B) : Colors.grey[600]!;
    return TextFormField(
      controller: controller,
      enabled: enabled,
      keyboardType: keyboardType,
      validator: validator,
      style: GoogleFonts.inter(
        color: enabled 
            ? (isDark ? Colors.white : Colors.black)
            : (isDark ? Colors.white54 : Colors.grey[600]),
      ),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        suffixIcon: !enabled
            ? Icon(Icons.lock_outline, size: 18, color: textSecondary)
            : null,
        labelStyle: GoogleFonts.inter(color: textSecondary),
        hintStyle: GoogleFonts.inter(color: textSecondary.withOpacity(0.6)),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        filled: true,
        fillColor: enabled
            ? (isDark ? const Color(0xFF1E1E22) : Colors.grey[100]!)
            : (isDark ? const Color(0xFF141416) : Colors.grey[200]!),
      ),
    );
  }
}
