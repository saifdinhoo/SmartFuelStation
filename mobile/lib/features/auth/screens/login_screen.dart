import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/config/env.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../shell/widgets/settings_menu.dart';
import '../state/auth_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _submitting = true;
    });
    try {
      await context.read<AuthState>().signIn(
        email: _email.text.trim(),
        password: _password.text,
      );
      // No navigation here: the router's redirect reacts to the session
      // change and moves to the dashboard on its own.
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.isNetworkError && Env.isLocalDefault
            ? '${e.message}\n\nCurrently pointing at ${Env.apiBaseUrl}. On a physical '
                  'device pass --dart-define=API_BASE_URL=http://<your-ip>:5000/api'
            : e.message;
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.actionLogin),
        actions: const [SettingsMenu()],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    l10n.appTitle,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 24),
                  AppTextField(
                    label: l10n.fieldEmail,
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    enabled: !_submitting,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: l10n.fieldPassword,
                    controller: _password,
                    obscure: true,
                    textInputAction: TextInputAction.done,
                    enabled: !_submitting,
                    onSubmitted: (_) => _submitting ? null : _submit(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  PrimaryButton(
                    label: _submitting
                        ? l10n.loginSubmitting
                        : l10n.actionLogin,
                    isLoading: _submitting,
                    onPressed: _submit,
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _submitting
                        ? null
                        : () => context.push(Routes.register),
                    child: Text(l10n.loginNoAccount),
                  ),
                  TextButton(
                    onPressed: _submitting
                        ? null
                        : () => context.push(Routes.forgotPassword),
                    child: Text(l10n.loginForgotPassword),
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
