import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

/// The platform at a glance. Every number comes from /admin/overview, which
/// counts real rows — there is no revenue, AI or system-health tile because
/// the endpoint has no such figure to report.
class AdminOverviewScreen extends StatelessWidget {
  const AdminOverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: repo.refreshOverview,
        child: AsyncView<AdminOverview>(
          value: repo.watchOverview(),
          errorTitle: l10n.aNavOverview,
          onRetry: repo.refreshOverview,
          builder: (context, data) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              // --- headline counts ---------------------------------------
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                childAspectRatio: 1.55,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                children: [
                  AdminStatTile(
                    icon: Icons.people_outline,
                    label: l10n.aOverviewUsers,
                    value: '${data.users.total}',
                    onTap: () => context.push(Routes.adminUsers),
                  ),
                  AdminStatTile(
                    icon: Icons.storefront_outlined,
                    label: l10n.aOverviewBusinesses,
                    value: '${data.providers.total}',
                    onTap: () => context.go(Routes.adminProviders),
                  ),
                  AdminStatTile(
                    icon: Icons.event_note_outlined,
                    label: l10n.aOverviewBookings,
                    value: '${data.bookings.total}',
                    onTap: () => context.go(Routes.adminBookings),
                  ),
                  AdminStatTile(
                    icon: Icons.report_gmailerrorred_outlined,
                    label: l10n.aOverviewComplaintsOpen,
                    value: '${data.complaints.open}',
                    tone: data.complaints.open > 0 ? status.warning : null,
                    onTap: () => context.go(Routes.adminComplaints),
                  ),
                ],
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aOverviewUsers),
              const SizedBox(height: 8),
              _BreakdownCard(
                rows: [
                  (l10n.aOverviewCustomers, '${data.users.customers}'),
                  (
                    l10n.aOverviewProviderAccounts,
                    '${data.users.providerAccounts}',
                  ),
                  (l10n.aOverviewAdmins, '${data.users.admins}'),
                ],
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aOverviewBusinesses),
              const SizedBox(height: 8),
              _BreakdownCard(
                rows: [
                  (l10n.aOverviewApproved, '${data.providers.approved}'),
                  (l10n.aOverviewPending, '${data.providers.pending}'),
                  (l10n.aOverviewOpenNow, '${data.providers.openNow}'),
                ],
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aOverviewBookings),
              const SizedBox(height: 8),
              _BreakdownCard(
                rows: [
                  (l10n.aOverviewActive, '${data.bookings.active}'),
                  (l10n.aOverviewCompleted, '${data.bookings.completed}'),
                  (l10n.aOverviewCancelled, '${data.bookings.cancelled}'),
                  (l10n.aOverviewRejected, '${data.bookings.rejected}'),
                  (l10n.aOverviewQueueNow, '${data.activeQueueEntries}'),
                ],
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aOverviewCatalog),
              const SizedBox(height: 8),
              _BreakdownCard(
                rows: [
                  (l10n.aOverviewCategories, '${data.catalog.categories}'),
                  (l10n.aCategoriesActive, '${data.catalog.activeCategories}'),
                  (l10n.aOverviewServices, '${data.catalog.services}'),
                  (l10n.aOverviewReviews, '${data.reviews.total}'),
                  (
                    l10n.aOverviewAvgRating,
                    // Null means no reviews at all — a dash, never 0.0.
                    data.reviews.averageRating?.toStringAsFixed(1) ?? '—',
                  ),
                ],
              ),

              // --- pending approvals -------------------------------------
              const SizedBox(height: 20),
              AdminSectionHeader(
                title: l10n.aOverviewPendingApprovals,
                actionLabel: data.pendingProviders.isEmpty
                    ? null
                    : l10n.aOverviewViewAll,
                onAction: data.pendingProviders.isEmpty
                    ? null
                    : () => context.go(Routes.adminProviders),
              ),
              const SizedBox(height: 8),
              if (data.pendingProviders.isEmpty)
                _EmptyLine(l10n.aOverviewNothingPending)
              else
                Card(
                  child: Column(
                    children: [
                      for (final p in data.pendingProviders)
                        ListTile(
                          leading: const Icon(Icons.storefront_outlined),
                          title: Text(p.businessName),
                          subtitle: Text('${p.ownerName} · ${p.ownerEmail}'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () =>
                              context.push(Routes.adminProviderDetails(p.id)),
                        ),
                    ],
                  ),
                ),

              // --- recent registrations ----------------------------------
              const SizedBox(height: 20),
              AdminSectionHeader(
                title: l10n.aOverviewRecentRegistrations,
                actionLabel: l10n.aOverviewViewAll,
                onAction: () => context.push(Routes.adminUsers),
              ),
              const SizedBox(height: 8),
              if (data.recentRegistrations.isEmpty)
                _EmptyLine(l10n.aOverviewNoRegistrations)
              else
                Card(
                  child: Column(
                    children: [
                      for (final u in data.recentRegistrations)
                        ListTile(
                          leading: const Icon(Icons.person_outline),
                          title: Text(u.name),
                          subtitle: Text(adminDate(u.createdAt)),
                          trailing: StatusChip(
                            label: roleLabel(l10n, u.role),
                            tone: u.role == UserRoleModel.provider
                                ? StatusTone.primary
                                : StatusTone.neutral,
                          ),
                          onTap: () =>
                              context.push(Routes.adminUserDetails(u.id)),
                        ),
                    ],
                  ),
                ),

              // --- recent complaints -------------------------------------
              const SizedBox(height: 20),
              AdminSectionHeader(
                title: l10n.aOverviewRecentComplaints,
                actionLabel: data.recentComplaints.isEmpty
                    ? null
                    : l10n.aOverviewViewAll,
                onAction: data.recentComplaints.isEmpty
                    ? null
                    : () => context.go(Routes.adminComplaints),
              ),
              const SizedBox(height: 8),
              if (data.recentComplaints.isEmpty)
                _EmptyLine(l10n.aOverviewNoComplaints)
              else
                Card(
                  child: Column(
                    children: [
                      for (final c in data.recentComplaints)
                        ListTile(
                          title: Text(
                            c.subject,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(c.providerName),
                          trailing: StatusChip(
                            label: complaintStatusLabel(l10n, c.status),
                            tone: complaintStatusTone(c.status),
                          ),
                          onTap: () => context.go(Routes.adminComplaints),
                        ),
                    ],
                  ),
                ),

              const SizedBox(height: 24),
              AdminGapNote(
                icon: Icons.sync_outlined,
                text: l10n.aMoreRealtimeNote,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BreakdownCard extends StatelessWidget {
  const _BreakdownCard({required this.rows});

  final List<(String, String)> rows;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      child: Column(
        children: [
          for (final (label, value) in rows)
            AdminInfoRow(label: label, value: value),
        ],
      ),
    ),
  );
}

class _EmptyLine extends StatelessWidget {
  const _EmptyLine(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Text(
        text,
        style: theme.textTheme.bodySmall?.copyWith(
          color: status.mutedForeground,
        ),
      ),
    );
  }
}
