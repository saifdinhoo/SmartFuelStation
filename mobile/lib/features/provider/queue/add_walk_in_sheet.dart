import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/provider_repository.dart';

/// Adds a customer who walked in without a booking.
///
/// The backend creates the entry with `customerId: null`, so a walk-in has
/// no account attached — the name is free text, exactly as on the web.
Future<void> showAddWalkInSheet(
  BuildContext context,
  List<ProviderService> services,
) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _AddWalkInSheet(services: services),
  );
}

class _AddWalkInSheet extends StatefulWidget {
  const _AddWalkInSheet({required this.services});

  final List<ProviderService> services;

  @override
  State<_AddWalkInSheet> createState() => _AddWalkInSheetState();
}

class _AddWalkInSheetState extends State<_AddWalkInSheet> {
  final _name = TextEditingController();
  int? _serviceId;
  String? _nameError;
  String? _serviceError;
  String? _submitError;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final bookable = widget.services.where((s) => s.isAvailable).toList();
    if (bookable.length == 1) _serviceId = bookable.first.id;
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;

    setState(() {
      _nameError = _name.text.trim().isEmpty ? l10n.pWalkInNameRequired : null;
      _serviceError = _serviceId == null ? l10n.pWalkInServiceRequired : null;
      _submitError = null;
    });
    if (_nameError != null || _serviceError != null) return;

    setState(() => _submitting = true);
    try {
      await context.read<ProviderRepository>().addWalkIn(
        providerServiceId: _serviceId!,
        customerName: _name.text.trim(),
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.pWalkInAdded)));
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
    final status = theme.extension<AppStatusColors>()!;
    final bookable = widget.services.where((s) => s.isAvailable).toList();

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
            Text(l10n.pWalkInTitle, style: theme.textTheme.titleLarge),
            const SizedBox(height: 20),

            if (bookable.isEmpty)
              Text(
                l10n.providerNoServices,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: status.mutedForeground,
                ),
              )
            else ...[
              TextField(
                controller: _name,
                enabled: !_submitting,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  labelText: l10n.pWalkInName,
                  errorText: _nameError,
                ),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<int>(
                initialValue: _serviceId,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: l10n.pWalkInService,
                  errorText: _serviceError,
                ),
                items: [
                  for (final service in bookable)
                    DropdownMenuItem(
                      value: service.id,
                      child: Text(
                        '${service.name} — ${l10n.serviceDuration(service.durationMinutes)}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: _submitting
                    ? null
                    : (value) => setState(() {
                        _serviceId = value;
                        _serviceError = null;
                      }),
              ),
              if (_submitError != null) ...[
                const SizedBox(height: 12),
                Text(
                  _submitError!,
                  style: TextStyle(color: theme.colorScheme.error),
                ),
              ],
              const SizedBox(height: 20),
              PrimaryButton(
                label: l10n.pWalkInAdd,
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
