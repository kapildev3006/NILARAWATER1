import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import '../main.dart';
import 'settings_service.dart';
import 'cart_service.dart';

class OrderItem {
  final String name;
  final int quantity;
  final double price;
  final String imageUrl;
  final String productId;
  final String variantId;

  OrderItem({
    required this.name,
    required this.quantity,
    required this.price,
    required this.imageUrl,
    required this.productId,
    required this.variantId,
  });
}

class Order {
  final String id;
  final String orderNumber;
  final String date;
  final String status;
  final List<OrderItem> items;
  final double total;
  final double discount;

  Order({
    required this.id,
    required this.orderNumber,
    required this.date,
    required this.status,
    required this.items,
    required this.total,
    required this.discount,
  });

  String get itemsSummary {
    if (items.isEmpty) return "No items";
    return items.map((e) => "${e.name} (${e.quantity})").join(", ");
  }
}

class OrderService {
  static final OrderService _instance = OrderService._internal();
  factory OrderService() => _instance;
  OrderService._internal() {
    _startPolling();
  }

  static String get baseUrl => SettingsService.baseUrl;

  final ValueNotifier<List<Order>> orders = ValueNotifier([]);
  Timer? _pollingTimer;

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      if (FirebaseAuth.instance.currentUser != null) {
        fetchMyOrders(isPolling: true);
      }
    });
  }

  Future<bool> checkout({
    required Map<String, CartItem> items,
    required String deliveryAddressId,
    required String paymentMethod,
    String? customerNotes,
    String? deliveryTimePref,
  }) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return false;
      final token = await user.getIdToken();

      final List<Map<String, dynamic>> itemsPayload = items.values.map((item) => {
        "productId": item.productId,
        "variantId": item.variantId,
        "quantity": item.quantity,
      }).toList();

      final payload = {
        "items": itemsPayload,
        "deliveryAddressId": deliveryAddressId,
        "paymentMethod": paymentMethod,
        if (customerNotes != null) "customerNotes": customerNotes,
        if (deliveryTimePref != null) "deliveryTimePref": deliveryTimePref,
      };

      final response = await http.post(
        Uri.parse('$baseUrl/orders/checkout'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(payload),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        // Fetch new orders after successful checkout
        await fetchMyOrders();
        return true;
      }
      
      debugPrint('Checkout failed: ${response.statusCode} - ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error during checkout: $e');
      return false;
    }
  }

  Future<void> fetchMyOrders({bool isPolling = false}) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;
      final token = await user.getIdToken();

      final response = await http.get(
        Uri.parse('$baseUrl/orders/me'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          final List<dynamic> ordersJson = data['data'];
          final List<Order> loadedOrders = ordersJson.map((json) {
            final itemsList = (json['items'] as List<dynamic>).map((itemJson) => OrderItem(
              name: itemJson['name'],
              quantity: itemJson['quantity'],
              price: itemJson['unitPricePaise'] / 100.0,
              imageUrl: itemJson['imageUrl'] ?? 'assets/images/1L.png',
              productId: itemJson['productId'] ?? '',
              variantId: itemJson['variantId'] ?? '',
            )).toList();

            return Order(
              id: json['_id'],
              orderNumber: json['orderNumber'] ?? 'Unknown',
              date: DateTime.parse(json['createdAt']).toLocal().toString().split('.')[0], // Format basic date string
              status: json['status'],
              items: itemsList,
              total: json['totalPaise'] / 100.0,
              discount: (json['discountPaise'] ?? 0) / 100.0,
            );
          }).toList();
          // Check for status changes and show notification
          if (orders.value.isNotEmpty && isPolling) {
            for (var newOrder in loadedOrders) {
              try {
                final oldOrder = orders.value.firstWhere((o) => o.id == newOrder.id);
                if (oldOrder.status != newOrder.status) {
                  // Status changed!
                  if (SettingsService().pushNotificationsEnabled.value) {
                    showTopNotification(
                      'Order Status Update',
                      'Order #${newOrder.orderNumber} status changed to ${newOrder.status.toUpperCase()}!'
                    );
                  }
                }
              } catch (e) {
                // New order that wasn't in the list before, ignore
              }
            }
          }

          orders.value = loadedOrders;
        }
      } else {
        debugPrint('Failed to fetch orders: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      debugPrint('Error fetching orders: $e');
    }
  }
  Future<bool> deleteOrder(String orderId) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return false;
      final token = await user.getIdToken();

      final url = Uri.parse('$baseUrl/orders/me/$orderId');
      final response = await http.delete(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        // Remove from local list
        final currentOrders = List<Order>.from(orders.value);
        currentOrders.removeWhere((o) => o.id == orderId);
        orders.value = currentOrders;
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error deleting order: $e');
      return false;
    }
  }
}
