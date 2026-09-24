import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import '../services/order_service.dart';
import '../services/bulk_order_service.dart';
import 'bulk_orders/track_order_screen.dart';
import 'bulk_orders/token_payment_screen.dart';

class OrdersScreen extends StatefulWidget {
  final int initialTab;
  const OrdersScreen({super.key, this.initialTab = 0});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String _selectedBulkFilter = 'All';

  @override
  void initState() {
    super.initState();
    OrderService().fetchMyOrders();
    BulkOrderService().fetchMyBulkOrders();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      initialIndex: widget.initialTab,
      child: Scaffold(
        backgroundColor: const Color(0xFFF5F5F5), // Light grey background
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            "My Orders",
            style: GoogleFonts.outfit(
              color: Colors.black,
              fontWeight: FontWeight.bold,
              fontSize: 20,
            ),
          ),
          centerTitle: true,
          bottom: TabBar(
            labelColor: const Color(0xFF0288D1),
            unselectedLabelColor: Colors.grey,
            indicatorColor: const Color(0xFF0288D1),
            labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15),
            tabs: const [
              Tab(text: "Orders"),
              Tab(text: "Bulk Orders"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildTopBanner(),
              const SizedBox(height: 24),
              Text(
                "Past Orders",
                style: GoogleFonts.outfit(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 16),
              ValueListenableBuilder<List<Order>>(
                valueListenable: OrderService().orders,
                builder: (context, orders, child) {
                  if (orders.isEmpty) {
                    return Center(
                      child: Text(
                        "No orders yet.",
                        style: GoogleFonts.outfit(color: Colors.grey.shade600),
                      ),
                    );
                  }
                  return ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: orders.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final order = orders[index];
                      return Slidable(
                        key: ValueKey(order.id),
                        endActionPane: ActionPane(
                          motion: const ScrollMotion(),
                          extentRatio: 0.25,
                          children: [
                            SlidableAction(
                              onPressed: (context) async {
                                final success = await OrderService().deleteOrder(order.id);
                                if (!success && context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Failed to delete order history')),
                                  );
                                }
                              },
                              backgroundColor: Colors.red,
                              foregroundColor: Colors.white,
                              icon: Icons.delete,
                              label: 'Delete',
                              borderRadius: BorderRadius.circular(20),
                            ),
                          ],
                        ),
                        child: _buildOrderCard(
                          orderId: order.orderNumber,
                          date: order.date,
                          status: order.status,
                          statusColor: order.status == "Delivered" ? Colors.green : (order.status == "Cancelled" ? Colors.red : Colors.orange),
                          items: order.itemsSummary,
                          total: "₹${order.total.toStringAsFixed(2)}",
                          images: const ["assets/images/qb4.jpg"], // Fixed placeholder
                        ),
                      );
                    },
                  );
                },
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
      _buildBulkOrdersTab(context),
    ],
  ),
),
    );
  }

  Widget _buildBulkOrdersTab(BuildContext context) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Pill Filters
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterPill("All", _selectedBulkFilter == "All"),
                  const SizedBox(width: 8),
                  _buildFilterPill("Processing", _selectedBulkFilter == "Processing"),
                  const SizedBox(width: 8),
                  _buildFilterPill("Delivered", _selectedBulkFilter == "Delivered"),
                  const SizedBox(width: 8),
                  _buildFilterPill("Cancelled", _selectedBulkFilter == "Cancelled"),
                ],
              ),
            ),
            const SizedBox(height: 24),
            
            ValueListenableBuilder<List<dynamic>>(
              valueListenable: BulkOrderService().myBulkOrders,
              builder: (context, bulkOrders, _) {
                // Filter locally
                final filteredOrders = bulkOrders.where((order) {
                  if (_selectedBulkFilter == "All") return true;
                  return order['status'] == _selectedBulkFilter;
                }).toList();

                if (filteredOrders.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 40.0),
                      child: Text(
                        "No $_selectedBulkFilter bulk orders found.",
                        style: GoogleFonts.outfit(color: Colors.grey.shade600),
                      ),
                    ),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filteredOrders.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final order = filteredOrders[index];
                    
                    // Safely extract date
                    String formattedDate = "N/A";
                    if (order['createdAt'] != null) {
                      final dt = DateTime.parse(order['createdAt']);
                      formattedDate = "${dt.day}/${dt.month}/${dt.year}";
                    }
                    
                    // Map generic image based on product name if possible
                    bool isJar = (order['productName'] ?? "").toString().contains('Jar');
                    final imagePath = isJar ? 'assets/images/20L daily bulk .png' : 'assets/images/qb4.jpg';

                    final String orderIdStr = order['_id'] != null 
                      ? "#${order['_id'].substring(order['_id'].length - 8).toUpperCase()}" 
                      : "#UNKNOWN";

                    return _buildBulkOrderCard(
                      context: context,
                      orderId: orderIdStr,
                      rawOrderId: order['_id'] ?? "",
                      date: formattedDate,
                      status: order['status'] ?? "Pending",
                      bulkStatus: order['bulkStatus'] ?? order['status'] ?? "Pending",
                      quoteDetails: order['quoteDetails'] != null ? Map<String, dynamic>.from(order['quoteDetails']) : null,
                      jarsDelivered: order['jarsDelivered'],
                      emptyJarsCollected: order['emptyJarsCollected'],
                      productName: order['productName'] ?? "Unknown Product",
                      quantity: "${order['quantity']} Items",
                      price: "₹${order['totalPrice']?.toStringAsFixed(2) ?? '0.00'}",
                      imagePath: imagePath,
                      deliveryDate: order['deliveryDate'] ?? "N/A",
                      deliveryTime: order['timeSlot'] ?? "N/A",
                      addressTitle: order['address']?['title'] ?? "Delivery Address",
                      addressDetail: order['address']?['line1'] ?? "Address details not available",
                      adminMessage: order['adminMessage'],
                      advancePayment: order['advancePayment'],
                      remainingPayment: order['remainingPayment'],
                      advancePaid: order['advancePaid'] ?? false,
                      onPaymentSuccess: () {
                        // Refresh the list after successful payment
                        BulkOrderService().fetchMyBulkOrders();
                      },
                    );
                  },
                );
              },
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterPill(String text, bool isSelected) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedBulkFilter = text;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0258C9) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          text,
          style: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            color: isSelected ? Colors.white : Colors.grey.shade600,
          ),
        ),
      ),
    );
  }

  Widget _buildBulkOrderCard({
    required BuildContext context,
    required String orderId,
    required String date,
    required String status,
    String? bulkStatus,
    Map<String, dynamic>? quoteDetails,
    int? jarsDelivered,
    int? emptyJarsCollected,
    required String productName,
    required String quantity,
    required String price,
    required String imagePath,
    required String deliveryDate,
    required String deliveryTime,
    required String addressTitle,
    required String addressDetail,
    String? adminMessage,
    num? advancePayment,
    num? remainingPayment,
    bool advancePaid = false,
    VoidCallback? onPaymentSuccess,
    String rawOrderId = "",
  }) {
    if (rawOrderId.isEmpty) {
      rawOrderId = orderId.replaceAll('#', '');
    }
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Order ID",
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      orderId,
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      date,
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    bulkStatus ?? status,
                    style: GoogleFonts.outfit(
                      color: Colors.blue.shade700,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),
            
            // Product Info
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 50,
                  height: 50,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Image.asset(imagePath, fit: BoxFit.contain),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        productName,
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        quantity,
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  price,
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Delivery Date
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.calendar_today_outlined, size: 16, color: Colors.grey.shade500),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        deliveryDate,
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        deliveryTime,
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Delivery Address and Track Order Button
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.location_on_outlined, size: 18, color: Colors.blue.shade600),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        addressTitle,
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        addressDetail,
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (status != 'Confirmed' || advancePaid || (advancePayment ?? 0) <= 0)
                  OutlinedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => TrackOrderScreen(orderId: orderId),
                        ),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF0258C9),
                      side: const BorderSide(color: Color(0xFF0258C9)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    ),
                    child: Text(
                      "Track Order",
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  )
                else
                  ElevatedButton(
                    onPressed: () async {
                      final result = await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => TokenPaymentScreen(
                            orderId: orderId,
                            rawOrderId: rawOrderId,
                            productName: productName,
                            advancePayment: advancePayment!.toDouble(),
                          ),
                        ),
                      );
                      if (result == true && onPaymentSuccess != null) {
                        onPaymentSuccess();
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.amber.shade600,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    ),
                    child: Text(
                      "Pay Token",
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
              ],
            ),
            
            // Quotation received banner & Review button
            if (bulkStatus == 'QUOTE_SENT' || (quoteDetails != null && quoteDetails['customerApprovedAt'] == null)) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.request_quote_outlined, size: 18, color: Color(0xFF1D4ED8)),
                        const SizedBox(width: 8),
                        Text(
                          "Commercial Quotation Received",
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: const Color(0xFF1E40AF),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "Quoted Price: ₹${(quoteDetails?['quotePricePaise'] != null ? (quoteDetails!['quotePricePaise'] / 100).toStringAsFixed(2) : price)} • Advance: ₹${(quoteDetails?['advanceRequiredPaise'] != null ? (quoteDetails!['advanceRequiredPaise'] / 100).toStringAsFixed(2) : '0.00')}",
                      style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blue.shade900),
                    ),
                    if (quoteDetails?['vehicleRequirement'] != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        "Fulfillment Carrier: ${quoteDetails!['vehicleRequirement']}",
                        style: GoogleFonts.outfit(fontSize: 11, color: Colors.blue.shade800),
                      ),
                    ],
                    const SizedBox(height: 10),
                    ElevatedButton(
                      onPressed: () => _showReviewQuoteModal(context, rawOrderId, orderId, productName, price, quoteDetails),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0258C9),
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 38),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text("Review & Accept Quotation", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                  ],
                ),
              ),
            ],

            // Returnable Jars Ledger
            if (jarsDelivered != null || emptyJarsCollected != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("Jars Delivered: ${jarsDelivered ?? 0}", style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green.shade900)),
                    Text("Empties Collected: ${emptyJarsCollected ?? 0}", style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue.shade900)),
                  ],
                ),
              ),
            ],

            // Payment Breakdown & Admin Message
            if (adminMessage != null && adminMessage.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: advancePaid ? Colors.green.shade50 : Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: advancePaid ? Colors.green.shade200 : Colors.amber.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(advancePaid ? Icons.check_circle : Icons.info_outline, size: 16, color: advancePaid ? Colors.green.shade800 : Colors.amber.shade800),
                        const SizedBox(width: 8),
                        Text(
                          "Message from Admin",
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: advancePaid ? Colors.green.shade900 : Colors.amber.shade900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      adminMessage,
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: advancePaid ? Colors.green.shade900 : Colors.amber.shade900,
                      ),
                    ),
                    if (advancePayment != null && advancePayment > 0) ...[
                      const SizedBox(height: 12),
                      Divider(color: advancePaid ? Colors.green.shade200 : Colors.amber.shade200),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Advance Token:", style: GoogleFonts.outfit(fontSize: 13, color: advancePaid ? Colors.green.shade900 : Colors.amber.shade900)),
                          Row(
                            children: [
                              Text("₹${advancePayment.toStringAsFixed(2)}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: advancePaid ? Colors.green.shade900 : Colors.amber.shade900)),
                              if (advancePaid) ...[
                                const SizedBox(width: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade100,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text("PAID", style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green.shade800)),
                                ),
                              ]
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Pay on Delivery:", style: GoogleFonts.outfit(fontSize: 13, color: advancePaid ? Colors.green.shade900 : Colors.amber.shade900)),
                          Text("₹${(remainingPayment ?? 0).toStringAsFixed(2)}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: advancePaid ? Colors.green.shade900 : Colors.amber.shade900)),
                        ],
                      ),
                    ]
                  ],
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }

  void _showReviewQuoteModal(
    BuildContext context,
    String rawOrderId,
    String orderId,
    String productName,
    String fallbackPrice,
    Map<String, dynamic>? quoteDetails,
  ) {
    final double quotePrice = quoteDetails?['quotePricePaise'] != null 
      ? (quoteDetails!['quotePricePaise'] / 100).toDouble() 
      : 0.0;
    final double advance = quoteDetails?['advanceRequiredPaise'] != null
      ? (quoteDetails!['advanceRequiredPaise'] / 100).toDouble()
      : 0.0;
    final String vehicle = quoteDetails?['vehicleRequirement'] ?? 'Commercial Carrier';
    final String notes = quoteDetails?['adminNotes'] ?? 'Standard commercial supply terms.';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        bool approving = false;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: const EdgeInsets.all(24),
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
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "Commercial Quotation",
                        style: GoogleFonts.outfit(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          orderId,
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: Colors.blue.shade700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    productName,
                    style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 20),

                  // Pricing card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("Total Quoted Price:", style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade700)),
                            Text("₹${quotePrice > 0 ? quotePrice.toStringAsFixed(2) : fallbackPrice}", style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("Advance Token Required:", style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade700)),
                            Text("₹${advance.toStringAsFixed(2)}", style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.amber.shade800)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("Carrier / Vehicle:", style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade700)),
                            Text(vehicle, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.blue.shade700)),
                          ],
                        ),
                      ],
                    ),
                  ),

                  if (notes.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade200),
                      ),
                      child: Text(
                        "Terms: $notes",
                        style: GoogleFonts.outfit(fontSize: 12, color: Colors.amber.shade900),
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: approving ? null : () async {
                        setModalState(() => approving = true);
                        final success = await BulkOrderService().approveQuote(rawOrderId);
                        setModalState(() => approving = false);
                        if (context.mounted) {
                          Navigator.pop(context);
                          if (success) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text("Quotation approved successfully!"),
                                backgroundColor: Color(0xFF1E9C1C),
                              ),
                            );
                            BulkOrderService().fetchMyBulkOrders();
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text("Failed to approve quotation. Please try again."),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E9C1C),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: approving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text("Accept & Confirm Quotation", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildTopBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          colors: [Colors.purple.shade700, Colors.deepPurple.shade900],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.purple.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Order Again & Save Time!",
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  "Reorder your daily essentials instantly with one tap.",
                  style: GoogleFonts.outfit(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 14,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.flash_on, color: Colors.amberAccent, size: 36),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard({
    required String orderId,
    required String date,
    required String status,
    required Color statusColor,
    required String items,
    required String total,
    required List<String> images,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order Header
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      orderId,
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      date,
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status,
                    style: GoogleFonts.outfit(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
          // Order Details
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Mini image thumbnails
                Row(
                  children: images.take(2).map((img) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: Container(
                        height: 48,
                        width: 48,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          color: Colors.grey.shade50,
                          border: Border.all(color: Colors.grey.shade200),
                          image: DecorationImage(
                            image: AssetImage(img),
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                if (images.length > 2)
                  Container(
                    height: 48,
                    width: 48,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      "+${images.length - 2}",
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey.shade700),
                    ),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    items,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: Colors.black87,
                      height: 1.3,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  total,
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: Colors.black,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, thickness: 1, color: Color(0xFFF0F0F0)),
          // Actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  onPressed: () {},
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  icon: Icon(Icons.star_border, color: Colors.amber.shade700, size: 22),
                  label: Text(
                    "Rate Order",
                    style: GoogleFonts.outfit(color: Colors.amber.shade700, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
                ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green.shade600,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  child: Text("Order Again", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
