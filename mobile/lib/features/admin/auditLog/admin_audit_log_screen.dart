import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

const _actions = [
  'ALL',
  'PROVIDER_APPROVED',
  'PROVIDER_REJECTED',
  'CATEGORY_CREATED',
  'CATEGORY_UPDATED',
  'CATEGORY_DELETED',
  'FUEL_INVENTORY_UPDATED',
  'FINANCE_SETTLED',
  'COMMISSION_RATE_UPDATED',
  'BOOKING_STATUS_CHANGED',
  'BOOKING_POLICY_UPDATED',
  'SYSTEM_BACKUP_EXPORTED',
];

String _actionLabel(AppLocalizations l10n, String action) => switch (action) {
  'ALL' => l10n.auditLogAllActions,
  'PROVIDER_APPROVED' => l10n.auditActionProviderApproved,
  'PROVIDER_REJECTED' => l10n.auditActionProviderRejected,
  'CATEGORY_CREATED' => l10n.auditActionCategoryCreated,
  'CATEGORY_UPDATED' => l10n.auditActionCategoryUpdated,
  'CATEGORY_DELETED' => l10n.auditActionCategoryDeleted,
  'FUEL_INVENTORY_UPDATED' => l10n.auditActionFuelInventoryUpdated,
  'FINANCE_SETTLED' => l10n.auditActionFinanceSettled,
  'COMMISSION_RATE_UPDATED' => l10n.auditActionCommissionRateUpdated,
  'BOOKING_STATUS_CHANGED' => l10n.auditActionBookingStatusChanged,
  'BOOKING_POLICY_UPDATED' => l10n.auditActionBookingPolicyUpdated,
  'SYSTEM_BACKUP_EXPORTED' => l10n.auditActionSystemBackupExported,
  _ => action,
};

/// Read-only through the whole app, matching the backend: there is no
/// update/delete route for an audit entry anywhere (see admin.routes.js).
class AdminAuditLogScreen extends StatefulWidget {
  const AdminAuditLogScreen({super.key});

  @override
  State<AdminAuditLogScreen> createState() => _AdminAuditLogScreenState();
}

class _AdminAuditLogScreenState extends State<AdminAuditLogScreen> {
  String _action = 'ALL';
  int _page = 1;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.auditLogTitle)),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshAuditLog(page: _page, action: _action),
        child: AsyncView<AuditLogPage>(
          value: repo.watchAuditLog(page: _page, action: _action),
          errorTitle: l10n.auditLogTitle,
          builder: (context, result) => CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.auditLogDescription,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: status.mutedForeground,
                        ),
                      ),
                      const SizedBox(height: 10),
                      AdminFilterBar<String>(
                        options: _actions,
                        selected: _action,
                        labelOf: (a) => _actionLabel(l10n, a),
                        onSelected: (a) => setState(() {
                          _action = a;
                          _page = 1;
                        }),
                      ),
                    ],
                  ),
                ),
              ),
              if (result.items.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyView(
                    title: l10n.auditLogEmptyTitle,
                    message: l10n.auditLogEmptyDescription,
                  ),
                )
              else
                SliverList.builder(
                  itemCount: result.items.length,
                  itemBuilder: (context, i) => Padding(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      0,
                      16,
                      i == result.items.length - 1 ? 12 : 10,
                    ),
                    child: _AuditEntryCard(entry: result.items[i]),
                  ),
                ),
              if (result.totalPages > 1)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton.icon(
                          onPressed: _page > 1
                              ? () => setState(() => _page -= 1)
                              : null,
                          icon: const Icon(Icons.chevron_left, size: 18),
                          label: Text(l10n.actionPrevious),
                        ),
                        Text(
                          l10n.auditLogPagination(
                            result.page,
                            result.totalPages,
                          ),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: status.mutedForeground,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: _page < result.totalPages
                              ? () => setState(() => _page += 1)
                              : null,
                          icon: const Icon(Icons.chevron_right, size: 18),
                          label: Text(l10n.actionNext),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuditEntryCard extends StatelessWidget {
  const _AuditEntryCard({required this.entry});

  final AuditLogEntry entry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    final metadataText = entry.metadata.entries
        .map((e) => '${e.key}: ${e.value}')
        .join(', ');

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _actionLabel(l10n, entry.action),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Text(
                  adminDate(entry.createdAt),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: status.mutedForeground,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${entry.adminName} (${entry.adminEmail}) · ${entry.entityType}'
              '${entry.entityId != null ? ' #${entry.entityId}' : ''}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: status.mutedForeground,
              ),
            ),
            if (metadataText.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                metadataText,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
