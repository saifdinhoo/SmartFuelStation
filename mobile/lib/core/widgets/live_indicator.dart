import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../l10n/generated/app_localizations.dart';
import '../realtime/socket_service.dart';
import '../theme/app_colors.dart';

/// Live/offline pill, matching the one on the web's Queue and Bookings
/// pages.
///
/// Offline is informational, not an error: cached data stays on screen and
/// pull-to-refresh still works over REST, so this tells the user whether
/// numbers will update on their own — nothing more alarming than that.
class LiveIndicator extends StatelessWidget {
  const LiveIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final connected = context.watch<SocketService>().isConnected;

    final color = connected ? status.success : status.mutedForeground;

    return Padding(
      padding: const EdgeInsetsDirectional.only(end: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            height: 7,
            width: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            connected ? l10n.realtimeLive : l10n.realtimeOffline,
            style: theme.textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
