import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/location_action_buttons.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

enum AdminProviderFilter { all, pending, approved }

/// Approve or revoke a business, with search and an approval filter.
///
/// The list comes from GET /providers, which returns unapproved businesses
/// only for an ADMIN token — that scoping is the backend's, not a client
/// filter over a broader response.
class AdminProvidersScreen extends StatefulWidget {
  const AdminProvidersScreen({super.key});

  @override
  State<AdminProvidersScreen> createState() => _AdminProvidersScreenState();
}

class _AdminProvidersScreenState extends State<AdminProvidersScreen> {
  final _search = TextEditingController();
  AdminProviderFilter _filter = AdminProviderFilter.all;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    String label(AdminProviderFilter f) => switch (f) {
      AdminProviderFilter.all => l10n.aProvidersAll,
      AdminProviderFilter.pending => l10n.aProvidersPending,
      AdminProviderFilter.approved => l10n.aProvidersApproved,
    };

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: repo.refreshProviders,
        child: AsyncView<List<AdminProviderRow>>(
          value: repo.watchProviders(),
          errorTitle: l10n.aNavProviders,
          onRetry: repo.refreshProviders,
          builder: (context, providers) {
            final term = _search.text.trim().toLowerCase();
            final results = providers
                .where(
                  (p) => switch (_filter) {
                    AdminProviderFilter.all => true,
                    AdminProviderFilter.pending => !p.isApproved,
                    AdminProviderFilter.approved => p.isApproved,
                  },
                )
                .where(
                  (p) =>
                      term.isEmpty ||
                      p.businessName.toLowerCase().contains(term) ||
                      p.address.toLowerCase().contains(term) ||
                      (p.ownerName ?? '').toLowerCase().contains(term) ||
                      (p.ownerEmail ?? '').toLowerCase().contains(term),
                )
                .toList();

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextField(
                          controller: _search,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: l10n.aProvidersSearchHint,
                            prefixIcon: const Icon(Icons.search),
                            suffixIcon: _search.text.isEmpty
                                ? null
                                : IconButton(
                                    icon: const Icon(Icons.clear),
                                    onPressed: () {
                                      _search.clear();
                                      setState(() {});
                                    },
                                  ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        AdminFilterBar<AdminProviderFilter>(
                          options: AdminProviderFilter.values,
                          selected: _filter,
                          labelOf: label,
                          onSelected: (f) => setState(() => _filter = f),
                        ),
                      ],
                    ),
                  ),
                ),
                if (results.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyView(title: l10n.aProvidersNoResults),
                  )
                else
                  SliverList.builder(
                    itemCount: results.length,
                    itemBuilder: (context, i) => Padding(
                      padding: EdgeInsets.fromLTRB(
                        16,
                        0,
                        16,
                        i == results.length - 1 ? 24 : 10,
                      ),
                      child: AdminProviderCard(row: results[i]),
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

/// One business, with the approval action it currently needs.
class AdminProviderCard extends StatelessWidget {
  const AdminProviderCard({super.key, required this.row});

  final AdminProviderRow row;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push(Routes.adminProviderDetails(row.id)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      row.businessName,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  StatusChip(
                    label: row.isApproved
                        ? l10n.aProvidersApproved
                        : l10n.aProvidersPending,
                    tone: row.isApproved
                        ? StatusTone.success
                        : StatusTone.warning,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                row.address,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
              if (row.ownerName != null) ...[
                const SizedBox(height: 2),
                Text(
                  '${row.ownerName} · ${row.ownerEmail ?? ''}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: status.mutedForeground,
                  ),
                ),
              ],
              const SizedBox(height: 8),
              LocationActionButtons(
                latitude: row.latitude,
                longitude: row.longitude,
                address: row.address,
                showDirections: false,
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 14,
                runSpacing: 4,
                children: [
                  _Metric(
                    label: l10n.aProvidersServices,
                    value: '${row.serviceCount}',
                  ),
                  _Metric(
                    label: l10n.aProvidersReviews,
                    value: '${row.reviewCount}',
                  ),
                  if (row.isApproved)
                    _Metric(
                      label: l10n.aOverviewOpenNow,
                      value: row.isOpen ? '✓' : '—',
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: row.isApproved
                    ? OutlinedButton(
                        onPressed: () => setApproval(context, row, false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: theme.colorScheme.error,
                        ),
                        child: Text(l10n.aProvidersRevoke),
                      )
                    : FilledButton(
                        onPressed: () => setApproval(context, row, true),
                        child: Text(l10n.aProvidersApprove),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '$value ',
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          TextSpan(
            text: label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: status.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

/// Confirms, then approves or revokes. Shared by the list card and the
/// details screen so both behave identically.
///
/// The backend is the authority: a non-admin calling the same route is
/// refused there, and any failure message it returns is shown verbatim.
Future<bool> setApproval(
  BuildContext context,
  AdminProviderRow row,
  bool approve,
) async {
  final l10n = AppLocalizations.of(context)!;
  final messenger = ScaffoldMessenger.of(context);
  final repo = context.read<AdminRepository>();

  final confirmed = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(
        approve ? l10n.aProvidersApproveTitle : l10n.aProvidersRevokeTitle,
      ),
      content: Text(
        approve ? l10n.aProvidersApproveBody : l10n.aProvidersRevokeBody,
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dialogContext, false),
          child: Text(l10n.actionCancel),
        ),
        FilledButton(
          style: approve
              ? null
              : FilledButton.styleFrom(
                  backgroundColor: Theme.of(dialogContext).colorScheme.error,
                ),
          onPressed: () => Navigator.pop(dialogContext, true),
          child: Text(approve ? l10n.aProvidersApprove : l10n.aProvidersRevoke),
        ),
      ],
    ),
  );
  if (confirmed != true) return false;

  try {
    await repo.setProviderApproval(row.id, approve);
    messenger.showSnackBar(SnackBar(content: Text(l10n.pActionDone)));
    return true;
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
    return false;
  }
}
