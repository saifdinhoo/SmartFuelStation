import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_view.dart';
import '../../auth/state/auth_state.dart';
import '../data/admin_api.dart';

/// Category list, with create/edit/delete for admins. Same functionality as
/// the pre-Phase-0 screen, now using the shared state widgets and the
/// interceptor-backed API.
class AdminCategoriesScreen extends StatefulWidget {
  const AdminCategoriesScreen({super.key});

  @override
  State<AdminCategoriesScreen> createState() => _AdminCategoriesScreenState();
}

class _AdminCategoriesScreenState extends State<AdminCategoriesScreen> {
  List<dynamic> _categories = const [];
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
      final result = await context.read<AdminApi>().listCategories();
      if (!mounted) return;
      setState(() {
        _categories = result;
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

  Future<void> _openForm({Map<String, dynamic>? existing}) async {
    final l10n = AppLocalizations.of(context)!;
    final name = TextEditingController(
      text: existing?['name'] as String? ?? '',
    );
    final description = TextEditingController(
      text: existing?['description'] as String? ?? '',
    );

    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(
          existing == null ? l10n.categoriesAdd : l10n.categoriesEdit,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppTextField(label: l10n.fieldName, controller: name),
            const SizedBox(height: 12),
            AppTextField(label: l10n.fieldDescription, controller: description),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(l10n.actionCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(l10n.actionSave),
          ),
        ],
      ),
    );

    if (saved != true || !mounted) return;

    final body = {
      'name': name.text.trim(),
      'description': description.text.trim(),
    };
    final api = context.read<AdminApi>();
    try {
      if (existing == null) {
        await api.createCategory(body);
      } else {
        await api.updateCategory(existing['id'] as int, body);
      }
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    }
  }

  Future<void> _delete(int id) async {
    try {
      await context.read<AdminApi>().deleteCategory(id);
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      // The backend refuses to delete a category still used by provider
      // services and explains why — show that message rather than a generic
      // failure.
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isAdmin = context.watch<AuthState>().role == UserRole.admin;

    if (_loading) return const LoadingView();
    if (_error != null && _categories.isEmpty) {
      return ErrorView(message: _error, onRetry: _load);
    }

    return Scaffold(
      body: Column(
        children: [
          if (_error != null)
            Container(
              width: double.infinity,
              color: Theme.of(context).colorScheme.error.withValues(alpha: 0.1),
              padding: const EdgeInsets.all(12),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          Expanded(
            child: _categories.isEmpty
                ? EmptyView(
                    icon: Icons.category_outlined,
                    title: l10n.categoriesEmpty,
                  )
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.builder(
                      itemCount: _categories.length,
                      itemBuilder: (context, index) {
                        final category =
                            _categories[index] as Map<String, dynamic>;
                        final description = category['description'] as String?;
                        return ListTile(
                          title: Text(category['name'] as String),
                          subtitle: description == null || description.isEmpty
                              ? null
                              : Text(description),
                          trailing: isAdmin
                              ? Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      tooltip: l10n.actionEdit,
                                      icon: const Icon(Icons.edit_outlined),
                                      onPressed: () =>
                                          _openForm(existing: category),
                                    ),
                                    IconButton(
                                      tooltip: l10n.actionDelete,
                                      icon: const Icon(Icons.delete_outline),
                                      onPressed: () =>
                                          _delete(category['id'] as int),
                                    ),
                                  ],
                                )
                              : null,
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
      floatingActionButton: isAdmin
          ? FloatingActionButton(
              onPressed: () => _openForm(),
              tooltip: l10n.categoriesAdd,
              child: const Icon(Icons.add),
            )
          : null,
    );
  }
}
