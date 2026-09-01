import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/fuel_labels.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/customer_repository.dart';

/// The customer's own vehicles — GET/POST/PATCH/DELETE /vehicles. Kept for
/// their reference when booking; not a government/VIN-verified record, so
/// there is deliberately no VIN decoding or registry lookup here.
class MyVehiclesScreen extends StatelessWidget {
  const MyVehiclesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<CustomerRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.myVehiclesTitle)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showVehicleFormSheet(context, repo),
        icon: const Icon(Icons.add),
        label: Text(l10n.vehicleAdd),
      ),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshMyVehicles(),
        child: AsyncView<List<Vehicle>>(
          value: repo.watchMyVehicles(),
          errorTitle: l10n.myVehiclesTitle,
          onRetry: () => repo.refreshMyVehicles(),
          builder: (context, vehicles) {
            if (vehicles.isEmpty) {
              return ListView(
                children: [
                  SizedBox(
                    height: MediaQuery.sizeOf(context).height * 0.6,
                    child: EmptyView(
                      icon: Icons.directions_car_outlined,
                      title: l10n.myVehiclesEmpty,
                    ),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: vehicles.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) =>
                  _VehicleCard(vehicle: vehicles[index], repo: repo),
            );
          },
        ),
      ),
    );
  }
}

class _VehicleCard extends StatelessWidget {
  const _VehicleCard({required this.vehicle, required this.repo});

  final Vehicle vehicle;
  final CustomerRepository repo;

  Future<void> _confirmDelete(BuildContext context) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.vehicleDeleteConfirmTitle),
        content: Text(l10n.vehicleDeleteConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.actionCancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(
              l10n.vehicleDelete,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      await repo.deleteVehicle(vehicle.id);
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.vehicleDeleted)));
    } on ApiException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final details = [
      vehicle.color,
      vehicle.plate,
    ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${vehicle.year} ${vehicle.make} ${vehicle.model}',
                    style: theme.textTheme.titleSmall,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    details.isEmpty ? '—' : details,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: status.mutedForeground,
                    ),
                  ),
                  if (vehicle.fuelType != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      fuelTypeLabel(l10n, vehicle.fuelType!),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: status.mutedForeground,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              onPressed: () => _showVehicleFormSheet(context, repo, existing: vehicle),
              tooltip: l10n.vehicleEdit,
              icon: Icon(Icons.edit_outlined, color: status.mutedForeground),
            ),
            IconButton(
              onPressed: () => _confirmDelete(context),
              tooltip: l10n.vehicleDelete,
              icon: Icon(Icons.delete_outline, color: status.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _showVehicleFormSheet(
  BuildContext context,
  CustomerRepository repo, {
  Vehicle? existing,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _VehicleFormSheet(repo: repo, existing: existing),
  );
}

class _VehicleFormSheet extends StatefulWidget {
  const _VehicleFormSheet({required this.repo, this.existing});

  final CustomerRepository repo;
  final Vehicle? existing;

  @override
  State<_VehicleFormSheet> createState() => _VehicleFormSheetState();
}

class _VehicleFormSheetState extends State<_VehicleFormSheet> {
  late final _make = TextEditingController(text: widget.existing?.make ?? '');
  late final _model = TextEditingController(text: widget.existing?.model ?? '');
  late final _year = TextEditingController(
    text: (widget.existing?.year ?? DateTime.now().year).toString(),
  );
  late final _plate = TextEditingController(text: widget.existing?.plate ?? '');
  late final _color = TextEditingController(text: widget.existing?.color ?? '');
  FuelTypeModel? _fuelType;
  String? _error;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _fuelType = widget.existing?.fuelType;
  }

  @override
  void dispose() {
    _make.dispose();
    _model.dispose();
    _year.dispose();
    _plate.dispose();
    _color.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    final maxYear = DateTime.now().year + 1;
    final year = int.tryParse(_year.text.trim());

    if (_make.text.trim().isEmpty) {
      setState(() => _error = l10n.vehicleErrorMake);
      return;
    }
    if (_model.text.trim().isEmpty) {
      setState(() => _error = l10n.vehicleErrorModel);
      return;
    }
    if (year == null || year < 1900 || year > maxYear) {
      setState(() => _error = l10n.vehicleErrorYear);
      return;
    }

    setState(() {
      _error = null;
      _submitting = true;
    });

    try {
      if (widget.existing != null) {
        await widget.repo.updateVehicle(
          widget.existing!.id,
          make: _make.text.trim(),
          model: _model.text.trim(),
          year: year,
          plate: _plate.text.trim().isEmpty ? null : _plate.text.trim(),
          color: _color.text.trim().isEmpty ? null : _color.text.trim(),
          fuelType: _fuelType,
        );
      } else {
        await widget.repo.createVehicle(
          make: _make.text.trim(),
          model: _model.text.trim(),
          year: year,
          plate: _plate.text.trim().isEmpty ? null : _plate.text.trim(),
          color: _color.text.trim().isEmpty ? null : _color.text.trim(),
          fuelType: _fuelType,
        );
      }
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.existing != null ? l10n.vehicleUpdated : l10n.vehicleAdded),
        ),
      );
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
    final isEditing = widget.existing != null;

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
              isEditing ? l10n.vehicleEdit : l10n.vehicleAdd,
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 16),

            AppTextField(label: l10n.vehicleMake, controller: _make, enabled: !_submitting),
            const SizedBox(height: 12),
            AppTextField(label: l10n.vehicleModel, controller: _model, enabled: !_submitting),
            const SizedBox(height: 12),
            AppTextField(
              label: l10n.vehicleYear,
              controller: _year,
              enabled: !_submitting,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            AppTextField(label: l10n.vehiclePlate, controller: _plate, enabled: !_submitting),
            const SizedBox(height: 12),
            AppTextField(label: l10n.vehicleColor, controller: _color, enabled: !_submitting),
            const SizedBox(height: 12),
            DropdownButtonFormField<FuelTypeModel?>(
              initialValue: _fuelType,
              decoration: InputDecoration(labelText: l10n.vehicleFuelType),
              items: [
                DropdownMenuItem(value: null, child: Text(l10n.vehicleFuelTypeNotSet)),
                ...FuelTypeModel.values.map(
                  (type) => DropdownMenuItem(value: type, child: Text(fuelTypeLabel(l10n, type))),
                ),
              ],
              onChanged: _submitting ? null : (value) => setState(() => _fuelType = value),
            ),

            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
            ],

            const SizedBox(height: 8),
            PrimaryButton(
              label: isEditing ? l10n.vehicleSaveChanges : l10n.vehicleAdd,
              isLoading: _submitting,
              onPressed: _submit,
            ),
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
