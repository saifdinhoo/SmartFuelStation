import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/admin_repository.dart';

/// Set one provider's commission rate. The only screen in the app with a
/// write control for commission — mirrors [showAdminFuelUpdateSheet]'s
/// exact modal-sheet shape. A provider never sees this sheet: there is no
/// route to it outside the admin area, and the backend enforces the same
/// boundary independently (PUT /admin/providers/:id/commission is
/// ADMIN-only).
///
/// Unlike the fuel sheet, which is handed its current row by the caller,
/// this sheet fetches the current rate itself via [AdminRepository.
/// watchCommission] — callers (the provider details screen, the finance
/// dashboard's provider filter) rarely have it cached already, and fetching
/// once here keeps every entry point consistent rather than duplicating the
/// read at each call site.
Future<void> showAdminCommissionSheet(
  BuildContext context, {
  required int providerId,
  String? providerName,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _AdminCommissionSheet(
      providerId: providerId,
      providerName: providerName,
    ),
  );
}

class _AdminCommissionSheet extends StatefulWidget {
  const _AdminCommissionSheet({required this.providerId, this.providerName});

  final int providerId;
  final String? providerName;

  @override
  State<_AdminCommissionSheet> createState() => _AdminCommissionSheetState();
}

class _AdminCommissionSheetState extends State<_AdminCommissionSheet> {
  final _rate = TextEditingController();
  bool _prefilled = false;
  String? _rateError;
  String? _submitError;
  bool _submitting = false;

  @override
  void dispose() {
    _rate.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    final rate = double.tryParse(_rate.text.trim());

    setState(() {
      _rateError = (rate == null || rate < 0 || rate > 100)
          ? l10n.aFinanceCommissionInvalid
          : null;
      _submitError = null;
    });
    if (_rateError != null) return;

    setState(() => _submitting = true);
    final repo = context.read<AdminRepository>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      await repo.setCommission(widget.providerId, rate!);
      if (!mounted) return;
      navigator.pop();
      messenger.showSnackBar(SnackBar(content: Text(l10n.aFinanceCommissionSaved)));
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
    final repo = context.read<AdminRepository>();
    context.watchQueries();

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
              widget.providerName == null
                  ? l10n.aFinanceCommissionTitle
                  : '${l10n.aFinanceCommissionTitle} — ${widget.providerName}',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 20),
            AsyncView<ProviderCommission>(
              value: repo.watchCommission(widget.providerId),
              builder: (context, commission) {
                if (!_prefilled) {
                  _prefilled = true;
                  _rate.text = commission.commissionRate.toStringAsFixed(1);
                }
                return TextField(
                  controller: _rate,
                  enabled: !_submitting,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: l10n.financeCommissionRateField,
                    suffixText: '%',
                    errorText: _rateError,
                  ),
                );
              },
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
