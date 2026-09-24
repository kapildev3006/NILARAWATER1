import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'order_delivered_screen.dart';
import '../services/delivery_service.dart';
import '../services/user_service.dart';
import '../services/alert_audio_service.dart';

enum DeliveryFlowStep {
  goToPickup,
  arrivedAtPickup,
  pickedUpOutForDelivery,
  arrivedAtCustomer,
}

class ActiveDeliveryScreen extends StatefulWidget {
  const ActiveDeliveryScreen({super.key});

  @override
  State<ActiveDeliveryScreen> createState() => _ActiveDeliveryScreenState();
}

class _ActiveDeliveryScreenState extends State<ActiveDeliveryScreen> {
  final LatLng _storeLocation = const LatLng(28.6200, 77.3639);
  final LatLng _customerLocation = const LatLng(28.5900, 77.4400);
  List<LatLng> _routePoints = [];
  final MapController _mapController = MapController();

  DeliveryFlowStep _currentStep = DeliveryFlowStep.goToPickup;
  bool _isProcessingAction = false;

  int _jarsDelivered = 1;
  int _emptyJarsCollected = 1;
  final TextEditingController _pinController = TextEditingController(text: "1234");

  @override
  void initState() {
    super.initState();
    _initStepFromActiveOrder();
    _fetchRoute();
  }

  void _initStepFromActiveOrder() {
    final order = DeliveryService().activeOrder.value;
    if (order != null) {
      final status = (order['deliveryStatus'] ?? order['status'] ?? '').toString().toUpperCase();
      if (status == 'ARRIVED_AT_PICKUP') {
        _currentStep = DeliveryFlowStep.arrivedAtPickup;
      } else if (status == 'OUT_FOR_DELIVERY' || status == 'PICKED_UP') {
        _currentStep = DeliveryFlowStep.pickedUpOutForDelivery;
      } else if (status == 'ARRIVED_AT_CUSTOMER') {
        _currentStep = DeliveryFlowStep.arrivedAtCustomer;
      }

      // Initialize default jars from items
      final items = order['items'] as List<dynamic>? ?? [];
      int jarCount = 0;
      for (var item in items) {
        final name = (item['name'] ?? '').toString().toLowerCase();
        if (name.contains('jar') || name.contains('20l')) {
          jarCount += (item['quantity'] as num? ?? 1).toInt();
        }
      }
      if (jarCount > 0) {
        _jarsDelivered = jarCount;
        _emptyJarsCollected = jarCount;
      }
    }
  }

  Future<void> _fetchRoute() async {
    final url =
        'http://router.project-osrm.org/route/v1/driving/${_storeLocation.longitude},${_storeLocation.latitude};${_customerLocation.longitude},${_customerLocation.latitude}?overview=full&geometries=geojson';
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final coordinates = data['routes'][0]['geometry']['coordinates'] as List;
        if (mounted) {
          setState(() {
            _routePoints = coordinates.map((coord) => LatLng(coord[1], coord[0])).toList();
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _routePoints = [_storeLocation, _customerLocation];
        });
      }
    }

    final prefs = UserService().currentUser.value?.deliveryDetails?['preferences'];
    final bool voicePrompts = prefs == null || prefs['voiceRoutePrompts'] != false;
    final bool autoCenter = prefs == null || prefs['autoCenterMap'] != false;

    if (autoCenter) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        try {
          _mapController.move(_storeLocation, 14.0);
        } catch (_) {}
      });
    }

    if (voicePrompts) {
      AlertAudioService().speak("Live delivery route loaded. Proceed towards destination.");
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
      debugPrint("Error dialing phone: $e");
    }
  }

  Future<void> _handleStepAction() async {
    final order = DeliveryService().activeOrder.value;
    final String orderId = order?['_id']?.toString() ?? order?['orderId']?.toString() ?? '';
    if (orderId.isEmpty) return;

    setState(() {
      _isProcessingAction = true;
    });

    if (_currentStep == DeliveryFlowStep.goToPickup) {
      final success = await DeliveryService().arrivedAtPickup(orderId);
      if (success && mounted) {
        setState(() {
          _currentStep = DeliveryFlowStep.arrivedAtPickup;
        });
        AlertAudioService().speak("Arrived at warehouse. Verify items for pickup.");
      }
    } else if (_currentStep == DeliveryFlowStep.arrivedAtPickup) {
      final success = await DeliveryService().confirmPickup(orderId);
      if (success && mounted) {
        setState(() {
          _currentStep = DeliveryFlowStep.pickedUpOutForDelivery;
        });
        AlertAudioService().speak("Pickup confirmed. Out for delivery to customer.");
      }
    } else if (_currentStep == DeliveryFlowStep.pickedUpOutForDelivery) {
      final success = await DeliveryService().arrivedAtCustomer(orderId);
      if (success && mounted) {
        setState(() {
          _currentStep = DeliveryFlowStep.arrivedAtCustomer;
        });
        AlertAudioService().speak("Arrived at customer location. Complete handover.");
      }
    } else if (_currentStep == DeliveryFlowStep.arrivedAtCustomer) {
      _showCompleteDeliveryBottomSheet();
    }

    if (mounted) {
      setState(() {
        _isProcessingAction = false;
      });
    }
  }

  void _showCompleteDeliveryBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (bottomSheetContext, setModalState) {
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
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    "Complete Delivery",
                    style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Record delivered products & collected empty jars",
                    style: GoogleFonts.outfit(fontSize: 13, color: Colors.black54),
                  ),
                  const SizedBox(height: 20),

                  // Returnable Water Jar Counter 1: Full Jars Delivered
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
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text("Full 20L Jars Delivered",
                                    style: GoogleFonts.outfit(
                                        fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF0369A1))),
                                Text("Handover to customer",
                                    style: GoogleFonts.outfit(fontSize: 11, color: const Color(0xFF0284C7))),
                              ],
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF0284C7)),
                              onPressed: () {
                                if (_jarsDelivered > 0) {
                                  setModalState(() => _jarsDelivered--);
                                  setState(() {});
                                }
                              },
                            ),
                            Text("$_jarsDelivered",
                                style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.bold, fontSize: 18, color: const Color(0xFF0369A1))),
                            IconButton(
                              icon: const Icon(Icons.add_circle, color: Color(0xFF0284C7)),
                              onPressed: () {
                                setModalState(() => _jarsDelivered++);
                                setState(() {});
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Returnable Water Jar Counter 2: Empty Jars Collected
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
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text("Empty Jars Collected",
                                    style: GoogleFonts.outfit(
                                        fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFFB45309))),
                                Text("Return to warehouse stock",
                                    style: GoogleFonts.outfit(fontSize: 11, color: const Color(0xFFD97706))),
                              ],
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Color(0xFFD97706)),
                              onPressed: () {
                                if (_emptyJarsCollected > 0) {
                                  setModalState(() => _emptyJarsCollected--);
                                  setState(() {});
                                }
                              },
                            ),
                            Text("$_emptyJarsCollected",
                                style: GoogleFonts.outfit(
                                    fontWeight: FontWeight.bold, fontSize: 18, color: const Color(0xFFB45309))),
                            IconButton(
                              icon: const Icon(Icons.add_circle, color: Color(0xFFD97706)),
                              onPressed: () {
                                setModalState(() => _emptyJarsCollected++);
                                setState(() {});
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Customer PIN / OTP input
                  Text("Customer Verification PIN",
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _pinController,
                    keyboardType: TextInputType.number,
                    maxLength: 4,
                    decoration: InputDecoration(
                      hintText: "4-Digit PIN (e.g. 1234)",
                      counterText: "",
                      prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF1E9C1C)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: () async {
                        final order = DeliveryService().activeOrder.value;
                        final String orderId =
                            order?['_id']?.toString() ?? order?['orderId']?.toString() ?? '';
                        if (orderId.isNotEmpty) {
                          final success = await DeliveryService().completeDeliveryStep(
                            orderId,
                            jarsDelivered: _jarsDelivered,
                            emptyJarsCollected: _emptyJarsCollected,
                          );

                          if (success && mounted) {
                            Navigator.of(context, rootNavigator: true).pop(); // Close sheet
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(builder: (context) => const OrderDeliveredScreen()),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E9C1C),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                      child: Text(
                        "Verify & Confirm Delivery",
                        style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
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

  String _getStepButtonLabel() {
    switch (_currentStep) {
      case DeliveryFlowStep.goToPickup:
        return "Arrived at Pickup Warehouse";
      case DeliveryFlowStep.arrivedAtPickup:
        return "Confirm Pickup & Handover";
      case DeliveryFlowStep.pickedUpOutForDelivery:
        return "Arrived at Customer Location";
      case DeliveryFlowStep.arrivedAtCustomer:
        return "Complete Delivery & Return Jars";
    }
  }

  IconData _getStepButtonIcon() {
    switch (_currentStep) {
      case DeliveryFlowStep.goToPickup:
        return Icons.warehouse_rounded;
      case DeliveryFlowStep.arrivedAtPickup:
        return Icons.inventory_2_rounded;
      case DeliveryFlowStep.pickedUpOutForDelivery:
        return Icons.directions_bike_rounded;
      case DeliveryFlowStep.arrivedAtCustomer:
        return Icons.check_circle_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final prefs = UserService().currentUser.value?.deliveryDetails?['preferences'];
    final bool isHighContrast = prefs != null && prefs['highContrastMap'] == true;
    final String tileUrl = isHighContrast
        ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

    final activeOrder = DeliveryService().activeOrder.value;
    final customerName = activeOrder?['deliveryAddressSnapshot']?['recipientName'] ??
        activeOrder?['deliveryAddress']?['recipientName'] ??
        activeOrder?['customerName'] ??
        'Customer';
    final customerPhone = activeOrder?['deliveryAddressSnapshot']?['phone'] ??
        activeOrder?['deliveryAddress']?['phone'] ??
        activeOrder?['customerPhone'] ??
        '';
    final customerAddress = activeOrder?['deliveryAddressSnapshot']?['addressLine1'] ??
        activeOrder?['deliveryAddress']?['addressLine1'] ??
        activeOrder?['address'] ??
        'Plot 14, Sector 62, Noida, Uttar Pradesh';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          "Active Delivery",
          style: GoogleFonts.outfit(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: Stack(
        children: [
          // MAP
          Positioned.fill(
            child: FlutterMap(
              mapController: _mapController,
              options: const MapOptions(
                initialCenter: LatLng(28.6050, 77.4019),
                initialZoom: 13.0,
              ),
              children: [
                TileLayer(
                  urlTemplate: tileUrl,
                  userAgentPackageName: 'com.cyberlim.delivery',
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _routePoints.isEmpty ? [_storeLocation, _customerLocation] : _routePoints,
                      strokeWidth: 5.0,
                      color: const Color(0xFF1E9C1C),
                    ),
                  ],
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _storeLocation,
                      width: 50,
                      height: 50,
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 8)],
                        ),
                        child: const Padding(
                          padding: EdgeInsets.all(4.0),
                          child: Icon(Icons.warehouse, color: Color(0xFF1E9C1C), size: 28),
                        ),
                      ),
                    ),
                    Marker(
                      point: _customerLocation,
                      width: 40,
                      height: 40,
                      child: const Icon(Icons.location_on, color: Colors.red, size: 40),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // FLOATING RE-CENTER GPS BUTTON
          Positioned(
            bottom: 24,
            right: 20,
            child: FloatingActionButton.small(
              heroTag: 'recenter_gps',
              backgroundColor: Colors.white,
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              onPressed: () {
                _mapController.move(_storeLocation, 14.5);
                AlertAudioService().vibrate(durationMs: 150);
              },
              child: const Icon(Icons.my_location_rounded, color: Color(0xFF1E9C1C), size: 22),
            ),
          ),

          // TOP OVERLAY CARD: Customer & Navigation details
          Positioned(
            top: 16,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, spreadRadius: 2)
                ],
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _currentStep == DeliveryFlowStep.goToPickup ? "Pickup Warehouse" : "Deliver to",
                          style: GoogleFonts.outfit(color: Colors.black54, fontSize: 12),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _currentStep == DeliveryFlowStep.goToPickup ? "Nilara Central Hub" : customerName,
                          style: GoogleFonts.outfit(color: Colors.black87, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _currentStep == DeliveryFlowStep.goToPickup
                              ? "Plot 42, Sector 62, Noida, UP"
                              : customerAddress,
                          style: GoogleFonts.outfit(color: Colors.black54, fontSize: 13, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      if (customerPhone.isNotEmpty)
                        GestureDetector(
                          onTap: () => _makePhoneCall(customerPhone),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F5E9),
                              border: Border.all(color: const Color(0xFF1E9C1C).withValues(alpha: 0.3)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.call, color: Color(0xFF1E9C1C), size: 20),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),

      // BOTTOM PROGRESSION PANEL
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -4))
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Step Indicator Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildStepPill("1. Pickup", _currentStep.index >= 0),
                _buildStepDivider(_currentStep.index >= 1),
                _buildStepPill("2. Handover", _currentStep.index >= 1),
                _buildStepDivider(_currentStep.index >= 2),
                _buildStepPill("3. Drop-off", _currentStep.index >= 2),
                _buildStepDivider(_currentStep.index >= 3),
                _buildStepPill("4. Done", _currentStep.index >= 3),
              ],
            ),
            const SizedBox(height: 18),

            // Dynamic Step Progression Action Button
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                onPressed: _isProcessingAction ? null : _handleStepAction,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E9C1C),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                icon: _isProcessingAction
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Icon(_getStepButtonIcon(), size: 20),
                label: Text(
                  _isProcessingAction ? "Updating..." : _getStepButtonLabel(),
                  style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepPill(String title, bool isCompleted) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isCompleted ? const Color(0xFFE8F5E9) : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        title,
        style: GoogleFonts.outfit(
          fontSize: 11,
          fontWeight: isCompleted ? FontWeight.bold : FontWeight.w500,
          color: isCompleted ? const Color(0xFF1E9C1C) : Colors.grey.shade500,
        ),
      ),
    );
  }

  Widget _buildStepDivider(bool isCompleted) {
    return Container(
      width: 12,
      height: 2,
      color: isCompleted ? const Color(0xFF1E9C1C) : Colors.grey.shade300,
    );
  }
}
