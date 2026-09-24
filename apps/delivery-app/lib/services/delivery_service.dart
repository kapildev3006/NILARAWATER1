import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'user_service.dart';
import 'alert_audio_service.dart';
import 'wallet_service.dart';
import 'incentive_service.dart';

class DeliveryService {
  static final DeliveryService _instance = DeliveryService._internal();
  factory DeliveryService() => _instance;
  DeliveryService._internal();

  static String get baseUrl => UserService.baseUrl;
  static String get socketUrl => UserService.baseUrl.replaceAll('/api/v1', '');

  io.Socket? _socket;
  final ValueNotifier<List<dynamic>> availableOrders = ValueNotifier([]);
  final ValueNotifier<List<dynamic>> myOrders = ValueNotifier([]);
  final ValueNotifier<List<dynamic>> todaysDeliveries = ValueNotifier([]);
  final ValueNotifier<List<dynamic>> myRoutes = ValueNotifier([]);
  final ValueNotifier<Map<String, dynamic>> todaysSummary = ValueNotifier({'total': 0, 'completed': 0, 'pending': 0});
  final ValueNotifier<Map<String, dynamic>?> activeOrder = ValueNotifier(null);
  final ValueNotifier<bool> isOnline = ValueNotifier(true);
  final ValueNotifier<Map<String, dynamic>?> latestIncomingOrder = ValueNotifier(null);
  final ValueNotifier<String?> orderClaimedAlert = ValueNotifier(null);

  Future<void> initSocket() async {
    if (_socket != null && _socket!.connected) return;
    
    final token = await UserService().getFreshToken();
    if (token == null) return;

    _socket = io.io(
      socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableReconnection()
          .disableAutoConnect()
          .setAuth({'token': token})
          .setExtraHeaders({'authorization': 'Bearer $token'})
          .build(),
    );

    _socket!.connect();

    _socket!.onConnect((_) {
      debugPrint('Delivery Socket Connected to $socketUrl');
    });

    _socket!.onConnectError((err) {
      debugPrint('Delivery Socket connect error: $err');
    });

    // 1. Broadcasted order popup like rider apps
    _socket!.on('new_order_available', (data) {
      debugPrint('New order available for riders: $data');
      if (!isOnline.value) {
        debugPrint('Rider is OFFLINE - skipping audio/vibration alert');
        return;
      }

      fetchAvailableOrders();
      if (data is Map) {
        latestIncomingOrder.value = Map<String, dynamic>.from(data);
      }

      // Play real alert tone and haptics based on rider preferences
      final user = UserService().currentUser.value;
      final prefs = user?.deliveryDetails?['preferences'];
      final String tone = prefs?['alertTone'] ?? 'Loud Ring';
      final double volume = (prefs?['soundVolume'] != null)
          ? (prefs!['soundVolume'] as num).toDouble()
          : 85.0;
      final bool vibrate = prefs?['vibrateOnAlert'] ?? true;

      AlertAudioService().playTone(tone, volume: volume);
      if (vibrate) {
        AlertAudioService().vibrate(durationMs: 700);
      }
    });

    // 2. Targeted single-rider request with 30s timeout
    _socket!.on('targeted_delivery_request', (data) {
      debugPrint('Targeted delivery request received: $data');
      if (!isOnline.value) return;

      if (data is Map) {
        latestIncomingOrder.value = Map<String, dynamic>.from(data);
      }

      final user = UserService().currentUser.value;
      final prefs = user?.deliveryDetails?['preferences'];
      final String tone = prefs?['alertTone'] ?? 'Loud Ring';
      final double volume = (prefs?['soundVolume'] != null)
          ? (prefs!['soundVolume'] as num).toDouble()
          : 85.0;
      final bool vibrate = prefs?['vibrateOnAlert'] ?? true;

      AlertAudioService().playTone(tone, volume: volume);
      if (vibrate) {
        AlertAudioService().vibrate(durationMs: 700);
      }
    });

    _socket!.on('delivery_request_expired', (data) {
      debugPrint('Delivery request expired: $data');
      if (data is Map && (latestIncomingOrder.value?['orderId'] == data['orderId'] || latestIncomingOrder.value?['_id'] == data['orderId'])) {
        latestIncomingOrder.value = null;
        orderClaimedAlert.value = "Request expired (30s response window ended).";
      }
    });

    // 3. Subscription Route assigned to this driver
    _socket!.on('subscription_route_assigned', (data) {
      debugPrint('Subscription route assigned to this driver: $data');
      fetchMyRoutes();
      AlertAudioService().playTone('Loud Ring', volume: 80);
      AlertAudioService().vibrate(durationMs: 500);
    });

    _socket!.on('route_progress_updated', (_) {
      fetchMyRoutes();
    });

    // 4. Another rider claimed the order
    _socket!.on('order_claimed', (data) {
      debugPrint('Order claimed broadcast: $data');
      if (data is Map) {
        final currentOrder = latestIncomingOrder.value;
        if (currentOrder != null && currentOrder['_id'] == data['orderId']) {
          latestIncomingOrder.value = null; // Dismiss popup on this rider's phone
          orderClaimedAlert.value = "Order was already accepted by another partner.";
        }
      }
      fetchAvailableOrders();
    });

    // 3. Admin assigned daily subscription delivery to this driver
    _socket!.on('new_daily_delivery_assigned', (data) {
      debugPrint('New daily delivery assigned to this driver: $data');
      fetchTodaysDeliveries();
      AlertAudioService().playTone('Loud Ring', volume: 80);
      AlertAudioService().vibrate(durationMs: 400);
    });

    _socket!.on('subscription_assignment_updated', (_) {
      fetchTodaysDeliveries();
    });

    _socket!.on('daily_delivery_completed', (_) {
      fetchTodaysDeliveries();
    });

    _socket!.on('order_status_updated', (data) {
      debugPrint('Order status updated: $data');
      fetchAvailableOrders();
      fetchTodaysDeliveries();
    });

    _socket!.on('incentive_reward_credited', (data) {
      debugPrint('Incentive reward credited socket received: $data');
      WalletService().fetchWalletData();
      IncentiveService().fetchIncentives();
    });

    _socket!.on('wallet_updated', (data) {
      debugPrint('Wallet updated socket received: $data');
      WalletService().fetchWalletData();
    });

    _socket!.onDisconnect((_) {
      debugPrint('Delivery Socket Disconnected');
    });
  }

  void disconnectSocket() {
    _socket?.disconnect();
    _socket = null;
  }

  Future<void> fetchAvailableOrders() async {
    final token = UserService().token.value;
    if (token == null) return;

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/delivery/orders/available'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          availableOrders.value = List<dynamic>.from(data['data']);
        }
      } else {
        debugPrint('Failed to fetch available orders: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Error fetching available orders: $e');
    }
  }

  Future<void> fetchMyOrders() async {
    final token = await UserService().getFreshToken();
    if (token == null) return;

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/delivery/orders/my-orders'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          myOrders.value = List<dynamic>.from(data['data'] ?? []);
        }
      } else {
        debugPrint('Failed to fetch my orders: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Error fetching my orders: $e');
    }
  }

  Future<bool> acceptOrder(String orderId) async {
    final token = UserService().token.value;
    if (token == null) return false;

    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/delivery/orders/$orderId/accept'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          activeOrder.value = data['data'];
          // Remove from available orders since we accepted it
          final currentOrders = List<dynamic>.from(availableOrders.value);
          currentOrders.removeWhere((order) => order['_id'] == orderId);
          availableOrders.value = currentOrders;
          
          // Optionally, join the specific order tracking room if required
          _socket?.emit('join_order_room', orderId);
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('Error accepting order: $e');
      return false;
    }
  }

  Future<bool> updateDeliveryStatus(String orderId, String status) async {
    final token = UserService().token.value;
    if (token == null) return false;

    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/delivery/orders/$orderId/status'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'status': status}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          activeOrder.value = data['data'];
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('Error updating delivery status: $e');
      return false;
    }
  }

  Future<void> fetchTodaysDeliveries() async {
    final token = await UserService().getFreshToken();
    if (token == null) return;

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/delivery/todays-deliveries'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          final payload = data['data'];
          todaysDeliveries.value = List<dynamic>.from(payload['all'] ?? []);
          if (payload['summary'] != null) {
            todaysSummary.value = Map<String, dynamic>.from(payload['summary']);
          }
        }
      } else {
        debugPrint('Failed to fetch today deliveries: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Error fetching today deliveries: $e');
    }
  }

  Future<bool> markSubscriptionDelivered(String subscriptionId) async {
    final token = await UserService().getFreshToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/delivery/subscriptions/$subscriptionId/mark-delivered'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          // Update local delivery item status
          final currentList = List<dynamic>.from(todaysDeliveries.value);
          for (var item in currentList) {
            if (item['subscriptionId'] == subscriptionId || item['id'] == 'sub_$subscriptionId') {
              item['isDeliveredToday'] = true;
              item['status'] = 'delivered';
            }
          }
          todaysDeliveries.value = currentList;

          // Update summary counts
          final currentSummary = Map<String, dynamic>.from(todaysSummary.value);
          currentSummary['completed'] = (currentSummary['completed'] ?? 0) + 1;
          currentSummary['pending'] = ((currentSummary['total'] ?? 0) - currentSummary['completed']).clamp(0, 9999);
          todaysSummary.value = currentSummary;

          // Refresh wallet balance
          WalletService.instance.fetchWalletData();
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('Error marking subscription delivered: $e');
      return false;
    }
  }

  // ==========================================
  // NORMAL DELIVERY STEP-BY-STEP PROGRESSION
  // ==========================================

  Future<bool> respondToOrderRequest(String orderId, String action) async {
    final token = await UserService().getFreshToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/delivery/orders/respond-request'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'orderId': orderId,
          'action': action
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          if (action.toUpperCase() == 'ACCEPT') {
            activeOrder.value = data['data']?['order'];
            // Remove from available orders
            final currentOrders = List<dynamic>.from(availableOrders.value);
            currentOrders.removeWhere((o) => (o['_id'] == orderId || o['orderId'] == orderId));
            availableOrders.value = currentOrders;
          }
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('Error responding to order request: $e');
      return false;
    }
  }

  Future<bool> arrivedAtPickup(String orderId) async {
    final token = await UserService().getFreshToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/delivery/orders/$orderId/arrived-pickup'),
        headers: { 'Authorization': 'Bearer $token' },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          activeOrder.value = data['data'];
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('Error marking arrived at pickup: $e');
      return false;
    }
  }

  Future<bool> confirmPickup(String orderId) async {
    final token = await UserService().getFreshToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/delivery/orders/$orderId/confirm-pickup'),
        headers: { 'Authorization': 'Bearer $token' },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          activeOrder.value = data['data'];
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('Error confirming pickup: $e');
      return false;
    }
  }

  Future<bool> arrivedAtCustomer(String orderId) async {
    final token = await UserService().getFreshToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/delivery/orders/$orderId/arrived-customer'),
        headers: { 'Authorization': 'Bearer $token' },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          activeOrder.value = data['data'];
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('Error marking arrived at customer: $e');
      return false;
    }
  }

  Future<bool> completeDeliveryStep(
    String orderId, {
    int jarsDelivered = 0,
    int emptyJarsCollected = 0,
  }) async {
    final token = await UserService().getFreshToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/delivery/orders/$orderId/complete-delivery'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'jarsDelivered': jarsDelivered,
          'emptyJarsCollected': emptyJarsCollected,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          activeOrder.value = null;
          WalletService.instance.fetchWalletData();
          fetchMyOrders();
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('Error completing delivery step: $e');
      return false;
    }
  }

  Future<bool> markCustomerUnavailable(String orderId, String reason) async {
    final token = await UserService().getFreshToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/delivery/orders/$orderId/customer-unavailable'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({ 'reason': reason }),
      );

      if (response.statusCode == 200) {
        activeOrder.value = null;
        fetchMyOrders();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error reporting customer unavailable: $e');
      return false;
    }
  }

  // ==========================================
  // SUBSCRIPTION ROUTE MANAGEMENT
  // ==========================================

  Future<void> fetchMyRoutes() async {
    final token = await UserService().getFreshToken();
    if (token == null) return;

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/delivery/routes/today'),
        headers: { 'Authorization': 'Bearer $token' },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          myRoutes.value = List<dynamic>.from(data['data'] ?? []);
        }
      }
    } catch (e) {
      debugPrint('Error fetching my routes: $e');
    }
  }

  Future<bool> startRoute(String routeId) async {
    final token = await UserService().getFreshToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/delivery/routes/$routeId/start'),
        headers: { 'Authorization': 'Bearer $token' },
      );

      if (response.statusCode == 200) {
        await fetchMyRoutes();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error starting route: $e');
      return false;
    }
  }

  Future<bool> updateRouteStopStatus(
    String routeId,
    String stopId, {
    required String status,
    int jarsDelivered = 0,
    int emptyJarsCollected = 0,
    String? failureReason,
  }) async {
    final token = await UserService().getFreshToken();
    if (token == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/delivery/routes/$routeId/stops/$stopId/status'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'status': status,
          'jarsDelivered': jarsDelivered,
          'emptyJarsCollected': emptyJarsCollected,
          'failureReason': failureReason,
        }),
      );

      if (response.statusCode == 200) {
        await fetchMyRoutes();
        await WalletService.instance.fetchWalletData();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error updating route stop status: $e');
      return false;
    }
  }
}

