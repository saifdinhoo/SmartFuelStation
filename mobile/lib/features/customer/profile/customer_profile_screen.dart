import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/l10n/locale_controller.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_chip.dart';
import '../../auth/state/auth_state.dart';
import '../../auth/widgets/change_password_section.dart';

/// Account summary plus the preferences that actually persist.
///
/// Name and phone are real, editable fields — PATCH /auth/me — via the
/// "Edit Profile" control in [_AccountCard] below. Email, role, and
/// password are read-only here on purpose: email has no edit path in this
/// task, role has no edit endpoint at all, and password goes through its
/// own Change Password section with a current-password check.
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
          const _AccountCard(),

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

/// Real account info, with a real Edit Profile flow — PATCH /auth/me.
/// Name and phone are editable; email, password, and role are shown but
/// never editable here (see the doc comment on [CustomerProfileScreen]).
class _AccountCard extends StatefulWidget {
  const _AccountCard();

  @override
  State<_AccountCard> createState() => _AccountCardState();
}

class _AccountCardState extends State<_AccountCard> {
  bool _editing = false;
  bool _submitting = false;
  String? _error;
  String? _success;
  late final TextEditingController _name;
  late final TextEditingController _phone;
  // Read-only in edit mode (email is never editable here) — kept as a real
  // controller anyway, purely so AppTextField has one to attach to without
  // constructing a fresh one on every rebuild.
  late final TextEditingController _email;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthState>().user;
    _name = TextEditingController(text: user?['name'] as String? ?? '');
    _phone = TextEditingController(text: user?['phone'] as String? ?? '');
    _email = TextEditingController(text: user?['email'] as String? ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  void _startEditing(Map<String, dynamic>? user) {
    _name.text = user?['name'] as String? ?? '';
    _phone.text = user?['phone'] as String? ?? '';
    setState(() {
      _editing = true;
      _error = null;
      _success = null;
    });
  }

  void _cancel(Map<String, dynamic>? user) {
    // Discards any unsaved edit — the controllers are reset from the real
    // current session state, never left holding a half-typed value.
    _name.text = user?['name'] as String? ?? '';
    _phone.text = user?['phone'] as String? ?? '';
    setState(() {
      _editing = false;
      _error = null;
    });
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() {
        _error = l10n.profileNameRequired;
        _success = null;
      });
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
      _success = null;
    });
    try {
      await context.read<AuthState>().updateProfile(
        name: name,
        phone: _phone.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _editing = false;
        _success = l10n.profileUpdateSuccess;
      });
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
    final auth = context.watch<AuthState>();
    final user = auth.user;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: _editing
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppTextField(
                    label: l10n.fieldName,
                    controller: _name,
                    textInputAction: TextInputAction.next,
                    enabled: !_submitting,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: l10n.fieldEmail,
                    controller: _email,
                    enabled: false,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: l10n.fieldPhone,
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.done,
                    enabled: !_submitting,
                    onSubmitted: (_) => _submitting ? null : _save(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                  ],
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: PrimaryButton(
                          label: l10n.actionSave,
                          isLoading: _submitting,
                          onPressed: _save,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: PrimaryButton(
                          label: l10n.actionCancel,
                          variant: ButtonVariant.outline,
                          onPressed: _submitting ? null : () => _cancel(user),
                        ),
                      ),
                    ],
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _InfoRow(
                    label: l10n.fieldName,
                    value: user?['name'] as String? ?? l10n.profileNotSet,
                  ),
                  _InfoRow(
                    label: l10n.fieldEmail,
                    value: user?['email'] as String? ?? l10n.profileNotSet,
                  ),
                  _InfoRow(
                    label: l10n.fieldPhone,
                    value: (user?['phone'] as String?)?.trim().isNotEmpty == true
                        ? user!['phone'] as String
                        : l10n.profileNotSet,
                  ),
                  _InfoRow(label: l10n.fieldPassword, value: '••••••••'),
                  _InfoRow(label: l10n.profileRole, value: l10n.roleCustomer),
                  if (_success != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      _success!,
                      style: TextStyle(
                        color: theme.extension<AppStatusColors>()!.success,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  PrimaryButton(
                    label: l10n.profileEditProfile,
                    icon: Icons.edit_outlined,
                    variant: ButtonVariant.outline,
                    onPressed: () => _startEditing(user),
                  ),
                ],
              ),
      ),
    );
  }
}

