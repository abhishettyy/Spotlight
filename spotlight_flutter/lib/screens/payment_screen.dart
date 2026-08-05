import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/api_service.dart';
import '../core/smooth_route.dart';
import '../core/custom_toast.dart';
import '../widgets/custom_image.dart';

class PaymentScreen extends StatefulWidget {
  final String eventName;
  final double price;
  final String? qrUrl;
  final String? upiId;
  final String registrationId;
  final String referenceCode;
  final int? teamSizeLimit;

  const PaymentScreen({
    super.key,
    required this.eventName,
    required this.price,
    this.qrUrl,
    this.upiId,
    required this.registrationId,
    required this.referenceCode,
    this.teamSizeLimit,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool _isSubmitting = false;
  final _utrController = TextEditingController();

  @override
  void dispose() {
    _utrController.dispose();
    super.dispose();
  }

  Future<void> _submitPayment() async {
    final utr = _utrController.text.trim();
    if (utr.isEmpty) {
      showSpotlightToast(
        context,
        'Please enter your Transaction ID.',
        isError: true,
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final apiService = ApiService();
      final resData = await apiService.submitPayment(
        registrationId: widget.registrationId,
        transactionId: utr,
      );

      final generatedPasskey = resData['passkey'] as String?;

      if (mounted) {
        showSpotlightToast(
          context,
          'Registration & Payment submitted successfully!',
          icon: Icons.check_circle_rounded,
        );

        if (generatedPasskey != null && generatedPasskey.isNotEmpty) {
          await showDialog(
            context: context,
            barrierDismissible: false,
            builder: (dialogContext) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: const Text('Team Passkey Unlocked!'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Payment details submitted! Share this Team Passkey with your teammates so they can join:'),
                  const SizedBox(height: 16),
                  InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: generatedPasskey));
                      showSpotlightToast(
                        context,
                        'Passkey copied to clipboard!',
                        icon: Icons.copy_rounded,
                      );
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            generatedPasskey,
                            style: GoogleFonts.inter(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 4,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Icon(
                            Icons.copy_rounded,
                            color: Theme.of(context).colorScheme.primary,
                            size: 22,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tap to copy passkey',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Got it'),
                ),
              ],
            ),
          );
        }

        if (mounted) {
          Navigator.pushReplacement(
            context,
            SmoothRoute(builder: (_) => const PaymentPendingScreen()),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        showSpotlightToast(
          context,
          'Submission failed: $e',
          isError: true,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('Payment', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [

                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: cs.surfaceVariant,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Text('Paying for', style: GoogleFonts.inter(color: Colors.grey)),
                      const SizedBox(height: 8),
                      Text(widget.eventName, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                      if (widget.teamSizeLimit != null) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: cs.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'Team Event · Max ${widget.teamSizeLimit} members per team',
                            style: GoogleFonts.inter(fontSize: 12, color: cs.primary, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      Text('₹${widget.price.toStringAsFixed(0)}', style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.bold, color: cs.primary)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                if (widget.upiId != null && widget.upiId!.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(color: cs.outlineVariant),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('UPI ID', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                            const SizedBox(height: 4),
                            Text(widget.upiId!, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 20),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: widget.upiId!));
                            showSpotlightToast(
                              context,
                              'UPI ID copied to clipboard!',
                              icon: Icons.copy_rounded,
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '⚠️ Make sure you enter a valid Transaction ID. If incorrect, your registration request will not be approved.',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: const Color(0xFFF03D4E),
                      fontWeight: FontWeight.w500,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                Center(
                  child: Column(
                    children: [
                      Text('Scan QR to Pay', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 16),
                      Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: widget.qrUrl != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: CustomImage(url: widget.qrUrl!, fit: BoxFit.cover),
                              )
                            : Icon(Icons.qr_code_2, size: 150, color: Colors.grey[800]),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                Text('Transaction ID', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _utrController,
                  decoration: InputDecoration(
                    hintText: 'Enter Transaction ID',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Theme.of(context).colorScheme.surface,
                  ),
                ),
                const SizedBox(height: 32),

                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitPayment,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: cs.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text('Submit Payment', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ],
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
}

class PaymentPendingScreen extends StatelessWidget {
  const PaymentPendingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle_outline, size: 80, color: Colors.green),
            const SizedBox(height: 24),
            Text('Payment Pending', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: Text(
                'Your payment details have been submitted. It will be verified by the organizers shortly.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 16, color: Colors.grey, height: 1.5),
              ),
            ),
            const SizedBox(height: 40),
            ElevatedButton(
              onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
              child: const Text('Back to Home'),
            ),
          ],
        ),
      ),
    );
  }
}
