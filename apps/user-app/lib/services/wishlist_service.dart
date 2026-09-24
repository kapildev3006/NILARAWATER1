import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/product_model.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'cart_service.dart';
import 'settings_service.dart';

class WishlistService {
  static final WishlistService _instance = WishlistService._internal();
  factory WishlistService() => _instance;
  WishlistService._internal() {
    FirebaseAuth.instance.authStateChanges().listen((User? user) {
      if (user != null) {
        fetchWishlist();
      } else {
        items.value = []; // Clear on logout
      }
    });
  }

  final ValueNotifier<List<ProductModel>> items = ValueNotifier([]);
  static String get baseUrl => SettingsService.baseUrl;

  Future<void> fetchWishlist() async {
    try {
      final token = await FirebaseAuth.instance.currentUser?.getIdToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse('$baseUrl/users/me/wishlist'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> productsJson = data['data'];
          items.value = productsJson.map((json) => ProductModel.fromJson(json)).toList();
        }
      }
    } catch (e) {
      debugPrint('Error fetching wishlist: $e');
    }
  }

  bool isInWishlist(String productId) {
    return items.value.any((item) => item.id == productId);
  }

  Future<void> toggleWishlist(ProductModel product) async {
    // Optimistic update for instant UI feedback
    final current = List<ProductModel>.from(items.value);
    final exists = current.any((item) => item.id == product.id);
    
    if (exists) {
      current.removeWhere((item) => item.id == product.id);
    } else {
      current.add(product);
    }
    items.value = current;

    // API call
    try {
      final token = await FirebaseAuth.instance.currentUser?.getIdToken();
      if (token == null) return;

      await http.post(
        Uri.parse('$baseUrl/users/me/wishlist/${product.id}'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );
      // Fetch latest state from DB
      await fetchWishlist();
    } catch (e) {
      debugPrint('Error toggling wishlist: $e');
      // On error, fetch again to revert optimistic update
      await fetchWishlist();
    }
  }

  void moveToCart(ProductModel product, String variantId) {
    String imageUrl = product.images.isNotEmpty ? product.images.first : '';
    CartService().addItem(product.name, imageUrl, "₹${(product.variants.firstWhere((v) => v.id == variantId).pricePaise / 100).toStringAsFixed(0)}", product.id, variantId);
    toggleWishlist(product);
  }
}
