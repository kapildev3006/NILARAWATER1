import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../utils/env_config.dart';

class SettingsService {
  static final SettingsService _instance = SettingsService._internal();
  factory SettingsService() => _instance;
  SettingsService._internal();

  static String activeBaseUrl = '';
  static String get baseUrl => activeBaseUrl.isNotEmpty ? activeBaseUrl : EnvConfig.apiUrl;

  static final List<Map<String, dynamic>> defaultSubscriptionPlans = [
    {
      "name": "Daily Essentials",
      "frequency": "Daily",
      "price": 799,
      "discountPercentage": 10,
      "durationMonths": 3,
      "description": "Fresh water delivered every morning.",
      "isActive": true,
      "includedProducts": ["Nilara 10L Water Jar", "Nilara 20L Water Jar"],
      "features": ["Daily delivery", "Free jar cleaning", "Priority morning slot"],
    },
    {
      "name": "Premium",
      "frequency": "Weekly",
      "price": 499,
      "discountPercentage": 5,
      "durationMonths": 1,
      "description": "Weekly deliveries for regular use.",
      "isActive": true,
      "includedProducts": ["Nilara 20L Water Jar"],
      "features": ["Weekly delivery", "Flexible pause & resume", "Instant support"],
    },
    {
      "name": "Monthly Value",
      "frequency": "Monthly",
      "price": 1499,
      "discountPercentage": 20,
      "durationMonths": 1,
      "description": "Best value for long term needs.",
      "isActive": true,
      "includedProducts": ["Nilara 10L Water Jar", "Nilara 20L Water Jar"],
      "features": ["Bulk savings", "Free dispenser sanitization", "Dedicated manager"],
    },
    {
      "name": "basic",
      "frequency": "Alternate Days",
      "price": 400,
      "discountPercentage": 5,
      "durationMonths": 4,
      "description": "Good fresh water delivered every 2 days.",
      "isActive": true,
      "includedProducts": ["Nilara 20L Water Jar", "nilara bottle"],
      "features": ["Alternate days delivery", "Flexible scheduling"],
    },
  ];

  final ValueNotifier<List<Map<String, dynamic>>> subscriptionPlans =
      ValueNotifier<List<Map<String, dynamic>>>(defaultSubscriptionPlans);
  final ValueNotifier<bool> pushNotificationsEnabled = ValueNotifier<bool>(true);
  final ValueNotifier<int> referralBonusAmount = ValueNotifier<int>(100);
  final ValueNotifier<List<Map<String, dynamic>>> homeBanners = ValueNotifier<List<Map<String, dynamic>>>([]);
  final ValueNotifier<List<Map<String, dynamic>>> carouselBanners = ValueNotifier<List<Map<String, dynamic>>>([]);
  final ValueNotifier<List<Map<String, dynamic>>> categoryTabs = ValueNotifier<List<Map<String, dynamic>>>([]);

  final ValueNotifier<List<String>> deliveryTimeSlots = ValueNotifier<List<String>>([
    'Early Morning (6 AM - 8 AM)',
    'Morning (8 AM - 10 AM)',
    'Noon (10 AM - 1 PM)',
    'Afternoon (1 PM - 5 PM)',
    'Evening (5 PM - 8 PM)'
  ]);

  final ValueNotifier<Map<String, dynamic>> contactSupport = ValueNotifier<Map<String, dynamic>>({
    'email': 'support@nilara.com',
    'chatResponseTime': 'Usually replies within 5 minutes'
  });

  final ValueNotifier<List<Map<String, dynamic>>> faqs = ValueNotifier<List<Map<String, dynamic>>>([
    {
      'question': 'How do I cancel my subscription?',
      'answer': 'You can cancel your subscription anytime from the Subscriptions page.'
    },
    {
      'question': 'Where is my delivery?',
      'answer': 'You can track your active orders directly from the Home or Orders page.'
    },
    {
      'question': 'Can I change my delivery address?',
      'answer': 'Yes, you can manage your addresses in your Profile section.'
    }
  ]);

  Future<Map<String, dynamic>?> fetchSettings() async {
    String? token;
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        token = await user.getIdToken();
      }
    } catch (_) {}

    final urlsToTry = <String>{
      '$baseUrl/settings',
      'https://nilara-backend-sct7.onrender.com/api/v1/settings',
      // 'http://localhost:5000/api/v1/settings',
      // 'http://10.0.2.2:5000/api/v1/settings',
      // 'http://127.0.0.1:5000/api/v1/settings',
    };

    for (final urlStr in urlsToTry) {
      try {
        final response = await http.get(
          Uri.parse(urlStr),
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
          },
        ).timeout(const Duration(seconds: 12));

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['success'] == true) {
            activeBaseUrl = urlStr.replaceAll('/settings', '');
            final settings = data['data'];
            if (settings != null) {
              if (settings['subscriptionPlans'] != null && (settings['subscriptionPlans'] as List).isNotEmpty) {
                subscriptionPlans.value = List<Map<String, dynamic>>.from(settings['subscriptionPlans']);
              }
              if (settings['homeBanners'] != null) {
                homeBanners.value = List<Map<String, dynamic>>.from(settings['homeBanners']);
              }
              if (settings['carouselBanners'] != null) {
                carouselBanners.value = List<Map<String, dynamic>>.from(settings['carouselBanners']);
              }
              if (settings['categoryTabs'] != null) {
                categoryTabs.value = List<Map<String, dynamic>>.from(settings['categoryTabs']);
              }
              if (settings['referralBonusAmount'] != null) {
                referralBonusAmount.value = settings['referralBonusAmount'];
              }
              if (settings['deliveryTimeSlots'] != null) {
                deliveryTimeSlots.value = List<String>.from(settings['deliveryTimeSlots']);
              }
              if (settings['contactSupport'] != null) {
                contactSupport.value = Map<String, dynamic>.from(settings['contactSupport']);
              }
              if (settings['faqs'] != null) {
                faqs.value = (settings['faqs'] as List).map((x) => Map<String, dynamic>.from(x)).toList();
              }
            }
            return settings;
          }
        }
      } catch (e) {
        // Continue to next candidate URL
      }
    }

    // Fallback: return default settings so UI is NEVER empty for new or existing users
    return {
      'subscriptionPlans': subscriptionPlans.value,
      'deliveryTimeSlots': deliveryTimeSlots.value,
      'contactSupport': contactSupport.value,
      'faqs': faqs.value,
      'homeBanners': homeBanners.value,
      'carouselBanners': carouselBanners.value,
    };
  }
}
