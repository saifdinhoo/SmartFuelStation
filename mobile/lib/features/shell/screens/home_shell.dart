import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../auth/state/auth_state.dart';
import '../widgets/settings_menu.dart';

/// Signed-in chrome: app bar plus bottom navigation, wrapped around whichever
/// routed screen is active.
///
/// Tabs are built from the current role, so a customer never sees the admin
/// destination. The router guard in `_roleGuards` still backstops a direct
/// navigation to an admin path.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final auth = context.watch<AuthState>();
    final isAdmin = auth.role == UserRole.admin;

    final destinations = <({String path, NavigationDestination destination})>[
      (
        path: Routes.dashboard,
        destination: NavigationDestination(
          icon: const Icon(Icons.home_outlined),
          selectedIcon: const Icon(Icons.home),
          label: l10n.navDashboard,
        ),
      ),
      (
        path: Routes.categories,
        destination: NavigationDestination(
          icon: const Icon(Icons.category_outlined),
          selectedIcon: const Icon(Icons.category),
          label: l10n.navCategories,
        ),
      ),
      if (isAdmin)
        (
          path: Routes.adminProviders,
          destination: NavigationDestination(
            icon: const Icon(Icons.store_outlined),
            selectedIcon: const Icon(Icons.store),
            label: l10n.navProviders,
          ),
        ),
    ];

    final location = GoRouterState.of(context).matchedLocation;
    final currentIndex = destinations.indexWhere((d) => d.path == location);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.appTitle),
        actions: [
          const SettingsMenu(),
          IconButton(
            tooltip: l10n.actionLogout,
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthState>().logout(),
          ),
        ],
      ),
      body: child,
      bottomNavigationBar: NavigationBar(
        // -1 while on a route with no tab (e.g. /unauthorized); clamp so the
        // bar renders instead of throwing on a negative index.
        selectedIndex: currentIndex < 0 ? 0 : currentIndex,
        onDestinationSelected: (index) => context.go(destinations[index].path),
        destinations: [for (final d in destinations) d.destination],
      ),
    );
  }
}
