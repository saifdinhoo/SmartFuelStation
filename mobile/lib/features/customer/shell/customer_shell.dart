import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/widgets/live_indicator.dart';
import '../../shell/widgets/settings_menu.dart';

/// Bottom-navigation chrome for the customer area.
///
/// The five destinations map to real routes rather than an index-only
/// PageView, so deep links and the back button behave.
class CustomerShell extends StatelessWidget {
  const CustomerShell({super.key, required this.child});

  final Widget child;

  static const _destinations = [
    (path: Routes.customerHome, icon: Icons.home_outlined, active: Icons.home),
    (path: Routes.customerExplore, icon: Icons.search, active: Icons.search),
    (
      path: Routes.customerBookings,
      icon: Icons.event_note_outlined,
      active: Icons.event_note,
    ),
    (
      path: Routes.customerQueue,
      icon: Icons.confirmation_number_outlined,
      active: Icons.confirmation_number,
    ),
    (
      path: Routes.customerProfile,
      icon: Icons.person_outline,
      active: Icons.person,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final location = GoRouterState.of(context).matchedLocation;

    final labels = [
      l10n.navHome,
      l10n.navExplore,
      l10n.navBookings,
      l10n.navQueue,
      l10n.navProfile,
    ];

    final index = _destinations.indexWhere((d) => d.path == location);
    final selected = index < 0 ? 0 : index;

    return Scaffold(
      appBar: AppBar(
        title: Text(labels[selected]),
        actions: const [LiveIndicator(), SettingsMenu()],
      ),
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected,
        onDestinationSelected: (i) => context.go(_destinations[i].path),
        destinations: [
          for (var i = 0; i < _destinations.length; i++)
            NavigationDestination(
              icon: Icon(_destinations[i].icon),
              selectedIcon: Icon(_destinations[i].active),
              label: labels[i],
            ),
        ],
      ),
    );
  }
}
