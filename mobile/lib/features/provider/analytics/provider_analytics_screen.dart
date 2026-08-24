import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../customer/widgets/booking_status_ui.dart';
import '../data/provider_repository.dart';

/// Every figure comes from GET /providers/me/analytics, which computes from
/// Booking, QueueEntry and Review rows.
///
/// No revenue and no "insights": nothing in the database backs either, so
/// the screen says so rather than inventing a number. Charts are simple
/// proportional bars — a charting package would be weight for no extra
/// truth at this data volume.
class ProviderAnalyticsScreen extends StatefulWidget {
  const ProviderAnalyticsScreen({super.key});

  @override
  State<ProviderAnalyticsScreen> createState() =>
      _ProviderAnalyticsScreenState();
}

class _ProviderAnalyticsScreenState extends State<ProviderAnalyticsScreen> {
  String _range = '30d';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    final ranges = {
      '7d': l10n.pAnalyticsRange7,
      '30d': l10n.pAnalyticsRange30,
      '90d': l10n.pAnalyticsRange90,
    };

    return Scaffold(
      appBar: AppBar(title: Text(l10n.pAnalyticsTitle)),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshAnalytics(_range),
        child: AsyncView<ProviderAnalytics>(
          value: repo.watchAnalytics(_range),
          onRetry: () => repo.refreshAnalytics(_range),
          builder: (context, data) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final entry in ranges.entries) ...[
                        ChoiceChip(
                          label: Text(entry.value),
                          selected: _range == entry.key,
                          onSelected: (_) => setState(() => _range = entry.key),
                        ),
                        const SizedBox(width: 8),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                if (data.totalBookings == 0 && data.queueEntriesHandled == 0)
                  SizedBox(
                    height: 220,
                    child: EmptyView(
                      icon: Icons.insights_outlined,
                      title: l10n.pAnalyticsEmpty,
                    ),
                  )
                else ...[
                  Row(
                    children: [
                      Expanded(
                        child: _Stat(
                          l10n.pAnalyticsTotal,
                          '${data.totalBookings}',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _Stat(
                          l10n.pAnalyticsCompleted,
                          '${data.completedBookings}',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _Stat(
                          l10n.pAnalyticsCancelled,
                          '${data.cancelledBookings}',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _Stat(
                          l10n.pAnalyticsCancelRate,
                          '${data.cancellationRate.toStringAsFixed(1)}%',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _Stat(
                          l10n.pAnalyticsAvgWait,
                          '${data.averageWaitMinutes}m',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _Stat(
                          l10n.pAnalyticsAvgRating,
                          data.averageRating == null
                              ? '—'
                              : data.averageRating!.toStringAsFixed(1),
                          hint: '${data.reviewCount}',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _Stat(
                    l10n.pAnalyticsQueueHandled,
                    '${data.queueEntriesHandled}',
                  ),

                  if (data.statusBreakdown.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    _Heading(l10n.pAnalyticsBreakdown),
                    const SizedBox(height: 8),
                    _BarList(
                      items: [
                        for (final slice in data.statusBreakdown)
                          (
                            label: bookingStatusLabel(
                              l10n,
                              BookingStatus.fromApi(slice.label),
                            ),
                            count: slice.count,
                          ),
                      ],
                    ),
                  ],

                  if (data.popularServices.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    _Heading(l10n.pAnalyticsPopular),
                    const SizedBox(height: 8),
                    _BarList(items: data.popularServices),
                  ],

                  if (data.busyHours.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    _Heading(l10n.pAnalyticsBusy),
                    const SizedBox(height: 8),
                    _BarList(items: data.busyHours),
                  ],
                ],

                const SizedBox(height: 20),
                Text(
                  l10n.pAnalyticsNoRevenue,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: status.mutedForeground,
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

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: Theme.of(
      context,
    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  );
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value, {this.hint});

  final String label;
  final String value;
  final String? hint;

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
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (hint != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    '($hint)',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: status.mutedForeground,
                    ),
                  ),
                ],
              ],
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

/// Proportional bars, scaled to the largest value in the set.
class _BarList extends StatelessWidget {
  const _BarList({required this.items});

  final List<({String label, int count})> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final max = items.fold<int>(0, (m, i) => i.count > m ? i.count : m);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            for (final item in items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    SizedBox(
                      width: 92,
                      child: Text(
                        item.label,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: max == 0 ? 0 : item.count / max,
                          minHeight: 8,
                          backgroundColor: status.muted,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 34,
                      child: Text(
                        '${item.count}',
                        textAlign: TextAlign.end,
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
