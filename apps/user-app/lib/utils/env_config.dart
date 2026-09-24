import 'package:flutter/services.dart' show rootBundle;

/// Central environment configuration for Nilara User App.
/// 
/// Automatically loads variables from `.env` asset file at startup,
/// with support for `--dart-define` / `--dart-define-from-file=.env` overrides.
class EnvConfig {
  static final Map<String, String> _env = {};
  static bool _isLoaded = false;

  /// Loads the .env file from assets if available.
  static Future<void> load() async {
    if (_isLoaded) return;
    try {
      final content = await rootBundle.loadString('.env');
      for (final rawLine in content.split('\n')) {
        final line = rawLine.trim();
        if (line.isEmpty || line.startsWith('#')) continue;
        final eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
          final key = line.substring(0, eqIdx).trim();
          final val = line.substring(eqIdx + 1).trim();
          _env[key] = val;
        }
      }
    } catch (_) {
      // .env not in assets or failed to load; will rely on compile-time environment variables
    }
    _isLoaded = true;
  }

  static String _get(String key, {String defineValue = '', String fallback = ''}) {
    if (defineValue.isNotEmpty) return defineValue;
    return _env[key] ?? fallback;
  }

  // API & WebSockets
  static String get apiUrl => _get(
    'API_URL',
    defineValue: const String.fromEnvironment(
      'API_URL',
      defaultValue: String.fromEnvironment('API_BASE_URL', defaultValue: ''),
    ),
    fallback: _env['API_BASE_URL'] ?? 'http://localhost:5000/api/v1',
  );

  static String get socketUrl => _get(
    'SOCKET_URL',
    defineValue: const String.fromEnvironment('SOCKET_URL', defaultValue: ''),
    fallback: apiUrl.replaceAll('/api/v1', ''),
  );

  // Firebase Configuration (read strictly from env)
  static String get firebaseApiKey => _get(
    'FIREBASE_API_KEY',
    defineValue: const String.fromEnvironment('FIREBASE_API_KEY', defaultValue: ''),
  );

  static String get firebaseProjectId => _get(
    'FIREBASE_PROJECT_ID',
    defineValue: const String.fromEnvironment('FIREBASE_PROJECT_ID', defaultValue: ''),
  );

  static String get firebaseMessagingSenderId => _get(
    'FIREBASE_MESSAGING_SENDER_ID',
    defineValue: const String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID', defaultValue: ''),
  );

  static String get firebaseStorageBucket => _get(
    'FIREBASE_STORAGE_BUCKET',
    defineValue: const String.fromEnvironment('FIREBASE_STORAGE_BUCKET', defaultValue: ''),
  );

  static String get firebaseAuthDomain => _get(
    'FIREBASE_AUTH_DOMAIN',
    defineValue: const String.fromEnvironment('FIREBASE_AUTH_DOMAIN', defaultValue: ''),
  );

  static String get firebaseAndroidAppId => _get(
    'FIREBASE_ANDROID_APP_ID',
    defineValue: const String.fromEnvironment('FIREBASE_ANDROID_APP_ID', defaultValue: ''),
  );

  static String get firebaseWebAppId => _get(
    'FIREBASE_WEB_APP_ID',
    defineValue: const String.fromEnvironment('FIREBASE_WEB_APP_ID', defaultValue: ''),
  );

  static String get firebaseIosAppId => _get(
    'FIREBASE_IOS_APP_ID',
    defineValue: const String.fromEnvironment('FIREBASE_IOS_APP_ID', defaultValue: ''),
  );

  // Cloudinary
  static String get cloudinaryCloudName => _get(
    'CLOUDINARY_CLOUD_NAME',
    defineValue: const String.fromEnvironment('CLOUDINARY_CLOUD_NAME', defaultValue: ''),
  );

  static String get cloudinaryUploadPreset => _get(
    'CLOUDINARY_UPLOAD_PRESET',
    defineValue: const String.fromEnvironment('CLOUDINARY_UPLOAD_PRESET', defaultValue: ''),
  );

  // Payment Gateway
  static String get razorpayKeyId => _get(
    'RAZORPAY_KEY_ID',
    defineValue: const String.fromEnvironment('RAZORPAY_KEY_ID', defaultValue: ''),
  );

  // Maps / Location Services
  static String get googleMapsApiKey => _get(
    'GOOGLE_MAPS_API_KEY',
    defineValue: const String.fromEnvironment('GOOGLE_MAPS_API_KEY', defaultValue: ''),
  );
}
