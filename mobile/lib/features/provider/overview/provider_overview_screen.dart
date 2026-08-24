import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/status_chip.dart';
import '../../customer/widgets/rating_stars.dart';
import '../data/provider_repository.dart';
import '../queue/add_walk_in_sheet.dart';
import '../workflow/action_runner.dart';
import '../workflow/booking_actions.dart';

class ProviderOverviewScreen extends StatelessWidget {
  const ProviderOverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    final profileState = repo.watchProfile();
    final queue = repo.watchQueue().valueOrNull ?? const <QueueEntry>[];
    final bookings = repo.watchBookings().valueOrNull ?? const <Booking>[];
    final analytics = repo.watchAnalytics('30d').valueOrNull;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([
            repo.refreshProfile(),
            repo.refreshQueue(),
            repo.refreshBookings(),
            repo.refreshAnalytics('30d'),
          ]);
        },
        child: AsyncView<OwnProviderProfile>(
          value: profileState,
          onRetry: repo.refreshProfile,
          builder: (context, profile) {
            final waiting = queue
                .where((e) => e.status == QueueStatus.waiting)
                .toList();
            final inService = queue
                .where((e) => e.status == QueueStatus.inService)
                .toList();
            final reviews =
                repo.watchReviews(profile.id).valueOrNull ?? const <Review>[];

            final now = DateTime.now();
            final todayCount = bookings
                .where(
                  (b) =>
                      b.scheduledAt.year == now.year &&
                      b.scheduledAt.month == now.month &&
                      b.scheduledAt.day == now.day,
                )
                .length;
            final needsAction = bookings
                .where((b) => bookingNeedsProviderAction(b.status))
                .length;

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                Text(
                  l10n.pOverviewWelcome(profile.contactName),
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  profile.businessName,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: status.mutedForeground,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    StatusChip(
                      label: profile.isApproved
                          ? l10n.pOverviewApproved
                          : l10n.pOverviewPending,
                      tone: profile.isApproved
                          ? StatusTone.success
                          : StatusTone.warning,
                      icon: Icons.verified_outlined,
                    ),
                    StatusChip(
                      label: profile.isOpen
                          ? l10n.pOverviewOpen
                          : l10n.pOverviewClosed,
                      tone: profile.isOpen
                          ? StatusTone.success
                          : StatusTone.neutral,
                    ),
                  ],
                ),

                if (!profile.isApproved) ...[
                  const SizedBox(height: 12),
                  Card(
                    color: status.warning.withValues(alpha: 0.1),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, color: status.warning),
                          const SizedBox(width: 12),
                          Expanded(child: Text(l10n.pOverviewPendingBody)),
                        ],
                      ),
                    ),
                  ),
                ],

                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: _Stat(
                        label: l10n.pOverviewQueueLength,
                        value: '${waiting.length + inService.length}',
                        icon: Icons.people_outline,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Stat(
                        label: l10n.pOverviewWait,
                        value: '${profile.estimatedWaitMinutes}m',
                        icon: Icons.schedule,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _Stat(
                        label: l10n.pOverviewToday,
                        value: '$todayCount',
                        icon: Icons.today_outlined,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Stat(
                        label: l10n.pOverviewCompleted,
                        value: '${analytics?.completedBookings ?? 0}',
                        icon: Icons.check_circle_outline,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _Stat(
                        label: l10n.pOverviewRating,
                        // Null means no reviews at all — a dash, never 0.0.
                        value: profile.rating.averageRating == null
                            ? '—'
                            : profile.rating.averageRating!.toStringAsFixed(1),
                        icon: Icons.star_outline,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Stat(
                        label: l10n.pOverviewReviews,
                        value: '${profile.rating.reviewCount}',
                        icon: Icons.reviews_outlined,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),
                Text(
                  l10n.pOverviewQuickActions,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.play_circle_outline),
                        title: Text(l10n.pOverviewNextCustomer),
                        subtitle: waiting.isEmpty
                            ? Text(l10n.pQueueNoneWaiting)
                            : Text(waiting.first.customerName ?? ''),
                        enabled: waiting.isNotEmpty,
                        onTap: waiting.isEmpty
                            ? null
                            : () => runProviderAction(
                                context: context,
                                repo: repo,
                                action: providerActionsFor(
                                  l10n,
                                  BookingStatus.inQueue,
                                ).first,
                                bookingId: waiting.first.bookingId,
                                queueEntryId: waiting.first.id,
                              ),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.person_add_alt),
                        title: Text(l10n.pOverviewAddWalkIn),
                        onTap: () =>
                            showAddWalkInSheet(context, profile.services),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.list_alt_outlined),
                        title: Text(l10n.pOverviewViewQueue),
                        onTap: () => context.go(Routes.providerQueue),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.event_note_outlined),
                        title: Text(l10n.pOverviewPendingBookings(needsAction)),
                        onTap: () => context.go(Routes.providerBookings),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),
                Text(
                  l10n.pOverviewRecentReviews,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                if (reviews.isEmpty)
                  Text(
                    l10n.pOverviewNoReviews,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: status.mutedForeground,
                    ),
                  )
                else
                  ...reviews
                      .take(3)
                      .map(
                        (review) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        review.customerName,
                                        style: theme.textTheme.titleSmall,
                                      ),
                                    ),
                                    RatingStars(
                                      rating: review.rating.toDouble(),
                                      showEmptyLabel: false,
                                      size: 12,
                                    ),
                                  ],
                                ),
                                if (review.comment != null &&
                                    review.comment!.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    review.comment!,
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ],
                              ],
                            ),
                          ),
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

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: status.mutedForeground),
            const SizedBox(height: 8),
            Text(
              value,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: status.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
