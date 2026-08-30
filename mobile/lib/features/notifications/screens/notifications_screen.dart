import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../auth/state/auth_state.dart';
import '../data/notification_repository.dart';

/// Only deep-links to a route that genuinely exists for the signed-in
/// role — otherwise the notification is shown as plain text with no
/// navigation, exactly like the web's NotificationsDropdown/NotificationsPage.
String? _targetFor(AppNotification notification, UserRole? role) {
  final bookingId = notification.relatedBookingId;
  if (bookingId != null) {
    return switch (role) {
      UserRole.customer => Routes.customerBookingDetails(bookingId),
      UserRole.provider => Routes.providerBookingDetails(bookingId),
      UserRole.admin => Routes.adminBookingDetails(bookingId),
      null => null,
    };
  }

  final providerId = notification.relatedProviderId;
  if (providerId != null) {
    return switch (role) {
      UserRole.admin => Routes.adminProviderDetails(providerId),
      // A provider's own approval/rejection notification is about their
      // own business — there is no "view provider by id" route for a
      // provider account, only their own profile.
      UserRole.provider => Routes.providerProfile,
      UserRole.customer => Routes.customerProviderDetails(providerId),
      null => null,
    };
  }

  if (notification.relatedQueueEntryId != null && role == UserRole.customer) {
    return Routes.customerQueue;
  }

  // No single-review-detail route exists anywhere in the app.
  if (notification.relatedReviewId != null && role == UserRole.provider) {
    return Routes.providerReviews;
  }

  return null;
}

/// User-scoped, shared by every role — there is exactly one notifications
/// screen, not a separate implementation per area.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<NotificationRepository>();
    final role = context.watch<AuthState>().role;
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.notifTitle),
        actions: [
          _MarkAllReadAction(repo: repo),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: repo.refreshNotifications,
        child: AsyncView<List<AppNotification>>(
          value: repo.watchNotifications(),
          errorTitle: l10n.notifTitle,
          onRetry: repo.refreshNotifications,
          builder: (context, notifications) {
            if (notifications.isEmpty) {
              return ListView(
                children: [
                  SizedBox(
                    height: MediaQuery.sizeOf(context).height * 0.6,
                    child: EmptyView(
                      icon: Icons.notifications_none_outlined,
                      title: l10n.notifEmpty,
                    ),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: notifications.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, index) => _NotificationTile(
                notification: notifications[index],
                onTap: () async {
                  final notification = notifications[index];
                  if (!notification.isRead) {
                    await repo.markRead(notification.id);
                  }
                  final target = _targetFor(notification, role);
                  if (target != null && context.mounted) context.push(target);
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

class _MarkAllReadAction extends StatelessWidget {
  const _MarkAllReadAction({required this.repo});

  final NotificationRepository repo;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    context.watchQueries();
    final notifications = repo.watchNotifications().valueOrNull ?? const [];
    if (repo.unreadCountOf(notifications) == 0) return const SizedBox.shrink();

    return TextButton(
      onPressed: repo.markAllRead,
      child: Text(l10n.notifMarkAllRead),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return ListTile(
      onTap: onTap,
      leading: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: CircleAvatar(
          radius: 4,
          backgroundColor: notification.isRead
              ? Colors.transparent
              : theme.colorScheme.primary,
        ),
      ),
      title: Text(
        notification.title,
        style: theme.textTheme.titleSmall?.copyWith(
          fontWeight: notification.isRead ? FontWeight.normal : FontWeight.w700,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 2),
          Text(notification.message),
          const SizedBox(height: 4),
          Text(
            _formatTimestamp(notification.createdAt),
            style: theme.textTheme.labelSmall?.copyWith(
              color: status.mutedForeground,
            ),
          ),
        ],
      ),
      isThreeLine: true,
    );
  }

  static String _twoDigits(int n) => n.toString().padLeft(2, '0');

  String _formatTimestamp(DateTime dateTime) {
    final local = dateTime.toLocal();
    return '${local.year}-${_twoDigits(local.month)}-${_twoDigits(local.day)} '
        '${_twoDigits(local.hour)}:${_twoDigits(local.minute)}';
  }
}
