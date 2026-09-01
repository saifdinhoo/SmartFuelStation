import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/fuel_labels.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../customer/widgets/fuel_history_chart.dart';
import '../data/admin_repository.dart';
import 'admin_fuel_update_sheet.dart';

String _formatLiters(double value) =>
    '${NumberFormat.decimalPattern().format(value.round())} L';

/// Admin-only fuel inventory management for one provider. The only screen
/// in the whole app with an edit control for fuel — reached from
/// [AdminProviderDetailsScreen].
///
/// The business name is read from the same cached `/providers` list
/// [AdminProviderDetailsScreen] uses, rather than being passed in — there is
/// no per-provider admin endpoint to fetch it from directly, and re-reading
/// the same cache keeps this screen correct if the name changes elsewhere.
class AdminFuelScreen extends StatelessWidget {
  const AdminFuelScreen({super.key, required this.providerId});

  final int providerId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    final providers = repo.watchProviders().valueOrNull ?? const [];
    final businessName = providers
        .where((p) => p.id == providerId)
        .map((p) => p.businessName)
        .firstOrNull;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aFuelTitle)),
      body: AsyncView<List<AdminFuelInventoryItem>>(
        value: repo.watchFuel(providerId),
        builder: (context, rows) {
          final byType = {for (final row in rows) row.fuelType: row};
          final configuredTypes = rows.map((r) => r.fuelType).toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              if (businessName != null) ...[
                Text(businessName, style: theme.textTheme.headlineSmall),
                const SizedBox(height: 16),
              ],
              for (final type in FuelTypeModel.values) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(fuelTypeLabel(l10n, type), style: theme.textTheme.titleMedium),
                        const SizedBox(height: 6),
                        Builder(
                          builder: (context) {
                            final row = byType[type];
                            if (row == null) {
                              return Text(
                                l10n.aFuelNotConfigured,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: status.mutedForeground,
                                ),
                              );
                            }
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${l10n.aFuelCapacityField}: ${_formatLiters(row.capacityLiters)}'),
                                Text('${l10n.aFuelRemainingField}: ${_formatLiters(row.currentLiters)}'),
                                if (row.pricePerLiter != null)
                                  Text('${l10n.aFuelPriceField}: \$${row.pricePerLiter}'),
                                const SizedBox(height: 4),
                                Text(
                                  '${row.percentageRemaining}%',
                                  style: theme.textTheme.titleSmall,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${l10n.fuelLastUpdatedLabel}: '
                                  '${DateFormat.yMd().add_jm().format(row.updatedAt.toLocal())}'
                                  '${row.updatedByAdminName != null ? ' · ${row.updatedByAdminName}' : ''}',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: status.mutedForeground,
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 10),
                        OutlinedButton(
                          onPressed: () => showAdminFuelUpdateSheet(
                            context,
                            providerId: providerId,
                            fuelType: type,
                            existing: byType[type],
                          ),
                          child: Text(byType[type] == null ? l10n.aFuelSetUp : l10n.aFuelUpdate),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              if (configuredTypes.isNotEmpty) ...[
                const SizedBox(height: 8),
                FuelHistoryChart(providerId: providerId, fuelTypes: configuredTypes),
              ],
            ],
          );
        },
      ),
    );
  }
}
