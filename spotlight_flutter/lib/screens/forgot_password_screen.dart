import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/sk_colors.dart';
import '../core/api_service.dart';
import '../core/custom_toast.dart';

/// Forgot password: 1) email a 6-digit code, 2) enter the code and a new password, which replaces
/// the old one. Pops back to sign-in when done.
class ForgotPasswordScreen extends StatefulWidget {
  final String initialEmail;
  const ForgotPasswordScreen({super.key, this.initialEmail = ''});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  static const int _resendSeconds = 30;
  static final RegExp _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  late final TextEditingController _emailController = TextEditingController(text: widget.initialEmail);
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _codeSent = false;
  bool _busy = false;
  bool _obscure = true;
  String? _notice;
  Map<String, String> _errors = {};
  int _resendIn = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _emailController.dispose();
    _codeController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  /// Same rules as the server and club sign-up. Null when the password is fine.
  String? _passwordProblem(String p) {
    final missing = <String>[];
    if (p.length < 8) missing.add('at least 8 characters');
    if (!RegExp(r'[A-Z]').hasMatch(p)) missing.add('at least one uppercase letter');
    if (!RegExp(r'[0-9]').hasMatch(p)) missing.add('at least one number');
    if (!RegExp(r'''[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]''').hasMatch(p)) missing.add('at least one special character');
    return missing.isEmpty ? null : 'Password must contain ${missing.join(', ')}.';
  }

  void _startResendTimer() {
    _timer?.cancel();
    setState(() => _resendIn = _resendSeconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _resendIn--);
      if (_resendIn <= 0) t.cancel();
    });
  }

  Future<void> _sendCode() async {
    final email = _emailController.text.trim();
    if (!_emailRe.hasMatch(email)) {
      setState(() => _errors = {'email': 'Please enter a valid email address.'});
      return;
    }
    setState(() { _errors = {}; _busy = true; });
    try {
      final message = await ApiService().requestPasswordReset(email: email);
      if (!mounted) return;
      setState(() { _notice = message; _codeSent = true; });
      _startResendTimer();
    } catch (e) {
      if (mounted) showSpotlightToast(context, e.toString(), isError: true, duration: const Duration(seconds: 4));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reset() async {
    final code = _codeController.text.trim();
    final pass = _passwordController.text;
    final next = <String, String>{};
    if (!RegExp(r'^\d{6}$').hasMatch(code)) next['code'] = 'Enter the 6-digit code from the email.';
    final problem = _passwordProblem(pass);
    if (problem != null) {
      next['password'] = problem;
    } else if (pass != _confirmController.text) {
      next['confirm'] = 'Passwords do not match.';
    }
    setState(() => _errors = next);
    if (next.isNotEmpty) return;

    setState(() => _busy = true);
    try {
      final message = await ApiService().resetPassword(
        email: _emailController.text.trim(), code: code, newPassword: pass);
      if (!mounted) return;
      showSpotlightToast(context, message, duration: const Duration(seconds: 4));
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) showSpotlightToast(context, e.toString(), isError: true, duration: const Duration(seconds: 4));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  InputDecoration _decoration(String hint, String key, {Widget? suffix}) {
    final cs = Theme.of(context).colorScheme;
    final sk = Sk.of(context);
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(color: sk.muted.withValues(alpha: 0.6), fontSize: 15),
      errorText: _errors[key],
      errorMaxLines: 3,
      errorStyle: GoogleFonts.inter(color: sk.danger, fontSize: 12, fontWeight: FontWeight.w500),
      filled: true,
      fillColor: cs.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: cs.primary, width: 1.5)),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: sk.danger, width: 1.5)),
      focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: sk.danger, width: 1.5)),
      suffixIcon: suffix,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text.toUpperCase(),
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Sk.of(context).muted)),
      );

  Widget _primaryButton(String label, VoidCallback onPressed) {
    final cs = Theme.of(context).colorScheme;
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _busy ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: cs.primary,
          disabledBackgroundColor: cs.primary.withValues(alpha: 0.6),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        child: _busy
            ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Sk.of(context).onBrand))
            : Text(label, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: Sk.of(context).onBrand)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final sk = Sk.of(context);
    final textStyle = GoogleFonts.inter(color: cs.onSurface, fontSize: 15);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        leading: IconButton(icon: Icon(Icons.arrow_back, color: cs.onSurface), onPressed: () => Navigator.of(context).pop()),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Forgot password?',
                  style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.bold, color: cs.onSurface)),
              const SizedBox(height: 8),
              Text(
                _codeSent
                    ? (_notice ?? '')
                    : "Enter your account's email and we'll send you a 6-digit code to reset your password.",
                style: GoogleFonts.inter(fontSize: 15, height: 1.5, color: sk.muted),
              ),
              const SizedBox(height: 28),
              if (!_codeSent) ...[
                _label('Email'),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  autofocus: widget.initialEmail.isEmpty,
                  style: textStyle,
                  decoration: _decoration('Enter your email', 'email'),
                  onSubmitted: (_) => _sendCode(),
                ),
                const SizedBox(height: 28),
                _primaryButton('Send Code', _sendCode),
              ] else ...[
                _label('6-digit code'),
                TextField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  autofillHints: const [AutofillHints.oneTimeCode],
                  autofocus: true,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                  style: GoogleFonts.inter(color: cs.onSurface, fontSize: 20, fontWeight: FontWeight.w600, letterSpacing: 6),
                  decoration: _decoration('••••••', 'code'),
                ),
                const SizedBox(height: 20),
                _label('New password'),
                TextField(
                  controller: _passwordController,
                  obscureText: _obscure,
                  autofillHints: const [AutofillHints.newPassword],
                  style: textStyle,
                  decoration: _decoration('Create a new password', 'password',
                      suffix: IconButton(
                        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: sk.muted),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      )),
                ),
                if (_errors['password'] == null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6, left: 4),
                    child: Text('At least 8 characters, with an uppercase letter, a number and a special character.',
                        style: GoogleFonts.inter(fontSize: 12, color: sk.faint)),
                  ),
                const SizedBox(height: 20),
                _label('Confirm new password'),
                TextField(
                  controller: _confirmController,
                  obscureText: _obscure,
                  style: textStyle,
                  decoration: _decoration('Enter it again', 'confirm'),
                  onSubmitted: (_) => _reset(),
                ),
                const SizedBox(height: 28),
                _primaryButton('Reset Password', _reset),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      onPressed: _busy ? null : () => setState(() { _codeSent = false; _codeController.clear(); _errors = {}; }),
                      child: Text('Use a different email', style: GoogleFonts.inter(fontSize: 13, color: sk.muted)),
                    ),
                    TextButton(
                      onPressed: _busy || _resendIn > 0 ? null : _sendCode,
                      child: Text(
                        _resendIn > 0 ? 'Resend code in ${_resendIn}s' : 'Resend code',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _resendIn > 0 ? sk.faint : cs.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
