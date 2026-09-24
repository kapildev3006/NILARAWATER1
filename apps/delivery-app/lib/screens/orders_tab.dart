import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/delivery_service.dart';

class OrdersTab extends StatefulWidget {
  const OrdersTab({super.key});

  @override
  State<OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<OrdersTab> {
  String? _deliveringItemId;

  @override
  void initState() {
    super.initState();
    DeliveryService().fetchMyOrders();
    DeliveryService().fetchTodaysDeliveries();
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    if (phoneNumber.isEmpty) return;
    final Uri uri = Uri(scheme: 'tel', path: phoneNumber);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
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
          content: Text("Delivery marked complete! ₹20 added to your wallet.",
              style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          backgroundColor: const Color(0xFF1E9C1C),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Failed to mark delivered. Please try again.",
              style: GoogleFonts.outfit(color: Colors.white)),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () {
              Navigator.maybePop(context);
            },
          ),
          title: Text(
            "My Deliveries & Orders",
            style: GoogleFonts.outfit(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 18),
          ),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            labelColor: const Color(0xFF1E9C1C),
            unselectedLabelColor: Colors.black54,
            indicatorColor: const Color(0xFF1E9C1C),
            labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
            unselectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w500, fontSize: 13),
            tabs: const [
              Tab(text: "Today's Drops"),
              Tab(text: "All Orders"),
              Tab(text: "Delivered"),
              Tab(text: "Cancelled"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Tab 1: Today's Assigned Daily Drops & Orders
            _buildTodaysDropsList(),

            // Tab 2: All Orders
            ValueListenableBuilder<List<dynamic>>(
              valueListenable: DeliveryService().myOrders,
              builder: (context, orders, child) => _buildOrdersList(orders),
            ),

            // Tab 3: Delivered Orders
            ValueListenableBuilder<List<dynamic>>(
              valueListenable: DeliveryService().myOrders,
              builder: (context, orders, child) => _buildOrdersList(orders, filter: "delivered"),
            ),

            // Tab 4: Cancelled Orders
            ValueListenableBuilder<List<dynamic>>(
              valueListenable: DeliveryService().myOrders,
              builder: (context, orders, child) => _buildOrdersList(orders, filter: "cancelled"),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodaysDropsList() {
    return ValueListenableBuilder<List<dynamic>>(
      valueListenable: DeliveryService().todaysDeliveries,
      builder: (context, deliveries, child) {
        if (deliveries.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.water_drop_rounded, size: 40, color: Color(0xFF0284C7)),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "No Deliveries Scheduled for Today",
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Admin assigned daily subscriptions and scheduled orders will appear here for today.",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
          );
        }

        return RefreshIndicator(
          color: const Color(0xFF1E9C1C),
          onRefresh: () => DeliveryService().fetchTodaysDeliveries(),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: deliveries.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = deliveries[index];
              final bool isDelivered = item['isDeliveredToday'] == true || item['status'] == 'delivered';
              final bool isSubscription = item['type'] == 'subscription';
              final String customerName = item['customerName'] ?? 'Customer';
              final String customerPhone = item['customerPhone'] ?? '';
              final String address = item['address'] ?? 'Customer Address';
              final String items = item['items'] ?? (isSubscription ? "${item['quantity'] ?? 1}x ${item['productName'] ?? 'Water Can'}" : "Order Items");
              final String timeWindow = item['timeWindow'] ?? (isSubscription ? "Morning (6 AM - 9 AM)" : "Instant Delivery");
              final double earning = (item['earning'] is num) ? (item['earning'] as num).toDouble() : 20.0;
              final bool isLoading = _deliveringItemId == item['id'];

              return Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDelivered ? Colors.green.shade200 : Colors.grey.shade200,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badge row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isSubscription ? const Color(0xFFE0F2FE) : const Color(0xFFF3E8FF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              isSubscription ? "💧 DAILY SUBSCRIBER" : "⚡ ON-DEMAND ORDER",
                              style: GoogleFonts.outfit(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isSubscription ? const Color(0xFF0369A1) : const Color(0xFF7E22CE),
                              ),
                            ),
                          ),
                          Text(
                            timeWindow,
                            style: GoogleFonts.outfit(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Customer & phone
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              customerName,
                              style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
                            ),
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
                                child: const Icon(Icons.phone, color: Color(0xFF1E9C1C), size: 16),
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
                            child: Text(
                              address,
                              style: GoogleFonts.outfit(fontSize: 12, color: Colors.black54),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Items
                      Row(
                        children: [
                          const Icon(Icons.inventory_2_outlined, size: 16, color: Color(0xFF0284C7)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              items,
                              style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black87),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 10),

                      // Earning & Action
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "₹${earning.toStringAsFixed(2)} earning",
                            style: GoogleFonts.outfit(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1E9C1C),
                            ),
                          ),
                          if (isDelivered)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.green.shade200),
                              ),
                              child: Text(
                                "✓ Delivered",
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF15803D),
                                ),
                              ),
                            )
                          else
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1E9C1C),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              onPressed: isLoading ? null : () => _handleMarkDelivered(item),
                              child: isLoading
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : Text(
                                      "Mark Delivered",
                                      style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildOrdersList(List<dynamic> allOrders, {String? filter}) {
    var filtered = allOrders;
    if (filter != null) {
      filtered = allOrders.where((o) => (o['status']?.toString().toLowerCase()) == filter.toLowerCase()).toList();
    }

    if (filtered.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.delivery_dining_outlined, size: 40, color: Colors.grey.shade400),
              ),
              const SizedBox(height: 16),
              Text(
                filter == null ? "No Orders Yet" : "No ${filter.toUpperCase()} Orders",
                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
              ),
              const SizedBox(height: 6),
              Text(
                "When you accept and deliver orders, they will appear here.",
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey.shade500),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: const Color(0xFF1E9C1C),
      onRefresh: () => DeliveryService().fetchMyOrders(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: filtered.length,
        itemBuilder: (context, index) {
          final order = filtered[index];
          final String status = (order['status'] ?? 'pending').toString();
          final bool isDelivered = status == "delivered";
          final bool isCancelled = status == "cancelled";

          final String orderNum = order['orderNumber'] ??
              (order['_id'] != null
                  ? "#${order['_id'].toString().substring(order['_id'].toString().length - 6).toUpperCase()}"
                  : "Order");
          final List items = order['items'] is List ? (order['items'] as List) : [];
          final String itemsCountText = items.isNotEmpty ? "${items.length} ${items.length == 1 ? 'item' : 'items'}" : "Delivery Order";

          String dateText = "Recent";
          if (order['createdAt'] != null) {
            try {
              final dt = DateTime.parse(order['createdAt']).toLocal();
              dateText = "${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}";
            } catch (_) {}
          }

          final double fee = order['deliveryFeePaise'] != null && (order['deliveryFeePaise'] as num) > 0
              ? (order['deliveryFeePaise'] as num) / 100.0
              : 20.0;

          final Color statusColor = isDelivered
              ? const Color(0xFF1E9C1C)
              : (isCancelled ? Colors.redAccent : Colors.orange);

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 3)),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(orderNum,
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black87)),
                    const SizedBox(height: 6),
                    Text(dateText, style: GoogleFonts.outfit(fontSize: 12, color: Colors.black54)),
                    const SizedBox(height: 6),
                    Text(itemsCountText, style: GoogleFonts.outfit(fontSize: 12, color: Colors.black54)),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        status.replaceAll('_', ' ').toUpperCase(),
                        style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text("₹${fee.toStringAsFixed(2)}",
                            style: GoogleFonts.outfit(
                                fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87)),
                        const SizedBox(width: 4),
                        const Icon(Icons.chevron_right, color: Colors.black54, size: 20),
                      ],
                    ),
                  ],
                )
              ],
            ),
          );
        },
      ),
    );
  }
}
