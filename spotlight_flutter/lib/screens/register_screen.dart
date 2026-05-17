import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/api_service.dart';

enum RegistrationType { solo, createTeam, joinTeam }

class RegisterScreen extends StatefulWidget {
  final String eventId;

  const RegisterScreen({super.key, required this.eventId});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  RegistrationType _selectedType = RegistrationType.solo;
  final _formKey = GlobalKey<FormState>();

  // Controllers
  final _nameController = TextEditingController();
  final _usnController = TextEditingController();
  final _phoneController = TextEditingController();
  final _teamNameController = TextEditingController();
  final _passkeyController = TextEditingController();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final apiService = ApiService();

      if (_selectedType == RegistrationType.solo) {
        await apiService.registerSolo(
          eventId: widget.eventId,
          name: _nameController.text.trim(),
          usn: _usnController.text.trim(),
        );
      } else if (_selectedType == RegistrationType.createTeam) {
        final passkey = await apiService.createTeam(
          eventId: widget.eventId,
          teamName: _teamNameController.text.trim(),
          leaderUsn: _usnController.text.trim(),
        );
        // Show the server-generated passkey to the user
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Registration successful!')),
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
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
                  // Segmented Control
                  SegmentedButton<RegistrationType>(
                    segments: const [
                      ButtonSegment(value: RegistrationType.solo, label: Text('Solo')),
                      ButtonSegment(value: RegistrationType.createTeam, label: Text('Create Team')),
                      ButtonSegment(value: RegistrationType.joinTeam, label: Text('Join Team')),
                    ],
                    selected: {_selectedType},
                    onSelectionChanged: (Set<RegistrationType> newSelection) {
                      setState(() {
                        _selectedType = newSelection.first;
                      });
                    },
                  ),
                  const SizedBox(height: 32),
                  
                  // Dynamic Form Fields
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
                        color: cs.surfaceVariant,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: cs.primary, size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'A unique passkey will be generated after you submit. Share it with your teammates.',
                              style: GoogleFonts.inter(fontSize: 13, color: Colors.grey[600]),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    _buildTextField(
                      controller: _passkeyController,
                      label: 'Team Passkey',
                      hint: 'Enter 6-character passkey',
                      validator: (v) => v!.length != 6 ? 'Passkey must be 6 characters' : null,
                    ),
                  ],
                  
                  const SizedBox(height: 40),
                  
                  // Submit Button
                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: cs.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Theme.of(context).colorScheme.surface,
      ),
    );
  }
}
