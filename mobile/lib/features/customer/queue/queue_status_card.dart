import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/status_chip.dart';
import '../../../core/state/query_cache.dart';
import '../data/customer_repository.dart';
import 'queue_display.dart';

/// Queue position for one booking, shown inside the booking details screen.
///
/// Renders nothing when queueing isn't relevant yet, so an ordinary pending
/// booking isn't cluttered with an empty queue box.
class QueueStatusCard extends StatelessWidget {
  const QueueStatusCard({super.key, required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<CustomerRepository>();
    // Rebuild when any watched cache key resolves or is invalidated.
    context.watchQueries();

    // GET /queue returns only this customer's own entries.
    final entries = repo.watchMyQueue().valueOrNull ?? const <QueueEntry>[];
    final entry = entries.where((e) => e.bookingId == booking.id).firstOrNull;
    final display = deriveQueueDisplay(l10n, entry, booking.status);

    if (display == null) return const SizedBox.shrink();

    final tone = switch (display.tone) {
      QueueTone.waiting => StatusTone.warning,
      QueueTone.active => StatusTone.success,
      QueueTone.done => StatusTone.neutral,
      QueueTone.neutral => StatusTone.neutral,
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    l10n.queueTitle,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                StatusChip(label: display.headline, tone: tone),
              ],
            ),
            if (display.detail != null) ...[
              const SizedBox(height: 8),
              Text(display.detail!, style: theme.textTheme.bodyMedium),
            ],
            if (display.nextAction != null) ...[
              const SizedBox(height: 4),
              Text(
                display.nextAction!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
            ],
            const SizedBox(height: 10),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                // No Socket.IO yet (Phase 2), so refreshing is explicit.
                onPressed: repo.refreshMyQueue,
                icon: const Icon(Icons.refresh, size: 18),
                label: Text(l10n.queueRefresh),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
