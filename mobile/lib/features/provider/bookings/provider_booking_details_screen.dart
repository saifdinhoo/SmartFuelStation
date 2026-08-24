import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/status_chip.dart';
import '../../customer/widgets/booking_status_ui.dart';
import '../data/provider_repository.dart';
import '../workflow/action_runner.dart';
import '../workflow/booking_actions.dart';

class ProviderBookingDetailsScreen extends StatefulWidget {
  const ProviderBookingDetailsScreen({super.key, required this.bookingId});

  final int bookingId;

  @override
  State<ProviderBookingDetailsScreen> createState() =>
      _ProviderBookingDetailsScreenState();
}

class _ProviderBookingDetailsScreenState
    extends State<ProviderBookingDetailsScreen> {
  bool _busy = false;

  Future<void> _run(ProviderBookingAction action, QueueEntry? entry) async {
    // Queue-keyed actions need the entry id; without it the request would
    // fail server-side, so the button stays disabled instead.
    if (action.needsQueueEntry && entry == null) return;

    setState(() => _busy = true);
    try {
      await runProviderAction(
        context: context,
        repo: context.read<ProviderRepository>(),
        action: action,
        bookingId: widget.bookingId,
        queueEntryId: entry?.id,
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    // Bridges booking id → queue entry id. The Queue endpoints are keyed by
    // entry, everything on this screen by booking.
    final queue = repo.watchQueue().valueOrNull ?? const <QueueEntry>[];

    return Scaffold(
      appBar: AppBar(title: Text(l10n.bookingDetailsTitle)),
      body: AsyncView<Booking>(
        value: repo.watchBooking(widget.bookingId),
        errorTitle: l10n.bookingNotFound,
        builder: (context, booking) {
          final entry = queue
              .where((e) => e.bookingId == booking.id)
              .cast<QueueEntry?>()
              .firstWhere((e) => true, orElse: () => null);
          final actions = providerActionsFor(l10n, booking.status);

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      booking.customerName,
                      style: theme.textTheme.titleLarge,
                    ),
                  ),
                  BookingStatusChip(status: booking.status),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                booking.serviceName,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: status.mutedForeground,
                ),
              ),

              const SizedBox(height: 24),
              _Heading(l10n.pBookingNextStep),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: actions.isEmpty
                      ? Text(
                          l10n.pBookingNoActions,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: status.mutedForeground,
                          ),
                        )
                      : Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final action in actions)
                              action.isDestructive
                                  ? OutlinedButton(
                                      onPressed:
                                          _busy ||
                                              (action.needsQueueEntry &&
                                                  entry == null)
                                          ? null
                                          : () => _run(action, entry),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor:
                                            theme.colorScheme.error,
                                        minimumSize: const Size(0, 40),
                                      ),
                                      child: Text(action.label),
                                    )
                                  : FilledButton(
                                      onPressed:
                                          _busy ||
                                              (action.needsQueueEntry &&
                                                  entry == null)
                                          ? null
                                          : () => _run(action, entry),
                                      style: FilledButton.styleFrom(
                                        minimumSize: const Size(0, 40),
                                      ),
                                      child: Text(action.label),
                                    ),
                          ],
                        ),
                ),
              ),

              const SizedBox(height: 20),
              _Heading(l10n.bookingStatusLabel),
              const SizedBox(height: 12),
              BookingStatusTimeline(
                status: booking.status,
                cancelledAt: booking.cancelledAt,
              ),

              if (entry != null) ...[
                const SizedBox(height: 20),
                _Heading(l10n.pBookingQueueEntry),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${l10n.pBookingPositionInLine}: #${entry.queuePosition ?? '—'}',
                          ),
                        ),
                        StatusChip(
                          label: entry.status == QueueStatus.inService
                              ? l10n.pQueueInService
                              : l10n.pQueueWaiting,
                          tone: entry.status == QueueStatus.inService
                              ? StatusTone.success
                              : StatusTone.warning,
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 20),
              _Heading(l10n.pBookingCustomer),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Column(
                    children: [
                      _Row(label: l10n.fieldName, value: booking.customerName),
                      _Row(
                        label: l10n.bookingWhen,
                        value: formatBookingDateTime(booking.scheduledAt),
                      ),
                      _Row(
                        label: l10n.bookingService,
                        value: booking.serviceName,
                      ),
                      _Row(
                        label: l10n.bookingCategory,
                        value: booking.categoryName,
                      ),
                      _Row(
                        label: l10n.bookingPrice,
                        value: '\$${booking.priceAtBooking.toStringAsFixed(2)}',
                      ),
                      if (booking.notes != null && booking.notes!.isNotEmpty)
                        _Row(label: l10n.bookingNotes, value: booking.notes!),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: Theme.of(
      context,
    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  );
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: status.mutedForeground,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: theme.textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
