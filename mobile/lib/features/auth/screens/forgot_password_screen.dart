import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../state/auth_state.dart';

/// Requests the password-reset email — the same generic response either
/// way, so the UI never reveals whether the email is registered.
///
/// There is deliberately no in-app "enter new password" screen here: the
/// emailed link points at the web app's /reset-password page (already the
/// real, backend-verified flow), opened in the phone's browser. Deep-
/// linking that link straight back into this app would need platform
/// verified-domain setup (Android App Links / iOS Universal Links) this
/// project has no production domain to support — documented as a known
/// gap rather than faked.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

// Deliberately simple — a shape check, not full RFC 5322 validation. Its
// only job is to catch an obviously-empty/malformed submission before a
// network round trip; the backend is the real authority on the address.
final _emailShape = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  String? _error;
  bool _submitting = false;
  bool _submitted = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    final email = _email.text.trim();
    if (!_emailShape.hasMatch(email)) {
      setState(() => _error = l10n.forgotPasswordInvalidEmail);
      return;
    }

    setState(() {
      _error = null;
      _submitting = true;
    });
    try {
      await context.read<AuthState>().requestPasswordReset(email);
      if (mounted) setState(() => _submitted = true);
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

    return Scaffold(
      appBar: AppBar(title: Text(l10n.forgotPasswordTitle)),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: _submitted
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle_outline, size: 40, color: theme.colorScheme.primary),
                        const SizedBox(height: 12),
                        Text(
                          l10n.forgotPasswordCheckEmailTitle,
                          style: theme.textTheme.titleLarge,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.forgotPasswordCheckEmailBody,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        TextButton(
                          onPressed: () => context.pop(),
                          child: Text(l10n.forgotPasswordBackToLogin),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          l10n.forgotPasswordTitle,
                          style: theme.textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 4),
                        Text(l10n.forgotPasswordSubtitle),
                        const SizedBox(height: 20),
                        AppTextField(
                          label: l10n.fieldEmail,
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.done,
                          enabled: !_submitting,
                          onSubmitted: (_) => _submitting ? null : _submit(),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                        ],
                        const SizedBox(height: 20),
                        PrimaryButton(
                          label: l10n.forgotPasswordSubmit,
                          isLoading: _submitting,
                          onPressed: _submit,
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: _submitting ? null : () => context.pop(),
                          child: Text(l10n.forgotPasswordBackToLogin),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
