import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/l10n/locale_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/status_chip.dart';
import '../../auth/state/auth_state.dart';
import '../../auth/widgets/change_password_section.dart';

/// Account summary plus the preferences that actually persist.
///
/// Everything shown as read-only is read-only because no endpoint exists to
/// change it — stated plainly rather than rendered as a control that would
/// silently discard the edit.
class CustomerProfileScreen extends StatelessWidget {
  const CustomerProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final auth = context.watch<AuthState>();
    final themeController = context.watch<ThemeController>();
    final localeController = context.watch<LocaleController>();
    final user = auth.user;

    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: theme.colorScheme.primary.withValues(
                  alpha: 0.12,
                ),
                child: Text(
                  (auth.displayName ?? '?').characters.first.toUpperCase(),
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      auth.displayName ?? '',
                      style: theme.textTheme.titleLarge,
                    ),
                    const SizedBox(height: 4),
                    StatusChip(
                      label: l10n.roleCustomer,
                      tone: StatusTone.primary,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),
          _SectionTitle(l10n.profileAccount),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Column(
                children: [
                  _InfoRow(
                    label: l10n.fieldName,
                    value: user?['name'] as String? ?? l10n.profileNotSet,
                  ),
                  _InfoRow(
                    label: l10n.fieldEmail,
                    value: user?['email'] as String? ?? l10n.profileNotSet,
                  ),
                  _InfoRow(label: l10n.fieldPassword, value: '••••••••'),
                  _InfoRow(label: l10n.profileRole, value: l10n.roleCustomer),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          _SectionTitle(l10n.profilePreferences),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  title: Text(l10n.settingsTheme),
                  subtitle: Text(
                    themeController.isDark(context)
                        ? l10n.themeDark
                        : l10n.themeLight,
                  ),
                  value: themeController.isDark(context),
                  onChanged: (_) => themeController.toggle(context),
                  secondary: const Icon(Icons.dark_mode_outlined),
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
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.star_outline_rounded),
                  title: Text(l10n.myReviewsTitle),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(Routes.customerReviews),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.report_gmailerrorred_outlined),
                  title: Text(l10n.myComplaintsTitle),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(Routes.customerComplaints),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.favorite_border),
                  title: Text(l10n.favoritesTitle),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(Routes.customerFavorites),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.directions_car_outlined),
                  title: Text(l10n.myVehiclesTitle),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(Routes.customerVehicles),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),
          _SectionTitle(l10n.profileChangePasswordTitle),
          const SizedBox(height: 8),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(14),
              child: ChangePasswordSection(),
            ),
          ),

          const SizedBox(height: 20),
          _SectionTitle(l10n.profileUnsupportedTitle),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: _Unsupported(
                icon: Icons.edit_outlined,
                text: l10n.profileEditUnsupported,
              ),
            ),
          ),

          const SizedBox(height: 24),
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

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

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

class _Unsupported extends StatelessWidget {
  const _Unsupported({required this.icon, required this.text});

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

