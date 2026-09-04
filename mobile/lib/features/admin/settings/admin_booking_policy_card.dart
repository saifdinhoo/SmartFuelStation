import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/admin_repository.dart';

/// Real, enforced platform-wide configuration (see bookingPolicy.service.js
/// on the backend) — not merely displayed. The values here are what
/// availability.service.js and booking.service.js independently check
/// before accepting a booking.
class AdminBookingPolicyCard extends StatefulWidget {
  const AdminBookingPolicyCard({super.key});

  @override
  State<AdminBookingPolicyCard> createState() =>
      _AdminBookingPolicyCardState();
}

class _AdminBookingPolicyCardState extends State<AdminBookingPolicyCard> {
  final _minAdvance = TextEditingController();
  final _maxDays = TextEditingController();
  bool _allowSameDay = true;
  bool _prefilled = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _minAdvance.dispose();
    _maxDays.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    final minAdvance = int.tryParse(_minAdvance.text.trim());
    final maxDays = int.tryParse(_maxDays.text.trim());
    if (minAdvance == null || minAdvance < 0 || maxDays == null || maxDays < 1) {
      setState(() => _error = l10n.aMoreBookingPolicyInvalid);
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    final repo = context.read<AdminRepository>();
    final messenger = ScaffoldMessenger.of(context);

    try {
      await repo.updateBookingPolicy(
        minAdvanceMinutes: minAdvance,
        maxAdvanceDays: maxDays,
        allowSameDayBooking: _allowSameDay,
      );
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(l10n.aMoreBookingPolicySaved)));
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
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.tune_outlined,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l10n.aMoreBookingPolicyTitle,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              l10n.aMoreBookingPolicyDescription,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 14),
            AsyncView<BookingPolicy>(
              value: repo.watchBookingPolicy(),
              builder: (context, policy) {
                if (!_prefilled) {
                  _prefilled = true;
                  _minAdvance.text = '${policy.minAdvanceMinutes}';
                  _maxDays.text = '${policy.maxAdvanceDays}';
                  _allowSameDay = policy.allowSameDayBooking;
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _minAdvance,
                      enabled: !_submitting,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: l10n.fieldMinAdvanceMinutes,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _maxDays,
                      enabled: !_submitting,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: l10n.fieldMaxAdvanceDays,
                      ),
                    ),
                    const SizedBox(height: 4),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(l10n.fieldAllowSameDayBooking),
                      value: _allowSameDay,
                      onChanged: _submitting
                          ? null
                          : (value) => setState(() => _allowSameDay = value),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        _error!,
                        style: TextStyle(color: theme.colorScheme.error),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: PrimaryButton(
                        label: l10n.actionSave,
                        isLoading: _submitting,
                        onPressed: _submit,
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
