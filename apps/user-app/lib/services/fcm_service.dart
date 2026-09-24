import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import '../main.dart';
import '../services/settings_service.dart';

class FcmService {
  static final FcmService _instance = FcmService._internal();
  factory FcmService() => _instance;
  FcmService._internal();

  static String get baseUrl => SettingsService.baseUrl;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<void> initPushNotifications() async {
    try {
      // 1. Request permission for iOS/Android 13+
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      // Configure foreground presentation options
      await _messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        debugPrint('[FCM] Notification permission granted');
      } else {
        debugPrint('[FCM] Notification permission declined');
        return;
      }

      // 2. Get the FCM token for this device
      String? token = await _messaging.getToken();
      if (token != null) {
        debugPrint("[FCM] Registered Device Token: $token");
        await _sendTokenToBackend(token);
      }

      // 3. Listen to token refreshes
      _messaging.onTokenRefresh.listen((newToken) {
        debugPrint("[FCM] Token refreshed: $newToken");
        _sendTokenToBackend(newToken);
      });

      // 4. Listen for foreground messages (app in use)
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint("[FCM] Received foreground notification: ${message.notification?.title}");
        if (SettingsService().pushNotificationsEnabled.value && message.notification != null) {
          showTopNotification(
            message.notification!.title ?? 'Nilara Update',
            message.notification!.body ?? '',
          );
        }
      });

      // 5. Handle notification click when app is in background
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint("[FCM] App opened from background notification: ${message.data}");
      });

      // 6. Handle notification click when app was terminated/killed
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        debugPrint("[FCM] App launched from terminated notification: ${initialMessage.data}");
      }
    } catch (e) {
      debugPrint("[FCM] Initialization error: $e");
    }
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return; // Only send if logged in

      final idToken = await user.getIdToken();
      final response = await http.patch(
        Uri.parse('$baseUrl/users/me/fcm-token'),
        headers: {
          'Authorization': 'Bearer $idToken',
          'Content-Type': 'application/json',
        },
        body: json.encode({'token': token}),
      );

      if (response.statusCode == 200) {
        debugPrint("FCM Token successfully synced to backend.");
      } else {
        debugPrint("Failed to sync FCM Token: ${response.body}");
      }
    } catch (e) {
      debugPrint("Error syncing FCM token: $e");
    }
  }
}
