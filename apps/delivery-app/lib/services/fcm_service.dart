import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'user_service.dart';
import 'alert_audio_service.dart';

class DeliveryFcmService {
  static final DeliveryFcmService _instance = DeliveryFcmService._internal();
  factory DeliveryFcmService() => _instance;
  DeliveryFcmService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<void> initPushNotifications() async {
    try {
      // 1. Request notification permissions (Android 13+ & iOS)
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      await _messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        debugPrint('[Rider FCM] Notification permission granted');
      } else {
        debugPrint('[Rider FCM] Notification permission declined');
        return;
      }

      // 2. Obtain token
      String? token = await _messaging.getToken();
      if (token != null) {
        debugPrint("[Rider FCM] Registered Token: $token");
        await _sendTokenToBackend(token);
      }

      // 3. Listen to token refreshes
      _messaging.onTokenRefresh.listen((newToken) {
        debugPrint("[Rider FCM] Token refreshed: $newToken");
        _sendTokenToBackend(newToken);
      });

      // 4. Foreground notification handling
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint("[Rider FCM] Incoming foreground push: ${message.notification?.title}");
        // Trigger rider audio alert for new delivery request
        if (message.data['type'] == 'TARGETED_DELIVERY_REQUEST' ||
            message.data['type'] == 'NEW_ORDER') {
          AlertAudioService().playOrderAlert();
        }
      });

      // 5. Background notification click
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint("[Rider FCM] Opened from background: ${message.data}");
      });

      // 6. Terminated launch click
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        debugPrint("[Rider FCM] Opened from terminated state: ${initialMessage.data}");
      }
    } catch (e) {
      debugPrint("[Rider FCM] Init error: $e");
    }
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final idToken = await user.getIdToken();
      final apiUrl = UserService.baseUrl;

      final response = await http.patch(
        Uri.parse('$apiUrl/users/me/fcm-token'),
        headers: {
          'Authorization': 'Bearer $idToken',
          'Content-Type': 'application/json',
        },
        body: json.encode({'token': token}),
      );

      if (response.statusCode == 200) {
        debugPrint("[Rider FCM] Token synced to backend successfully.");
      } else {
        debugPrint("[Rider FCM] Failed to sync token: ${response.body}");
      }
    } catch (e) {
      debugPrint("[Rider FCM] Error syncing token: $e");
    }
  }
}
