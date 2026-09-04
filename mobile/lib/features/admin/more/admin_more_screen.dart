import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/l10n/locale_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../auth/state/auth_state.dart';
import '../../auth/widgets/change_password_section.dart';
import '../settings/admin_backup_card.dart';
import '../settings/admin_booking_policy_card.dart';
import '../settings/admin_notification_preferences_card.dart';
import '../widgets/admin_widgets.dart';

/// The long tail of the admin area: the screens that don't earn a
/// bottom-bar slot, plus account and preferences.
///
/// Booking window configuration, notification settings and the system
/// backup export are real, backend-enforced features (see
/// bookingPolicy.service.js, notificationPreference.service.js and
/// backup.service.js) — not placeholders. The full audit history lives on
/// its own screen, reached from the nav tile below.
class AdminMoreScreen extends StatelessWidget {
  const AdminMoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final auth = context.watch<AuthState>();
    final themeController = context.watch<ThemeController>();
    final localeController = context.watch<LocaleController>();

    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: theme.colorScheme.primary.withValues(
                  alpha: 0.12,
                ),
                child: Icon(
                  Icons.shield_outlined,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      auth.displayName ?? l10n.roleAdmin,
                      style: theme.textTheme.titleLarge,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      l10n.roleAdmin,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: status.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),
          AdminSectionHeader(title: l10n.aMoreManagement),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                _NavTile(
                  icon: Icons.people_outline,
                  label: l10n.aMoreUsers,
                  onTap: () => context.push(Routes.adminUsers),
                ),
                const Divider(height: 1),
                _NavTile(
                  icon: Icons.category_outlined,
                  label: l10n.aMoreCategories,
                  onTap: () => context.push(Routes.adminCategories),
                ),
                const Divider(height: 1),
                _NavTile(
                  icon: Icons.reviews_outlined,
                  label: l10n.aMoreReviews,
                  onTap: () => context.push(Routes.adminReviews),
                ),
                const Divider(height: 1),
                _NavTile(
                  icon: Icons.insights_outlined,
                  label: l10n.aMoreAnalytics,
                  onTap: () => context.push(Routes.adminAnalytics),
                ),
                const Divider(height: 1),
                _NavTile(
                  icon: Icons.account_balance_wallet_outlined,
                  label: l10n.aMoreFinance,
                  onTap: () => context.push(Routes.adminFinance),
                ),
                const Divider(height: 1),
                _NavTile(
                  icon: Icons.history_toggle_off_outlined,
                  label: l10n.aMoreAuditLog,
                  onTap: () => context.push(Routes.adminAuditLog),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),
          AdminSectionHeader(title: l10n.aMoreAccount),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Column(
                children: [
                  AdminInfoRow(
                    label: l10n.fieldName,
                    value: auth.displayName ?? '—',
                  ),
                  AdminInfoRow(
                    label: l10n.fieldEmail,
                    value: auth.email ?? '—',
                  ),
                  AdminInfoRow(label: l10n.profileRole, value: l10n.roleAdmin),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          AdminSectionHeader(title: l10n.aMorePreferences),
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
          AdminSectionHeader(title: l10n.profileChangePasswordTitle),
          const SizedBox(height: 8),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(14),
              child: ChangePasswordSection(),
            ),
          ),

          const SizedBox(height: 20),
          const AdminBookingPolicyCard(),

          const SizedBox(height: 20),
          const AdminNotificationPreferencesCard(),

          const SizedBox(height: 20),
          const AdminBackupCard(),

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
