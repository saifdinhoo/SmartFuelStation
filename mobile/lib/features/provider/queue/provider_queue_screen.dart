import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/provider_repository.dart';
import '../workflow/action_runner.dart';
import '../workflow/booking_actions.dart';
import 'add_walk_in_sheet.dart';

/// The provider's live line.
///
/// Updated by `queue:provider_updated`, which the backend broadcasts to the
/// provider's own room after every queue mutation — including ones made by
/// a colleague on another device.
class ProviderQueueScreen extends StatefulWidget {
  const ProviderQueueScreen({super.key});

  @override
  State<ProviderQueueScreen> createState() => _ProviderQueueScreenState();
}

class _ProviderQueueScreenState extends State<ProviderQueueScreen> {
  bool _busy = false;

  /// Swaps two waiting entries and sends the whole WAITING set.
  ///
  /// The backend requires the complete current set — a subset is ambiguous
  /// about where the omitted entries land, so it is refused.
  Future<void> _move(List<QueueEntry> waiting, int index, int delta) async {
    final target = index + delta;
    if (target < 0 || target >= waiting.length) return;

    final reordered = [...waiting];
    final moved = reordered.removeAt(index);
    reordered.insert(target, moved);

    setState(() => _busy = true);
    final l10n = AppLocalizations.of(context)!;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await context.read<ProviderRepository>().reorderQueue(
        reordered.map((e) => e.id).toList(),
      );
      messenger.showSnackBar(SnackBar(content: Text(l10n.pQueueReordered)));
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _run(QueueEntry entry, ProviderBookingAction action) async {
    setState(() => _busy = true);
    try {
      await runProviderAction(
        context: context,
        repo: context.read<ProviderRepository>(),
        action: action,
        bookingId: entry.bookingId,
        queueEntryId: entry.id,
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    final services =
        repo.watchProfile().valueOrNull?.services ?? const <ProviderService>[];

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showAddWalkInSheet(context, services),
        icon: const Icon(Icons.person_add_alt),
        label: Text(l10n.pOverviewAddWalkIn),
      ),
      body: RefreshIndicator(
        onRefresh: repo.refreshQueue,
        child: AsyncView<List<QueueEntry>>(
          value: repo.watchQueue(),
          errorTitle: l10n.pNavQueue,
          onRetry: repo.refreshQueue,
          builder: (context, entries) {
            // The provider list includes finished rows; the live board only
            // shows the people actually in the line right now.
            final waiting =
                entries.where((e) => e.status == QueueStatus.waiting).toList()
                  ..sort(
                    (a, b) =>
                        (a.queuePosition ?? 0).compareTo(b.queuePosition ?? 0),
                  );
            final inService = entries
                .where((e) => e.status == QueueStatus.inService)
                .toList();

            if (waiting.isEmpty && inService.isEmpty) {
              return ListView(
                children: [
                  SizedBox(
                    height: MediaQuery.sizeOf(context).height * 0.6,
                    child: EmptyView(
                      icon: Icons.list_alt_outlined,
                      title: l10n.pQueueEmpty,
                      message: l10n.pQueueEmptyBody,
                    ),
                  ),
                ],
              );
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                _SectionTitle('${l10n.pQueueInService} (${inService.length})'),
                const SizedBox(height: 8),
                if (inService.isEmpty)
                  _Muted(l10n.pQueueNoneInService)
                else
                  ...inService.map(
                    (entry) => _QueueCard(
                      entry: entry,
                      headline: l10n.pQueueCurrent,
                      busy: _busy,
                      actions: [
                        (
                          providerActionsFor(
                            l10n,
                            BookingStatus.inService,
                          ).first,
                          () => _run(
                            entry,
                            providerActionsFor(
                              l10n,
                              BookingStatus.inService,
                            ).first,
                          ),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 20),
                _SectionTitle('${l10n.pQueueWaiting} (${waiting.length})'),
                const SizedBox(height: 8),
                if (waiting.isEmpty)
                  _Muted(l10n.pQueueNoneWaiting)
                else
                  ...waiting.asMap().entries.map((pair) {
                    final index = pair.key;
                    final entry = pair.value;
                    final queueActions = providerActionsFor(
                      l10n,
                      BookingStatus.inQueue,
                    );

                    return _QueueCard(
                      entry: entry,
                      headline: index == 0 ? l10n.pQueueNext : null,
                      position: index + 1,
                      busy: _busy,
                      onMoveUp: index > 0
                          ? () => _move(waiting, index, -1)
                          : null,
                      onMoveDown: index < waiting.length - 1
                          ? () => _move(waiting, index, 1)
                          : null,
                      actions: [
                        for (final action in queueActions)
                          (action, () => _run(entry, action)),
                      ],
                    );
                  }),

                const SizedBox(height: 16),
                Text(
                  l10n.queueLiveUpdating,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.extension<AppStatusColors>()!.mutedForeground,
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

class _QueueCard extends StatelessWidget {
  const _QueueCard({
    required this.entry,
    required this.busy,
    required this.actions,
    this.headline,
    this.position,
    this.onMoveUp,
    this.onMoveDown,
  });

  final QueueEntry entry;
  final bool busy;
  final List<(ProviderBookingAction, VoidCallback)> actions;
  final String? headline;
  final int? position;
  final VoidCallback? onMoveUp;
  final VoidCallback? onMoveDown;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final isServing = entry.status == QueueStatus.inService;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (position != null) ...[
                  Container(
                    height: 30,
                    width: 30,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$position',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        // Walk-ins always carry a name; booking-linked
                        // entries carry the customer's.
                        entry.customerName ?? '—',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        entry.serviceName,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: status.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
                if (headline != null)
                  StatusChip(
                    label: headline!,
                    tone: isServing ? StatusTone.success : StatusTone.primary,
                  ),
              ],
            ),

            if (onMoveUp != null || onMoveDown != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  IconButton(
                    tooltip: l10n.pQueueMoveUp,
                    onPressed: busy ? null : onMoveUp,
                    icon: const Icon(Icons.arrow_upward, size: 18),
                  ),
                  IconButton(
                    tooltip: l10n.pQueueMoveDown,
                    onPressed: busy ? null : onMoveDown,
                    icon: const Icon(Icons.arrow_downward, size: 18),
                  ),
                ],
              ),
            ] else
              const SizedBox(height: 10),

            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final (action, run) in actions)
                  action.isDestructive
                      ? OutlinedButton(
                          onPressed: busy ? null : run,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: theme.colorScheme.error,
                            minimumSize: const Size(0, 38),
                          ),
                          child: Text(action.label),
                        )
                      : FilledButton(
                          onPressed: busy ? null : run,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(0, 38),
                          ),
                          child: Text(action.label),
                        ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: Theme.of(
      context,
    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  );
}

class _Muted extends StatelessWidget {
  const _Muted(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      text,
      style: theme.textTheme.bodyMedium?.copyWith(
        color: theme.extension<AppStatusColors>()!.mutedForeground,
      ),
    );
  }
}
