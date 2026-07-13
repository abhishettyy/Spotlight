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
import 'package:google_sign_in/google_sign_in.dart';

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
              const SizedBox(height: 32),

              Row(
                children: [
                  Expanded(
                    child: Divider(
                      color: isDark ? Colors.white10 : Colors.grey[300],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      '- OR -',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: subTextColor.withOpacity(0.6),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Divider(
                      color: isDark ? Colors.white10 : Colors.grey[300],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: OutlinedButton.icon(
                  onPressed: _isLoading ? null : () async {
                    setState(() => _isLoading = true);
                    try {

                      final googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);
                      final googleUser = await googleSignIn.signIn();

                      if (googleUser == null) {

                        setState(() => _isLoading = false);
                        return;
                      }

                      final googleAuth = await googleUser.authentication;
                      final idToken = googleAuth.idToken;

                      final authProvider = Provider.of<AuthProvider>(context, listen: false);
                      final userProvider = Provider.of<UserProvider>(context, listen: false);
                      final eventsProvider = Provider.of<EventsProvider>(context, listen: false);
                      final apiService = ApiService();

                      final userId = 'google_${googleUser.id}';
                      final prefs = await SharedPreferences.getInstance();
                      await prefs.setString('userId', userId);

                      if (idToken != null) {
                        await prefs.setString('auth_token', idToken);
                      }
                      await authProvider.tryAutoLogin();

                      final user = await apiService.checkAndSyncProfile(
                        userId,
                        googleUser.email,
                        googleUser.displayName ?? 'Spotlight User',
                      );

                      if (user != null && mounted) {
                        userProvider.setCurrentUser(user);
                        await eventsProvider.loadEvents();

                        if (user.isProfileIncomplete) {
                          Navigator.pushReplacementNamed(context, '/onboarding');
                        } else {
                          Navigator.pushReplacementNamed(context, '/main');
                        }
                      } else if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Failed to sync profile. Please try again.')),
                        );
                      }
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Google sign-in error: $e')),
                        );
                      }
                    } finally {
                      if (mounted) setState(() => _isLoading = false);
                    }
                  },
                  icon: const Icon(Icons.account_circle_outlined, size: 24),
                  label: Text(
                    'Continue with Google',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: cs.onBackground,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: theme.cardTheme.color,
                    side: BorderSide(
                      color: isDark ? Colors.white10 : Colors.grey[300]!,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: TextButton(
                  onPressed: () {

                    final userProvider = Provider.of<UserProvider>(context, listen: false);
                    userProvider.setCurrentUser(UserModel(
                      id: 'dev_user_123',
                      name: 'Dev Admin',
                      email: 'dev@spotlight.app',
                      usn: '1RI22CS000',
                      branch: 'CS',
                      phone: '9988776655',
                    ));
                    Navigator.pushReplacementNamed(context, '/main');
                  },
                  child: Text(
                    'Skip to Dashboard (Dev Mode)',
                    style: GoogleFonts.inter(
                      color: Colors.grey[600],
                      fontSize: 14,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
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
