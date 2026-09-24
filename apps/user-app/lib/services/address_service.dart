import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import 'settings_service.dart';

class Address {
  final String id;
  final String title;
  final String recipientName;
  final String phone;
  final String addressLine1;
  final String city;
  final String state;
  final String postalCode;
  final bool isDefault;
  final List<double> coordinates;

  Address({
    required this.id,
    required this.title,
    required this.recipientName,
    required this.phone,
    required this.addressLine1,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.isDefault,
    required this.coordinates,
  });

  String get fullAddress =>
      "$addressLine1, $city, $state $postalCode";

  Address copyWith({
    String? id,
    String? title,
    String? recipientName,
    String? phone,
    String? addressLine1,
    String? city,
    String? state,
    String? postalCode,
    bool? isDefault,
    List<double>? coordinates,
  }) {
    return Address(
      id: id ?? this.id,
      title: title ?? this.title,
      recipientName: recipientName ?? this.recipientName,
      phone: phone ?? this.phone,
      addressLine1: addressLine1 ?? this.addressLine1,
      city: city ?? this.city,
      state: state ?? this.state,
      postalCode: postalCode ?? this.postalCode,
      isDefault: isDefault ?? this.isDefault,
      coordinates: coordinates ?? this.coordinates,
    );
  }

  factory Address.fromJson(Map<String, dynamic> json) {
    List<double> coords = [];
    if (json['location'] != null && json['location']['coordinates'] != null) {
      coords = List<double>.from(json['location']['coordinates'].map((x) => x.toDouble()));
    } else {
      coords = [77.2090, 28.6139]; // Default to New Delhi if missing
    }

    return Address(
      id: json['_id'] ?? '',
      title: json['label'] ?? 'Address',
      recipientName: json['recipientName'] ?? '',
      phone: json['phone'] ?? '',
      addressLine1: json['addressLine1'] ?? '',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      postalCode: json['postalCode'] ?? '',
      isDefault: json['isDefault'] ?? false,
      coordinates: coords,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': title,
      'title': title,
      'recipientName': recipientName,
      'phone': phone,
      'addressLine1': addressLine1,
      'city': city,
      'state': state,
      'postalCode': postalCode,
      'isDefault': isDefault,
      'location': {
        'type': 'Point',
        'coordinates': coordinates,
      },
    };
  }
}

class AddressService {
  static final AddressService _instance = AddressService._internal();
  factory AddressService() => _instance;
  
  String get baseUrl => '${SettingsService.baseUrl}/addresses';
  final ValueNotifier<List<Address>> addresses = ValueNotifier([]);

  AddressService._internal() {
    fetchAddresses();
  }

  Future<String?> _getToken() async {
    final user = FirebaseAuth.instance.currentUser;
    return await user?.getIdToken();
  }

  Future<void> fetchAddresses() async {
    try {
      final token = await _getToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse(baseUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> addressList = data['data'];
          addresses.value = addressList.map((json) => Address.fromJson(json)).toList();
        }
      } else {
        debugPrint('Failed to fetch addresses: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error fetching addresses: $e');
    }
  }

  Future<bool> addAddress(Address address) async {
    try {
      final token = await _getToken();
      if (token == null) return false;

      final response = await http.post(
        Uri.parse(baseUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'label': address.title,
          'recipientName': address.recipientName,
          'phone': address.phone,
          'addressLine1': address.addressLine1,
          'city': address.city,
          'state': address.state,
          'postalCode': address.postalCode,
          'coordinates': address.coordinates,
          'isDefault': address.isDefault,
        }),
      );

      if (response.statusCode == 201) {
        await fetchAddresses();
        return true;
      } else {
        debugPrint('Failed to add address: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Error adding address: $e');
      return false;
    }
  }

  Future<bool> updateAddress(String id, Address address) async {
    try {
      final token = await _getToken();
      if (token == null) return false;

      final response = await http.patch(
        Uri.parse('$baseUrl/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'label': address.title,
          'recipientName': address.recipientName,
          'phone': address.phone,
          'addressLine1': address.addressLine1,
          'city': address.city,
          'state': address.state,
          'postalCode': address.postalCode,
          'coordinates': address.coordinates,
          'isDefault': address.isDefault,
        }),
      );

      if (response.statusCode == 200) {
        await fetchAddresses();
        return true;
      } else {
        debugPrint('Failed to update address: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Error updating address: $e');
      return false;
    }
  }

  Future<bool> setDefault(String id) async {
    try {
      final token = await _getToken();
      if (token == null) return false;

      final response = await http.patch(
        Uri.parse('$baseUrl/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'isDefault': true,
        }),
      );

      if (response.statusCode == 200) {
        await fetchAddresses();
        return true;
      } else {
        debugPrint('Failed to set default address: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Error setting default address: $e');
      return false;
    }
  }

  Future<bool> deleteAddress(String id) async {
    try {
      final token = await _getToken();
      if (token == null) return false;

      final response = await http.delete(
        Uri.parse('$baseUrl/$id'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        await fetchAddresses();
        return true;
      } else {
        debugPrint('Failed to delete address: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Error deleting address: $e');
      return false;
    }
  }
}
