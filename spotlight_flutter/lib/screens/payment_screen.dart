import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../core/smooth_route.dart';
import '../widgets/custom_image.dart';

class PaymentScreen extends StatefulWidget {
  final String eventName;
  final double price;
  final String? qrUrl;

  const PaymentScreen({
    super.key,
    required this.eventName,
    required this.price,
    this.qrUrl,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  File? _image;
  bool _isSubmitting = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);

    if (pickedFile != null) {
      setState(() {
        _image = File(pickedFile.path);
      });
    }
  }

  Future<void> _submitPayment() async {
    if (_image == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload a screenshot of your payment.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    // Simulate API call and upload
    await Future.delayed(const Duration(seconds: 2));

    if (mounted) {
      setState(() => _isSubmitting = false);
      Navigator.pushReplacement(
        context,
        SmoothRoute(builder: (_) => const PaymentPendingScreen()),
      );
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
                // Summary Card
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
                      Text(widget.eventName, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      Text('₹${widget.price.toStringAsFixed(0)}', style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.bold, color: cs.primary)),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                
                // QR Code Placeholder
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
                const SizedBox(height: 32),
                
                // Upload Section
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
                
                // Submit Button
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
