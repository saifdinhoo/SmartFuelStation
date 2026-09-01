import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../state/auth_state.dart';

/// Real, authenticated change-password form — PATCH /auth/change-password.
/// Shared by Customer, Provider, and Admin settings, since all three roles
/// hit the same endpoint. The current session/token is untouched on
/// success (see AuthState.changePassword), so nothing here needs to
/// navigate away.
class ChangePasswordSection extends StatefulWidget {
  const ChangePasswordSection({super.key});

  @override
  State<ChangePasswordSection> createState() => _ChangePasswordSectionState();
}

class _ChangePasswordSectionState extends State<ChangePasswordSection> {
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
