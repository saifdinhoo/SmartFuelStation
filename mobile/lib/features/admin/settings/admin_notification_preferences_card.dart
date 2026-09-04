import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../notifications/data/notification_repository.dart';

/// Only the four categories the backend actually emits notifications for
/// (see notificationPreference.service.js's CATEGORY_BY_TYPE) — no toggle
/// exists here for a notification family that doesn't exist yet.
class AdminNotificationPreferencesCard extends StatefulWidget {
  const AdminNotificationPreferencesCard({super.key});

  @override
  State<AdminNotificationPreferencesCard> createState() =>
      _AdminNotificationPreferencesCardState();
}

class _AdminNotificationPreferencesCardState
    extends State<AdminNotificationPreferencesCard> {
  bool _saving = false;

  Future<void> _toggle(
    Future<NotificationPreferences> Function(NotificationRepository repo)
    update,
  ) async {
    final repo = context.read<NotificationRepository>();
    setState(() => _saving = true);
    try {
      await update(repo);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final repo = context.read<NotificationRepository>();
    context.watchQueries();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.notifications_outlined,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l10n.aMoreNotificationSettingsTitle,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              l10n.aMoreNotificationSettingsDescription,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            AsyncView<NotificationPreferences>(
              value: repo.watchPreferences(),
              builder: (context, prefs) => Column(
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.notifPrefBookingUpdates),
                    subtitle: Text(l10n.notifPrefBookingUpdatesDesc),
                    value: prefs.bookingUpdates,
                    onChanged: _saving
                        ? null
                        : (value) => _toggle(
                            (r) => r.updatePreference(bookingUpdates: value),
                          ),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.notifPrefQueueUpdates),
                    subtitle: Text(l10n.notifPrefQueueUpdatesDesc),
                    value: prefs.queueUpdates,
                    onChanged: _saving
                        ? null
                        : (value) => _toggle(
                            (r) => r.updatePreference(queueUpdates: value),
                          ),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.notifPrefReviewUpdates),
                    subtitle: Text(l10n.notifPrefReviewUpdatesDesc),
                    value: prefs.reviewUpdates,
                    onChanged: _saving
                        ? null
                        : (value) => _toggle(
                            (r) => r.updatePreference(reviewUpdates: value),
                          ),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(l10n.notifPrefProviderUpdates),
                    subtitle: Text(l10n.notifPrefProviderUpdatesDesc),
                    value: prefs.providerUpdates,
                    onChanged: _saving
                        ? null
                        : (value) => _toggle(
                            (r) => r.updatePreference(providerUpdates: value),
                          ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
