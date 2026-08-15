import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_view.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/admin_api.dart';

/// Provider list with approve action. Admin-only — reachable only via the
/// admin tab, and additionally enforced by the router's role guard.
class AdminProvidersScreen extends StatefulWidget {
  const AdminProvidersScreen({super.key});

  @override
  State<AdminProvidersScreen> createState() => _AdminProvidersScreenState();
}

class _AdminProvidersScreenState extends State<AdminProvidersScreen> {
  List<dynamic> _providers = const [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await context.read<AdminApi>().listProviders();
      if (!mounted) return;
      setState(() {
        _providers = result;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _approve(int id) async {
    try {
      await context.read<AdminApi>().approveProvider(id);
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    if (_loading) return const LoadingView();
    if (_error != null && _providers.isEmpty) {
      return ErrorView(message: _error, onRetry: _load);
    }
    if (_providers.isEmpty) {
      return EmptyView(icon: Icons.store_outlined, title: l10n.providersEmpty);
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        itemCount: _providers.length,
        itemBuilder: (context, index) {
          final provider = _providers[index] as Map<String, dynamic>;
          final isApproved = provider['isApproved'] == true;
          final user = provider['user'] as Map<String, dynamic>?;

          return ListTile(
            title: Text(provider['businessName'] as String),
            subtitle: Text('${provider['address']} — ${user?['email'] ?? ''}'),
            isThreeLine: false,
            trailing: isApproved
                ? StatusChip(
                    label: l10n.statusApproved,
                    tone: StatusTone.success,
                  )
                : TextButton(
                    onPressed: () => _approve(provider['id'] as int),
                    child: Text(l10n.actionApprove),
                  ),
          );
        },
      ),
    );
  }
}
