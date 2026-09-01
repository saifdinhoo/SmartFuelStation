import 'package:flutter/material.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/live_camera_models.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_chip.dart';
import 'live_camera_ui.dart';

/// Home screen's "Live Station" card (Phase F).
///
/// Purely presentational — the caller is responsible for finding the one
/// provider with `liveCameraEnabled: true` and for only mounting this widget
/// when one exists (no card at all otherwise, never an empty placeholder).
/// [status] is the real fetched value (or null while still loading); the
/// badge only ever reads LIVE when [status] is actually
/// [LiveCameraStatusValue.live] — see [liveCameraStatusLabel].
class LiveStationCard extends StatelessWidget {
  const LiveStationCard({
    super.key,
    required this.businessName,
    required this.status,
    required this.onWatchLive,
  });

  final String businessName;
  final LiveCameraStatusValue? status;
  final VoidCallback onWatchLive;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final statusColors = theme.extension<AppStatusColors>()!;
    final isLive = status == LiveCameraStatusValue.live;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    businessName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                StatusChip(
                  label: liveCameraStatusLabel(l10n, status),
                  tone: liveCameraStatusTone(status),
                  icon: isLive ? Icons.videocam : Icons.videocam_off_outlined,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              l10n.homeLiveStationBody,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: statusColors.mutedForeground,
              ),
            ),
            const SizedBox(height: 12),
            PrimaryButton(
              label: l10n.homeWatchLive,
              icon: Icons.play_circle_outline,
              onPressed: onWatchLive,
            ),
          ],
        ),
      ),
    );
  }
}
