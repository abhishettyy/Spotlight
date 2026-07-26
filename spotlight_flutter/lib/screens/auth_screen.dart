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
    final isDark = theme.brightness == Brightness.dark;
    final subTextColor = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;
    final cardBg = isDark ? const Color(0xFF1A1A1E) : Colors.white;
    final topPadding = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F0F12) : const Color(0xFFF2F3F7),
      body: Stack(
        children: [
          // ─── Top Rich Gradient Header ──────────────────────────────────────────
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 260,
            child: Container(
              padding: EdgeInsets.fromLTRB(28, topPadding + 16, 24, 0),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Color(0xFFC62828), // Rich Crimson Red
                    Color(0xFF8E0032), // Deep Burgundy
                    Color(0xFF26082F), // Dark Plum / Deep Purple
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const SizedBox(width: 24),
                      Icon(Icons.more_horiz, color: Colors.white.withOpacity(0.7), size: 26),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Text(
                    isLogin ? 'Hello\nSign in!' : 'Hello\nSign up!',
                    style: GoogleFonts.inter(
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      height: 1.25,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ─── Overlapping Rounded Card Container ─────────────────────────────
          Positioned.fill(
            top: 210,
            child: Container(
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(36)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.4 : 0.08),
                    blurRadius: 24,
                    offset: const Offset(0, -6),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(36)),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(28, 36, 28, 36),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (isLogin) ...[
                        _buildInputField(
                          controller: _emailController,
                          labelText: 'Gmail / Email',
                          hintText: 'your.name@gmail.com',
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 24),
                        _buildInputField(
                          controller: _passwordController,
                          labelText: 'Password',
                          hintText: '••••••••',
                          obscureText: obscurePassword,
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: subTextColor,
                              size: 20,
                            ),
                            onPressed: () => setState(() => obscurePassword = !obscurePassword),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Please contact your administrator to reset your password.')),
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
                                color: isDark ? Colors.grey[400] : Colors.grey[700],
                              ),
                            ),
                          ),
                        ),
                      ] else ...[
                        _buildInputField(
                          controller: _nameController,
                          labelText: 'Full Name',
                          hintText: 'John Doe',
                        ),
                        const SizedBox(height: 20),
                        _buildInputField(
                          controller: _emailController,
                          labelText: 'Email',
                          hintText: 'your.name@gmail.com',
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 20),
                        _buildInputField(
                          controller: _passwordController,
                          labelText: 'Password',
                          hintText: 'Create password',
                          obscureText: obscurePassword,
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: subTextColor,
                              size: 20,
                            ),
                            onPressed: () => setState(() => obscurePassword = !obscurePassword),
                          ),
                        ),
                        const SizedBox(height: 20),
                        _buildInputField(
                          controller: _usnController,
                          labelText: 'USN',
                          hintText: 'e.g. 4MH23IS001',
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Expanded(
                              child: _buildInputField(
                                controller: _branchController,
                                labelText: 'Branch',
                                hintText: 'e.g. ISE',
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: _buildInputField(
                                controller: _yearController,
                                labelText: 'Year',
                                hintText: 'e.g. 2',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: _buildInputField(
                                controller: _semController,
                                labelText: 'Sem',
                                hintText: 'e.g. 4',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        _buildInputField(
                          controller: _phoneController,
                          labelText: 'Phone Number (Optional)',
                          hintText: 'Enter phone number',
                          keyboardType: TextInputType.phone,
                        ),
                      ],

                      const SizedBox(height: 36),

                      // ─── Large Pill Gradient Button ───────────────────────────
                      Container(
                        width: double.infinity,
                        height: 56,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: _isLoading
                                ? [Colors.grey[600]!, Colors.grey[700]!]
                                : [
                                    const Color(0xFFC62828), // Crimson
                                    const Color(0xFF5E1742), // Dark Plum/Burgundy
                                  ],
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                          ),
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFC62828).withOpacity(0.35),
                              blurRadius: 18,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(30),
                            onTap: _isLoading ? null : _submitAuth,
                            child: Center(
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
                                        color: Colors.white,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 48),

                      // ─── Bottom Footer Toggle ──────────────────────────────────
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
                                    color: isDark ? Colors.white : Colors.black,
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

  Widget _buildInputField({
    required TextEditingController controller,
    required String labelText,
    required String hintText,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
    Widget? suffixIcon,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          labelText,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: const Color(0xFFC62828), // Red accent label matching reference design
          ),
        ),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          style: GoogleFonts.inter(
            color: isDark ? Colors.white : Colors.black87,
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: GoogleFonts.inter(
              color: isDark ? Colors.white30 : Colors.grey[400],
              fontSize: 15,
            ),
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
            filled: false,
            border: UnderlineInputBorder(
              borderSide: BorderSide(color: isDark ? Colors.white24 : Colors.grey[300]!),
            ),
            enabledBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: isDark ? Colors.white24 : Colors.grey[300]!),
            ),
            focusedBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: Color(0xFFC62828), width: 2),
            ),
            suffixIcon: suffixIcon,
            suffixIconConstraints: const BoxConstraints(minWidth: 24, minHeight: 24),
          ),
        ),
      ],
    );
  }
}
