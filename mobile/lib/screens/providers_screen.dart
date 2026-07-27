import 'package:flutter/material.dart';
import 'package:provider/provider.dart' as app_provider;
import '../api/providers_api.dart' as providers_api;
import '../api/api_client.dart';
import '../state/auth_state.dart';

// Admin-only screen — only reachable via the admin bottom-nav tab.
class ProvidersScreen extends StatefulWidget {
  const ProvidersScreen({super.key});

  @override
  State<ProvidersScreen> createState() => _ProvidersScreenState();
}

class _ProvidersScreenState extends State<ProvidersScreen> {
  List<dynamic> _providers = [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = app_provider.Provider.of<AuthState>(context, listen: false).token!;
    try {
      final res = await providers_api.listProviders(token);
      setState(() {
        _providers = res['data'];
        _loading = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _approve(int id) async {
    final token = app_provider.Provider.of<AuthState>(context, listen: false).token!;
    try {
      await providers_api.approveProvider(token, id);
      _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    return Column(
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.all(8),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        Expanded(
          child: _providers.isEmpty
              ? const Center(child: Text('No providers yet.'))
              : ListView.builder(
                  itemCount: _providers.length,
                  itemBuilder: (context, index) {
                    final provider = _providers[index];
                    final isApproved = provider['isApproved'] == true;
                    return ListTile(
                      title: Text(provider['businessName']),
                      subtitle: Text('${provider['address']} — ${provider['user']['email']}'),
                      trailing: isApproved
                          ? const Text('Approved')
                          : TextButton(
                              onPressed: () => _approve(provider['id']),
                              child: const Text('Approve'),
                            ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
