import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../core/sk_colors.dart';
import '../core/branches.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:provider/provider.dart';
import '../core/auth_provider.dart';
import 'package:flutter/services.dart';
import '../core/user_provider.dart';
import '../core/api_service.dart';
import '../core/events_provider.dart';
import '../core/notifications_provider.dart';
import '../core/custom_toast.dart';
import 'privacy_policy_screen.dart';
import 'forgot_password_screen.dart';

const String _googleWebClientId = String.fromEnvironment(
  'GOOGLE_WEB_CLIENT_ID',
  defaultValue: '614014299614-n10khe2om4g50ehpqb6h82tdtumkh5ot.apps.googleusercontent.com',
);

final bool _googleSignInEnabled = !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

const String _googleLogoSvg = '''
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
</svg>''';

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

  bool get _isUsnValid {
    final usn = _usnController.text.trim().toUpperCase();
    return usn.startsWith('1MS') && usn.length >= 5;
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

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: const ['email'],
    serverClientId: _googleWebClientId,
  );

  Future<void> _signInWithGoogle() async {
    setState(() => _isLoading = true);
    try {
      await _googleSignIn.signOut();
      final account = await _googleSignIn.signIn();
      if (account == null) return;

      final idToken = (await account.authentication).idToken;
      if (idToken == null) {
        throw AppException('Google did not return a sign-in token. Please try again.');
      }

      final userProvider = Provider.of<UserProvider>(context, listen: false);
      final eventsProvider = Provider.of<EventsProvider>(context, listen: false);
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      final user = await ApiService().googleLogin(idToken: idToken);
      if (user == null) return;

      await authProvider.tryAutoLogin();
      userProvider.setCurrentUser(user);
      await eventsProvider.refreshEvents();
      if (!mounted) return;
      Provider.of<NotificationsProvider>(context, listen: false).load();

      showSpotlightToast(context, 'Signed in successfully!', icon: Icons.check_circle_rounded);
      Navigator.pushReplacementNamed(context, user.isProfileIncomplete ? '/onboarding' : '/main');
    } on PlatformException catch (e) {
      debugPrint('Google sign-in platform error: ${e.code} ${e.message}');
      if (mounted) {
        showSpotlightToast(context, 'Google sign-in is unavailable right now. Please sign in with email.', isError: true);
      }
    } catch (e) {
      if (mounted) showSpotlightToast(context, '$e', isError: true);
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
    final subTextColor = Sk.of(context).muted;

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
                  color: Sk.of(context).raised,
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
                              color: isLogin ? Sk.of(context).onBrand : subTextColor,
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
                              color: !isLogin ? Sk.of(context).onBrand : subTextColor,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              AutofillGroup(
                child: Form(
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
                          autofillHints: const [AutofillHints.email, AutofillHints.username],
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
                        autofillHints: const [AutofillHints.password],
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
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ForgotPasswordScreen(initialEmail: _emailController.text.trim()),
                            ),
                          ),
                          child: Text(
                            'Forgot password?',
                            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.primary),
                          ),
                        ),
                      ),
                    ] else ...[
                      _buildTextField(
                        controller: _nameController,
                        labelText: 'Full Name',
                        hintText: 'Enter your full name',
                        autofillHints: const [AutofillHints.name],
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
                        autofillHints: const [AutofillHints.email, AutofillHints.newUsername],
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
                        autofillHints: const [AutofillHints.newPassword],
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
                            if (_autoValidateMode == AutovalidateMode.always) return 'Invalid';
                            return null;
                          }
                          if (!_isUsnValid) return 'Invalid';
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      _buildBranchDropdown(),
                      const SizedBox(height: 20),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: _buildTextField(
                              controller: _yearController,
                              labelText: 'Year',
                              hintText: '1-4',
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(1)],
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) {
                                  if (_autoValidateMode == AutovalidateMode.always) return 'Invalid';
                                  return null;
                                }
                                if (!_isYearValid) return 'Invalid';
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
                                  if (_autoValidateMode == AutovalidateMode.always) return 'Invalid';
                                  return null;
                                }
                                if (!_isSemValid) return 'Invalid';
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
                        autofillHints: const [AutofillHints.telephoneNumber],
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) {
                            if (_autoValidateMode == AutovalidateMode.always) return 'Invalid';
                            return null;
                          }
                          if (!_isPhoneValid) return 'Invalid';
                          return null;
                        },
                      ),
                    ],
                  ],
                ),
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
                          branch: _branchController.text,
                          phone: _phoneController.text.trim(),
                          year: _yearController.text.trim(),
                          sem: _semController.text.trim(),
                        );
                      }

                      if (user != null) {
                        TextInput.finishAutofillContext();
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
                    ? JumpingDotsLoader(color: Sk.of(context).onBrand)
                    : Text(
                        isLogin ? 'Sign In' : 'Create Account',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Sk.of(context).onBrand,
                        ),
                      ),
                ),
              ),

              if (isLogin && _googleSignInEnabled) ...[
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(child: Divider(color: subTextColor.withOpacity(0.25))),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('or', style: GoogleFonts.inter(fontSize: 12, color: subTextColor)),
                    ),
                    Expanded(child: Divider(color: subTextColor.withOpacity(0.25))),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: OutlinedButton(
                    onPressed: _isLoading ? null : _signInWithGoogle,
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Sk.of(context).surface,
                      side: BorderSide(color: Sk.of(context).lineStrong),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SvgPicture.string(_googleLogoSvg, width: 20, height: 20),
                        const SizedBox(width: 12),
                        Text(
                          'Continue with Google',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Sk.of(context).fg,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              if (!isLogin) ...[
                const SizedBox(height: 16),

                Center(
                  child: Text.rich(
                    TextSpan(
                      text: 'By creating an account, you agree to our ',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: subTextColor.withOpacity(0.8),
                      ),
                      children: [
                        TextSpan(
                          text: 'Terms & Privacy Policy',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: cs.primary,
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
              ],

              if (isLogin) ...[
                const SizedBox(height: 40),

                Container(
                  padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                  decoration: BoxDecoration(
                    color: Sk.of(context).surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Sk.of(context).line),
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
                      color: Sk.of(context).fg,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                _benefitItem(
                  context,
                  icon: Icons.explore_outlined,
                  title: 'Discover campus events',
                  subtitle: 'Find every workshop, hackathon & fest on campus in real-time.',
                  isDark: isDark,
                ),
                const SizedBox(height: 16),
                _benefitItem(
                  context,
                  icon: Icons.qr_code_2_rounded,
                  title: 'Solo or team, register in seconds',
                  subtitle: "Your QR ticket's ready right after, and it works even without internet.",
                  isDark: isDark,
                ),
                const SizedBox(height: 16),
                _benefitItem(
                  context,
                  icon: Icons.assignment_turned_in_outlined,
                  title: 'Everything in one place',
                  subtitle: 'Track your active, pending, and past registrations without digging through emails.',
                  isDark: isDark,
                ),
                const SizedBox(height: 24),
              ],

            ],
          ),
        ),
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
    final subTextColor = Sk.of(context).muted;

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
                  color: Sk.of(context).fg,
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
            color: Sk.of(context).faint,
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
      color: Sk.of(context).line,
    );
  }

  Widget _buildBranchDropdown() {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final subTextColor = Sk.of(context).muted;
    final selected = _branchController.text.isEmpty ? null : _branchController.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'BRANCH',
          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: subTextColor),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          key: ValueKey('branch-${_branchController.text}'),
          initialValue: selected,
          isExpanded: true,
          dropdownColor: Theme.of(context).cardColor,
          style: GoogleFonts.inter(color: cs.onSurface, fontSize: 15),
          items: kBranches
              .map((b) => DropdownMenuItem(value: b, child: Text(b, overflow: TextOverflow.ellipsis)))
              .toList(),
          onChanged: (v) => setState(() => _branchController.text = v ?? ''),
          validator: (v) {
            if (v == null || v.isEmpty) {
              if (_autoValidateMode == AutovalidateMode.always) return 'Select your branch';
              return null;
            }
            return null;
          },
          decoration: InputDecoration(
            hintText: 'Select your branch',
            hintStyle: GoogleFonts.inter(color: subTextColor.withValues(alpha: 0.6), fontSize: 15),
            errorStyle: GoogleFonts.inter(color: Sk.of(context).danger, fontSize: 12, fontWeight: FontWeight.w500),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Sk.of(context).danger, width: 1.5),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Sk.of(context).danger, width: 1.5),
            ),
            filled: true,
            fillColor: cs.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: cs.primary, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        ),
      ],
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
    Iterable<String>? autofillHints,
  }) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final subTextColor = theme.brightness == Brightness.dark
        ? Sk.of(context).muted
        : Sk.of(context).muted;

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
          autofillHints: autofillHints,
          style: GoogleFonts.inter(color: cs.onBackground, fontSize: 15),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: GoogleFonts.inter(color: subTextColor.withOpacity(0.6), fontSize: 15),
            helperText: helperText,
            helperStyle: GoogleFonts.inter(color: Sk.of(context).warn, fontSize: 11, fontWeight: FontWeight.w500),
            errorStyle: GoogleFonts.inter(color: Sk.of(context).danger, fontSize: 12, fontWeight: FontWeight.w500),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Sk.of(context).danger, width: 1.5),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Sk.of(context).danger, width: 1.5),
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

