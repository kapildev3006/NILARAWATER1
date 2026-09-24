import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/wallet_service.dart';
import '../services/delivery_service.dart';
import 'new_order_screen.dart';
import 'incentives_screen.dart';
import 'subscription_route_screen.dart';

class HomeTab extends StatefulWidget {
  final Function(int)? onSelectTab;

  const HomeTab({super.key, this.onSelectTab});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  String _selectedFilter = 'all'; // 'all', 'pending', 'delivered'
  String? _deliveringItemId;

  @override
  void initState() {
    super.initState();
    DeliveryService().fetchTodaysDeliveries();
    DeliveryService().fetchMyRoutes();
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    if (phoneNumber.isEmpty) return;
    final Uri uri = Uri(scheme: 'tel', path: phoneNumber);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Cannot launch phone dialer for $phoneNumber",
                  style: GoogleFonts.outfit(color: Colors.white)),
              backgroundColor: Colors.redAccent,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Error launching call: $e');
    }
  }

  Future<void> _handleMarkDelivered(Map<String, dynamic> item) async {
    final String itemId = item['id']?.toString() ?? '';
    final String type = item['type']?.toString() ?? 'subscription';
    final String subId = item['subscriptionId']?.toString() ?? '';
    final String orderId = item['orderId']?.toString() ?? '';

    setState(() {
      _deliveringItemId = itemId;
    });

    bool success = false;
    if (type == 'subscription' && subId.isNotEmpty) {
      success = await DeliveryService().markSubscriptionDelivered(subId);
    } else if (orderId.isNotEmpty) {
      success = await DeliveryService().updateDeliveryStatus(orderId, 'delivered');
      if (success) {
        await DeliveryService().fetchTodaysDeliveries();
      }
    }

    if (!mounted) return;

    setState(() {
      _deliveringItemId = null;
    });

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Delivery Completed!",
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
                    Text("₹20 delivery fee credited to your wallet.",
                        style: GoogleFonts.outfit(fontSize: 12, color: Colors.white70)),
                  ],
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF1E9C1C),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Could not mark delivery complete. Please retry.",
              style: GoogleFonts.outfit(color: Colors.white)),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: const Color(0xFF1E9C1C),
      onRefresh: () async {
        await Future.wait([
          DeliveryService().fetchTodaysDeliveries(),
          WalletService.instance.fetchWalletData(),
        ]);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Hello, Rider 👋",
                        style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87)),
                    const SizedBox(height: 4),
                    Text("Ready for your next delivery?",
                        style: GoogleFonts.outfit(fontSize: 14, color: Colors.black54)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Earnings Card with Live Shared Wallet Balance!
            ValueListenableBuilder<double>(
              valueListenable: WalletService.instance.balanceNotifier,
              builder: (context, currentBalance, child) {
                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4A148C), Color(0xFF7B1FA2)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF7B1FA2).withValues(alpha: 0.5),
                        blurRadius: 20,
                        spreadRadius: 4,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text("Today's Earning Balance",
                                  style: GoogleFonts.outfit(
                                      color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500)),
                              const SizedBox(height: 4),
                              Text("₹${currentBalance.toStringAsFixed(2)}",
                                  style: GoogleFonts.outfit(
                                      color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          GestureDetector(
                            onTap: () => widget.onSelectTab?.call(1), // Go to Earnings tab
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                              child: const Icon(Icons.account_balance_wallet, color: Colors.white, size: 28),
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 24),
                      Divider(color: Colors.white.withValues(alpha: 0.2), thickness: 1),
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Expanded(
                            child: ValueListenableBuilder<int>(
                              valueListenable: WalletService.instance.todayDeliveredOrdersNotifier,
                              builder: (context, count, child) {
                                return _buildPurpleStatColumn(
                                  "$count",
                                  "Orders Delivered",
                                  onTap: () => widget.onSelectTab?.call(2), // Go to Orders tab
                                );
                              },
                            ),
                          ),
                          Container(height: 35, width: 1, color: Colors.white.withValues(alpha: 0.2)),
                          Expanded(child: _buildPurpleStatColumn("12.4 km", "Distance")),
                          Container(height: 35, width: 1, color: Colors.white.withValues(alpha: 0.2)),
                          Expanded(child: _buildPurpleStatColumn("4h 25m", "Online Time")),
                        ],
                      )
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 32),

            // Quick Actions
            Text("Quick Actions",
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildActionBox(Icons.shopping_bag, "New Order", Colors.green, onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (context) => const NewOrderScreen()));
                }),
                _buildActionBox(Icons.receipt_long, "My Orders", Colors.blue, onTap: () {
                  widget.onSelectTab?.call(2); // Take partner to Orders tab in navbar!
                }),
                _buildActionBox(Icons.account_balance_wallet, "Earnings", Colors.purple, onTap: () {
                  widget.onSelectTab?.call(1); // Take partner to Earnings tab in navbar!
                }),
                _buildActionBox(Icons.person_outline, "Profile", Colors.orange, onTap: () {
                  widget.onSelectTab?.call(3); // Take partner to Profile tab in navbar!
                }),
              ],
            ),

            const SizedBox(height: 32),

            // TODAY'S ASSIGNED DELIVERIES (Daily Subscriber & Today's Orders)
            _buildTodaysDeliveriesSection(),

            const SizedBox(height: 32),

            // Incentives Banner
            Text("Incentives",
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (context) => const IncentivesScreen()));
              },
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFE8F5E9), Color(0xFFF1F8E9)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.green.withValues(alpha: 0.1),
                        blurRadius: 15,
                        spreadRadius: 0,
                        offset: const Offset(0, 8)),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Incentives",
                              style: GoogleFonts.outfit(
                                  fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87)),
                          const SizedBox(height: 8),
                          Text("Complete 5 more orders\nand earn ₹200 extra",
                              style: GoogleFonts.outfit(fontSize: 13, color: Colors.black87, height: 1.4)),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: const LinearProgressIndicator(
                                    value: 0.5,
                                    backgroundColor: Colors.white,
                                    color: Color(0xFF1E9C1C),
                                    minHeight: 8,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text("5 / 10",
                                  style: GoogleFonts.outfit(
                                      fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black54)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
                      ),
                      child: Image.asset(
                        'assets/images/gift_box.png',
                        width: 45,
                        height: 45,
                        errorBuilder: (c, e, s) =>
                            const Icon(Icons.card_giftcard, color: Color(0xFF1E9C1C), size: 36),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Performance Box
            Text("Performance",
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 15,
                      spreadRadius: 0,
                      offset: const Offset(0, 8)),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Rating", style: GoogleFonts.outfit(fontSize: 13, color: Colors.black54)),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Text("4.8 ",
                                  style: GoogleFonts.outfit(
                                      fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87)),
                              const Icon(Icons.star, color: Colors.amber, size: 22),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  Container(height: 40, width: 1, color: Colors.grey.shade200),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Completion Rate",
                              style: GoogleFonts.outfit(fontSize: 13, color: Colors.black54)),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Text("95%",
                                  style: GoogleFonts.outfit(
                                      fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87)),
                              const SizedBox(width: 4),
                              const Icon(Icons.trending_up, color: Color(0xFF1E9C1C), size: 22),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildTodaysDeliveriesSection() {
    return ValueListenableBuilder<List<dynamic>>(
      valueListenable: DeliveryService().todaysDeliveries,
      builder: (context, deliveries, child) {
        return ValueListenableBuilder<Map<String, dynamic>>(
          valueListenable: DeliveryService().todaysSummary,
          builder: (context, summary, _) {
            final int total = summary['total'] ?? deliveries.length;
            final int completed = summary['completed'] ?? deliveries.where((d) => d['isDeliveredToday'] == true).length;
            final int pending = summary['pending'] ?? (total - completed).clamp(0, 9999);

            List<dynamic> filteredList = deliveries;
            if (_selectedFilter == 'pending') {
              filteredList = deliveries.where((d) => d['isDeliveredToday'] != true).toList();
            } else if (_selectedFilter == 'delivered') {
              filteredList = deliveries.where((d) => d['isDeliveredToday'] == true).toList();
            }

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              "Today's Deliveries",
                              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                            ),
                            const SizedBox(width: 8),
                            if (pending > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.orange.shade100,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  "$pending Pending",
                                  style: GoogleFonts.outfit(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.orange.shade800,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "Admin assigned daily subscriptions & orders",
                          style: GoogleFonts.outfit(fontSize: 12, color: Colors.black54),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, color: Color(0xFF1E9C1C), size: 22),
                      tooltip: "Refresh today's deliveries",
                      onPressed: () {
                        DeliveryService().fetchTodaysDeliveries();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Filter chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip("All ($total)", 'all'),
                      const SizedBox(width: 8),
                      _buildFilterChip("Pending ($pending)", 'pending'),
                      const SizedBox(width: 8),
                      _buildFilterChip("Delivered ($completed)", 'delivered'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ACTIVE SUBSCRIPTION ROUTES
                ValueListenableBuilder<List<dynamic>>(
                  valueListenable: DeliveryService().myRoutes,
                  builder: (context, routes, _) {
                    if (routes.isEmpty) return const SizedBox.shrink();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "Subscription Routes",
                              style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: const Color(0xFF0369A1)),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade100,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                "${routes.length} Route${routes.length > 1 ? 's' : ''}",
                                style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF0369A1)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...routes.map((r) => _buildRouteHeroCard(r)),
                        const SizedBox(height: 16),
                      ],
                    );
                  },
                ),

                if (deliveries.isEmpty)
                  _buildEmptyState()
                else if (filteredList.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Center(
                      child: Text(
                        "No $_selectedFilter deliveries found for today.",
                        style: GoogleFonts.outfit(color: Colors.grey.shade600, fontSize: 13),
                      ),
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filteredList.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = filteredList[index];
                      return _buildDeliveryCard(item);
                    },
                  ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildRouteHeroCard(Map<String, dynamic> route) {
    final String routeNumber = route['routeNumber'] ?? 'Route';
    final String area = route['area'] ?? 'Sector 62';
    final String timeSlot = route['timeSlot']?['label'] ?? 'Morning (6:00 AM - 9:00 AM)';
    final int totalStops = route['totalStops'] ?? 0;
    final int completedStops = route['completedStops'] ?? 0;
    final int totalJars = route['totalJarsToDeliver'] ?? 0;
    final String status = (route['status'] ?? 'ASSIGNED').toString().toUpperCase();
    final bool isCompleted = status == 'COMPLETED';

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => SubscriptionRouteScreen(route: route)),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0284C7), Color(0xFF0369A1)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0284C7).withValues(alpha: 0.25),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.alt_route_rounded, color: Colors.white, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      routeNumber,
                      style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isCompleted ? Colors.green.shade400 : Colors.white.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isCompleted ? "COMPLETED" : (status == 'STARTED' ? "IN PROGRESS" : "ASSIGNED"),
                    style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              "$area • $timeSlot",
              style: GoogleFonts.outfit(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Stops: $completedStops / $totalStops  •  $totalJars Jars",
                  style: GoogleFonts.outfit(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                Row(
                  children: [
                    Text(
                      "View Route",
                      style: GoogleFonts.outfit(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 12),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String key) {
    final bool isSelected = _selectedFilter == key;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = key;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1E9C1C) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF1E9C1C) : Colors.grey.shade300,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : Colors.black87,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.blue.shade50.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.blue.withValues(alpha: 0.1),
                  blurRadius: 10,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(Icons.water_drop_rounded, size: 36, color: Color(0xFF0284C7)),
          ),
          const SizedBox(height: 14),
          Text(
            "No Scheduled Deliveries Today",
            style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
          ),
          const SizedBox(height: 6),
          Text(
            "When the admin assigns daily water subscriptions or regular orders to you, they will appear here with one-tap completion.",
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(fontSize: 12, color: Colors.black54, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveryCard(Map<String, dynamic> item) {
    final bool isDelivered = item['isDeliveredToday'] == true || item['status'] == 'delivered';
    final bool isSubscription = item['type'] == 'subscription';
    final String customerName = item['customerName'] ?? 'Customer';
    final String customerPhone = item['customerPhone'] ?? '';
    final String address = item['address'] ?? 'Customer Address';
    final String items = item['items'] ?? (isSubscription ? "${item['quantity'] ?? 1}x ${item['productName'] ?? 'Water Can'}" : "Order Items");
    final String timeWindow = item['timeWindow'] ?? (isSubscription ? "Morning (6 AM - 9 AM)" : "Instant Delivery");
    final String instructions = item['instructions'] ?? '';
    final bool leaveAtDoor = item['leaveAtDoor'] == true;
    final bool callBeforeDelivery = item['callBeforeDelivery'] == true;
    final double earning = (item['earning'] is num) ? (item['earning'] as num).toDouble() : 20.0;
    final bool isLoading = _deliveringItemId == item['id'];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDelivered ? Colors.green.shade200 : Colors.grey.shade200,
          width: isDelivered ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top pill row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isDelivered
                  ? Colors.green.shade50
                  : (isSubscription ? Colors.blue.shade50 : Colors.purple.shade50),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(17)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isSubscription ? Icons.water_drop_rounded : Icons.flash_on_rounded,
                      size: 16,
                      color: isSubscription ? const Color(0xFF0284C7) : const Color(0xFF7E22CE),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isSubscription ? "DAILY SUBSCRIBER" : "ON-DEMAND ORDER",
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                        color: isSubscription ? const Color(0xFF0284C7) : const Color(0xFF7E22CE),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Icon(Icons.access_time_rounded, size: 13, color: Colors.black54),
                    const SizedBox(width: 4),
                    Text(
                      timeWindow,
                      style: GoogleFonts.outfit(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Customer Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            customerName,
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          if (customerPhone.isNotEmpty)
                            Text(
                              customerPhone,
                              style: GoogleFonts.outfit(fontSize: 12, color: Colors.black54),
                            ),
                        ],
                      ),
                    ),
                    if (customerPhone.isNotEmpty)
                      GestureDetector(
                        onTap: () => _makePhoneCall(customerPhone),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.green.shade200),
                          ),
                          child: const Icon(Icons.phone_in_talk, color: Color(0xFF1E9C1C), size: 18),
                        ),
                      ),
                  ],
                ),

                const SizedBox(height: 12),

                // Address Row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.location_on, size: 18, color: Colors.redAccent),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        address,
                        style: GoogleFonts.outfit(fontSize: 13, color: Colors.black87, height: 1.3),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Product items
                Row(
                  children: [
                    const Icon(Icons.inventory_2_outlined, size: 18, color: Color(0xFF0284C7)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        items,
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ],
                ),

                // Special instructions tags
                if (leaveAtDoor || callBeforeDelivery || instructions.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      if (leaveAtDoor)
                        _buildInstructionChip("🚪 Leave at door", Colors.blue),
                      if (callBeforeDelivery)
                        _buildInstructionChip("📞 Call before delivery", Colors.orange),
                      if (instructions.isNotEmpty)
                        _buildInstructionChip("📝 $instructions", Colors.purple),
                    ],
                  ),
                ],

                const SizedBox(height: 16),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 14),

                // Bottom Action Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Guaranteed Earning
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "GUARANTEED EARNING",
                          style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black45),
                        ),
                        Text(
                          "₹${earning.toStringAsFixed(2)}",
                          style: GoogleFonts.outfit(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1E9C1C),
                          ),
                        ),
                      ],
                    ),

                    // Status or Mark Delivered button
                    if (isDelivered)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.green.shade100,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.green.shade300),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle, color: Color(0xFF1E9C1C), size: 18),
                            const SizedBox(width: 6),
                            Text(
                              "Delivered Today",
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF15803D),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E9C1C),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: isLoading ? null : () => _handleMarkDelivered(item),
                        icon: isLoading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.check_circle_outline, size: 18),
                        label: Text(
                          isLoading ? "Updating..." : "Mark Delivered",
                          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionChip(String text, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.shade200),
      ),
      child: Text(
        text,
        style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.w600, color: color.shade800),
      ),
    );
  }

  Widget _buildPurpleStatColumn(String val, String label, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Text(val, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.outfit(fontSize: 12, color: Colors.white70)),
        ],
      ),
    );
  }

  Widget _buildActionBox(IconData icon, String label, Color iconColor, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: iconColor.withValues(alpha: 0.2)),
            ),
            child: Icon(icon, color: iconColor, size: 28),
          ),
          const SizedBox(height: 10),
          Text(label, style: GoogleFonts.outfit(fontSize: 13, color: Colors.black87, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
