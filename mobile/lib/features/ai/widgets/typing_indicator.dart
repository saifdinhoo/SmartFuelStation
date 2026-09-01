import 'package:flutter/material.dart';

import '../../../core/l10n/generated/app_localizations.dart';

/// Calm, non-flashing loading cue for while a request is in flight — a
/// standard spinner, not a blinking/flashing animation.
class TypingIndicator extends StatelessWidget {
  const TypingIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: const BorderRadiusDirectional.only(
            topStart: Radius.circular(16),
            topEnd: Radius.circular(16),
            bottomEnd: Radius.circular(16),
            bottomStart: Radius.circular(4),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              height: 14,
              width: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 10),
            Text(l10n.aiThinking, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
