import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/l10n/locale_controller.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_chip.dart';
import '../../auth/state/auth_state.dart';

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
          _SectionTitle(l10n.profileChangePasswordTitle),
          const SizedBox(height: 8),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(14),
              child: _ChangePasswordSection(),
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

/// Real, authenticated change-password form — PATCH /auth/change-password.
/// The current session/token is untouched on success (see
/// AuthState.changePassword), so nothing here needs to navigate away.
class _ChangePasswordSection extends StatefulWidget {
  const _ChangePasswordSection();

  @override
  State<_ChangePasswordSection> createState() =>
      _ChangePasswordSectionState();
}

class _ChangePasswordSectionState extends State<_ChangePasswordSection> {
  final _current = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  String? _success;
  bool _submitting = false;

  @override
  void dispose() {
    _current.dispose();
    _newPassword.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;

    if (_newPassword.text.length < 6) {
      setState(() {
        _error = l10n.changePasswordTooShort;
        _success = null;
      });
      return;
    }
    if (_newPassword.text != _confirm.text) {
      setState(() {
        _error = l10n.changePasswordMismatch;
        _success = null;
      });
      return;
    }

    setState(() {
      _error = null;
      _success = null;
      _submitting = true;
    });
    try {
      await context.read<AuthState>().changePassword(
        currentPassword: _current.text,
        newPassword: _newPassword.text,
      );
      if (!mounted) return;
      _current.clear();
      _newPassword.clear();
      _confirm.clear();
      setState(() => _success = l10n.changePasswordSuccess);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          label: l10n.fieldCurrentPassword,
          controller: _current,
          obscure: true,
          textInputAction: TextInputAction.next,
          enabled: !_submitting,
        ),
        const SizedBox(height: 12),
        AppTextField(
          label: l10n.fieldNewPassword,
          controller: _newPassword,
          obscure: true,
          textInputAction: TextInputAction.next,
          enabled: !_submitting,
        ),
        const SizedBox(height: 12),
        AppTextField(
          label: l10n.fieldConfirmPassword,
          controller: _confirm,
          obscure: true,
          textInputAction: TextInputAction.done,
          enabled: !_submitting,
          onSubmitted: (_) => _submitting ? null : _submit(),
        ),
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
        ],
        if (_success != null) ...[
          const SizedBox(height: 10),
          Text(_success!, style: TextStyle(color: status.success)),
        ],
        const SizedBox(height: 14),
        PrimaryButton(
          label: l10n.changePasswordSubmit,
          isLoading: _submitting,
          onPressed: _submit,
        ),
      ],
    );
  }
}
