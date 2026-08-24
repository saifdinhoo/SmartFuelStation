import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/state/query_cache.dart';
import '../data/customer_repository.dart';
import '../queue/queue_status_card.dart';
import '../reviews/write_review_sheet.dart';
import '../widgets/booking_status_ui.dart';

class BookingDetailsScreen extends StatefulWidget {
  const BookingDetailsScreen({super.key, required this.bookingId});

  final int bookingId;

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  bool _cancelling = false;

  Future<void> _confirmCancel(Booking booking) async {
    final l10n = AppLocalizations.of(context)!;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.bookingCancelConfirmTitle),
        content: Text(l10n.bookingCancelConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(l10n.actionCancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(l10n.bookingCancel),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _cancelling = true);
    try {
      await context.read<CustomerRepository>().cancelBooking(booking.id);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.bookingCancelled)));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<CustomerRepository>();
    // Rebuild when any watched cache key resolves or is invalidated.
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.bookingDetailsTitle)),
      body: AsyncView<Booking>(
        value: repo.watchBooking(widget.bookingId),
        errorTitle: l10n.bookingNotFound,
        builder: (context, booking) {
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          booking.providerName,
                          style: theme.textTheme.titleLarge,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          booking.providerAddress,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: status.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  ),
                  BookingStatusChip(status: booking.status),
                ],
              ),

              const SizedBox(height: 24),
              Text(
                l10n.bookingStatusLabel,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              BookingStatusTimeline(
                status: booking.status,
                cancelledAt: booking.cancelledAt,
              ),

              const SizedBox(height: 20),
              QueueStatusCard(booking: booking),

              const SizedBox(height: 20),
              Text(
                l10n.bookingDetailsSection,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 4,
                  ),
                  child: Column(
                    children: [
                      _Row(
                        label: l10n.bookingService,
                        value: booking.serviceName,
                      ),
                      _Row(
                        label: l10n.bookingCategory,
                        value: booking.categoryName,
                      ),
                      _Row(
                        label: l10n.serviceDuration(
                          booking.serviceDurationMinutes,
                        ),
                        value: '',
                      ),
                      _Row(
                        label: l10n.bookingWhen,
                        value: formatBookingDateTime(booking.scheduledAt),
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

              const SizedBox(height: 24),

              // Reviewing is only offered once the provider marks the
              // booking complete — the backend rejects it otherwise.
              if (booking.status == BookingStatus.completed) ...[
                PrimaryButton(
                  label: l10n.reviewLeaveOne,
                  icon: Icons.rate_review_outlined,
                  variant: ButtonVariant.outline,
                  onPressed: () => showWriteReviewSheet(context, booking),
                ),
                const SizedBox(height: 10),
              ],

              // Self-cancel is allowed only before arrival, matching the
              // backend transition table.
              if (booking.status.customerCanCancel)
                PrimaryButton(
                  label: l10n.bookingCancel,
                  variant: ButtonVariant.destructive,
                  isLoading: _cancelling,
                  onPressed: () => _confirmCancel(booking),
                ),
            ],
          );
        },
      ),
    );
  }
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
      padding: const EdgeInsets.symmetric(vertical: 10),
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
