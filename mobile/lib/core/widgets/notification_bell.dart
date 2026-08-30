import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../app/router.dart';
import '../../features/auth/state/auth_state.dart';
import '../../features/notifications/data/notification_repository.dart';
import '../l10n/generated/app_localizations.dart';
import '../state/query_cache.dart';

/// Bell icon + unread badge, shared by all three role shells — notifications
/// are user-scoped, not role-scoped, so there is exactly one implementation.
class NotificationBell extends StatelessWidget {
  const NotificationBell({super.key});

  @override
  Widget build(BuildContext context) {
    context.watchQueries();
    final repo = context.read<NotificationRepository>();
    final role = context.watch<AuthState>().role;
    final notifications = repo.watchNotifications().valueOrNull ?? const [];
    final unreadCount = repo.unreadCountOf(notifications);
    final l10n = AppLocalizations.of(context)!;

    final path = switch (role) {
      UserRole.customer => Routes.customerNotifications,
      UserRole.provider => Routes.providerNotifications,
      UserRole.admin || null => Routes.adminNotifications,
    };

    return IconButton(
      tooltip: l10n.notifTitle,
      onPressed: () => context.push(path),
      icon: Badge(
        isLabelVisible: unreadCount > 0,
        label: Text(unreadCount > 9 ? '9+' : '$unreadCount'),
        child: const Icon(Icons.notifications_outlined),
      ),
    );
  }
}
