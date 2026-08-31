import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/app_colors.dart';

Color _barColor(BuildContext context, double pct) {
  final status = Theme.of(context).extension<AppStatusColors>()!;
  if (pct <= 15) return Theme.of(context).colorScheme.error;
  if (pct <= 35) return status.warning;
  return status.success;
}

String _formatLiters(double value) =>
    '${NumberFormat.decimalPattern().format(value.round())} L';

/// Shared by the customer Provider Details screen and the provider's own
/// read-only "My Fuel Inventory" section — same real data, same rendering.
/// Renders nothing (not an empty card) for an empty list — callers should
/// only mount this once a non-empty inventory is confirmed.
class FuelStatusList extends StatelessWidget {
  const FuelStatusList({super.key, required this.items, this.showPrice = true});

  final List<FuelInventoryItem> items;

  /// Hides the price row — the provider's own read-only view doesn't need
  /// it repeated next to the admin-managed values.
  final bool showPrice;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    final lastUpdated = items
        .map((i) => i.updatedAt)
        .reduce((a, b) => a.isAfter(b) ? a : b);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: theme.dividerColor),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(item.displayName, style: theme.textTheme.titleSmall),
                      Text(
                        '${item.percentageRemaining}%',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: status.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    [
                      '${l10n.fuelRemainingLabel}: ${_formatLiters(item.currentLiters)}',
                      '${l10n.fuelCapacityLabel}: ${_formatLiters(item.capacityLiters)}',
                      if (showPrice && item.pricePerLiter != null)
                        '\$${item.pricePerLiter}/L',
                    ].join(' · '),
                    style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (item.percentageRemaining / 100).clamp(0, 1),
                      minHeight: 8,
                      backgroundColor: status.muted,
                      color: _barColor(context, item.percentageRemaining),
                      semanticsLabel: '${item.displayName} ${l10n.fuelRemainingLabel}',
                      semanticsValue: '${item.percentageRemaining}%',
                    ),
                  ),
                ],
              ),
            ),
          ),
        Text(
          '${l10n.fuelLastUpdatedLabel}: ${DateFormat.jm().format(lastUpdated.toLocal())}',
          style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
        ),
      ],
    );
  }
}
