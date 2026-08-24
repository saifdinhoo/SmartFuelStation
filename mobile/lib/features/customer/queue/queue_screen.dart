import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/realtime/socket_service.dart';
import '../../../core/state/async_view.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/status_chip.dart';
import '../../../core/state/query_cache.dart';
import '../data/customer_repository.dart';
import 'queue_display.dart';

/// The customer's own place in line, across every business.
///
/// GET /queue is scoped server-side to the caller, so nothing here can
/// expose another customer's name, booking, or position. The counts shown
/// ("2 ahead") are aggregates the server computes over the full line — the
/// people in it are never sent to the client.
class QueueScreen extends StatelessWidget {
  const QueueScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<CustomerRepository>();
    // Rebuild when any watched cache key resolves or is invalidated.
    context.watchQueries();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: repo.refreshMyQueue,
        child: AsyncView<List<QueueEntry>>(
          value: repo.watchMyQueue(),
          errorTitle: l10n.queueTitle,
          onRetry: repo.refreshMyQueue,
          builder: (context, entries) {
            // Finished and cancelled entries are history, not "your place
            // in line" — the active ones are what this screen is for.
            final active = entries.where((e) => e.status.isActive).toList()
              ..sort((a, b) => a.joinedAt.compareTo(b.joinedAt));

            if (active.isEmpty) {
              return ListView(
                children: [
                  SizedBox(
                    height: MediaQuery.sizeOf(context).height * 0.6,
                    child: EmptyView(
                      icon: Icons.confirmation_number_outlined,
                      title: l10n.queueNotInLine,
                      message: l10n.queueNotInLineBody,
                    ),
                  ),
                ],
              );
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                for (final entry in active) ...[
                  _QueueEntryCard(entry: entry),
                  const SizedBox(height: 12),
                ],
                Text(
                  // Sockets push position changes as they happen; the note
                  // only falls back to "pull to refresh" when disconnected.
                  context.watch<SocketService>().isConnected
                      ? l10n.queueLiveUpdating
                      : l10n.queueLiveNote,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: status.mutedForeground,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _QueueEntryCard extends StatelessWidget {
  const _QueueEntryCard({required this.entry});

  final QueueEntry entry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    // bookingStatus only matters for the "arrived but not queued" case; an
    // entry that exists always drives the message itself.
    final display = deriveQueueDisplay(
      l10n,
      entry,
      entry.bookingStatus ?? BookingStatus.inQueue,
    )!;

    final tone = switch (display.tone) {
      QueueTone.waiting => StatusTone.warning,
      QueueTone.active => StatusTone.success,
      QueueTone.done || QueueTone.neutral => StatusTone.neutral,
    };

    final card = Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    entry.providerName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                StatusChip(
                  label: entry.status == QueueStatus.inService
                      ? l10n.statusInService
                      : l10n.statusInQueue,
                  tone: tone,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              entry.serviceName,
              style: theme.textTheme.bodySmall?.copyWith(
                color: status.mutedForeground,
              ),
            ),
            const SizedBox(height: 16),

            // The position number is the reason this screen exists, so it
            // gets display-sized treatment rather than being a line of body
            // text.
            if (entry.status == QueueStatus.waiting && entry.position != null)
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    '#${entry.position}',
                    style: theme.textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          display.headline,
                          style: theme.textTheme.titleSmall,
                        ),
                        if (display.detail != null)
                          Text(
                            display.detail!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: status.mutedForeground,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              )
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(display.headline, style: theme.textTheme.titleMedium),
                  if (display.detail != null)
                    Text(
                      display.detail!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: status.mutedForeground,
                      ),
                    ),
                ],
              ),

            if (display.nextAction != null) ...[
              const SizedBox(height: 10),
              Text(
                display.nextAction!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
            ],
          ],
        ),
      ),
    );

    if (entry.bookingId == null) return card;

    // Walk-in entries have no booking to open; booking-linked ones do.
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () =>
          context.push(Routes.customerBookingDetails(entry.bookingId!)),
      child: card,
    );
  }
}
