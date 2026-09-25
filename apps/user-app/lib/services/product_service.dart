import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/product_model.dart';
import 'settings_service.dart';

class ProductService {
  static String get baseUrl => SettingsService.activeBaseUrl;

  Future<List<ProductModel>> getProducts() async {
    final urlsToTry = <String>{
      '$baseUrl/products',
      'https://nilara-backend-sct7.onrender.com/api/v1/products',
      // 'http://localhost:5000/api/v1/products',
      // 'http://10.0.2.2:5000/api/v1/products',
      // 'http://192.168.1.33:5000/api/v1/products',
    };

    for (final url in urlsToTry) {
      try {
        final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 4));

        if (response.statusCode == 200) {
          final Map<String, dynamic> data = json.decode(response.body);
          if (data['success'] == true && data['data'] != null) {
            final List<dynamic> productsJson = data['data'];
            return productsJson.map((json) => ProductModel.fromJson(json)).toList();
          }
        }
      } catch (_) {
        // Try next candidate URL
      }
    }
    return [];
  }
}
