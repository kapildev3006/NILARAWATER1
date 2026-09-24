import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/delivery_service.dart';
import '../services/alert_audio_service.dart';
import 'active_delivery_screen.dart';

class IncomingOrderRequestDialog extends StatefulWidget {
  final Map<String, dynamic> order;

  const IncomingOrderRequestDialog({super.key, required this.order});

  static Future<void> show(BuildContext context, Map<String, dynamic> order) {
    return showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => IncomingOrderRequestDialog(order: order),
    );
  }

  @override
  State<IncomingOrderRequestDialog> createState() => _IncomingOrderRequestDialogState();
}

class _IncomingOrderRequestDialogState extends State<IncomingOrderRequestDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  Timer? _countdownTimer;
  late int _secondsRemaining;
  late int _totalSeconds;
  bool _isAccepting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _totalSeconds = (widget.order['expiresInSeconds'] is int)
        ? widget.order['expiresInSeconds'] as int
        : 30;
    _secondsRemaining = _totalSeconds;

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _startCountdown();

    // Listen to claimed event or dismiss
    DeliveryService().orderClaimedAlert.addListener(_onOrderClaimedByOther);
  }

  void _onOrderClaimedByOther() {
    final alert = DeliveryService().orderClaimedAlert.value;
    if (alert != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(alert, style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
          backgroundColor: Colors.orange.shade800,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context, rootNavigator: true).maybePop();
    }
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_secondsRemaining > 1) {
        setState(() {
          _secondsRemaining--;
        });
      } else {
        timer.cancel();
        // Time expired, tell backend and dismiss
        final orderId = widget.order['orderId']?.toString() ?? widget.order['_id']?.toString();
        if (orderId != null && orderId.isNotEmpty) {
          DeliveryService().respondToOrderRequest(orderId, 'REJECT');
        }
        DeliveryService().latestIncomingOrder.value = null;
        if (mounted) {
          Navigator.of(context, rootNavigator: true).maybePop();
        }
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _countdownTimer?.cancel();
    DeliveryService().orderClaimedAlert.removeListener(_onOrderClaimedByOther);
    super.dispose();
  }

  Future<void> _handleAccept() async {
    final orderId = widget.order['orderId']?.toString() ?? widget.order['_id']?.toString();
    if (orderId == null || orderId.isEmpty) return;

    setState(() {
      _isAccepting = true;
      _errorMessage = null;
    });

    bool success = await DeliveryService().respondToOrderRequest(orderId, 'ACCEPT');
    if (!success) {
      success = await DeliveryService().acceptOrder(orderId);
    }
    if (!mounted) return;

    if (success) {
      DeliveryService().latestIncomingOrder.value = null;
      AlertAudioService().speak("Order accepted. Head to pickup point.");
      AlertAudioService().vibrate(durationMs: 300);

      // Close modal
      Navigator.of(context, rootNavigator: true).pop();

      // Navigate to active delivery
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const ActiveDeliveryScreen()),
      );
    } else {
      setState(() {
        _isAccepting = false;
        _errorMessage = "Order is no longer available or was claimed by another partner.";
      });
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          DeliveryService().latestIncomingOrder.value = null;
          Navigator.of(context, rootNavigator: true).maybePop();
        }
      });
    }
  }

  void _handleDecline() {
    final orderId = widget.order['orderId']?.toString() ?? widget.order['_id']?.toString();
    if (orderId != null && orderId.isNotEmpty) {
      DeliveryService().respondToOrderRequest(orderId, 'REJECT');
    }
    DeliveryService().latestIncomingOrder.value = null;
    Navigator.of(context, rootNavigator: true).maybePop();
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final orderNumber = order['orderNumber'] ??
        (order['_id'] != null
            ? "#${order['_id'].toString().substring(order['_id'].toString().length - 6).toUpperCase()}"
            : "NEW ORDER");

    final address = order['deliveryAddress'] ?? {};
    final recipientName = order['customerName'] ?? address['recipientName'] ?? address['fullName'] ?? "Customer";
    final recipientPhone = order['customerPhone'] ?? address['phone'] ?? "";
    final fullAddress = "${address['addressLine1'] ?? address['streetAddress'] ?? ''} ${address['addressLine2'] ?? ''}, ${address['city'] ?? ''}".trim();

    final totalPaise = order['totalPaise'] as num?;
    final amountText = totalPaise != null
        ? "₹${(totalPaise / 100).toStringAsFixed(2)}"
        : (order['totalAmount'] != null ? "₹${order['totalAmount']}" : "₹250.00");

    final deliveryFeePaise = order['deliveryFeePaise'] as num?;
    final earningFee = deliveryFeePaise != null && deliveryFeePaise > 0
        ? "₹${(deliveryFeePaise / 100).toStringAsFixed(0)}"
        : (order['deliveryFee'] != null ? "₹${order['deliveryFee']}" : "₹25");

    final items = order['items'] is List ? (order['items'] as List) : [];
    final itemsCount = items.isNotEmpty ? items.length : (order['itemCount'] ?? 1);

    final progressRatio = (_secondsRemaining / _totalSeconds).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 30,
            spreadRadius: 4,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Linear Countdown Bar
            LinearProgressIndicator(
              value: progressRatio,
              backgroundColor: Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation<Color>(
                _secondsRemaining < 10 ? Colors.redAccent : const Color(0xFF1E9C1C),
              ),
              minHeight: 6,
            ),

            // Pulsing Header with Urgency
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Row(
                children: [
                  AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: 1.0 + (_pulseController.value * 0.18),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E9C1C).withValues(alpha: 0.25 + (_pulseController.value * 0.25)),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.notifications_active_rounded,
                            color: Color(0xFF4ADE80),
                            size: 22,
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              "NEW DELIVERY REQUEST",
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                                color: const Color(0xFF4ADE80),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          "$orderNumber • $itemsCount ${itemsCount == 1 ? 'item' : 'items'}",
                          style: GoogleFonts.outfit(fontSize: 12, color: Colors.white70),
                        ),
                      ],
                    ),
                  ),
                  // Countdown Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: _secondsRemaining < 10 ? Colors.redAccent : Colors.white24,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.timer_outlined,
                          size: 14,
                          color: _secondsRemaining < 10 ? Colors.redAccent : Colors.white,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          "${_secondsRemaining}s",
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: _secondsRemaining < 10 ? Colors.redAccent : Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Payout & Earnings Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              color: const Color(0xFFF0FDF4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "YOUR EARNING FOR TRIP",
                        style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFF166534), letterSpacing: 0.5),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "$earningFee Guaranteed",
                        style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w900, color: const Color(0xFF15803D)),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text("Bill Amount", style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey.shade600)),
                        Text(amountText, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: Colors.red.shade50,
                child: Text(
                  _errorMessage!,
                  style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.red.shade700),
                ),
              ),

            // Trip Route Details
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Column(
                children: [
                  // Pickup Location
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E9C1C),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                            ),
                          ),
                          Container(
                            width: 2,
                            height: 38,
                            color: Colors.grey.shade300,
                          ),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("PICKUP HUB", style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade500, letterSpacing: 0.5)),
                            Text("Nilara Dark Store & Warehouse", style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87)),
                            Text("Main Logistics Center", style: GoogleFonts.outfit(fontSize: 12, color: Colors.black54)),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Delivery Location
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: Colors.redAccent,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("CUSTOMER DROP-OFF", style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade500, letterSpacing: 0.5)),
                            Text(
                              recipientName,
                              style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87),
                            ),
                            Text(
                              fullAddress.isNotEmpty ? fullAddress : "Address provided by customer",
                              style: GoogleFonts.outfit(fontSize: 12, color: Colors.black54),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (recipientPhone.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Text("📞 $recipientPhone", style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // Action Buttons (Decline / Accept)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
              child: Row(
                children: [
                  // Decline Button
                  Expanded(
                    flex: 2,
                    child: OutlinedButton(
                      onPressed: _isAccepting ? null : _handleDecline,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: BorderSide(color: Colors.grey.shade300),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(
                        "Decline",
                        style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.grey.shade700),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Accept Button (Vibrant Green)
                  Expanded(
                    flex: 3,
                    child: ElevatedButton(
                      onPressed: _isAccepting ? null : _handleAccept,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E9C1C),
                        elevation: 4,
                        shadowColor: const Color(0xFF1E9C1C).withValues(alpha: 0.4),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _isAccepting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.flash_on_rounded, color: Colors.white, size: 20),
                                const SizedBox(width: 6),
                                Text(
                                  "ACCEPT ORDER",
                                  style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.5),
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
