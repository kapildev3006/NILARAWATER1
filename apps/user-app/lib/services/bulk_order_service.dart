import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import 'settings_service.dart';

class BulkOrderService {
  static final BulkOrderService _instance = BulkOrderService._internal();
  factory BulkOrderService() => _instance;
  BulkOrderService._internal();

  static String get baseUrl => SettingsService.baseUrl;

  final ValueNotifier<List<dynamic>> myBulkOrders = ValueNotifier([]);

  Future<void> fetchMyBulkOrders() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;
      
      final token = await user.getIdToken();
      final response = await http.get(
        Uri.parse('$baseUrl/bulk-orders/my-orders'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success']) {
          myBulkOrders.value = data['data'];
        }
      } else {
        debugPrint('Failed to fetch bulk orders: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Error fetching bulk orders: $e');
    }
  }

  Future<bool> createBulkOrder({
    required String productName,
    required int quantity,
    required double totalPrice,
    required String deliveryDate,
    required String timeSlot,
    required String paymentMethod,
    String? specialInstructions,
    Map<String, dynamic>? address,
    Map<String, dynamic>? customDesign,
  }) async {
    try {
      String? token;
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        token = await user.getIdToken();
      }

      final payload = {
        "productName": productName,
        "quantity": quantity,
        "totalPrice": totalPrice,
        "deliveryDate": deliveryDate,
        "timeSlot": timeSlot,
        "paymentMethod": paymentMethod,
        if (specialInstructions != null && specialInstructions.isNotEmpty) "specialInstructions": specialInstructions,
        if (address != null) "address": address,
        if (customDesign != null) "customDesign": customDesign,
      };

      final headers = {
        'Content-Type': 'application/json',
      };
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await http.post(
        Uri.parse('$baseUrl/bulk-orders'),
        headers: headers,
        body: json.encode(payload),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return true;
      }
      
      debugPrint('Create bulk order failed: ${response.statusCode} - ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error creating bulk order: $e');
      return false;
    }
  }

  Future<bool> payTokenAdvance(String orderId) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return false;
      
      final token = await user.getIdToken();
      final response = await http.patch(
        Uri.parse('$baseUrl/bulk-orders/$orderId/pay-advance'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return true;
      }
      
      debugPrint('Pay advance failed: ${response.statusCode} - ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error paying advance: $e');
      return false;
    }
  }

  Future<bool> approveQuote(String orderId) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return false;
      
      final token = await user.getIdToken();
      final response = await http.post(
        Uri.parse('$baseUrl/bulk-orders/$orderId/approve-quote'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        await fetchMyBulkOrders();
        return true;
      }
      
      debugPrint('Approve quote failed: ${response.statusCode} - ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error approving quote: $e');
      return false;
    }
  }
}
