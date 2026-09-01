import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../app/router.dart';
import '../../features/auth/state/auth_state.dart';
import '../l10n/generated/app_localizations.dart';

/// AppBar entry point into the AI Assistant, shared by all three role
/// shells — same discoverability mechanism as [NotificationBell], just
/// without a badge since there is nothing to count.
class AiAssistantButton extends StatelessWidget {
  const AiAssistantButton({super.key});

  @override
  Widget build(BuildContext context) {
    final role = context.watch<AuthState>().role;
    final l10n = AppLocalizations.of(context)!;

    final path = switch (role) {
      UserRole.customer => Routes.customerAssistant,
      UserRole.provider => Routes.providerAssistant,
      UserRole.admin || null => Routes.adminAssistant,
    };

    return IconButton(
      tooltip: l10n.aiAssistantTitle,
      onPressed: () => context.push(path),
      icon: const Icon(Icons.smart_toy_outlined),
    );
  }
}
