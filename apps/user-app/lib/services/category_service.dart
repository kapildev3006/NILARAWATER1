import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/category_model.dart';
import 'settings_service.dart';

class CategoryService {
  static String get baseUrl => SettingsService.baseUrl;

  Future<List<CategoryModel>> getCategories() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/categories'));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final List<dynamic> categoriesJson = data['data'];
          final categories = categoriesJson.map((json) => CategoryModel.fromJson(json)).toList();
          categories.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
          return categories;
        }
      }
      return [];
    } catch (e) {
      print('Error fetching categories: $e');
      return [];
    }
  }
}
