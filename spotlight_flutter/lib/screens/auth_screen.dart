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
                  hintText: 'e.g., 4MH23IS001',
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        controller: _branchController,
                        labelText: 'Branch',
                        hintText: 'e.g., ISE',
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildTextField(
                        controller: _yearController,
                        labelText: 'Year',
                        hintText: 'e.g., 2',
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildTextField(
                        controller: _semController,
                        labelText: 'Sem',
                        hintText: 'e.g., 4',
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
              const SizedBox(height: 40),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () async {
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
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: cs.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading 
                    ? const CircularProgressIndicator(color: Colors.white)
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
              if (isLogin) ...[
                const SizedBox(height: 28),

                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: GoogleFonts.inter(fontSize: 14, color: subTextColor),
                    ),
                    GestureDetector(
                      onTap: () => setState(() => isLogin = false),
                      child: Text(
                        "Sign Up",
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: cs.primary,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E1E1E) : Colors.grey[100],
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.06),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: cs.primary.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(Icons.stars_rounded, size: 20, color: cs.primary),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            "Why Spotlight?",
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: cs.onBackground,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildFeatureRow(
                        icon: Icons.flash_on_rounded,
                        title: "Instant Registrations",
                        desc: "Join campus workshops & hackathons in one tap",
                        cs: cs,
                        subTextColor: subTextColor,
                      ),
                      const SizedBox(height: 12),
                      _buildFeatureRow(
                        icon: Icons.qr_code_2_rounded,
                        title: "Digital QR Passes",
                        desc: "Seamless check-ins & live event updates",
                        cs: cs,
                        subTextColor: subTextColor,
                      ),
                      const SizedBox(height: 12),
                      _buildFeatureRow(
                        icon: Icons.shield_outlined,
                        title: "Verified Student Network",
                        desc: "Connect & form teams with verified peers",
                        cs: cs,
                        subTextColor: subTextColor,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),
                Center(
                  child: Text(
                    "Spotlight Platform • Empowering Campus Culture",
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: subTextColor.withOpacity(0.5),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureRow({
    required IconData icon,
    required String title,
    required String desc,
    required ColorScheme cs,
    required Color subTextColor,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: cs.primary.withOpacity(0.85)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: cs.onBackground,
                ),
              ),
              Text(
                desc,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: subTextColor,
                ),
              ),
            ],
          ),
        ),
      ],
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
