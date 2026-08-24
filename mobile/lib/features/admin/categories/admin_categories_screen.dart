import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

/// Service category CRUD.
///
/// Categories are the one piece of shared catalog an admin owns, so this
/// writes through the same `categories` cache key the provider's service
/// form and customer discovery read — one edit updates all three.
class AdminCategoriesScreen extends StatelessWidget {
  const AdminCategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aCategoriesTitle)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showCategorySheet(context),
        icon: const Icon(Icons.add),
        label: Text(l10n.aCategoriesNew),
      ),
      body: RefreshIndicator(
        onRefresh: repo.refreshCategories,
        child: AsyncView<List<ServiceCategory>>(
          value: repo.watchCategories(),
          errorTitle: l10n.aCategoriesTitle,
          onRetry: repo.refreshCategories,
          builder: (context, categories) {
            if (categories.isEmpty) {
              return LayoutBuilder(
                builder: (context, constraints) => SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: SizedBox(
                    height: constraints.maxHeight,
                    child: EmptyView(title: l10n.aCategoriesNone),
                  ),
                ),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: categories.length,
              itemBuilder: (context, i) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _CategoryCard(category: categories[i]),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({required this.category});

  final ServiceCategory category;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        onTap: () => showCategorySheet(context, existing: category),
        title: Row(
          children: [
            Expanded(child: Text(category.name)),
            StatusChip(
              label: category.isActive
                  ? l10n.aCategoriesActive
                  : l10n.aCategoriesInactive,
              tone: category.isActive ? StatusTone.success : StatusTone.neutral,
            ),
          ],
        ),
        subtitle:
            category.description != null &&
                category.description!.trim().isNotEmpty
            ? Text(
                category.description!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              )
            : null,
        trailing: IconButton(
          icon: Icon(Icons.delete_outline, color: theme.colorScheme.error),
          tooltip: l10n.actionDelete,
          onPressed: () => _confirmDelete(context, category),
        ),
      ),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    ServiceCategory category,
  ) async {
    final l10n = AppLocalizations.of(context)!;
    final messenger = ScaffoldMessenger.of(context);
    final repo = context.read<AdminRepository>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.aCategoriesDeleteTitle),
        content: Text(l10n.aCategoriesDeleteBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(l10n.actionCancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(l10n.actionDelete),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await repo.deleteCategory(category.id);
      messenger.showSnackBar(SnackBar(content: Text(l10n.pActionDone)));
    } on ApiException catch (e) {
      // The backend refuses to delete a category still used by services and
      // explains why — that message is more useful than a generic failure.
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }
}

/// Create or edit, in a bottom sheet.
Future<void> showCategorySheet(
  BuildContext context, {
  ServiceCategory? existing,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (_) => _CategoryForm(existing: existing),
);

class _CategoryForm extends StatefulWidget {
  const _CategoryForm({this.existing});

  final ServiceCategory? existing;

  @override
  State<_CategoryForm> createState() => _CategoryFormState();
}

class _CategoryFormState extends State<_CategoryForm> {
  late final _name = TextEditingController(text: widget.existing?.name ?? '');
  late final _description = TextEditingController(
    text: widget.existing?.description ?? '',
  );
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final repo = context.read<AdminRepository>();

    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() => _error = l10n.aCategoriesNameRequired);
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      if (widget.existing == null) {
        await repo.createCategory(name: name, description: _description.text);
      } else {
        await repo.updateCategory(
          widget.existing!.id,
          name: name,
          description: _description.text,
        );
      }
      messenger.showSnackBar(SnackBar(content: Text(l10n.pActionDone)));
      navigator.pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.fromLTRB(
        16,
        0,
        16,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.existing == null
                  ? l10n.aCategoriesNew
                  : l10n.aCategoriesEdit,
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            AppTextField(
              controller: _name,
              label: l10n.fieldName,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            AppTextField(
              controller: _description,
              label: l10n.fieldDescription,
              maxLines: 3,
            ),
            const SizedBox(height: 12),
            // Shown, not offered: no route writes isActive, so a switch
            // here would look like it worked and change nothing.
            if (widget.existing != null)
              Row(
                children: [
                  Text(
                    '${l10n.aCategoriesActive}: ',
                    style: theme.textTheme.bodyMedium,
                  ),
                  StatusChip(
                    label: widget.existing!.isActive
                        ? l10n.aCategoriesActive
                        : l10n.aCategoriesInactive,
                    tone: widget.existing!.isActive
                        ? StatusTone.success
                        : StatusTone.neutral,
                  ),
                ],
              ),
            const SizedBox(height: 8),
            AdminGapNote(
              icon: Icons.info_outline,
              text: l10n.aCategoriesNoToggle,
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _saving ? null : _save,
                child: Text(l10n.actionSave),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
