import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import 'settings_service.dart';

class CartItem {
  final String productId;
  final String variantId;
  final String title;
  final String imagePath;
  final String price;
  final String? originalPrice;
  final String? unit;
  final int quantity;

  CartItem({
    required this.productId,
    required this.variantId,
    required this.title,
    required this.imagePath,
    required this.price,
    this.originalPrice,
    this.unit,
    required this.quantity,
  });

  CartItem copyWith({
    String? productId,
    String? variantId,
    String? title,
    String? imagePath,
    String? price,
    String? originalPrice,
    String? unit,
    int? quantity,
  }) {
    return CartItem(
      productId: productId ?? this.productId,
      variantId: variantId ?? this.variantId,
      title: title ?? this.title,
      imagePath: imagePath ?? this.imagePath,
      price: price ?? this.price,
      originalPrice: originalPrice ?? this.originalPrice,
      unit: unit ?? this.unit,
      quantity: quantity ?? this.quantity,
    );
  }

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'variantId': variantId,
    'title': title,
    'imagePath': imagePath,
    'price': price,
    'originalPrice': originalPrice,
    'unit': unit,
    'quantity': quantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    productId: json['productId'] as String,
    variantId: json['variantId'] as String,
    title: json['title'] as String,
    imagePath: json['imagePath'] as String,
    price: json['price'] as String,
    originalPrice: json['originalPrice'] as String?,
    unit: json['unit'] as String?,
    quantity: json['quantity'] as int,
  );
}

class CartService {
  // Singleton pattern
  static final CartService _instance = CartService._internal();
  factory CartService() => _instance;
  
  CartService._internal() {
    FirebaseAuth.instance.authStateChanges().listen((User? user) {
      if (user != null) {
        loadCart();
      } else {
        items.value = {}; // Clear on logout
      }
    });
  }

  final ValueNotifier<Map<String, CartItem>> items = ValueNotifier({});
  static String get baseUrl => SettingsService.baseUrl;

  Future<String?> _getToken() async {
    return await FirebaseAuth.instance.currentUser?.getIdToken();
  }

  Future<void> loadCart() async {
    try {
      final token = await _getToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse('$baseUrl/cart'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null && data['data']['items'] != null) {
          final List<dynamic> itemsJson = data['data']['items'];
          final Map<String, CartItem> loadedItems = {};
          for (var item in itemsJson) {
            loadedItems[item['productId']] = CartItem.fromJson(item);
          }
          items.value = loadedItems;
        }
      }
    } catch (e) {
      debugPrint('Error loading cart from DB: $e');
    }
  }

  Future<void> _syncCart() async {
    try {
      final token = await _getToken();
      if (token == null) return;

      final itemsList = items.value.values.map((item) => item.toJson()).toList();
      
      await http.put(
        Uri.parse('$baseUrl/cart'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'items': itemsList}),
      );
    } catch (e) {
      debugPrint('Error syncing cart to DB: $e');
    }
  }

  void addItem(String productId, String variantId, String title, String imagePath, String price, {String? originalPrice, String? unit}) {
    final currentItems = Map<String, CartItem>.from(items.value);
    if (currentItems.containsKey(productId)) {
      currentItems[productId] = currentItems[productId]!.copyWith(
        quantity: currentItems[productId]!.quantity + 1,
      );
    } else {
      currentItems[productId] = CartItem(
        productId: productId,
        variantId: variantId,
        title: title,
        imagePath: imagePath,
        price: price,
        originalPrice: originalPrice,
        unit: unit,
        quantity: 1,
      );
    }
    items.value = currentItems;
    _syncCart();
  }

  void removeItem(String productId) {
    final currentItems = Map<String, CartItem>.from(items.value);
    if (currentItems.containsKey(productId)) {
      if (currentItems[productId]!.quantity > 1) {
        currentItems[productId] = currentItems[productId]!.copyWith(
          quantity: currentItems[productId]!.quantity - 1,
        );
      } else {
        currentItems.remove(productId);
      }
      items.value = currentItems;
      _syncCart();
    }
  }

  int getQuantity(String productId) {
    return items.value[productId]?.quantity ?? 0;
  }

  int getTotalItems() {
    return items.value.values.fold(0, (sum, item) => sum + item.quantity);
  }
  
  void clear() {
    items.value = {};
    _syncCart();
  }
}
