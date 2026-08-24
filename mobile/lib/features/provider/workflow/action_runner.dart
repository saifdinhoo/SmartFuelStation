import 'package:flutter/material.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/network/api_exception.dart';
import '../data/provider_repository.dart';
import 'booking_actions.dart';

/// Runs one provider workflow action, including its confirmation dialog and
/// error reporting.
///
/// Shared by the bookings list, the booking details screen and the queue
/// screen so all three behave identically — the same confirm copy, the same
/// verbatim server error, the same cache invalidation.
///
/// Returns true when the action was performed.
Future<bool> runProviderAction({
  required BuildContext context,
  required ProviderRepository repo,
  required ProviderBookingAction action,
  required int? bookingId,
  int? queueEntryId,
}) async {
  final l10n = AppLocalizations.of(context)!;
  final messenger = ScaffoldMessenger.of(context);

  if (action.needsConfirmation) {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(action.confirmTitle!),
        content: Text(action.confirmBody!),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(l10n.actionCancel),
          ),
          FilledButton(
            style: action.isDestructive
                ? FilledButton.styleFrom(
                    backgroundColor: Theme.of(dialogContext).colorScheme.error,
                  )
                : null,
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(action.label),
          ),
        ],
      ),
    );
    if (confirmed != true) return false;
  }

  try {
    switch (action.kind) {
      case ProviderActionKind.booking:
        await repo.setBookingStatus(bookingId!, action.targetStatus!);
      case ProviderActionKind.queueAdd:
        await repo.addBookingToQueue(bookingId!);
      case ProviderActionKind.queueStatus:
        await repo.setQueueStatus(
          queueEntryId!,
          action.targetStatus!,
          bookingId: bookingId,
        );
      case ProviderActionKind.queueRemove:
        await repo.removeQueueEntry(queueEntryId!, bookingId: bookingId);
    }

    messenger.showSnackBar(SnackBar(content: Text(l10n.pActionDone)));
    return true;
  } on ApiException catch (e) {
    // The backend writes these for humans — "Cannot remove an in-service,
    // booking-linked queue entry — complete it first" says more than any
    // generic failure message could.
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
    return false;
  }
}
