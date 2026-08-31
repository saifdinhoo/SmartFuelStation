import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../l10n/generated/app_localizations.dart';
import '../models/models.dart';
import '../theme/app_colors.dart';

/// Gross/commission/net over time, plotted from the `trend` array a finance
/// summary already carries — unlike [FuelHistoryChart] there is no separate
/// history endpoint to call, so this is a plain presentational widget: it
/// takes the points it is given and renders them, with no repository or
/// cache access of its own. That also makes it trivial to smoke-test in
/// isolation.
///
/// Real recorded points only, one per day in the requested window — never
/// interpolated or invented.
class FinanceTrendChart extends StatelessWidget {
  const FinanceTrendChart({
    super.key,
    required this.points,
    this.showCommissionAndNet = true,
  });

  final List<FinanceTrendPoint> points;

  /// The provider's own chart can be shown as all three series too — the
  /// data is theirs alone either way — but a caller with limited space may
  /// pass false to plot gross only. Defaults to the full 3-series view.
  final bool showCommissionAndNet;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    if (points.isEmpty) {
      return SizedBox(
        height: 160,
        child: Center(
          child: Text(
            l10n.financeTrendEmpty,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: status.mutedForeground,
            ),
          ),
        ),
      );
    }

    final grossSpots = [
      for (var i = 0; i < points.length; i++)
        FlSpot(i.toDouble(), points[i].gross),
    ];
    final commissionSpots = [
      for (var i = 0; i < points.length; i++)
        FlSpot(i.toDouble(), points[i].commission),
    ];
    final netSpots = [
      for (var i = 0; i < points.length; i++)
        FlSpot(i.toDouble(), points[i].net),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 14,
          runSpacing: 4,
          children: [
            _LegendEntry(color: theme.colorScheme.primary, label: l10n.financeGross),
            if (showCommissionAndNet) ...[
              _LegendEntry(
                color: theme.colorScheme.secondary,
                label: l10n.financeCommission,
              ),
              _LegendEntry(
                color: theme.colorScheme.tertiary,
                label: l10n.financeNet,
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 220,
          child: LineChart(
            LineChartData(
              gridData: const FlGridData(show: true, drawVerticalLine: false),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 48,
                    getTitlesWidget: (value, meta) => Text(
                      NumberFormat.compact().format(value),
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 28,
                    getTitlesWidget: (value, meta) {
                      final i = value.round();
                      if (i < 0 || i >= points.length) {
                        return const SizedBox.shrink();
                      }
                      final label = points[i].label;
                      // "YYYY-MM-DD" -> "MM-DD", the same trimming the fuel
                      // chart's DateFormat.Md() achieves for a real date.
                      final short = label.length >= 10 ? label.substring(5) : label;
                      return Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(short, style: theme.textTheme.bodySmall),
                      );
                    },
                  ),
                ),
              ),
              lineBarsData: [
                LineChartBarData(
                  spots: grossSpots,
                  isCurved: false,
                  color: theme.colorScheme.primary,
                  barWidth: 2,
                  dotData: const FlDotData(show: false),
                ),
                if (showCommissionAndNet) ...[
                  LineChartBarData(
                    spots: commissionSpots,
                    isCurved: false,
                    color: theme.colorScheme.secondary,
                    barWidth: 2,
                    dotData: const FlDotData(show: false),
                  ),
                  LineChartBarData(
                    spots: netSpots,
                    isCurved: false,
                    color: theme.colorScheme.tertiary,
                    barWidth: 2,
                    dotData: const FlDotData(show: false),
                  ),
                ],
              ],
            ),
          ),
        ),
        if (points.length == 1) ...[
          const SizedBox(height: 8),
          Text(
            l10n.financeTrendSinglePoint,
            style: theme.textTheme.bodySmall?.copyWith(
              color: status.mutedForeground,
            ),
          ),
        ],
      ],
    );
  }
}

class _LegendEntry extends StatelessWidget {
  const _LegendEntry({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      const SizedBox(width: 5),
      Text(label, style: Theme.of(context).textTheme.bodySmall),
    ],
  );
}
