import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'home_tab.dart';
import 'earnings_tab.dart';
import 'profile_tab.dart';
import 'orders_tab.dart';
import 'notifications_screen.dart';
import 'incentives_screen.dart';
import 'help_support_screen.dart';
import 'settings_preferences_screen.dart';
import 'login_screen.dart';
import 'incoming_order_dialog.dart';
import '../services/user_service.dart';
import '../services/delivery_service.dart';
import '../services/wallet_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  bool _isOnline = true;
  bool _isModalShowing = false;

  @override
  void initState() {
    super.initState();
    DeliveryService().isOnline.value = _isOnline;
    DeliveryService().initSocket();
    DeliveryService().fetchAvailableOrders();
    DeliveryService().fetchTodaysDeliveries();
    WalletService.instance.fetchWalletData();
    DeliveryService().latestIncomingOrder.addListener(_handleIncomingOrderAlert);
  }

  @override
  void dispose() {
    DeliveryService().latestIncomingOrder.removeListener(_handleIncomingOrderAlert);
    super.dispose();
  }

  void _handleIncomingOrderAlert() {
    final order = DeliveryService().latestIncomingOrder.value;
    if (order == null || !mounted || !_isOnline) return;

    if (_isModalShowing) return;
    _isModalShowing = true;

    // Show rider-app style popup modal
    IncomingOrderRequestDialog.show(context, order).then((_) {
      _isModalShowing = false;
      if (DeliveryService().latestIncomingOrder.value?['_id'] == order['_id']) {
        DeliveryService().latestIncomingOrder.value = null;
      }
    });
  }

  void _onTabSelect(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = [
      HomeTab(onSelectTab: _onTabSelect),
      const EarningsTab(),
      const OrdersTab(),
      const ProfileTab(),
    ];

    return Scaffold(
      backgroundColor: Colors.white,
      drawer: _buildPartnerDrawer(context),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Builder(
              builder: (drawerContext) => IconButton(
                icon: const Icon(Icons.menu, color: Colors.black87, size: 26),
                onPressed: () => Scaffold.of(drawerContext).openDrawer(),
              ),
            ),
            const Spacer(),
            // Online/Offline Toggle
            GestureDetector(
              onTap: () {
                setState(() {
                  _isOnline = !_isOnline;
                  DeliveryService().isOnline.value = _isOnline;
                  if (_isOnline) {
                    DeliveryService().initSocket();
                    DeliveryService().fetchAvailableOrders();
                    DeliveryService().fetchTodaysDeliveries();
                  }
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      _isOnline ? "You are now ONLINE for deliveries" : "You are now OFFLINE",
                      style: GoogleFonts.outfit(color: Colors.white),
                    ),
                    backgroundColor: _isOnline ? const Color(0xFF1E9C1C) : Colors.black87,
                    duration: const Duration(seconds: 2),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade300, width: 1),
                  boxShadow: [
                    BoxShadow(color: Colors.grey.shade200, blurRadius: 4, spreadRadius: 1),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _isOnline ? const Color(0xFF1E9C1C) : Colors.red,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _isOnline ? "Online" : "Offline",
                      style: GoogleFonts.outfit(
                        color: Colors.black87,
                        fontWeight: FontWeight.w500,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 16),
            GestureDetector(
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (context) => const NotificationsScreen()));
              },
              child: Stack(
                children: [
                  const Icon(Icons.notifications_none, color: Colors.black87, size: 26),
                  Positioned(
                    right: 2,
                    top: 2,
                    child: Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: tabs[_currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: Colors.grey.shade200)),
        ),
        child: BottomNavigationBar(
          backgroundColor: Colors.white,
          selectedItemColor: const Color(0xFF1E9C1C),
          unselectedItemColor: Colors.black54,
          selectedLabelStyle: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold),
          unselectedLabelStyle: GoogleFonts.outfit(fontSize: 12),
          currentIndex: _currentIndex,
          type: BottomNavigationBarType.fixed,
          onTap: (index) {
            setState(() {
              _currentIndex = index;
            });
          },
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: "Home"),
            BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), activeIcon: Icon(Icons.account_balance_wallet), label: "Earnings"),
            BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined), activeIcon: Icon(Icons.assignment), label: "Orders"),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: "Profile"),
          ],
        ),
      ),
    );
  }

  // --- PARTNER SIDE SLIDE BAR DRAWER ---
  Widget _buildPartnerDrawer(BuildContext context) {
    return Drawer(
      backgroundColor: Colors.white,
      width: MediaQuery.of(context).size.width * 0.78, // Side slide bar width
      child: Column(
        children: [
          // Header Profile Section
          Container(
            padding: const EdgeInsets.fromLTRB(16, 50, 16, 20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1E9C1C), Color(0xFF146B12)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ValueListenableBuilder<UserProfile?>(
                  valueListenable: UserService().currentUser,
                  builder: (context, user, _) {
                    final hasPhoto = user?.photoUrl != null && user!.photoUrl!.isNotEmpty;
                    final shortId = (user != null && user.id.length > 6)
                        ? user.id.substring(user.id.length - 6).toUpperCase()
                        : (user?.id ?? "000000");
                    return Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(3),
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          child: CircleAvatar(
                            radius: 28,
                            backgroundColor: const Color(0xFFE8F5E9),
                            backgroundImage: hasPhoto ? NetworkImage(user.photoUrl!) : null,
                            child: hasPhoto ? null : const Icon(Icons.person, size: 36, color: Color(0xFF1E9C1C)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.name ?? "Delivery Partner",
                                style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                "Partner ID: #$shortId",
                                style: GoogleFonts.outfit(color: Colors.white70, fontSize: 12),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.star, color: Colors.amber, size: 14),
                                    const SizedBox(width: 4),
                                    Text(
                                      "4.9 Rating (520+ Orders)",
                                      style: GoogleFonts.outfit(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.two_wheeler, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          "TVS iQube EV • TS 09 EA 4321",
                          style: GoogleFonts.outfit(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Drawer Navigation List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
              children: [
                _buildDrawerSectionTitle("QUICK NAVIGATION"),
                _buildDrawerItem(
                  icon: Icons.home_outlined,
                  title: "Home Dashboard",
                  subtitle: "View earnings & active shift",
                  onTap: () {
                    Navigator.pop(context);
                    _onTabSelect(0);
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.assignment_outlined,
                  title: "My Deliveries & Orders",
                  subtitle: "Pending, active & completed",
                  onTap: () {
                    Navigator.pop(context);
                    _onTabSelect(2);
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.account_balance_wallet_outlined,
                  title: "Earnings & Payouts",
                  subtitle: "Daily earnings & bank transfer",
                  onTap: () {
                    Navigator.pop(context);
                    _onTabSelect(1);
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.card_giftcard_outlined,
                  title: "Incentives & Bonuses",
                  subtitle: "Earn ₹200 extra bonus today",
                  badgeText: "HOT",
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (context) => const IncentivesScreen()));
                  },
                ),

                const Divider(height: 24),
                _buildDrawerSectionTitle("PARTNER TOOLS & HUB"),
                ValueListenableBuilder<UserProfile?>(
                  valueListenable: UserService().currentUser,
                  builder: (context, user, _) {
                    final deliveryDetails = user?.deliveryDetails;
                    final assignedStore = (deliveryDetails?['assignedStore'] ??
                            deliveryDetails?['assignedHub'] ??
                            deliveryDetails?['darkStore'] ??
                            deliveryDetails?['hubName'])
                        ?.toString()
                        .trim();
                    if (assignedStore == null || assignedStore.isEmpty) {
                      return const SizedBox.shrink();
                    }
                    final hubAddress = deliveryDetails?['hubAddress'] ?? 'Contact admin for hub address';
                    final managerContact = deliveryDetails?['hubManagerContact'] ?? 'Contact support';
                    return _buildDrawerItem(
                      icon: Icons.storefront_outlined,
                      title: "Dark Store Hub",
                      subtitle: assignedStore,
                      onTap: () => _showDialogInfo(
                        context,
                        "Dark Store Hub",
                        "Assigned Hub: $assignedStore\nAddress: $hubAddress\nManager Contact: $managerContact",
                      ),
                    );
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.ev_station_outlined,
                  title: "EV Charging Stations",
                  subtitle: "Nearest battery swap points",
                  onTap: () => _showDialogInfo(context, "EV Charging Stations", "1. Jubilee Hills Hub Station (0.5 km)\n2. Madhapur Swap Point (1.8 km)\n3. Gachibowli Fast Charger (3.2 km)"),
                ),

                const Divider(height: 24),
                _buildDrawerSectionTitle("SAFETY & SUPPORT"),
                _buildDrawerItem(
                  icon: Icons.sos_outlined,
                  title: "Emergency SOS / Helpline",
                  subtitle: "Instant 24x7 rider emergency help",
                  iconColor: Colors.redAccent,
                  onTap: () => _showDialogInfo(context, "Emergency SOS", "Dialing Nilara Partner Emergency Support Helpline:\n📞 1800-102-9999\n\nLocation shared automatically with nearest support unit."),
                ),
                _buildDrawerItem(
                  icon: Icons.support_agent_outlined,
                  title: "Partner Support Chat",
                  subtitle: "Raise ticket or talk to executive",
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const HelpSupportScreen()),
                    );
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.settings_outlined,
                  title: "App Settings",
                  subtitle: "Navigation maps, language & alert tones",
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const SettingsPreferencesScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),

          // Drawer Footer Logout Option
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.grey.shade200))),
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.logout, color: Colors.redAccent),
              title: Text("Log Out", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.redAccent)),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const LoginScreen()));
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 12, top: 4, bottom: 6),
      child: Text(
        title,
        style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500, letterSpacing: 1.0),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color iconColor = const Color(0xFF1E9C1C),
    String? badgeText,
    Color badgeColor = Colors.orange,
  }) {
    return ListTile(
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
            ),
          ),
          if (badgeText != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                badgeText,
                style: GoogleFonts.outfit(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
        ],
      ),
      subtitle: Text(
        subtitle,
        style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade600),
      ),
      onTap: onTap,
    );
  }

  void _showDialogInfo(BuildContext context, String title, String content) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Text(content, style: GoogleFonts.outfit(fontSize: 14, height: 1.5)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text("Close", style: GoogleFonts.outfit(color: const Color(0xFF1E9C1C), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
