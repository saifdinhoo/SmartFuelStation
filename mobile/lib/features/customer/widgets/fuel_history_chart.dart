import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/fuel_labels.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../data/customer_repository.dart';

/// Real recorded points only — one per Admin update, including the
/// initial creation. Never an invented trend: a single point renders as a
/// single point plus an honest "more history will appear" message rather
/// than a fabricated line.
class FuelHistoryChart extends StatefulWidget {
  const FuelHistoryChart({
    super.key,
    required this.providerId,
    required this.fuelTypes,
  });

  final int providerId;
  final List<FuelTypeModel> fuelTypes;

  @override
  State<FuelHistoryChart> createState() => _FuelHistoryChartState();
}

class _FuelHistoryChartState extends State<FuelHistoryChart> {
  late FuelTypeModel _fuelType = widget.fuelTypes.first;
  String _range = '7d';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<CustomerRepository>();
    context.watchQueries();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(l10n.fuelHistoryTitle, style: theme.textTheme.titleMedium),
                ),
                DropdownButton<String>(
                  value: _range,
                  underline: const SizedBox.shrink(),
                  items: [
                    DropdownMenuItem(value: '7d', child: Text(l10n.fuelRange7d)),
                    DropdownMenuItem(value: '30d', child: Text(l10n.fuelRange30d)),
                  ],
                  onChanged: (value) => setState(() => _range = value ?? '7d'),
                ),
              ],
            ),
            if (widget.fuelTypes.length > 1)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: DropdownButton<FuelTypeModel>(
                  value: _fuelType,
                  underline: const SizedBox.shrink(),
                  items: [
                    for (final type in widget.fuelTypes)
                      DropdownMenuItem(
                        value: type,
                        child: Text(fuelTypeLabel(l10n, type)),
                      ),
                  ],
                  onChanged: (value) => setState(() => _fuelType = value ?? _fuelType),
                ),
              ),
            const SizedBox(height: 8),
            SizedBox(
              height: 220,
              child: AsyncView<List<FuelHistoryPoint>>(
                value: repo.watchFuelHistory(widget.providerId, _fuelType, _range),
                builder: (context, points) {
                  if (points.isEmpty) {
                    return Center(
                      child: Text(
                        l10n.fuelHistoryEmpty,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: status.mutedForeground,
                        ),
                      ),
                    );
                  }

                  final spots = [
                    for (var i = 0; i < points.length; i++)
                      FlSpot(i.toDouble(), points[i].liters),
                  ];

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
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
                                  reservedSize: 44,
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
                                    return Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        DateFormat.Md().format(points[i].timestamp.toLocal()),
                                        style: theme.textTheme.bodySmall,
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                            lineBarsData: [
                              LineChartBarData(
                                spots: spots,
                                isCurved: false,
                                color: theme.colorScheme.primary,
                                barWidth: 2,
                                dotData: const FlDotData(show: true),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (points.length == 1) ...[
                        const SizedBox(height: 8),
                        Text(
                          l10n.fuelHistorySinglePoint,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: status.mutedForeground,
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
