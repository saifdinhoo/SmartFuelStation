import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Small coloured label for a status value — the mobile counterpart of the
/// web's Badge, with the same tone vocabulary so a booking that reads
/// "success" green on the web reads the same here.
enum StatusTone { neutral, primary, success, warning, danger }

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    this.tone = StatusTone.neutral,
    this.icon,
  });

  final String label;
  final StatusTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    final (Color background, Color foreground) = switch (tone) {
      StatusTone.neutral => (status.muted, status.mutedForeground),
      StatusTone.primary => (
        theme.colorScheme.primary.withValues(alpha: 0.12),
        theme.colorScheme.primary,
      ),
      StatusTone.success => (
        status.success.withValues(alpha: 0.14),
        status.success,
      ),
      StatusTone.warning => (
        status.warning.withValues(alpha: 0.16),
        status.warning,
      ),
      StatusTone.danger => (
        theme.colorScheme.error.withValues(alpha: 0.12),
        theme.colorScheme.error,
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: foreground),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
