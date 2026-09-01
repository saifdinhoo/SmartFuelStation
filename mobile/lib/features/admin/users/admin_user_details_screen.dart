import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/location_action_buttons.dart';
import '../../../core/widgets/status_chip.dart';
import '../../customer/widgets/booking_status_ui.dart';
import '../../customer/widgets/rating_stars.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

/// One user in full: their counts, their linked business if they own one,
/// and the ten most recent bookings and reviews the backend returns.
///
/// Read-only — see [AdminUsersScreen] for why there is nothing to toggle.
class AdminUserDetailsScreen extends StatelessWidget {
  const AdminUserDetailsScreen({super.key, required this.userId});

  final int userId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aUsersDetails)),
      body: AsyncView<AdminUserDetail>(
        value: repo.watchUser(userId),
        errorTitle: l10n.aUsersDetails,
        builder: (context, user) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: theme.colorScheme.primary.withValues(
                    alpha: 0.12,
                  ),
                  child: Text(
                    user.name.isEmpty
                        ? '?'
                        : user.name.characters.first.toUpperCase(),
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.name, style: theme.textTheme.titleLarge),
                      const SizedBox(height: 4),
                      StatusChip(label: roleLabel(l10n, user.role)),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: AdminStatTile(
                    label: l10n.aUsersBookings,
                    value: '${user.bookingCount}',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: AdminStatTile(
                    label: l10n.aUsersReviews,
                    value: '${user.reviewCount}',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: AdminStatTile(
                    label: l10n.aUsersComplaints,
                    value: '${user.complaintCount}',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),
            AdminSectionHeader(title: l10n.profileAccount),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Column(
                  children: [
                    AdminInfoRow(label: l10n.fieldEmail, value: user.email),
                    AdminInfoRow(
                      label: l10n.pProfilePhone,
                      value: user.phone ?? '—',
                    ),
                    AdminInfoRow(
                      label: l10n.aUsersJoined,
                      value: adminDate(user.createdAt),
                    ),
                  ],
                ),
              ),
            ),

            if (user.business != null) ...[
              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aUsersBusiness),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Column(
                    children: [
                      AdminInfoRow(
                        label: l10n.fieldBusinessName,
                        value: user.business!.businessName,
                      ),
                      AdminInfoRow(
                        label: l10n.fieldAddress,
                        value: user.business!.address,
                      ),
                      AdminInfoRow(
                        label: l10n.statusApproved,
                        value: user.business!.isApproved
                            ? l10n.aProvidersApproved
                            : l10n.aProvidersPending,
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Align(
                          alignment: AlignmentDirectional.centerStart,
                          // This response carries no coordinates, only the
                          // raw address — the shared helper falls back to a
                          // text search rather than needing lat/long here.
                          child: LocationActionButtons(
                            latitude: null,
                            longitude: null,
                            address: user.business!.address,
                            showDirections: false,
                          ),
                        ),
                      ),
                      AdminInfoRow(
                        label: l10n.aProvidersServices,
                        value: '${user.business!.serviceCount}',
                      ),
                      AdminInfoRow(
                        label: l10n.aProvidersReviews,
                        value: '${user.business!.reviewCount}',
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 20),
            AdminSectionHeader(title: l10n.aUsersRecentBookings),
            const SizedBox(height: 8),
            if (user.recentBookings.isEmpty)
              _Muted(l10n.aUsersNoBookings)
            else
              Card(
                child: Column(
                  children: [
                    for (final b in user.recentBookings)
                      ListTile(
                        dense: true,
                        title: Text(b.serviceName),
                        subtitle: Text(formatBookingDateTime(b.scheduledAt)),
                        trailing: BookingStatusChip(status: b.status),
                      ),
                  ],
                ),
              ),

            const SizedBox(height: 20),
            AdminSectionHeader(title: l10n.aUsersRecentReviews),
            const SizedBox(height: 8),
            if (user.recentReviews.isEmpty)
              _Muted(l10n.aUsersNoReviews)
            else
              Card(
                child: Column(
                  children: [
                    for (final r in user.recentReviews)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                RatingStars(rating: r.rating.toDouble()),
                                const Spacer(),
                                Text(
                                  adminDate(r.createdAt),
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: status.mutedForeground,
                                  ),
                                ),
                              ],
                            ),
                            if (r.comment != null &&
                                r.comment!.trim().isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                r.comment!,
                                style: theme.textTheme.bodyMedium,
                              ),
                            ],
                          ],
                        ),
                      ),
                  ],
                ),
              ),

            const SizedBox(height: 24),
            AdminGapNote(icon: Icons.lock_outline, text: l10n.aUsersReadOnly),
          ],
        ),
      ),
    );
  }
}

class _Muted extends StatelessWidget {
  const _Muted(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Text(
      text,
      style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
    );
  }
}
