import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/day_labels.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/provider_repository.dart';

const _defaultOpen = TimeOfDay(hour: 9, minute: 0);
const _defaultClose = TimeOfDay(hour: 18, minute: 0);

TimeOfDay _parseTime(String value, TimeOfDay fallback) {
  final parts = value.split(':');
  if (parts.length != 2) return fallback;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) return fallback;
  return TimeOfDay(hour: hour, minute: minute);
}

String _formatTime(TimeOfDay time) =>
    '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';

/// Minutes since midnight — used only to compare two [TimeOfDay]s, never
/// combined with a date (that ambiguity is exactly what
/// backend/src/services/shared/availabilityRules.js's doc comment warns
/// against on the server side).
int _minutes(TimeOfDay t) => t.hour * 60 + t.minute;

class _Row {
  _Row({required this.dayOfWeek, required this.isClosed, required this.openTime, required this.closeTime});

  final DayOfWeekModel dayOfWeek;
  bool isClosed;
  TimeOfDay openTime;
  TimeOfDay closeTime;

  String? error(AppLocalizations l10n) {
    if (isClosed) return null;
    if (_minutes(closeTime) <= _minutes(openTime)) {
      return l10n.pHoursErrorCloseBeforeOpen;
    }
    return null;
  }

  OperatingHour toApi() => OperatingHour(
    dayOfWeek: dayOfWeek,
    isClosed: isClosed,
    openTime: isClosed ? null : _formatTime(openTime),
    closeTime: isClosed ? null : _formatTime(closeTime),
  );
}

List<_Row> _toRows(List<OperatingHour> hours) {
  final byDay = {for (final h in hours) h.dayOfWeek: h};
  return DayOfWeekModel.week.map((day) {
    final existing = byDay[day];
    return _Row(
      dayOfWeek: day,
      isClosed: existing?.isClosed ?? true,
      openTime: existing?.openTime != null
          ? _parseTime(existing!.openTime!, _defaultOpen)
          : _defaultOpen,
      closeTime: existing?.closeTime != null
          ? _parseTime(existing!.closeTime!, _defaultClose)
          : _defaultClose,
    );
  }).toList();
}

/// Every weekday, always all seven — a missing day means "closed" here,
/// matching HOURS_NOT_CONFIGURED's customer-facing meaning. Embedded in
/// [BusinessProfileScreen] as its own save unit, independent of the profile
/// form above it.
class OperatingHoursEditor extends StatefulWidget {
  const OperatingHoursEditor({super.key});

  @override
  State<OperatingHoursEditor> createState() => _OperatingHoursEditorState();
}

class _OperatingHoursEditorState extends State<OperatingHoursEditor> {
  List<_Row>? _rows;
  bool _dirty = false;
  bool _saving = false;
  String? _error;

  void _seed(List<OperatingHour> hours) {
    if (_rows != null) return;
    _rows = _toRows(hours);
  }

  Future<void> _pickTime(_Row row, {required bool isOpen}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isOpen ? row.openTime : row.closeTime,
    );
    if (picked == null || !mounted) return;
    setState(() {
      if (isOpen) {
        row.openTime = picked;
      } else {
        row.closeTime = picked;
      }
      _dirty = true;
    });
  }

  Future<void> _save() async {
    final rows = _rows;
    if (rows == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final saved = await context.read<ProviderRepository>().updateHours(
        rows.map((r) => r.toApi()).toList(),
      );
      if (!mounted) return;
      setState(() {
        _rows = _toRows(saved);
        _dirty = false;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.pHoursSaved)));
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    return AsyncView<List<OperatingHour>>(
      value: repo.watchHours(),
      onRetry: repo.watchHours,
      builder: (context, hours) {
        _seed(hours);
        final rows = _rows!;
        final hasErrors = rows.any((r) => r.error(l10n) != null);

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.pHoursTitle, style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(
                  l10n.pHoursSubtitle,
                  style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
                ),
                const SizedBox(height: 12),
                for (final row in rows) ...[
                  _HourRow(
                    row: row,
                    label: dayLabel(l10n, row.dayOfWeek),
                    closedLabel: l10n.pHoursClosed,
                    opensLabel: l10n.pHoursOpensLabel,
                    closesLabel: l10n.pHoursClosesLabel,
                    error: row.error(l10n),
                    enabled: !_saving,
                    onToggle: (open) => setState(() {
                      row.isClosed = !open;
                      _dirty = true;
                    }),
                    onPickOpen: () => _pickTime(row, isOpen: true),
                    onPickClose: () => _pickTime(row, isOpen: false),
                  ),
                  const Divider(height: 20),
                ],
                if (_error != null) ...[
                  Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                  const SizedBox(height: 12),
                ],
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: (!_dirty || _saving)
                            ? null
                            : () => setState(() {
                                _rows = _toRows(hours);
                                _dirty = false;
                                _error = null;
                              }),
                        child: Text(l10n.pHoursDiscard),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: PrimaryButton(
                        label: l10n.pHoursSave,
                        isLoading: _saving,
                        onPressed: (!_dirty || hasErrors) ? null : _save,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _HourRow extends StatelessWidget {
  const _HourRow({
    required this.row,
    required this.label,
    required this.closedLabel,
    required this.opensLabel,
    required this.closesLabel,
    required this.error,
    required this.enabled,
    required this.onToggle,
    required this.onPickOpen,
    required this.onPickClose,
  });

  final _Row row;
  final String label;
  final String closedLabel;
  final String opensLabel;
  final String closesLabel;
  final String? error;
  final bool enabled;
  final ValueChanged<bool> onToggle;
  final VoidCallback onPickOpen;
  final VoidCallback onPickClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            SizedBox(
              width: 90,
              child: Text(label, style: theme.textTheme.bodyMedium),
            ),
            Switch(
              value: !row.isClosed,
              onChanged: enabled ? onToggle : null,
            ),
            if (row.isClosed)
              Text(closedLabel, style: TextStyle(color: status.mutedForeground))
            else
              Expanded(
                child: Wrap(
                  spacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _TimeButton(label: opensLabel, time: row.openTime, onTap: enabled ? onPickOpen : null),
                    Text('–'),
                    _TimeButton(label: closesLabel, time: row.closeTime, onTap: enabled ? onPickClose : null),
                  ],
                ),
              ),
          ],
        ),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(error!, style: TextStyle(color: theme.colorScheme.error, fontSize: 12)),
          ),
      ],
    );
  }
}

class _TimeButton extends StatelessWidget {
  const _TimeButton({required this.label, required this.time, required this.onTap});

  final String label;
  final TimeOfDay time;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      child: Text('$label ${time.format(context)}'),
    );
  }
}
