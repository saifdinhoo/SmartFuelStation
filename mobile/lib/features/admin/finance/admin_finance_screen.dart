import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/finance_trend_chart.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';
import 'admin_commission_sheet.dart';

String _money(double value) => '\$${value.toStringAsFixed(2)}';

/// Platform-wide commission and settlement dashboard.
///
/// Every figure comes from GET /admin/finance/summary and
/// GET /admin/finance/transactions — real per-booking commission splits,
/// never estimated. The summary card stays platform-wide regardless of the
/// provider filter below (recomputing it per-provider would mean a second
/// endpoint call anyway, which is exactly what selecting a provider already
/// triggers for the compact [_ProviderCommissionCard]); the filter narrows
/// only the transaction list and, when set, adds that one card.
class AdminFinanceScreen extends StatefulWidget {
  const AdminFinanceScreen({super.key});

  @override
  State<AdminFinanceScreen> createState() => _AdminFinanceScreenState();
}

class _AdminFinanceScreenState extends State<AdminFinanceScreen> {
  static const _ranges = ['7d', '30d', '90d'];
  static const _statuses = ['ALL', 'PENDING', 'SETTLED'];

  String _range = '30d';
  String _status = 'ALL';
  int? _providerFilter;

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

    String statusLabel(String status) => switch (status) {
      'PENDING' => l10n.financeStatusPending,
      'SETTLED' => l10n.financeStatusSettled,
      _ => l10n.financeStatusAll,
    };

    final providers = repo.watchProviders().valueOrNull ?? const [];

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aFinanceTitle)),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshFinanceSummary(_range),
        child: AsyncView<FinanceSummary>(
          value: repo.watchFinanceSummary(_range),
          errorTitle: l10n.aFinanceTitle,
          onRetry: () => repo.refreshFinanceSummary(_range),
          builder: (context, summary) {
            return ListView(
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
                      label: l10n.financeGross,
                      value: _money(summary.grossServiceValue),
                    ),
                    AdminStatTile(
                      label: l10n.aFinanceCommissionRevenue,
                      value: _money(summary.platformCommissionRevenue),
                    ),
                    AdminStatTile(
                      label: l10n.aFinanceProviderNet,
                      value: _money(summary.providerNetEarnings),
                    ),
                    AdminStatTile(
                      label: l10n.aFinancePending,
                      value: _money(summary.pendingSettlementAmount),
                    ),
                    AdminStatTile(
                      label: l10n.aFinanceSettled,
                      value: _money(summary.settledAmount),
                    ),
                    AdminStatTile(
                      label: l10n.aFinanceTransactionCount,
                      value: '${summary.transactionCount ?? 0}',
                    ),
                  ],
                ),

                const SizedBox(height: 20),
                AdminSectionHeader(title: l10n.aFinanceTrend),
                const SizedBox(height: 8),
                Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: FinanceTrendChart(points: summary.trend),
                  ),
                ),

                const SizedBox(height: 20),
                AdminSectionHeader(title: l10n.aFinanceTransactions),
                const SizedBox(height: 8),
                DropdownButtonFormField<int?>(
                  initialValue: _providerFilter,
                  decoration: InputDecoration(labelText: l10n.aFinanceProviderFilter),
                  items: [
                    DropdownMenuItem(value: null, child: Text(l10n.aFinanceAllProviders)),
                    for (final p in providers)
                      DropdownMenuItem(value: p.id, child: Text(p.businessName)),
                  ],
                  onChanged: (value) => setState(() => _providerFilter = value),
                ),

                if (_providerFilter != null) ...[
                  const SizedBox(height: 10),
                  _ProviderCommissionCard(providerId: _providerFilter!, range: _range),
                ],

                const SizedBox(height: 10),
                AdminFilterBar<String>(
                  options: _statuses,
                  selected: _status,
                  labelOf: statusLabel,
                  onSelected: (s) => setState(() => _status = s),
                ),
                const SizedBox(height: 10),

                AsyncView<List<AdminFinanceTransaction>>(
                  value: repo.watchFinanceTransactions(
                    providerId: _providerFilter?.toString(),
                    status: _status,
                  ),
                  builder: (context, transactions) {
                    if (transactions.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: Text(l10n.aFinanceNoTransactions)),
                      );
                    }
                    return Column(
                      children: [
                        for (final tx in transactions)
                          _TransactionCard(transaction: tx, showProvider: _providerFilter == null),
                      ],
                    );
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Shown only while a provider filter is active — the summary above stays
/// platform-wide, so this is where that one business's own commission rate
/// and totals surface, right next to the button that changes the rate.
class _ProviderCommissionCard extends StatelessWidget {
  const _ProviderCommissionCard({required this.providerId, required this.range});

  final int providerId;
  final String range;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final repo = context.read<AdminRepository>();

    return AsyncView<AdminProviderFinance>(
      value: repo.watchProviderFinance(providerId, range),
      builder: (context, data) {
        final summary = data.summary;
        return Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        summary.providerName ?? '—',
                        style: theme.textTheme.titleSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${l10n.financeCommissionRateField}: '
                        '${(summary.commissionRate ?? 0).toStringAsFixed(1)}%',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                OutlinedButton(
                  onPressed: () => showAdminCommissionSheet(
                    context,
                    providerId: providerId,
                    providerName: summary.providerName,
                  ),
                  child: Text(l10n.aFinanceCommissionEdit),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TransactionCard extends StatelessWidget {
  const _TransactionCard({required this.transaction, required this.showProvider});

  final AdminFinanceTransaction transaction;
  final bool showProvider;

  Future<void> _settle(BuildContext context) async {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<AdminRepository>();
    final messenger = ScaffoldMessenger.of(context);
    try {
      await repo.settleTransaction(transaction.id);
      messenger.showSnackBar(SnackBar(content: Text(l10n.aFinanceSettleSuccess)));
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

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
            if (showProvider) ...[
              const SizedBox(height: 4),
              Text(
                transaction.providerName,
                style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
              ),
            ],
            const SizedBox(height: 8),
            _AmountRow(label: l10n.financeGross, value: transaction.grossAmount),
            _AmountRow(label: l10n.aFinanceCommissionRevenue, value: transaction.commissionAmount),
            _AmountRow(label: l10n.aFinanceProviderNet, value: transaction.providerNetAmount),
            const SizedBox(height: 6),
            Text(
              '${l10n.commonCreated}: '
              '${DateFormat.yMd().add_jm().format(transaction.createdAt.toLocal())}',
              style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
            ),
            if (!isPending && transaction.settledAt != null)
              Text(
                '${l10n.aFinanceSettledAt}: '
                '${DateFormat.yMd().add_jm().format(transaction.settledAt!.toLocal())}'
                '${transaction.settledByAdminName != null ? ' · ${transaction.settledByAdminName}' : ''}',
                style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
              ),
            if (isPending) ...[
              const SizedBox(height: 10),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: OutlinedButton(
                  onPressed: () => _settle(context),
                  child: Text(l10n.aFinanceMarkSettled),
                ),
              ),
            ],
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
