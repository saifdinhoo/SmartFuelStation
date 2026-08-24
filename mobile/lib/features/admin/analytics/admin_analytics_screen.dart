import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

/// Platform analytics.
///
/// Renders exactly what GET /admin/analytics returns and nothing else.
/// There is no revenue, AI-usage, stream or system-health section because
/// the endpoint has no such data — the database does not record any of it,
/// and inventing a number here would make the screen a lie.
class AdminAnalyticsScreen extends StatefulWidget {
  const AdminAnalyticsScreen({super.key});

  @override
  State<AdminAnalyticsScreen> createState() => _AdminAnalyticsScreenState();
}

class _AdminAnalyticsScreenState extends State<AdminAnalyticsScreen> {
  /// The three windows the backend accepts; anything else is a 400.
  static const _ranges = ['7d', '30d', '90d'];
  String _range = '30d';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    String rangeLabel(String range) => switch (range) {
      '7d' => l10n.pAnalyticsRange7,
      '90d' => l10n.pAnalyticsRange90,
      _ => l10n.pAnalyticsRange30,
    };

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aAnalyticsTitle)),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshAnalytics(_range),
        child: AsyncView<AdminAnalytics>(
          value: repo.watchAnalytics(_range),
          errorTitle: l10n.aAnalyticsTitle,
          onRetry: () => repo.refreshAnalytics(_range),
          builder: (context, data) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              AdminFilterBar<String>(
                options: _ranges,
                selected: _range,
                labelOf: rangeLabel,
                onSelected: (r) => setState(() => _range = r),
              ),

              const SizedBox(height: 16),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                childAspectRatio: 1.7,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                children: [
                  AdminStatTile(
                    label: l10n.aAnalyticsBookings,
                    value: '${data.bookings}',
                  ),
                  AdminStatTile(
                    label: l10n.aAnalyticsCompleted,
                    value: '${data.completed}',
                  ),
                  AdminStatTile(
                    label: l10n.aAnalyticsCancelled,
                    value: '${data.cancelled}',
                  ),
                  AdminStatTile(
                    label: l10n.aAnalyticsCancelRate,
                    value: '${data.cancellationRate}%',
                  ),
                  AdminStatTile(
                    label: l10n.aAnalyticsNewCustomers,
                    value: '${data.newCustomers}',
                  ),
                  AdminStatTile(
                    label: l10n.aAnalyticsNewProviders,
                    value: '${data.newProviders}',
                  ),
                  AdminStatTile(
                    label: l10n.aAnalyticsReviews,
                    value: '${data.reviewCount}',
                  ),
                  AdminStatTile(
                    label: l10n.aAnalyticsAvgRating,
                    // Null means no reviews in the window — a dash, not 0.0.
                    value: data.averageRating?.toStringAsFixed(1) ?? '—',
                  ),
                ],
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aAnalyticsBookingTrend),
              const SizedBox(height: 8),
              _ChartCard(
                // A 90-day window is far too many bars for a phone, so the
                // trend is shown as its most recent 14 days.
                child: AdminBarList(
                  rows: _tail(data.bookingTrend, 14),
                  emptyLabel: l10n.aAnalyticsEmpty,
                ),
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aAnalyticsUserGrowth),
              const SizedBox(height: 8),
              _ChartCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.aAnalyticsCustomersLabel),
                    const SizedBox(height: 6),
                    AdminBarList(
                      rows: _tail(
                        data.userGrowth
                            .map((g) => (label: g.label, count: g.customers))
                            .toList(),
                        14,
                      ),
                      emptyLabel: l10n.aAnalyticsEmpty,
                    ),
                    const SizedBox(height: 14),
                    Text(l10n.aAnalyticsProvidersLabel),
                    const SizedBox(height: 6),
                    AdminBarList(
                      rows: _tail(
                        data.userGrowth
                            .map((g) => (label: g.label, count: g.providers))
                            .toList(),
                        14,
                      ),
                      emptyLabel: l10n.aAnalyticsEmpty,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aAnalyticsStatusBreakdown),
              const SizedBox(height: 8),
              _ChartCard(
                child: AdminBarList(
                  rows: data.statusBreakdown,
                  emptyLabel: l10n.aAnalyticsEmpty,
                ),
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aAnalyticsPopularServices),
              const SizedBox(height: 8),
              _ChartCard(
                child: AdminBarList(
                  rows: data.popularServices,
                  emptyLabel: l10n.aAnalyticsEmpty,
                ),
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aAnalyticsTopProviders),
              const SizedBox(height: 8),
              _ChartCard(
                child: AdminBarList(
                  rows: data.topProviders,
                  emptyLabel: l10n.aAnalyticsEmpty,
                ),
              ),

              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aAnalyticsCategories),
              const SizedBox(height: 8),
              _ChartCard(
                child: AdminBarList(
                  rows: data.providerCategories,
                  emptyLabel: l10n.aAnalyticsEmpty,
                ),
              ),

              const SizedBox(height: 24),
              AdminGapNote(
                icon: Icons.info_outline,
                text: l10n.aAnalyticsSource,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Last [count] points, so a long range stays readable on a phone.
  List<({String label, int count})> _tail(
    List<({String label, int count})> rows,
    int count,
  ) => rows.length <= count ? rows : rows.sublist(rows.length - count);
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: Padding(padding: const EdgeInsets.all(14), child: child),
  );
}
