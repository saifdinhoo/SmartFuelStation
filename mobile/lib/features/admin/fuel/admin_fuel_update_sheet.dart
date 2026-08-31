import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/fuel_labels.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/admin_repository.dart';

/// Create or update one fuel type's inventory for [providerId]. The only
/// place in the app with a write control for fuel — every other screen
/// (customer, provider) is read-only.
Future<void> showAdminFuelUpdateSheet(
  BuildContext context, {
  required int providerId,
  required FuelTypeModel fuelType,
  AdminFuelInventoryItem? existing,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _AdminFuelUpdateSheet(
      providerId: providerId,
      fuelType: fuelType,
      existing: existing,
    ),
  );
}

class _AdminFuelUpdateSheet extends StatefulWidget {
  const _AdminFuelUpdateSheet({
    required this.providerId,
    required this.fuelType,
    this.existing,
  });

  final int providerId;
  final FuelTypeModel fuelType;
  final AdminFuelInventoryItem? existing;

  @override
  State<_AdminFuelUpdateSheet> createState() => _AdminFuelUpdateSheetState();
}

class _AdminFuelUpdateSheetState extends State<_AdminFuelUpdateSheet> {
  late final TextEditingController _capacity;
  late final TextEditingController _current;
  late final TextEditingController _price;

  String? _capacityError;
  String? _currentError;
  String? _priceError;
  String? _submitError;
  bool _submitting = false;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _capacity = TextEditingController(
      text: existing == null ? '' : existing.capacityLiters.toStringAsFixed(0),
    );
    _current = TextEditingController(
      text: existing == null ? '' : existing.currentLiters.toStringAsFixed(0),
    );
    _price = TextEditingController(
      text: existing?.pricePerLiter == null ? '' : existing!.pricePerLiter!.toStringAsFixed(2),
    );
  }

  @override
  void dispose() {
    _capacity.dispose();
    _current.dispose();
    _price.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    final capacity = double.tryParse(_capacity.text.trim());
    final current = double.tryParse(_current.text.trim());
    final priceText = _price.text.trim();
    final price = priceText.isEmpty ? null : double.tryParse(priceText);

    setState(() {
      _capacityError = (capacity == null || capacity <= 0) ? l10n.aFuelCapacityInvalid : null;
      _currentError = current == null || current < 0
          ? l10n.aFuelRemainingInvalid
          : (capacity != null && current > capacity)
              ? l10n.aFuelRemainingExceedsCapacity
              : null;
      _priceError = (priceText.isNotEmpty && (price == null || price < 0))
          ? l10n.aFuelPriceInvalid
          : null;
      _submitError = null;
    });
    if (_capacityError != null || _currentError != null || _priceError != null) return;

    setState(() => _submitting = true);
    final repo = context.read<AdminRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      await repo.updateFuel(
        widget.providerId,
        widget.fuelType,
        capacityLiters: capacity!,
        currentLiters: current!,
        pricePerLiter: price,
      );
      if (!mounted) return;
      navigator.pop();
      messenger.showSnackBar(SnackBar(content: Text(l10n.aFuelSaved)));
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _submitError = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

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
              '${_isEditing ? l10n.aFuelUpdate : l10n.aFuelSetUp} — '
              '${fuelTypeLabel(l10n, widget.fuelType)}',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _capacity,
              enabled: !_submitting,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: l10n.aFuelCapacityField,
                suffixText: 'L',
                errorText: _capacityError,
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _current,
              enabled: !_submitting,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: l10n.aFuelRemainingField,
                suffixText: 'L',
                errorText: _currentError,
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _price,
              enabled: !_submitting,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: l10n.aFuelPriceField,
                prefixText: '\$',
                errorText: _priceError,
              ),
            ),
            if (_submitError != null) ...[
              const SizedBox(height: 8),
              Text(_submitError!, style: TextStyle(color: theme.colorScheme.error)),
            ],
            const SizedBox(height: 16),
            PrimaryButton(label: l10n.actionSave, isLoading: _submitting, onPressed: _submit),
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
