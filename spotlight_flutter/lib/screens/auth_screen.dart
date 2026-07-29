import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/auth_provider.dart';
import 'main_layout.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/services.dart';
import '../core/user_provider.dart';
import '../core/api_service.dart';
import '../core/events_provider.dart';
import '../core/notifications_provider.dart';
import '../core/custom_toast.dart';

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

  Future<void> _handleAuthentication({String? token, String? userId, String? email, String? name}) async {
    setState(() => _isLoading = true);
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final userProvider = Provider.of<UserProvider>(context, listen: false);
      final eventsProvider = Provider.of<EventsProvider>(context, listen: false);
      final apiService = ApiService();

      if (token != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        await authProvider.tryAutoLogin();
      }

      final user = await apiService.checkAndSyncProfile(
        userId ?? authProvider.userId ?? 'temp_user',
        email ?? _emailController.text.trim().toLowerCase(),
        name ?? _nameController.text.trim(),
        usn: !isLogin ? _usnController.text.trim().toUpperCase() : null,
        branch: !isLogin ? _branchController.text.trim() : null,
        phone: !isLogin ? _phoneController.text.trim() : null,
      );

      if (user != null) {
        userProvider.setCurrentUser(user);

        await eventsProvider.loadEvents();

        Provider.of<NotificationsProvider>(context, listen: false).load();

        if (mounted) {
          showSpotlightToast(
            context,
            isLogin ? 'Signed in successfully!' : 'Account created successfully!',
            icon: Icons.check_circle_rounded,
          );

          if (user.isProfileIncomplete) {
            Navigator.pushReplacementNamed(context, '/onboarding');
          } else {
            Navigator.pushReplacementNamed(context, '/main');
          }
        }
      } else {
        throw AppException("Failed to sync profile with server.");
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
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final subTextColor = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),

              Text(
                isLogin ? 'Welcome!' : 'Create Account',
                style: GoogleFonts.inter(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  color: cs.onBackground,
                  letterSpacing: -1,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                isLogin
                    ? 'Sign in to discover what\'s happening'
                    : 'Fill in your details to get started',
                style: GoogleFonts.inter(fontSize: 16, color: subTextColor),
              ),
              const SizedBox(height: 32),

              Container(
                height: 54,
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E1E) : Colors.grey[200],
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => isLogin = true),
                        child: Container(
                          decoration: BoxDecoration(
                            color: isLogin ? cs.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Sign In',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: isLogin ? Colors.white : subTextColor,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => isLogin = false),
                        child: Container(
                          decoration: BoxDecoration(
                            color: !isLogin ? cs.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Sign Up',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: !isLogin ? Colors.white : subTextColor,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

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
                  hintText: 'Enter your USN',
                  helperText: 'Note: USN cannot be edited once set',
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
                  labelText: 'Phone Number',
                  hintText: 'Enter your phone number',
                  keyboardType: TextInputType.phone,
                ),
              ],
              const SizedBox(height: 40),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () async {
                    // Validate fields before proceeding
                    if (isLogin) {
                      if (_emailController.text.trim().isEmpty ||
                          _passwordController.text.trim().isEmpty) {
                        showSpotlightToast(
                          context,
                          'Please fill in all fields.',
                          isError: true,
                        );
                        return;
                      }
                    } else {
                      if (_nameController.text.trim().isEmpty ||
                          _emailController.text.trim().isEmpty ||
                          _passwordController.text.trim().isEmpty ||
                          _usnController.text.trim().isEmpty ||
                          _branchController.text.trim().isEmpty ||
                          _yearController.text.trim().isEmpty ||
                          _semController.text.trim().isEmpty ||
                          _phoneController.text.trim().isEmpty) {
                        showSpotlightToast(
                          context,
                          'Please fill in all fields.',
                          isError: true,
                        );
                        return;
                      }
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
                          showSpotlightToast(
                            context,
                            isLogin ? 'Signed in successfully!' : 'Account created successfully!',
                            icon: Icons.check_circle_rounded,
                          );

                          if (user.isProfileIncomplete) {
                            Navigator.pushReplacementNamed(context, '/onboarding');
                          } else {
                            Navigator.pushReplacementNamed(context, '/main');
                          }
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
                      if (mounted) setState(() => _isLoading = false);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: cs.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading 
                    ? const JumpingDotsLoader(color: Colors.white)
                    : Text(
                        isLogin ? 'Sign In' : 'Create Account',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),

              // ── Social proof section (Sign In only) ──────────────────────
              if (isLogin) ...[
                const SizedBox(height: 52),

                // Avatar stack + joined count
                Center(
                  child: Column(
                    children: [
                      // Overlapping avatar circles
                      SizedBox(
                        height: 40,
                        width: 120,
                        child: Stack(
                          children: [
                            _avatarCircle(0,  const Color(0xFFE57373)),
                            _avatarCircle(26, const Color(0xFF64B5F6)),
                            _avatarCircle(52, const Color(0xFF81C784)),
                            _avatarCircle(78, const Color(0xFFFFB74D)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Join 500+ students already on Spotlight',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Discover events happening at your campus',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: subTextColor,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 36),

                // Stats row
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1A1A1A) : Colors.grey[50],
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark ? Colors.white.withOpacity(0.06) : Colors.grey[200]!,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _statItem(context, '20+', 'Events', isDark),
                      _dividerLine(isDark),
                      _statItem(context, '10+', 'Clubs', isDark),
                      _dividerLine(isDark),
                      _statItem(context, '500+', 'Students', isDark),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Terms line
                Center(
                  child: Text(
                    'By signing in you agree to our Terms & Privacy Policy',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: subTextColor.withOpacity(0.55),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 24),
              ],

            ],
          ),
        ),
      ),
    );
  }

  Widget _avatarCircle(double left, Color color) {
    return Positioned(
      left: left,
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: Theme.of(context).scaffoldBackgroundColor,
            width: 2.5,
          ),
        ),
        child: Icon(Icons.person, color: Colors.white, size: 18),
      ),
    );
  }

  Widget _statItem(BuildContext context, String value, String label, bool isDark) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: cs.primary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: isDark ? Colors.white54 : Colors.grey[500],
            letterSpacing: 0.3,
          ),
        ),
      ],
    );
  }

  Widget _dividerLine(bool isDark) {
    return Container(
      width: 1,
      height: 32,
      color: isDark ? Colors.white12 : Colors.grey[300],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String labelText,
    required String hintText,
    String? helperText,
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
            color: subTextColor,
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
            helperText: helperText,
            helperStyle: GoogleFonts.inter(color: Colors.amber[800], fontSize: 11, fontWeight: FontWeight.w500),
            filled: true,
            fillColor: cs.surface,
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

class JumpingDotsLoader extends StatefulWidget {
  final Color color;
  final double size;
  const JumpingDotsLoader({super.key, this.color = Colors.white, this.size = 7.0});

  @override
  State<JumpingDotsLoader> createState() => _JumpingDotsLoaderState();
}

class _JumpingDotsLoaderState extends State<JumpingDotsLoader> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final delay = index * 0.2;
            final value = (math.sin((_controller.value * 2 * math.pi) - (delay * 2 * math.pi)) + 1) / 2;
            final offsetY = -6.0 * value;
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 3),
              transform: Matrix4.translationValues(0, offsetY, 0),
              child: Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  color: widget.color,
                  shape: BoxShape.circle,
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

