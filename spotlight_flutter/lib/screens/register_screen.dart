import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/api_service.dart';
import '../core/smooth_route.dart';
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
        final passkey = result['passkey']!;
        final regId = result['registrationId']!;
        registrationId = regId;
        referenceCode = passkey;

        if (mounted) {
          await showDialog(
            context: context,
            barrierDismissible: false,
            builder: (_) => AlertDialog(
              title: const Text('Team Created!'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Share this passkey with your teammates:'),
                  const SizedBox(height: 16),
                  Text(
                    passkey,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 4,
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Got it'),
                ),
              ],
            ),
          );
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
              ),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Registration successful!')),
          );
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
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
    final warningBg = isDark ? const Color(0xFF161414) : Colors.red[50]!;
    final warningText = isDark ? const Color(0xFFA09B9B) : Colors.grey[700]!;
    final warningBorder = isDark ? Colors.white.withOpacity(0.05) : Colors.red[100]!;

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
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedType = RegistrationType.createTeam;
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              decoration: BoxDecoration(
                                color: _selectedType == RegistrationType.createTeam
                                    ? Theme.of(context).colorScheme.primary
                                    : (isDark ? const Color(0xFF1E1C1C) : Colors.grey[200]!),
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(12),
                                  bottomLeft: Radius.circular(12),
                                ),
                                border: Border.all(
                                  color: _selectedType == RegistrationType.createTeam
                                      ? Theme.of(context).colorScheme.primary
                                      : (isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.08)),
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  'Create Team',
                                  style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: _selectedType == RegistrationType.createTeam
                                        ? Colors.white
                                        : (isDark ? Colors.white70 : Colors.black87),
                                  ),
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
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              decoration: BoxDecoration(
                                color: _selectedType == RegistrationType.joinTeam
                                    ? Theme.of(context).colorScheme.primary
                                    : (isDark ? const Color(0xFF1E1C1C) : Colors.grey[200]!),
                                borderRadius: const BorderRadius.only(
                                  topRight: Radius.circular(12),
                                  bottomRight: Radius.circular(12),
                                ),
                                border: Border.all(
                                  color: _selectedType == RegistrationType.joinTeam
                                      ? Theme.of(context).colorScheme.primary
                                      : (isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.08)),
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  'Join Team',
                                  style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: _selectedType == RegistrationType.joinTeam
                                        ? Colors.white
                                        : (isDark ? Colors.white70 : Colors.black87),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                  ],

                  if (_selectedType == RegistrationType.solo) ...[
                    _buildTextField(
                      controller: _nameController,
                      label: 'Full Name',
                      hint: 'Enter your full name',
                      validator: (v) => v!.isEmpty ? 'Name is required' : null,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _usnController,
                      label: 'USN',
                      hint: 'Enter your USN',
                      validator: (v) => v!.isEmpty ? 'USN is required' : null,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _phoneController,
                      label: 'Phone Number',
                      hint: 'Enter 10 digit phone number',
                      keyboardType: TextInputType.phone,
                      validator: (v) => v!.length != 10 ? 'Enter valid 10 digit number' : null,
                    ),
                  ] else if (_selectedType == RegistrationType.createTeam) ...[
                    _buildTextField(
                      controller: _teamNameController,
                      label: 'Team Name',
                      hint: 'Enter team name',
                      validator: (v) => v!.isEmpty ? 'Team name is required' : null,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _usnController,
                      label: 'Your USN',
                      hint: 'Enter your USN',
                      validator: (v) => v!.isEmpty ? 'USN is required' : null,
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: warningBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: warningBorder),
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
                      validator: (v) => v!.length != 5 ? 'Passkey must be 5 characters' : null,
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
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textSecondary = isDark ? const Color(0xFFA09B9B) : Colors.grey[600]!;
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      validator: validator,
      style: GoogleFonts.inter(color: isDark ? Colors.white : Colors.black),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle: GoogleFonts.inter(color: textSecondary),
        hintStyle: GoogleFonts.inter(color: textSecondary.withOpacity(0.6)),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        filled: true,
        fillColor: isDark ? const Color(0xFF1E1C1C) : Colors.grey[100]!,
      ),
    );
  }
}
