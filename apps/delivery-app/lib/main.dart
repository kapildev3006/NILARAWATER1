import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'firebase_options.dart';
import 'screens/splash_screen.dart';
import 'services/user_service.dart';
import 'services/fcm_service.dart';
import 'utils/env_config.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await EnvConfig.load();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  debugPrint("[Rider FCM] Background message received: ${message.messageId}");
}

final GlobalKey<NavigatorState> deliveryNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EnvConfig.load();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Register background push notification handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  await UserService().init();

  // Initialize FCM for logged in delivery riders and listen to auth changes
  if (FirebaseAuth.instance.currentUser != null) {
    DeliveryFcmService().initPushNotifications();
  }
  FirebaseAuth.instance.authStateChanges().listen((User? user) {
    if (user != null) {
      DeliveryFcmService().initPushNotifications();
    }
  });

  runApp(const NilaraDeliveryApp());
}

class NilaraDeliveryApp extends StatelessWidget {
  const NilaraDeliveryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nilara Delivery',
      navigatorKey: deliveryNavigatorKey,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: Colors.white,
        primaryColor: const Color(0xFF1E9C1C), // Nilara Delivery Green
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF1E9C1C),
          secondary: Color(0xFF1E9C1C),
          surface: Colors.white,
          onSurface: Colors.black87,
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.light().textTheme),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
          elevation: 0,
          centerTitle: true,
        ),
      ),
      home: const SplashScreen(),
    );
  }
}
