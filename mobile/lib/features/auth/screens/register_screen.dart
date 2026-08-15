import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../shell/widgets/settings_menu.dart';
import '../state/auth_state.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _businessName = TextEditingController();
  final _address = TextEditingController();

  UserRole _role = UserRole.customer;
  String? _error;
  bool _submitting = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _businessName.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _submitting = true;
    });
    try {
      final isProvider = _role == UserRole.provider;
      await context.read<AuthState>().register({
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'password': _password.text,
        'role': _role.apiValue,
        if (isProvider) 'businessName': _businessName.text.trim(),
        if (isProvider) 'address': _address.text.trim(),
      });
      // The router redirect handles navigation once the session exists.
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
    final isProvider = _role == UserRole.provider;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.actionRegister),
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
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    enabled: !_submitting,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: l10n.fieldPassword,
                    controller: _password,
                    obscure: true,
                    enabled: !_submitting,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<UserRole>(
                    initialValue: _role,
                    decoration: InputDecoration(
                      labelText: l10n.fieldAccountType,
                    ),
                    items: [
                      DropdownMenuItem(
                        value: UserRole.customer,
                        child: Text(l10n.roleCustomer),
                      ),
                      DropdownMenuItem(
                        value: UserRole.provider,
                        child: Text(l10n.roleProvider),
                      ),
                    ],
                    onChanged: _submitting
                        ? null
                        : (value) => setState(
                            () => _role = value ?? UserRole.customer,
                          ),
                  ),
                  if (isProvider) ...[
                    const SizedBox(height: 12),
                    AppTextField(
                      label: l10n.fieldBusinessName,
                      controller: _businessName,
                      textInputAction: TextInputAction.next,
                      enabled: !_submitting,
                    ),
                    const SizedBox(height: 12),
                    AppTextField(
                      label: l10n.fieldAddress,
                      controller: _address,
                      enabled: !_submitting,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.registerProviderNotice,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
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
                        ? l10n.registerSubmitting
                        : l10n.actionRegister,
                    isLoading: _submitting,
                    onPressed: _submit,
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
