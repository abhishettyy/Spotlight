import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/auth_provider.dart';
import '../core/user_provider.dart';
import '../core/api_service.dart';
import '../core/events_provider.dart';
import '../core/notifications_provider.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool isLogin = true;
  bool obscurePassword = true;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _usnController = TextEditingController();
  final _branchController = TextEditingController();
  final _yearController = TextEditingController();
  final _semController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _usnController.dispose();
    _branchController.dispose();
    _yearController.dispose();
    _semController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submitAuth() async {
    if (_emailController.text.trim().isEmpty || _passwordController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in both Email and Password.')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final apiService = ApiService();
      final userProvider = Provider.of<UserProvider>(context, listen: false);
      final eventsProvider = Provider.of<EventsProvider>(context, listen: false);
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      UserModel? user;
      if (isLogin) {
        user = await apiService.login(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
        );
      } else {
        if (_nameController.text.trim().isEmpty || _usnController.text.trim().isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please fill in all required fields.')),
          );
          setState(() => _isLoading = false);
          return;
        }

        user = await apiService.signup(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
          name: _nameController.text.trim(),
          usn: _usnController.text.trim().toUpperCase(),
          branch: _branchController.text.trim().toUpperCase(),
          phone: _phoneController.text.trim(),
          year: _yearController.text.trim(),
          sem: _semController.text.trim(),
        );
      }

      if (user != null) {
        await authProvider.tryAutoLogin();
        userProvider.setCurrentUser(user);
        await eventsProvider.refreshEvents();

        Provider.of<NotificationsProvider>(context, listen: false).load();

        if (mounted) {
          if (user.isProfileIncomplete) {
            Navigator.pushReplacementNamed(context, '/onboarding');
          } else {
            Navigator.pushReplacementNamed(context, '/main');
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Auth Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final subTextColor = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;
    final topPadding = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          // ─── Header Container with App's Theme Primary Color ───────────────
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 250,
            child: Container(
              padding: EdgeInsets.fromLTRB(24, topPadding + 16, 24, 0),
              color: cs.primary,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const SizedBox(width: 24),
                      Icon(Icons.more_horiz, color: cs.onPrimary.withOpacity(0.8), size: 26),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    isLogin ? 'Hello\nSign in!' : 'Hello\nSign up!',
                    style: GoogleFonts.inter(
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      color: cs.onPrimary,
                      height: 1.2,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ─── Overlapping Rounded Card (App's Theme Surface) ───────────────────
          Positioned.fill(
            top: 200,
            child: Container(
              decoration: BoxDecoration(
                color: cs.surface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
                    blurRadius: 20,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (isLogin) ...[
                        _buildTextField(
                          controller: _emailController,
                          labelText: 'Email',
                          hintText: 'Enter your email',
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 20),
                        _buildTextField(
                          controller: _passwordController,
                          labelText: 'Password',
                          hintText: 'Enter your password',
                          obscureText: obscurePassword,
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              color: subTextColor,
                            ),
                            onPressed: () =>
                                setState(() => obscurePassword = !obscurePassword),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Please contact support to reset password.')),
                              );
                            },
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              'Forgot password?',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: subTextColor,
                              ),
                            ),
                          ),
                        ),
                      ] else ...[
                        _buildTextField(
                          controller: _nameController,
                          labelText: 'Full Name',
                          hintText: 'Enter your full name',
                        ),
                        const SizedBox(height: 20),
                        _buildTextField(
                          controller: _emailController,
                          labelText: 'Email',
                          hintText: 'Enter your email',
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 20),
                        _buildTextField(
                          controller: _passwordController,
                          labelText: 'Password',
                          hintText: 'Create a password',
                          obscureText: obscurePassword,
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              color: subTextColor,
                            ),
                            onPressed: () =>
                                setState(() => obscurePassword = !obscurePassword),
                          ),
                        ),
                        const SizedBox(height: 20),
                        _buildTextField(
                          controller: _usnController,
                          labelText: 'USN',
                          hintText: 'Enter USN',
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Expanded(
                              child: _buildTextField(
                                controller: _branchController,
                                labelText: 'Branch',
                                hintText: 'Branch',
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: _buildTextField(
                                controller: _yearController,
                                labelText: 'Year',
                                hintText: 'Year',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: _buildTextField(
                                controller: _semController,
                                labelText: 'Sem',
                                hintText: 'Sem',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        _buildTextField(
                          controller: _phoneController,
                          labelText: 'Phone Number (Optional)',
                          hintText: 'Enter your phone number',
                          keyboardType: TextInputType.phone,
                        ),
                      ],

                      const SizedBox(height: 32),

                      // ─── Primary App Theme Button ──────────────────────────────
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _submitAuth,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: cs.primary,
                            foregroundColor: cs.onPrimary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(28),
                            ),
                            elevation: 0,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                )
                              : Text(
                                  isLogin ? 'SIGN IN' : 'SIGN UP',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: cs.onPrimary,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                        ),
                      ),

                      const SizedBox(height: 40),

                      // ─── Toggle Link ──────────────────────────────────────────
                      Align(
                        alignment: Alignment.centerRight,
                        child: GestureDetector(
                          onTap: () => setState(() => isLogin = !isLogin),
                          child: RichText(
                            textAlign: TextAlign.right,
                            text: TextSpan(
                              text: isLogin ? "Don't have account?\n" : "Already have an account?\n",
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: subTextColor,
                                height: 1.4,
                              ),
                              children: [
                                TextSpan(
                                  text: isLogin ? 'Sign up' : 'Sign in',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: cs.primary,
                                  ),
                                ),
                              ],
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
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String labelText,
    required String hintText,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
    Widget? suffixIcon,
  }) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final subTextColor = theme.brightness == Brightness.dark
        ? const Color(0xFFA0A0A0)
        : Colors.grey[600]!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          labelText.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
            color: cs.primary,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          style: GoogleFonts.inter(color: cs.onBackground, fontSize: 15),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: GoogleFonts.inter(color: subTextColor.withOpacity(0.6), fontSize: 15),
            filled: true,
            fillColor: cs.surface == Colors.white ? const Color(0xFFF3F4F6) : cs.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: cs.primary, width: 1.5),
            ),
            suffixIcon: suffixIcon,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        ),
      ],
    );
  }
}
