import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/provider_repository.dart';

/// Create or edit one service. Categories come from the real /categories
/// table — the backend 404s on an unknown id, so the picker only ever
/// offers ids that exist.
Future<void> showServiceFormSheet(
  BuildContext context, {
  required List<ServiceCategory> categories,
  ProviderService? existing,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) =>
        _ServiceFormSheet(categories: categories, existing: existing),
  );
}

class _ServiceFormSheet extends StatefulWidget {
  const _ServiceFormSheet({required this.categories, this.existing});

  final List<ServiceCategory> categories;
  final ProviderService? existing;

  @override
  State<_ServiceFormSheet> createState() => _ServiceFormSheetState();
}

class _ServiceFormSheetState extends State<_ServiceFormSheet> {
  late final TextEditingController _name;
  late final TextEditingController _price;
  late final TextEditingController _duration;
  late int? _categoryId;
  late bool _available;

  String? _nameError;
  String? _priceError;
  String? _durationError;
  String? _submitError;
  bool _submitting = false;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _name = TextEditingController(text: existing?.name ?? '');
    _price = TextEditingController(
      text: existing == null ? '' : existing.price.toStringAsFixed(2),
    );
    _duration = TextEditingController(
      text: existing == null ? '30' : '${existing.durationMinutes}',
    );
    _categoryId = existing?.categoryId ?? widget.categories.firstOrNull?.id;
    _available = existing?.isAvailable ?? true;
  }

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _duration.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    final price = double.tryParse(_price.text.trim());
    final duration = int.tryParse(_duration.text.trim());

    setState(() {
      _nameError = _name.text.trim().isEmpty ? l10n.pServiceNameRequired : null;
      _priceError = (price == null || price <= 0)
          ? l10n.pServicePriceInvalid
          : null;
      _durationError = (duration == null || duration <= 0)
          ? l10n.pServiceDurationInvalid
          : null;
      _submitError = null;
    });
    if (_nameError != null ||
        _priceError != null ||
        _durationError != null ||
        _categoryId == null) {
      return;
    }

    setState(() => _submitting = true);
    final repo = context.read<ProviderRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      if (_isEditing) {
        await repo.updateService(widget.existing!.id, {
          'name': _name.text.trim(),
          'categoryId': _categoryId,
          'price': price,
          'durationMinutes': duration,
          'isAvailable': _available,
        });
      } else {
        await repo.createService(
          name: _name.text.trim(),
          categoryId: _categoryId!,
          price: price!,
          durationMinutes: duration!,
          isAvailable: _available,
        );
      }
      if (!mounted) return;
      navigator.pop();
      messenger.showSnackBar(SnackBar(content: Text(l10n.pServiceSaved)));
    } on ApiException catch (e) {
      if (!mounted) return;
      // 409 on a duplicate name within this business, 404 on an unknown
      // category — both worth showing as written.
      setState(() => _submitError = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _isEditing ? l10n.pServicesEdit : l10n.pServicesAdd,
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 20),

            if (widget.categories.isEmpty)
              Text(
                l10n.pServiceNoCategories,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: status.mutedForeground,
                ),
              )
            else ...[
              TextField(
                controller: _name,
                enabled: !_submitting,
                decoration: InputDecoration(
                  labelText: l10n.pServiceName,
                  errorText: _nameError,
                ),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<int>(
                initialValue: _categoryId,
                isExpanded: true,
                decoration: InputDecoration(labelText: l10n.pServiceCategory),
                items: [
                  for (final category in widget.categories)
                    DropdownMenuItem(
                      value: category.id,
                      child: Text(category.name),
                    ),
                ],
                onChanged: _submitting
                    ? null
                    : (value) => setState(() => _categoryId = value),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _price,
                      enabled: !_submitting,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: l10n.pServicePrice,
                        prefixText: '\$',
                        errorText: _priceError,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _duration,
                      enabled: !_submitting,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: l10n.pServiceDuration,
                        errorText: _durationError,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(l10n.pServiceAvailable),
                value: _available,
                onChanged: _submitting
                    ? null
                    : (value) => setState(() => _available = value),
              ),

              if (_submitError != null) ...[
                const SizedBox(height: 8),
                Text(
                  _submitError!,
                  style: TextStyle(color: theme.colorScheme.error),
                ),
              ],

              const SizedBox(height: 16),
              PrimaryButton(
                label: l10n.actionSave,
                isLoading: _submitting,
                onPressed: _submit,
              ),
            ],
            const SizedBox(height: 8),
            TextButton(
              onPressed: _submitting ? null : () => Navigator.of(context).pop(),
              child: Text(l10n.actionCancel),
            ),
          ],
        ),
      ),
    );
  }
}
