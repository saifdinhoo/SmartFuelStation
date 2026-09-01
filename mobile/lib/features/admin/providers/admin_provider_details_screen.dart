import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/location_action_buttons.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/admin_repository.dart';
import '../finance/admin_commission_sheet.dart';
import '../widgets/admin_widgets.dart';
import 'admin_providers_screen.dart';

/// One business in full, with its approval action.
///
/// Reads from the same cached `/providers` list the admin list screen uses
/// rather than a per-provider admin endpoint, because none exists — and
/// inventing one would mean changing the backend for a view that already
/// has its data.
class AdminProviderDetailsScreen extends StatelessWidget {
  const AdminProviderDetailsScreen({super.key, required this.providerId});

  final int providerId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aProvidersDetails)),
      body: RefreshIndicator(
        onRefresh: repo.refreshProviders,
        child: AsyncView<List<AdminProviderRow>>(
          value: repo.watchProviders(),
          errorTitle: l10n.aProvidersDetails,
          onRetry: repo.refreshProviders,
          builder: (context, providers) {
            final match = providers.where((p) => p.id == providerId);
            if (match.isEmpty) {
              return EmptyView(title: l10n.aProvidersNoResults);
            }
            final row = match.first;

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                Text(row.businessName, style: theme.textTheme.headlineSmall),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    StatusChip(
                      label: row.isApproved
                          ? l10n.aProvidersApproved
                          : l10n.aProvidersPending,
                      tone: row.isApproved
                          ? StatusTone.success
                          : StatusTone.warning,
                    ),
                    if (row.isApproved)
                      StatusChip(
                        label: row.isOpen
                            ? l10n.providerOpen
                            : l10n.providerClosed,
                        tone: row.isOpen
                            ? StatusTone.success
                            : StatusTone.neutral,
                      ),
                  ],
                ),

                if (row.description != null &&
                    row.description!.trim().isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(row.description!, style: theme.textTheme.bodyMedium),
                ],

                const SizedBox(height: 20),
                AdminSectionHeader(title: l10n.aProvidersOwner),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Column(
                      children: [
                        AdminInfoRow(
                          label: l10n.fieldName,
                          value: row.ownerName ?? '—',
                        ),
                        AdminInfoRow(
                          label: l10n.fieldEmail,
                          value: row.ownerEmail ?? '—',
                        ),
                        AdminInfoRow(
                          label: l10n.pProfilePhone,
                          value: row.ownerPhone ?? '—',
                        ),
                        AdminInfoRow(
                          label: l10n.fieldAddress,
                          value: row.address,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                LocationActionButtons(
                  latitude: row.latitude,
                  longitude: row.longitude,
                  address: row.address,
                  showDirections: false,
                ),

                const SizedBox(height: 20),
                AdminSectionHeader(title: l10n.aOverviewCatalog),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Column(
                      children: [
                        AdminInfoRow(
                          label: l10n.aProvidersServices,
                          value: '${row.serviceCount}',
                        ),
                        AdminInfoRow(
                          label: l10n.aProvidersReviews,
                          value: '${row.reviewCount}',
                        ),
                        AdminInfoRow(
                          label: l10n.aProvidersQueueEntries,
                          value: '${row.queueEntryCount}',
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 20),
                OutlinedButton.icon(
                  onPressed: () => context.push(Routes.adminProviderFuel(providerId)),
                  icon: const Icon(Icons.local_gas_station_outlined, size: 18),
                  label: Text(l10n.aFuelManageButton),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () => showAdminCommissionSheet(
                    context,
                    providerId: providerId,
                    providerName: row.businessName,
                  ),
                  icon: const Icon(Icons.percent, size: 18),
                  label: Text(l10n.aFinanceCommissionEdit),
                ),

                const SizedBox(height: 24),
                if (row.isApproved)
                  OutlinedButton(
                    onPressed: () => setApproval(context, row, false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: theme.colorScheme.error,
                    ),
                    child: Text(l10n.aProvidersRevoke),
                  )
                else
                  FilledButton(
                    onPressed: () => setApproval(context, row, true),
                    child: Text(l10n.aProvidersApprove),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
