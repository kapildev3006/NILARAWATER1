import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/delivery_service.dart';
import '../services/alert_audio_service.dart';

class SubscriptionRouteScreen extends StatefulWidget {
  final Map<String, dynamic> route;

  const SubscriptionRouteScreen({super.key, required this.route});

  @override
  State<SubscriptionRouteScreen> createState() => _SubscriptionRouteScreenState();
}

class _SubscriptionRouteScreenState extends State<SubscriptionRouteScreen> {
  late Map<String, dynamic> _routeData;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _routeData = Map<String, dynamic>.from(widget.route);
    DeliveryService().myRoutes.addListener(_onRoutesUpdated);
  }

  @override
  void dispose() {
    DeliveryService().myRoutes.removeListener(_onRoutesUpdated);
    super.dispose();
  }

  void _onRoutesUpdated() {
    final routes = DeliveryService().myRoutes.value;
    final updated = routes.firstWhere(
      (r) => r['_id'] == _routeData['_id'],
      orElse: () => null,
    );
    if (updated != null && mounted) {
      setState(() {
        _routeData = Map<String, dynamic>.from(updated);
      });
    }
  }

  Future<void> _makePhoneCall(String phone) async {
    if (phone.isEmpty) return;
    final Uri uri = Uri(scheme: 'tel', path: phone);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    } catch (e) {
      debugPrint("Error making call: $e");
    }
  }

  Future<void> _handleStartRoute() async {
    final routeId = _routeData['_id']?.toString();
    if (routeId == null) return;

    setState(() => _isLoading = true);
    final success = await DeliveryService().startRoute(routeId);
    setState(() => _isLoading = false);

    if (success && mounted) {
      AlertAudioService().speak("Subscription delivery route started. Proceed to Stop 1.");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Route Started! Proceed to the first customer stop.",
              style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          backgroundColor: const Color(0xFF1E9C1C),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showCompleteStopDialog(Map<String, dynamic> delivery) {
    int jarsDelivered = (delivery['totalJarsToDeliver'] as num? ?? 1).toInt();
    int emptyJarsCollected = jarsDelivered;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
                top: 24,
                left: 24,
                right: 24,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 5,
                      decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "Complete Stop #${delivery['stopIndex'] ?? 1}",
                    style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  Text(
                    delivery['customer']?['displayName'] ?? delivery['deliveryAddress']?['recipientName'] ?? "Customer",
                    style: GoogleFonts.outfit(fontSize: 14, color: Colors.black54),
                  ),
                  const SizedBox(height: 20),

                  // Jar Stepper 1: Full jars delivered
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2FE),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFBAE6FD)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.water_drop, color: Color(0xFF0284C7), size: 24),
                            const SizedBox(width: 10),
                            Text("Full Jars Delivered",
                                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF0369A1))),
                          ],
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF0284C7)),
                              onPressed: () {
                                if (jarsDelivered > 0) setModalState(() => jarsDelivered--);
                              },
                            ),
                            Text("$jarsDelivered",
                                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18, color: const Color(0xFF0369A1))),
                            IconButton(
                              icon: const Icon(Icons.add_circle, color: Color(0xFF0284C7)),
                              onPressed: () => setModalState(() => jarsDelivered++),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Jar Stepper 2: Empty jars collected
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.replay_circle_filled, color: Color(0xFFD97706), size: 24),
                            const SizedBox(width: 10),
                            Text("Empty Jars Collected",
                                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFFB45309))),
                          ],
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Color(0xFFD97706)),
                              onPressed: () {
                                if (emptyJarsCollected > 0) setModalState(() => emptyJarsCollected--);
                              },
                            ),
                            Text("$emptyJarsCollected",
                                style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18, color: const Color(0xFFB45309))),
                            IconButton(
                              icon: const Icon(Icons.add_circle, color: Color(0xFFD97706)),
                              onPressed: () => setModalState(() => emptyJarsCollected++),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () async {
                        final routeId = _routeData['_id']?.toString() ?? '';
                        final stopId = delivery['_id']?.toString() ?? '';
                        Navigator.pop(ctx);

                        final success = await DeliveryService().updateRouteStopStatus(
                          routeId,
                          stopId,
                          status: 'DELIVERED',
                          jarsDelivered: jarsDelivered,
                          emptyJarsCollected: emptyJarsCollected,
                        );

                        if (success && mounted) {
                          AlertAudioService().speak("Stop delivered. ₹20 added to your wallet.");
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text("Stop completed! ₹20 credited to your wallet.",
                                  style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
                              backgroundColor: const Color(0xFF1E9C1C),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E9C1C),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text("Confirm Stop Delivered (+₹20)",
                          style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showCustomerUnavailableDialog(Map<String, dynamic> delivery) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text("Mark Customer Unavailable", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Text("Mark this subscriber stop as unavailable? The route will advance to the next customer.",
            style: GoogleFonts.outfit(fontSize: 14)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text("Cancel", style: GoogleFonts.outfit(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final routeId = _routeData['_id']?.toString() ?? '';
              final stopId = delivery['_id']?.toString() ?? '';
              await DeliveryService().updateRouteStopStatus(
                routeId,
                stopId,
                status: 'CUSTOMER_UNAVAILABLE',
                failureReason: 'Door locked / customer unavailable',
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            child: Text("Confirm", style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String routeNumber = _routeData['routeNumber'] ?? 'Route #R101';
    final String area = _routeData['area'] ?? 'Sector 62';
    final String timeSlot = _routeData['timeSlot']?['label'] ?? 'Morning (6:00 AM - 9:00 AM)';
    final String status = (_routeData['status'] ?? 'CREATED').toString().toUpperCase();
    final int totalStops = _routeData['totalStops'] ?? 0;
    final int completedStops = _routeData['completedStops'] ?? 0;
    final int remainingStops = (totalStops - completedStops).clamp(0, 9999);
    final int totalJars = _routeData['totalJarsToDeliver'] ?? 0;
    final List<dynamic> deliveries = _routeData['deliveries'] is List ? _routeData['deliveries'] : [];

    final bool isStarted = status == 'STARTED';
    final bool isCompleted = status == 'COMPLETED';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(routeNumber, style: GoogleFonts.outfit(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ROUTE SUMMARY HERO CARD
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0284C7), Color(0xFF0369A1)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: const Color(0xFF0284C7).withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0, 8)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(area,
                            style: GoogleFonts.outfit(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isCompleted
                              ? Colors.green.shade400
                              : (isStarted ? Colors.orange.shade400 : Colors.white.withValues(alpha: 0.25)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          isCompleted ? "COMPLETED" : (isStarted ? "IN PROGRESS" : "ASSIGNED"),
                          style: GoogleFonts.outfit(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.access_time_filled, color: Colors.white70, size: 16),
                      const SizedBox(width: 6),
                      Text(timeSlot, style: GoogleFonts.outfit(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Progress Bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: totalStops > 0 ? (completedStops / totalStops) : 0,
                      backgroundColor: Colors.white.withValues(alpha: 0.2),
                      color: const Color(0xFF4ADE80),
                      minHeight: 8,
                    ),
                  ),
                  const SizedBox(height: 18),

                  // 4 Stats Columns
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildWhiteStat("$totalStops", "Total Stops"),
                      _buildWhiteStat("$completedStops", "Completed"),
                      _buildWhiteStat("$remainingStops", "Remaining"),
                      _buildWhiteStat("$totalJars", "Total Jars"),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // START ROUTE BUTTON (if not yet started)
            if (!isStarted && !isCompleted)
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton.icon(
                  onPressed: _isLoading ? null : _handleStartRoute,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E9C1C),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  icon: _isLoading
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 24),
                  label: Text("Start Route Batch",
                      style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),

            const SizedBox(height: 24),

            // STOPS SECTION HEADER
            Text("Route Stops ($totalStops)",
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
            const SizedBox(height: 12),

            // STOPS LIST
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: deliveries.length,
              separatorBuilder: (context, index) => const SizedBox(height: 14),
              itemBuilder: (context, index) {
                final del = deliveries[index];
                final int stopNum = del['stopIndex'] ?? (index + 1);
                final String stopStatus = (del['deliveryStatus'] ?? 'ASSIGNED').toString().toUpperCase();
                final bool isDelivered = stopStatus == 'DELIVERED';
                final bool isUnavailable = stopStatus == 'CUSTOMER_UNAVAILABLE';
                final bool isOutForDel = stopStatus == 'OUT_FOR_DELIVERY';

                final String customerName = del['customer']?['displayName'] ??
                    del['deliveryAddress']?['recipientName'] ??
                    'Customer';
                final String customerPhone = del['customer']?['phone'] ??
                    del['deliveryAddress']?['phone'] ??
                    '';
                final String address = del['deliveryAddress']?['addressLine1'] ??
                    del['deliveryAddress']?['street'] ??
                    'Customer Address';
                final int jars = (del['totalJarsToDeliver'] as num? ?? 1).toInt();
                final bool leaveAtDoor = del['leaveAtDoor'] == true;
                final bool callBeforeDelivery = del['callBeforeDelivery'] == true;

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDelivered
                          ? Colors.green.shade200
                          : (isOutForDel ? const Color(0xFF0284C7) : Colors.grey.shade200),
                      width: isOutForDel ? 1.5 : 1,
                    ),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top Row: Stop badge & Status
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDelivered
                                  ? Colors.green.shade50
                                  : (isOutForDel ? Colors.blue.shade50 : Colors.grey.shade100),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              "STOP #$stopNum",
                              style: GoogleFonts.outfit(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isDelivered
                                    ? const Color(0xFF1E9C1C)
                                    : (isOutForDel ? const Color(0xFF0284C7) : Colors.black54),
                              ),
                            ),
                          ),
                          if (isDelivered)
                            Text("✓ Delivered",
                                style: GoogleFonts.outfit(color: const Color(0xFF1E9C1C), fontSize: 12, fontWeight: FontWeight.bold))
                          else if (isUnavailable)
                            Text("Unavailable",
                                style: GoogleFonts.outfit(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold))
                          else if (isOutForDel)
                            Text("Current Stop",
                                style: GoogleFonts.outfit(color: const Color(0xFF0284C7), fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Customer & Phone
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(customerName,
                                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87)),
                          ),
                          if (customerPhone.isNotEmpty)
                            GestureDetector(
                              onTap: () => _makePhoneCall(customerPhone),
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade50,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.phone, color: Color(0xFF1E9C1C), size: 18),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Address
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on, size: 16, color: Colors.redAccent),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(address, style: GoogleFonts.outfit(fontSize: 13, color: Colors.black54, height: 1.3)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Products
                      Row(
                        children: [
                          const Icon(Icons.water_drop, size: 16, color: Color(0xFF0284C7)),
                          const SizedBox(width: 6),
                          Text("$jars x 20L Nilara Pure Water Jar",
                              style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A))),
                        ],
                      ),

                      // Instructions tags
                      if (leaveAtDoor || callBeforeDelivery) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          children: [
                            if (leaveAtDoor) _buildTagChip("🚪 Leave at door"),
                            if (callBeforeDelivery) _buildTagChip("📞 Call before delivery"),
                          ],
                        ),
                      ],

                      // ACTION BUTTONS (if route started & stop pending)
                      if (isStarted && !isDelivered && !isUnavailable) ...[
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: ElevatedButton.icon(
                                onPressed: () => _showCompleteStopDialog(del),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1E9C1C),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(vertical: 11),
                                ),
                                icon: const Icon(Icons.check_circle_outline, color: Colors.white, size: 18),
                                label: Text("Delivered",
                                    style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 1,
                              child: OutlinedButton(
                                onPressed: () => _showCustomerUnavailableDialog(del),
                                style: OutlinedButton.styleFrom(
                                  side: BorderSide(color: Colors.grey.shade300),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 11),
                                ),
                                child: Text("Skip",
                                    style: GoogleFonts.outfit(color: Colors.grey.shade700, fontWeight: FontWeight.bold, fontSize: 12)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWhiteStat(String val, String label) {
    return Column(
      children: [
        Text(val, style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(label, style: GoogleFonts.outfit(color: Colors.white70, fontSize: 11)),
      ],
    );
  }

  Widget _buildTagChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Text(text, style: GoogleFonts.outfit(fontSize: 11, color: Colors.blue.shade800, fontWeight: FontWeight.w500)),
    );
  }
}
