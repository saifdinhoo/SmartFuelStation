import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/l10n/locale_controller.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/status_chip.dart';
import '../../auth/state/auth_state.dart';
import '../data/provider_repository.dart';

/// The long tail of the provider area: the screens that don't earn a
/// bottom-bar slot, plus account and preferences.
class ProviderMoreScreen extends StatelessWidget {
  const ProviderMoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final auth = context.watch<AuthState>();
    final themeController = context.watch<ThemeController>();
    final localeController = context.watch<LocaleController>();
    context.watchQueries();

    final profile = context
        .read<ProviderRepository>()
        .watchProfile()
        .valueOrNull;

    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          if (profile != null) ...[
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: theme.colorScheme.primary.withValues(
                    alpha: 0.12,
                  ),
                  child: Icon(
                    Icons.storefront,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.businessName,
                        style: theme.textTheme.titleLarge,
                      ),
                      const SizedBox(height: 4),
                      StatusChip(
                        label: profile.isApproved
                            ? l10n.pOverviewApproved
                            : l10n.pOverviewPending,
                        tone: profile.isApproved
                            ? StatusTone.success
                            : StatusTone.warning,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],

          Card(
            child: Column(
              children: [
                _NavTile(
                  icon: Icons.storefront_outlined,
                  label: l10n.pMoreBusinessProfile,
                  onTap: () => context.push(Routes.providerProfile),
                ),
                const Divider(height: 1),
                _NavTile(
                  icon: Icons.podcasts,
                  label: l10n.pMoreLiveStatus,
                  onTap: () => context.push(Routes.providerLiveStatus),
                ),
                const Divider(height: 1),
                _NavTile(
                  icon: Icons.reviews_outlined,
                  label: l10n.pMoreReviews,
                  onTap: () => context.push(Routes.providerReviews),
                ),
                const Divider(height: 1),
                _NavTile(
                  icon: Icons.insights_outlined,
                  label: l10n.pMoreAnalytics,
                  onTap: () => context.push(Routes.providerAnalytics),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),
          _Heading(l10n.pMoreAccount),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Column(
                children: [
                  _InfoRow(
                    label: l10n.fieldName,
                    value: profile?.contactName ?? auth.displayName ?? '—',
                  ),
                  _InfoRow(
                    label: l10n.fieldEmail,
                    value: profile?.email ?? '—',
                  ),
                  _InfoRow(
                    label: l10n.pProfilePhone,
                    value: profile?.phone ?? '—',
                  ),
                  _InfoRow(label: l10n.profileRole, value: l10n.roleProvider),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          _Heading(l10n.pMorePreferences),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.dark_mode_outlined),
                  title: Text(l10n.settingsTheme),
                  subtitle: Text(
                    themeController.isDark(context)
                        ? l10n.themeDark
                        : l10n.themeLight,
                  ),
                  value: themeController.isDark(context),
                  onChanged: (_) => themeController.toggle(context),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.language_outlined),
                  title: Text(l10n.settingsLanguage),
                  subtitle: Text(
                    localeController.isArabic ? 'العربية' : 'English',
                  ),
                  trailing: Switch(
                    value: localeController.isArabic,
                    onChanged: (_) => localeController.toggle(),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),
          _Heading(l10n.pMoreUnsupported),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Stated rather than shown as a disabled control that
                  // would imply it is coming imminently.
                  _Gap(icon: Icons.key_outlined, text: l10n.pMoreNoPassword),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: () => context.read<AuthState>().logout(),
            icon: const Icon(Icons.logout, size: 18),
            label: Text(l10n.actionLogout),
            style: OutlinedButton.styleFrom(
              foregroundColor: theme.colorScheme.error,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'v1.0.0',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: status.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    leading: Icon(icon),
    title: Text(label),
    trailing: const Icon(Icons.chevron_right),
    onTap: onTap,
  );
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: Theme.of(
      context,
    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
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

class _Gap extends StatelessWidget {
  const _Gap({required this.icon, required this.text});

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
