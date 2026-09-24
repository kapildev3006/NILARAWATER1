import 'env_config.dart';

class Constants {
  // Centralized Base URL for the backend API
  static String get baseUrl {
    final configured = EnvConfig.apiUrl;
    if (configured.isNotEmpty) {
      return configured.replaceAll('/api/v1', '');
    }
    return 'http://localhost:5000';
  }
}
