import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'delivery_service.dart';
import '../utils/env_config.dart';

class UserProfile {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;
  final String? photoUrl;
  bool onboardingComplete;
  final Map<String, dynamic>? deliveryDetails;
  final String? dob;
  final String? address;
  final String? emergencyContact;
  final String? createdAt;
  
  UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    this.photoUrl,
    this.onboardingComplete = false,
    this.deliveryDetails,
    this.dob,
    this.address,
    this.emergencyContact,
    this.createdAt,
  });
}

class UserService {
  static final UserService _instance = UserService._internal();
  factory UserService() => _instance;
  UserService._internal();

  static String _activeBaseUrl = '';
  static String get baseUrl => _activeBaseUrl.isNotEmpty ? _activeBaseUrl : EnvConfig.apiUrl;

  final ValueNotifier<UserProfile?> currentUser = ValueNotifier(null);
  final ValueNotifier<String?> token = ValueNotifier(null);
  final ValueNotifier<bool> isInitialized = ValueNotifier(false);

  Future<void> init() async {
    // Wait for the first auth state event to resolve
    final user = await FirebaseAuth.instance.authStateChanges().first;
    if (user != null) {
      final idToken = await user.getIdToken();
      token.value = idToken;
      await _syncWithBackend(idToken!);
    } else {
      currentUser.value = null;
      token.value = null;
    }
    isInitialized.value = true;
    
    // Continue listening for subsequent changes
    FirebaseAuth.instance.authStateChanges().listen((User? user) async {
      if (user != null) {
        final idToken = await user.getIdToken();
        token.value = idToken;
        // Don't need to await here for UI responsiveness on subsequent changes
        _syncWithBackend(idToken!);
      } else {
        currentUser.value = null;
        token.value = null;
      }
    });
  }

  Future<bool> _syncWithBackend(String idToken) async {
    final urlsToTry = <String>{
      baseUrl,
      'https://nilara-backend-sct7.onrender.com/api/v1',
      // if (EnvConfig.apiUrl.isEmpty) ...[
      //   if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) ...[
      //     'http://10.0.2.2:5000/api/v1',
      //     'http://127.0.0.1:5000/api/v1',
      //   ],
      // ],
    }.toList();

    for (final url in urlsToTry) {
      try {
        final response = await http.post(
          Uri.parse('$url/auth/sync'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $idToken',
          },
        ).timeout(const Duration(seconds: 15));

        if (response.statusCode == 200) {
          final data = json.decode(response.body);
          // Sync successful
          if (data['success'] == true) {
            _activeBaseUrl = url;
            final userData = data['data'];
            if (userData['role'] != 'delivery') {
              // Not a delivery partner!
              debugPrint("User is not a delivery partner! Role is: ${userData['role']}");
              await logout();
              return false;
            }
            currentUser.value = UserProfile(
              id: userData['id'] ?? '',
              name: userData['displayName'] ?? '',
              email: userData['email'] ?? '',
              phone: userData['phone'] ?? '',
              role: userData['role'],
              photoUrl: userData['photoUrl'],
              onboardingComplete: userData['onboardingComplete'] ?? false,
              deliveryDetails: userData['deliveryDetails'],
              dob: userData['dob'],
              address: userData['address'],
              emergencyContact: userData['emergencyContact'],
              createdAt: userData['createdAt'],
            );
            DeliveryService().initSocket();
            return true;
          }
        }
      } catch (e) {
        debugPrint('Sync attempt on $url failed: $e');
      }
    }
    return false;
  }

  Future<bool> login(String email, String password) async {
    try {
      final userCredential = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      if (userCredential.user != null) {
        final idToken = await userCredential.user!.getIdToken();
        final success = await _syncWithBackend(idToken!);
        return success;
      }
      return false;
    } catch (e) {
      debugPrint("Login error: $e");
      return false;
    }
  }
  

  Future<String?> getFreshToken({bool forceRefresh = false}) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      try {
        final freshToken = await user.getIdToken(forceRefresh);
        token.value = freshToken;
        return freshToken;
      } catch (e) {
        debugPrint('Error getting fresh token: $e');
      }
    }
    return token.value;
  }

  Future<void> refreshProfile() async {
    final tkn = await getFreshToken();
    if (tkn != null) {
      await _syncWithBackend(tkn);
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> data) async {
    String? tkn = await getFreshToken();
    if (tkn == null) {
      debugPrint('updateProfile: Token is null');
      return false;
    }
    
    try {
      var response = await http.put(
        Uri.parse('$baseUrl/delivery/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $tkn',
        },
        body: json.encode(data),
      );

      // Retry once if token was expired
      if (response.statusCode == 401) {
        tkn = await getFreshToken(forceRefresh: true);
        if (tkn != null) {
          response = await http.put(
            Uri.parse('$baseUrl/delivery/profile'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $tkn',
            },
            body: json.encode(data),
          );
        }
      }
      
      if (response.statusCode == 200) {
        if (tkn != null) await _syncWithBackend(tkn);
        return true;
      }
      debugPrint('updateProfile failed with code: ${response.statusCode}, body: ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error updating profile: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>?> fetchPreferences() async {
    String? tkn = await getFreshToken();
    if (tkn == null) return null;

    try {
      var response = await http.get(
        Uri.parse('$baseUrl/delivery/preferences'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $tkn',
        },
      );

      if (response.statusCode == 401) {
        tkn = await getFreshToken(forceRefresh: true);
        if (tkn != null) {
          response = await http.get(
            Uri.parse('$baseUrl/delivery/preferences'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $tkn',
            },
          );
        }
      }

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final prefs = Map<String, dynamic>.from(data['data']);
          if (currentUser.value != null) {
            final existingDetails = Map<String, dynamic>.from(currentUser.value!.deliveryDetails ?? {});
            existingDetails['preferences'] = prefs;
            currentUser.value = UserProfile(
              id: currentUser.value!.id,
              name: currentUser.value!.name,
              email: currentUser.value!.email,
              phone: currentUser.value!.phone,
              role: currentUser.value!.role,
              photoUrl: currentUser.value!.photoUrl,
              onboardingComplete: currentUser.value!.onboardingComplete,
              deliveryDetails: existingDetails,
              dob: currentUser.value!.dob,
              address: currentUser.value!.address,
              emergencyContact: currentUser.value!.emergencyContact,
              createdAt: currentUser.value!.createdAt,
            );
          }
          return prefs;
        }
      }
    } catch (e) {
      debugPrint('Error fetching preferences: $e');
    }
    return null;
  }

  Future<bool> updatePreferences(Map<String, dynamic> preferences) async {
    String? tkn = await getFreshToken();
    if (tkn == null) {
      debugPrint('updatePreferences: Token is null');
      return false;
    }

    try {
      var response = await http.put(
        Uri.parse('$baseUrl/delivery/preferences'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $tkn',
        },
        body: json.encode(preferences),
      );

      if (response.statusCode == 401) {
        tkn = await getFreshToken(forceRefresh: true);
        if (tkn != null) {
          response = await http.put(
            Uri.parse('$baseUrl/delivery/preferences'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $tkn',
            },
            body: json.encode(preferences),
          );
        }
      }

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final updatedPrefs = (data['data'] != null)
            ? Map<String, dynamic>.from(data['data'])
            : preferences;

        if (currentUser.value != null) {
          final existingDetails = Map<String, dynamic>.from(currentUser.value!.deliveryDetails ?? {});
          existingDetails['preferences'] = updatedPrefs;
          currentUser.value = UserProfile(
            id: currentUser.value!.id,
            name: currentUser.value!.name,
            email: currentUser.value!.email,
            phone: currentUser.value!.phone,
            role: currentUser.value!.role,
            photoUrl: currentUser.value!.photoUrl,
            onboardingComplete: currentUser.value!.onboardingComplete,
            deliveryDetails: existingDetails,
            dob: currentUser.value!.dob,
            address: currentUser.value!.address,
            emergencyContact: currentUser.value!.emergencyContact,
            createdAt: currentUser.value!.createdAt,
          );
        }
        return true;
      }
      debugPrint('updatePreferences failed with code: ${response.statusCode}, body: ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error updating preferences: $e');
      return false;
    }
  }

  Future<({bool success, String message})> uploadRC(Uint8List fileBytes, String filename) async {
    String? tkn = await getFreshToken();
    if (tkn == null) {
      debugPrint('uploadRC: Token is null');
      return (success: false, message: 'Authentication required. Please log in again.');
    }

    try {
      MediaType contentType;
      final ext = filename.split('.').last.toLowerCase();
      if (ext == 'png') {
        contentType = MediaType('image', 'png');
      } else if (ext == 'webp') {
        contentType = MediaType('image', 'webp');
      } else if (ext == 'gif') {
        contentType = MediaType('image', 'gif');
      } else {
        contentType = MediaType('image', 'jpeg');
      }

      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/delivery/rc'),
      );
      request.headers['Authorization'] = 'Bearer $tkn';
      request.files.add(http.MultipartFile.fromBytes(
        'rcImage',
        fileBytes,
        filename: filename,
        contentType: contentType,
      ));

      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);

      // If token expired (401), force refresh and retry once
      if (response.statusCode == 401) {
        tkn = await getFreshToken(forceRefresh: true);
        if (tkn != null) {
          request = http.MultipartRequest(
            'POST',
            Uri.parse('$baseUrl/delivery/rc'),
          );
          request.headers['Authorization'] = 'Bearer $tkn';
          request.files.add(http.MultipartFile.fromBytes(
            'rcImage',
            fileBytes,
            filename: filename,
            contentType: contentType,
          ));
          streamedResponse = await request.send();
          response = await http.Response.fromStream(streamedResponse);
        }
      }

      if (response.statusCode == 200) {
        if (tkn != null) await _syncWithBackend(tkn);
        return (success: true, message: 'Registration Certificate (RC) uploaded successfully!');
      }

      String errorMsg = 'Failed to upload RC document (${response.statusCode})';
      try {
        final body = json.decode(response.body);
        if (body['message'] != null) {
          errorMsg = body['message'];
        } else if (body['error']?['message'] != null) {
          errorMsg = body['error']['message'];
        }
      } catch (_) {}

      debugPrint('uploadRC failed: ${response.statusCode}, ${response.body}');
      return (success: false, message: errorMsg);
    } catch (e) {
      debugPrint('Error uploading RC: $e');
      return (success: false, message: 'Error uploading RC: $e');
    }
  }

  Future<void> logout() async {
    DeliveryService().disconnectSocket();
    await FirebaseAuth.instance.signOut();
    currentUser.value = null;
    token.value = null;
  }
}
