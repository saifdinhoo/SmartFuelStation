import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/widgets/primary_button.dart';
import '../../auth/state/auth_state.dart';

/// Shown when a role guard blocks a route — the mobile counterpart of the
/// web's /unauthorized page. Explains which role is signed in rather than
/// silently bouncing, which would look like a broken link.
class UnauthorizedScreen extends StatelessWidget {
  const UnauthorizedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final auth = context.watch<AuthState>();

    final roleLabel = switch (auth.role) {
      UserRole.customer => l10n.roleCustomer,
      UserRole.provider => l10n.roleProvider,
      UserRole.admin => l10n.roleAdmin,
      null => '—',
    };

    return Scaffold(
      appBar: AppBar(title: Text(l10n.unauthorizedTitle)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.lock_outline,
                size: 44,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 12),
              Text(
                l10n.unauthorizedTitle,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                l10n.unauthorizedBody(roleLabel),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              PrimaryButton(
                label: l10n.unauthorizedGoBack,
                // Splash re-runs the redirect, which routes each role to its own
                // home — a customer sent to an admin route would only bounce
                // straight back here.
                onPressed: () => context.go(Routes.splash),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
