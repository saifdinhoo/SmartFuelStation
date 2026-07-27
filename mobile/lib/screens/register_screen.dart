import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api/auth_api.dart' as auth_api;
import '../api/api_client.dart';
import '../state/auth_state.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _businessNameController = TextEditingController();
  final _addressController = TextEditingController();
  String _role = 'CUSTOMER';
  String? _error;
  bool _submitting = false;

  Future<void> _handleSubmit() async {
    setState(() {
      _error = null;
      _submitting = true;
    });
    try {
      final res = await auth_api.register({
        'name': _nameController.text,
        'email': _emailController.text,
        'password': _passwordController.text,
        'role': _role,
        if (_role == 'PROVIDER') 'businessName': _businessNameController.text,
        if (_role == 'PROVIDER') 'address': _addressController.text,
      });
      if (!mounted) return;
      await context.read<AuthState>().loginWithResult(res['data']);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isProvider = _role == 'PROVIDER';

    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Name')),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _role,
              decoration: const InputDecoration(labelText: 'Account type'),
              items: const [
                DropdownMenuItem(value: 'CUSTOMER', child: Text('Customer')),
                DropdownMenuItem(value: 'PROVIDER', child: Text('Service Provider')),
              ],
              onChanged: (value) => setState(() => _role = value!),
            ),
            if (isProvider) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _businessNameController,
                decoration: const InputDecoration(labelText: 'Business name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _addressController,
                decoration: const InputDecoration(labelText: 'Address'),
              ),
              const SizedBox(height: 8),
              const Text(
                "Your provider account will need admin approval before it's active.",
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
            const SizedBox(height: 16),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            ElevatedButton(
              onPressed: _submitting ? null : _handleSubmit,
              child: Text(_submitting ? 'Registering...' : 'Register'),
            ),
          ],
        ),
      ),
    );
  }
}
