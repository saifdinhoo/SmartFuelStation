import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/widgets/status_chip.dart';
import '../../auth/state/auth_state.dart';

/// Placeholder landing screen, unchanged in scope from before Phase 0 —
/// the real role dashboards arrive with the feature phases.
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final auth = context.watch<AuthState>();
    final providerInfo = auth.user?['provider'] as Map<String, dynamic>?;

    final roleLabel = switch (auth.role) {
      UserRole.customer => l10n.roleCustomer,
      UserRole.provider => l10n.roleProvider,
      UserRole.admin => l10n.roleAdmin,
      null => '—',
    };

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.dashboardWelcome(auth.displayName ?? ''),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(l10n.dashboardRole(roleLabel)),
          if (auth.role == UserRole.provider && providerInfo != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: Text(l10n.dashboardApprovalStatus(''))),
                StatusChip(
                  label: providerInfo['isApproved'] == true
                      ? l10n.statusApproved
                      : l10n.statusPendingApproval,
                  tone: providerInfo['isApproved'] == true
                      ? StatusTone.success
                      : StatusTone.warning,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
