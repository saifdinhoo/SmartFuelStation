import 'package:flutter/material.dart';

import '../../../core/l10n/day_labels.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/app_colors.dart';

/// Read-only weekly schedule, shown to customers on Provider Details.
///
/// Deliberately separate from the provider's live `isOpen` indicator —
/// these are the hours the provider has scheduled, not whether they happen
/// to be open at this exact moment.
class OperatingHoursList extends StatelessWidget {
  const OperatingHoursList({super.key, required this.hours});

  final List<OperatingHour> hours;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    if (hours.isEmpty) {
      return Text(
        l10n.providerHoursNone,
        style: theme.textTheme.bodyMedium?.copyWith(color: status.mutedForeground),
      );
    }

    final byDay = {for (final h in hours) h.dayOfWeek: h};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final day in DayOfWeekModel.week)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(dayLabel(l10n, day), style: theme.textTheme.bodyMedium),
                Builder(
                  builder: (context) {
                    final entry = byDay[day];
                    final text = entry == null
                        ? l10n.providerHoursNotSet
                        : entry.isClosed
                            ? l10n.pHoursClosed
                            : '${entry.openTime} – ${entry.closeTime}';
                    return Text(
                      text,
                      style: theme.textTheme.bodyMedium?.copyWith(color: status.mutedForeground),
                    );
                  },
                ),
              ],
            ),
          ),
      ],
    );
  }
}
