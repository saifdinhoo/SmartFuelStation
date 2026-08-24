import 'package:flutter/material.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/status_chip.dart';

/// Localized label for a booking status.
String bookingStatusLabel(AppLocalizations l10n, BookingStatus status) =>
    switch (status) {
      BookingStatus.pending => l10n.statusPending,
      BookingStatus.confirmed => l10n.statusConfirmed,
      BookingStatus.arrived => l10n.statusArrived,
      BookingStatus.inQueue => l10n.statusInQueue,
      BookingStatus.inService => l10n.statusInService,
      BookingStatus.completed => l10n.statusCompleted,
      BookingStatus.cancelled => l10n.statusCancelled,
      BookingStatus.rejected => l10n.statusRejected,
    };

/// Same tone mapping as the web's BookingStatusBadge, so a status that is
/// amber on the web is amber here.
StatusTone bookingStatusTone(BookingStatus status) => switch (status) {
  BookingStatus.pending => StatusTone.warning,
  BookingStatus.confirmed ||
  BookingStatus.arrived ||
  BookingStatus.inQueue => StatusTone.primary,
  BookingStatus.inService || BookingStatus.completed => StatusTone.success,
  BookingStatus.cancelled => StatusTone.neutral,
  BookingStatus.rejected => StatusTone.danger,
};

class BookingStatusChip extends StatelessWidget {
  const BookingStatusChip({super.key, required this.status});

  final BookingStatus status;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return StatusChip(
      label: bookingStatusLabel(l10n, status),
      tone: bookingStatusTone(status),
    );
  }
}

/// Vertical progress through the booking lifecycle.
///
/// Vertical rather than the web's horizontal row because six steps do not
/// fit across a phone without becoming unreadable. Cancelled and rejected
/// are shown as a single terminal card instead, since they are exits from
/// the lifecycle rather than points along it.
class BookingStatusTimeline extends StatelessWidget {
  const BookingStatusTimeline({
    super.key,
    required this.status,
    this.cancelledAt,
  });

  final BookingStatus status;
  final DateTime? cancelledAt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final status0 = theme.extension<AppStatusColors>()!;

    if (status == BookingStatus.cancelled || status == BookingStatus.rejected) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.error.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: theme.colorScheme.error.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            Icon(Icons.cancel_outlined, color: theme.colorScheme.error),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    bookingStatusLabel(l10n, status),
                    style: theme.textTheme.titleSmall,
                  ),
                  if (cancelledAt != null)
                    Text(
                      _formatDateTime(cancelledAt!),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: status0.mutedForeground,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final steps = BookingStatus.lifecycle;
    final currentIndex = steps.indexOf(status);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < steps.length; i++)
          _TimelineRow(
            label: bookingStatusLabel(l10n, steps[i]),
            index: i,
            isDone: i < currentIndex,
            isCurrent: i == currentIndex,
            isLast: i == steps.length - 1,
          ),
      ],
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.label,
    required this.index,
    required this.isDone,
    required this.isCurrent,
    required this.isLast,
  });

  final String label;
  final int index;
  final bool isDone;
  final bool isCurrent;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final primary = theme.colorScheme.primary;
    final reached = isDone || isCurrent;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                height: 26,
                width: 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDone ? primary : Colors.transparent,
                  border: Border.all(
                    color: reached ? primary : theme.dividerColor,
                    width: 2,
                  ),
                ),
                alignment: Alignment.center,
                child: isDone
                    ? Icon(
                        Icons.check,
                        size: 14,
                        color: theme.colorScheme.onPrimary,
                      )
                    : Text(
                        '${index + 1}',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: isCurrent ? primary : status.mutedForeground,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: isDone ? primary : theme.dividerColor,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Padding(
            padding: EdgeInsets.only(top: 3, bottom: isLast ? 0 : 18),
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: reached ? FontWeight.w600 : FontWeight.w400,
                color: reached
                    ? theme.colorScheme.onSurface
                    : status.mutedForeground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _two(int n) => n.toString().padLeft(2, '0');

String _formatDateTime(DateTime value) =>
    '${value.year}-${_two(value.month)}-${_two(value.day)} '
    '${_two(value.hour)}:${_two(value.minute)}';

/// Shared date formatting so every customer screen renders a booking time
/// the same way. Deliberately numeric and locale-neutral: `intl`'s
/// month names would need per-locale data wiring that isn't set up yet.
String formatBookingDateTime(DateTime value) => _formatDateTime(value);
