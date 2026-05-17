import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/api_service.dart';
import '../core/user_provider.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usnController = TextEditingController();
  final _phoneController = TextEditingController();
  String? _selectedBranch;
  bool _isLoading = false;

  final List<String> _branches = ['CS', 'IS', 'EC', 'ME', 'CV', 'EE', 'AI', 'BT'];

  Future<void> _completeSetup() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final userProvider = Provider.of<UserProvider>(context, listen: false);
      final apiService = ApiService();
      
      final updatedUser = await apiService.updateProfile(
        clerkUserId: userProvider.currentUser!.id,
        usn: _usnController.text.trim().toUpperCase(),
        branch: _selectedBranch!,
        phone: _phoneController.text.trim(),
      );

      if (updatedUser != null) {
        userProvider.setCurrentUser(updatedUser);
        if (mounted) {
          Navigator.pushReplacementNamed(context, '/main');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    
    return Scaffold(
      body: Container(
        height: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: SingleChildScrollView(
          child: SafeArea(
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 60),
                  Text(
                    'Welcome to\nSpotlight!',
                    style: GoogleFonts.inter(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: cs.onBackground,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    "Let's complete your profile to get started.",
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 48),
                  
                  // USN Field
                  _buildLabel('USN'),
                  TextFormField(
                    controller: _usnController,
                    style: GoogleFonts.inter(color: cs.onBackground),
                    textCapitalization: TextCapitalization.characters,
                    decoration: _buildInputDecoration('e.g. 1RI22CS000'),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'USN is required';
                      if (v.length < 5) return 'Enter a valid USN';
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // Branch Field
                  _buildLabel('Branch'),
                  DropdownButtonFormField<String>(
                    value: _selectedBranch,
                    dropdownColor: Theme.of(context).cardColor,
                    style: GoogleFonts.inter(color: cs.onBackground),
                    decoration: _buildInputDecoration('Select your branch'),
                    items: _branches.map((b) => DropdownMenuItem(
                      value: b,
                      child: Text(b),
                    )).toList(),
                    onChanged: (v) => setState(() => _selectedBranch = v),
                    validator: (v) => v == null ? 'Branch is required' : null,
                  ),
                  const SizedBox(height: 24),

                  // Phone Field
                  _buildLabel('Phone Number'),
                  TextFormField(
                    controller: _phoneController,
                    style: GoogleFonts.inter(color: cs.onBackground),
                    keyboardType: TextInputType.phone,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
                    decoration: _buildInputDecoration('10-digit number'),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Phone number is required';
                      if (v.length != 10) return 'Must be 10 digits';
                      return null;
                    },
                  ),
                  
                  const SizedBox(height: 60),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _completeSetup,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: cs.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _isLoading 
                        ? const CircularProgressIndicator(color: Colors.white)
                        : Text(
                            'Complete Setup',
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
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Colors.grey[400],
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(color: Colors.grey[600]),
      filled: true,
      fillColor: Theme.of(context).cardColor,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }
}
