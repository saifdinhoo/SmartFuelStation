import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/widgets/ai_assistant_button.dart';
import '../../../core/widgets/live_indicator.dart';
import '../../../core/widgets/notification_bell.dart';
import '../../shell/widgets/settings_menu.dart';

/// Bottom-navigation chrome for the provider area.
///
/// Five destinations, with the long tail (profile, live status, reviews,
/// analytics) behind "More" rather than crowding the bar — the mobile
/// equivalent of the web's nine-item sidebar.
class ProviderShell extends StatelessWidget {
  const ProviderShell({super.key, required this.child});

  final Widget child;

  static const _paths = [
    Routes.providerOverview,
    Routes.providerBookings,
    Routes.providerQueue,
    Routes.providerServices,
    Routes.providerMore,
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final location = GoRouterState.of(context).matchedLocation;

    final labels = [
      l10n.pNavOverview,
      l10n.pNavBookings,
      l10n.pNavQueue,
      l10n.pNavServices,
      l10n.pNavMore,
    ];

    final icons = [
      (Icons.dashboard_outlined, Icons.dashboard),
      (Icons.event_note_outlined, Icons.event_note),
      (Icons.list_alt_outlined, Icons.list_alt),
      (Icons.build_outlined, Icons.build),
      (Icons.more_horiz, Icons.more_horiz),
    ];

    final index = _paths.indexOf(location);
    final selected = index < 0 ? 0 : index;

    return Scaffold(
      appBar: AppBar(
        title: Text(labels[selected]),
        actions: const [
          LiveIndicator(),
          AiAssistantButton(),
          NotificationBell(),
          SettingsMenu(),
        ],
      ),
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected,
        onDestinationSelected: (i) => context.go(_paths[i]),
        destinations: [
          for (var i = 0; i < _paths.length; i++)
            NavigationDestination(
              icon: Icon(icons[i].$1),
              selectedIcon: Icon(icons[i].$2),
              label: labels[i],
            ),
        ],
      ),
    );
  }
}
