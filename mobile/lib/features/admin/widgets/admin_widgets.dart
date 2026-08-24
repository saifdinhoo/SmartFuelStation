import 'package:flutter/material.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/status_chip.dart';

/// Small building blocks shared across the admin screens, so a stat tile or
/// a severity chip looks and behaves the same everywhere it appears.

/// A labelled number. [value] is a string so a null average rating can be a
/// dash rather than a misleading 0.0.
class AdminStatTile extends StatelessWidget {
  const AdminStatTile({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.tone,
    this.onTap,
  });

  final String label;
  final String value;
  final IconData? icon;
  final Color? tone;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final accent = tone ?? theme.colorScheme.primary;

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18, color: accent),
                const SizedBox(height: 8),
              ],
              Text(
                value,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Section heading with an optional trailing action.
class AdminSectionHeader extends StatelessWidget {
  const AdminSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        if (actionLabel != null && onAction != null)
          TextButton(onPressed: onAction, child: Text(actionLabel!)),
      ],
    );
  }
}

/// A horizontally scrolling row of choice chips — the mobile stand-in for
/// the web's filter dropdowns.
class AdminFilterBar<T> extends StatelessWidget {
  const AdminFilterBar({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelected,
    required this.labelOf,
  });

  final List<T> options;
  final T selected;
  final ValueChanged<T> onSelected;
  final String Function(T value) labelOf;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final option in options)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 8),
              child: ChoiceChip(
                label: Text(labelOf(option)),
                selected: option == selected,
                onSelected: (_) => onSelected(option),
              ),
            ),
        ],
      ),
    );
  }
}

/// Label/value row used by every admin detail screen.
class AdminInfoRow extends StatelessWidget {
  const AdminInfoRow({super.key, required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: status.mutedForeground,
              ),
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: theme.textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

/// A stated limitation, rather than a disabled control that would imply the
/// feature is coming imminently.
class AdminGapNote extends StatelessWidget {
  const AdminGapNote({super.key, required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: status.mutedForeground),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: theme.textTheme.bodySmall?.copyWith(
              color: status.mutedForeground,
            ),
          ),
        ),
      ],
    );
  }
}

/// Simple horizontal bar chart. Deliberately hand-drawn rather than pulling
/// in a chart package: every admin chart is a list of labelled counts, and
/// the widest bar sets the scale.
class AdminBarList extends StatelessWidget {
  const AdminBarList({super.key, required this.rows, this.emptyLabel});

  final List<({String label, int count})> rows;
  final String? emptyLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    if (rows.isEmpty) {
      return Text(
        emptyLabel ?? '',
        style: theme.textTheme.bodySmall?.copyWith(
          color: status.mutedForeground,
        ),
      );
    }

    final max = rows.map((r) => r.count).reduce((a, b) => a > b ? a : b);

    return Column(
      children: [
        for (final row in rows)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(
              children: [
                SizedBox(
                  width: 110,
                  child: Text(
                    row.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall,
                  ),
                ),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      // A zero-width bar for a real zero is correct; the
                      // guard is only for an all-zero list.
                      value: max == 0 ? 0 : row.count / max,
                      minHeight: 8,
                      backgroundColor: status.muted,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  width: 34,
                  child: Text(
                    '${row.count}',
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
    );
  }
}

// --- complaint vocabulary ---------------------------------------------------

String complaintStatusLabel(AppLocalizations l10n, ComplaintStatus status) =>
    switch (status) {
      ComplaintStatus.open => l10n.aComplaintStatusOpen,
      ComplaintStatus.inReview => l10n.aComplaintStatusInReview,
      ComplaintStatus.resolved => l10n.aComplaintStatusResolved,
      ComplaintStatus.dismissed => l10n.aComplaintStatusDismissed,
    };

StatusTone complaintStatusTone(ComplaintStatus status) => switch (status) {
  ComplaintStatus.open => StatusTone.warning,
  ComplaintStatus.inReview => StatusTone.primary,
  ComplaintStatus.resolved => StatusTone.success,
  ComplaintStatus.dismissed => StatusTone.neutral,
};

String complaintSeverityLabel(
  AppLocalizations l10n,
  ComplaintSeverity severity,
) => switch (severity) {
  ComplaintSeverity.low => l10n.aComplaintSeverityLow,
  ComplaintSeverity.medium => l10n.aComplaintSeverityMedium,
  ComplaintSeverity.high => l10n.aComplaintSeverityHigh,
};

StatusTone complaintSeverityTone(ComplaintSeverity severity) =>
    switch (severity) {
      ComplaintSeverity.low => StatusTone.neutral,
      ComplaintSeverity.medium => StatusTone.warning,
      ComplaintSeverity.high => StatusTone.danger,
    };

String roleLabel(AppLocalizations l10n, UserRoleModel? role) => switch (role) {
  UserRoleModel.customer => l10n.roleCustomer,
  UserRoleModel.provider => l10n.roleProvider,
  UserRoleModel.admin => l10n.roleAdmin,
  null => '—',
};

/// Date only — every admin list shows when something happened, never at
/// what second.
String adminDate(DateTime value) =>
    '${value.year}-${_two(value.month)}-${_two(value.day)}';

String _two(int n) => n.toString().padLeft(2, '0');
