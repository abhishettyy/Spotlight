import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
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
  File? _image;
  bool _isSubmitting = false;
  final _utrController = TextEditingController();

  @override
  void dispose() {
    _utrController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();

    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 50,
      maxWidth: 1000,
      maxHeight: 1000,
    );

    if (pickedFile != null) {
      setState(() {
        _image = File(pickedFile.path);
      });
    }
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

    if (_image == null) {
      showSpotlightToast(
        context,
        'Please upload a screenshot of your payment.',
        isError: true,
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final bytes = await _image!.readAsBytes();
      final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';

      final apiService = ApiService();
      await apiService.uploadPaymentProof(
        registrationId: widget.registrationId,
        base64Image: base64Image,
        transactionId: utr,
      );

      if (mounted) {
        showSpotlightToast(
          context,
          'Registration submitted successfully!',
          icon: Icons.check_circle_rounded,
        );
        Navigator.pushReplacement(
          context,
          SmoothRoute(builder: (_) => const PaymentPendingScreen()),
        );
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

    final displayCode = widget.referenceCode.length > 6
        ? 'REG-${widget.referenceCode.substring(0, 6).toUpperCase()}'
        : widget.referenceCode.toUpperCase();

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

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(color: cs.outlineVariant),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('1. Copy Payment Details', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: cs.primary)),
                      const SizedBox(height: 16),
                      if (widget.upiId != null && widget.upiId!.isNotEmpty) ...[
                        Row(
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
                        const Divider(height: 24),
                      ],
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Payment Reference / Remarks', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                              const SizedBox(height: 4),
                              Text(displayCode, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: cs.secondary)),
                            ],
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy_rounded, size: 20),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: displayCode));
                              showSpotlightToast(
                                context,
                                'Reference Code copied!',
                                icon: Icons.copy_rounded,
                              );
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '⚠️ IMPORTANT: You must paste this Reference Code into the remarks/note field of your UPI app when making payment.',
                        style: GoogleFonts.inter(fontSize: 11, color: Colors.red[400], fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

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
                const SizedBox(height: 24),

                Text('Upload Payment Proof', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _pickImage,
                  child: Container(
                    height: 150,
                    decoration: BoxDecoration(
                      color: cs.surfaceVariant.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: cs.primary.withOpacity(0.5), width: 2, style: BorderStyle.solid),
                    ),
                    child: _image != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: Image.file(_image!, fit: BoxFit.cover),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.cloud_upload_outlined, size: 40, color: cs.primary),
                              const SizedBox(height: 8),
                              Text('Tap to upload screenshot', style: GoogleFonts.inter(color: cs.primary)),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 40),

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
                'Your payment screenshot has been uploaded. It will be verified by the organizers shortly.',
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
