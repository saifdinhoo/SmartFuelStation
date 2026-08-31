import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/finance_trend_chart.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/provider_repository.dart';

String _money(double value) => '\$${value.toStringAsFixed(2)}';

/// The provider's own read-only commission and settlement ledger.
///
/// Every figure comes from GET /providers/me/finance/summary and
/// GET /providers/me/finance/transactions, both resolved server-side from
/// the JWT — there is no providerId anywhere on this screen, so it can
/// never even attempt to address another business's data.
///
/// Read-only by design, matching the backend: there is no PUT/PATCH a
/// provider may call for its own commission rate, and no settle action
/// here — only an Admin can settle a transaction. No admin identity field
/// (settledByAdminId/settledByAdminName) is requested or shown, matching
/// the provider-safe API shape.
class ProviderFinanceScreen extends StatefulWidget {
  const ProviderFinanceScreen({super.key});

  @override
  State<ProviderFinanceScreen> createState() => _ProviderFinanceScreenState();
}

class _ProviderFinanceScreenState extends State<ProviderFinanceScreen> {
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
      appBar: AppBar(title: Text(l10n.pFinanceTitle)),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshFinanceSummary(_range),
        child: AsyncView<FinanceSummary>(
          value: repo.watchFinanceSummary(_range),
          errorTitle: l10n.pFinanceTitle,
          onRetry: () => repo.refreshFinanceSummary(_range),
          builder: (context, summary) {
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

                AsyncView<ProviderCommission>(
                  value: repo.watchCommission(),
                  builder: (context, commission) => Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Icon(Icons.percent, color: theme.colorScheme.primary),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '${l10n.pFinanceCommissionLabel}: '
                              '${commission.commissionRate.toStringAsFixed(1)}%',
                              style: theme.textTheme.titleSmall,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
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
                    _Stat(l10n.financeGross, _money(summary.grossServiceValue)),
                    _Stat(l10n.pFinanceCommissionPaid, _money(summary.platformCommissionRevenue)),
                    _Stat(l10n.pFinanceNetEarnings, _money(summary.providerNetEarnings)),
                    _Stat(l10n.pFinancePending, _money(summary.pendingSettlementAmount)),
                    _Stat(l10n.pFinanceSettled, _money(summary.settledAmount)),
                  ],
                ),

                const SizedBox(height: 20),
                _Heading(l10n.pFinanceTrend),
                const SizedBox(height: 8),
                Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: FinanceTrendChart(points: summary.trend),
                  ),
                ),

                const SizedBox(height: 20),
                _Heading(l10n.pFinanceTransactions),
                const SizedBox(height: 8),
                AsyncView<List<FinanceTransaction>>(
                  value: repo.watchFinanceTransactions(),
                  builder: (context, transactions) {
                    if (transactions.isEmpty) {
                      return SizedBox(
                        height: 160,
                        child: EmptyView(
                          icon: Icons.receipt_long_outlined,
                          title: l10n.pFinanceNoTransactions,
                        ),
                      );
                    }
                    return Column(
                      children: [
                        for (final tx in transactions) _TransactionTile(transaction: tx),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 20),
                Text(
                  l10n.pFinanceReadOnlyNote,
                  style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
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
    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  );
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.transaction});

  final FinanceTransaction transaction;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final isPending = transaction.settlementStatus == SettlementStatusModel.pending;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    transaction.booking?.serviceName ?? l10n.financeUnknownService,
                    style: theme.textTheme.titleSmall,
                  ),
                ),
                StatusChip(
                  label: isPending ? l10n.financeStatusPending : l10n.financeStatusSettled,
                  tone: isPending ? StatusTone.warning : StatusTone.success,
                ),
              ],
            ),
            const SizedBox(height: 8),
            _AmountRow(label: l10n.financeGross, value: transaction.grossAmount),
            _AmountRow(label: l10n.pFinanceCommissionPaid, value: transaction.commissionAmount),
            _AmountRow(label: l10n.pFinanceNetEarnings, value: transaction.providerNetAmount),
            const SizedBox(height: 6),
            Text(
              '${l10n.commonCreated}: '
              '${DateFormat.yMd().add_jm().format(transaction.createdAt.toLocal())}',
              style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}

class _AmountRow extends StatelessWidget {
  const _AmountRow({required this.label, required this.value});

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
            ),
          ),
          Text(_money(value), style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}
