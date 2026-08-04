import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
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
import 'privacy_policy_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool isLogin = true;
  bool obscurePassword = true;

  int _eventsCount = 0;
  int _clubsCount = 0;
  int _studentsCount = 0;

  @override
  void initState() {
    super.initState();
    _loadPublicStats();
  }

  Future<void> _loadPublicStats() async {
    try {
      final stats = await ApiService().fetchPublicStats();
      if (mounted) {
        setState(() {
          _eventsCount = stats['totalEvents'] ?? stats['liveEvents'] ?? 0;
          _clubsCount = stats['clubs'] ?? 0;
          _studentsCount = stats['totalStudents'] ?? 0;
        });
      }
    } catch (e) {
      debugPrint('Failed to load public stats on login: $e');
    }
  }

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _usnController = TextEditingController();
  final _branchController = TextEditingController();
  final _yearController = TextEditingController();
  final _semController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;
  AutovalidateMode _autoValidateMode = AutovalidateMode.disabled;

  bool get _isEmailValid {
    final email = _emailController.text.trim();
    if (email.isEmpty) return false;
    return RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(email);
  }

  bool get _isPasswordValid {
    return _passwordController.text.trim().isNotEmpty;
  }

  bool get _isNameValid {
    return _nameController.text.trim().isNotEmpty;
  }

  bool get _isUsnValid {
    final usn = _usnController.text.trim().toUpperCase();
    return usn.startsWith('1MS') && usn.length >= 5;
  }

  bool get _isBranchValid {
    return _branchController.text.trim().isNotEmpty;
  }

  bool get _isYearValid {
    final y = int.tryParse(_yearController.text.trim());
    return y != null && y >= 1 && y <= 4;
  }

  bool get _isSemValid {
    final s = int.tryParse(_semController.text.trim());
    if (s == null) return false;
    final y = int.tryParse(_yearController.text.trim());
    if (y != null && y >= 1 && y <= 4) {
      final minSem = y * 2 - 1;
      final maxSem = y * 2;
      return s >= minSem && s <= maxSem;
    }
    return s >= 1 && s <= 8;
  }

  bool get _isPhoneValid {
    final phone = _phoneController.text.trim();
    return RegExp(r'^\d{10}$').hasMatch(phone);
  }

  bool get _isFormValid {
    if (isLogin) {
      return _isEmailValid && _isPasswordValid;
    } else {
      return _isNameValid &&
          _isEmailValid &&
          _isPasswordValid &&
          _isUsnValid &&
          _isBranchValid &&
          _isYearValid &&
          _isSemValid &&
          _isPhoneValid;
    }
  }

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

  void _switchTab(bool targetLogin) {
    if (isLogin == targetLogin) return;
    setState(() {
      isLogin = targetLogin;
      _autoValidateMode = AutovalidateMode.disabled;
      _nameController.clear();
      _emailController.clear();
      _passwordController.clear();
      _usnController.clear();
      _branchController.clear();
      _yearController.clear();
      _semController.clear();
      _phoneController.clear();
    });
    _formKey.currentState?.reset();
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
                        onTap: () => _switchTab(true),
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
                        onTap: () => _switchTab(false),
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

              Form(
                key: _formKey,
                autovalidateMode: _autoValidateMode,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isLogin) ...[
                      _buildTextField(
                        controller: _emailController,
                        labelText: 'Email',
                        hintText: 'Enter your email',
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            if (_autoValidateMode == AutovalidateMode.always) return 'Invalid email';
                            return null;
                          }
                          if (!_isEmailValid) return 'Invalid email';
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      _buildTextField(
                        controller: _passwordController,
                        labelText: 'Password',
                        hintText: 'Enter your password',
                        obscureText: obscurePassword,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            if (_autoValidateMode == AutovalidateMode.always) return 'Invalid password';
                            return null;
                          }
                          return null;
                        },
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
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            if (_autoValidateMode == AutovalidateMode.always) return 'Invalid name';
                            return null;
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      _buildTextField(
                        controller: _emailController,
                        labelText: 'Email',
                        hintText: 'Enter your email',
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            if (_autoValidateMode == AutovalidateMode.always) return 'Invalid email';
                            return null;
                          }
                          if (!_isEmailValid) return 'Invalid email';
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      _buildTextField(
                        controller: _passwordController,
                        labelText: 'Password',
                        hintText: 'Create a password',
                        obscureText: obscurePassword,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            if (_autoValidateMode == AutovalidateMode.always) return 'Invalid password';
                            return null;
                          }
                          return null;
                        },
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
                        hintText: 'Enter valid USN',
                        textCapitalization: TextCapitalization.characters,
                        inputFormatters: [UpperCaseTextFormatter()],
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            if (_autoValidateMode == AutovalidateMode.always) return 'Invalid USN';
                            return null;
                          }
                          if (!_isUsnValid) return 'Invalid USN';
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: _buildTextField(
                              controller: _branchController,
                              labelText: 'Branch',
                              hintText: 'Branch',
                              textCapitalization: TextCapitalization.characters,
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) {
                                  if (_autoValidateMode == AutovalidateMode.always) return 'Invalid branch';
                                  return null;
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildTextField(
                              controller: _yearController,
                              labelText: 'Year',
                              hintText: '1-4',
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(1)],
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) {
                                  if (_autoValidateMode == AutovalidateMode.always) return 'Invalid year';
                                  return null;
                                }
                                if (!_isYearValid) return 'Invalid year';
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildTextField(
                              controller: _semController,
                              labelText: 'Sem',
                              hintText: '1-8',
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(1)],
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) {
                                  if (_autoValidateMode == AutovalidateMode.always) return 'Invalid semester';
                                  return null;
                                }
                                if (!_isSemValid) return 'Invalid semester';
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      _buildTextField(
                        controller: _phoneController,
                        labelText: 'Phone Number',
                        hintText: '10-digit number',
                        keyboardType: TextInputType.phone,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            if (_autoValidateMode == AutovalidateMode.always) return 'Invalid phone number';
                            return null;
                          }
                          if (!_isPhoneValid) return 'Invalid phone number';
                          return null;
                        },
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 40),

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () async {
                    setState(() => _autoValidateMode = AutovalidateMode.always);
                    if (!_formKey.currentState!.validate()) {
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
                    disabledBackgroundColor: cs.primary.withOpacity(0.6),
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

              if (isLogin) ...[
                const SizedBox(height: 40),

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
                      _statItem(context, '${_eventsCount}+', 'Events', isDark),
                      _dividerLine(isDark),
                      _statItem(context, '${_clubsCount}+', 'Clubs', isDark),
                      _dividerLine(isDark),
                      _statItem(context, '${_studentsCount}+', 'Students', isDark),
                    ],
                  ),
                ),

                const SizedBox(height: 48),

                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Why Spotlight?',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                _benefitItem(
                  context,
                  icon: Icons.explore_outlined,
                  title: 'Discover campus events',
                  subtitle: 'Find all university workshops, hackathons & fests in real-time.',
                  isDark: isDark,
                ),
                const SizedBox(height: 16),
                _benefitItem(
                  context,
                  icon: Icons.touch_app_outlined,
                  title: 'Register in one tap',
                  subtitle: 'Seamless quick registration for solo and team fests.',
                  isDark: isDark,
                ),
                const SizedBox(height: 16),
                _benefitItem(
                  context,
                  icon: Icons.notifications_active_outlined,
                  title: 'Instant event notifications',
                  subtitle: 'Stay updated with dynamic reminders and slot alerts.',
                  isDark: isDark,
                ),
                const SizedBox(height: 48),

                Center(
                  child: Text.rich(
                    TextSpan(
                      text: 'By signing in you agree to our ',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: subTextColor.withOpacity(0.55),
                      ),
                      children: [
                        TextSpan(
                          text: 'Terms & Privacy Policy',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black87,
                            decoration: TextDecoration.underline,
                          ),
                          recognizer: TapGestureRecognizer()
                            ..onTap = () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const PrivacyPolicyScreen(),
                                ),
                              );
                            },
                        ),
                      ],
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

  Widget _benefitItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isDark,
  }) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final subTextColor = isDark ? const Color(0xFFA0A0A0) : Colors.grey[600]!;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: cs.primary.withOpacity(0.08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: cs.primary,
            size: 20,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: subTextColor,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
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
    List<TextInputFormatter>? inputFormatters,
    TextCapitalization textCapitalization = TextCapitalization.none,
    FormFieldValidator<String>? validator,
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
        TextFormField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          textCapitalization: textCapitalization,
          validator: validator,
          style: GoogleFonts.inter(color: cs.onBackground, fontSize: 15),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: GoogleFonts.inter(color: subTextColor.withOpacity(0.6), fontSize: 15),
            helperText: helperText,
            helperStyle: GoogleFonts.inter(color: Colors.amber[800], fontSize: 11, fontWeight: FontWeight.w500),
            errorStyle: GoogleFonts.inter(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.w500),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
            ),
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

class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    return TextEditingValue(
      text: newValue.text.toUpperCase(),
      selection: newValue.selection,
    );
  }
}
