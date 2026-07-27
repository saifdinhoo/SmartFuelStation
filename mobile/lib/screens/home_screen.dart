import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_state.dart';
import 'dashboard_screen.dart';
import 'categories_screen.dart';
import 'providers_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final isAdmin = context.watch<AuthState>().user?['role'] == 'ADMIN';

    final tabs = [
      const DashboardScreen(),
      const CategoriesScreen(),
      if (isAdmin) const ProvidersScreen(),
    ];
    final destinations = [
      const NavigationDestination(icon: Icon(Icons.home), label: 'Dashboard'),
      const NavigationDestination(icon: Icon(Icons.category), label: 'Categories'),
      if (isAdmin) const NavigationDestination(icon: Icon(Icons.store), label: 'Providers'),
    ];

    final safeIndex = _tabIndex < tabs.length ? _tabIndex : 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart Automotive Service'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthState>().logout(),
          ),
        ],
      ),
      body: tabs[safeIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeIndex,
        onDestinationSelected: (index) => setState(() => _tabIndex = index),
        destinations: destinations,
      ),
    );
  }
}
