import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/customer_repository.dart';
import '../widgets/booking_status_ui.dart';

/// Opens the booking form for [provider]. On success the sheet closes and
/// the new booking's details screen is pushed.
Future<void> showCreateBookingSheet(
  BuildContext context,
  ServiceProvider provider,
) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _CreateBookingSheet(provider: provider),
  );
}

class _CreateBookingSheet extends StatefulWidget {
  const _CreateBookingSheet({required this.provider});

  final ServiceProvider provider;

  @override
  State<_CreateBookingSheet> createState() => _CreateBookingSheetState();
}

class _CreateBookingSheetState extends State<_CreateBookingSheet> {
  final _notes = TextEditingController();
  int? _serviceId;
  DateTime? _scheduledAt;
  String? _serviceError;
  String? _timeError;
  String? _submitError;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final services = widget.provider.bookableServices;
    if (services.length == 1) _serviceId = services.first.id;
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _scheduledAt ?? now.add(const Duration(hours: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(
        _scheduledAt ?? now.add(const Duration(hours: 1)),
      ),
    );
    if (time == null || !mounted) return;

    setState(() {
      _scheduledAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
      _timeError = null;
    });
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;

    setState(() {
      _serviceError = _serviceId == null
          ? l10n.bookingErrorSelectService
          : null;
      _timeError = _scheduledAt == null
          ? l10n.bookingErrorSelectTime
          // The backend rejects a past scheduledAt; catching it here gives
          // an immediate message instead of a round-trip error.
          : _scheduledAt!.isAfter(DateTime.now())
          ? null
          : l10n.bookingErrorFutureTime;
      _submitError = null;
    });
    if (_serviceError != null || _timeError != null) return;

    setState(() => _submitting = true);
    try {
      final booking = await context.read<CustomerRepository>().createBooking(
        providerServiceId: _serviceId!,
        scheduledAt: _scheduledAt!,
        notes: _notes.text,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.bookingCreated)));
      context.push(Routes.customerBookingDetails(booking.id));
    } on ApiException catch (e) {
      if (!mounted) return;
      // Overlap conflicts (409) and validation failures arrive with a
      // server-written message worth showing verbatim.
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
    final services = widget.provider.bookableServices;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        // Lifts the sheet above the keyboard while typing notes.
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(l10n.bookingCreateTitle, style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              widget.provider.businessName,
              style: theme.textTheme.bodySmall?.copyWith(
                color: status.mutedForeground,
              ),
            ),
            const SizedBox(height: 20),

            DropdownButtonFormField<int>(
              initialValue: _serviceId,
              isExpanded: true,
              decoration: InputDecoration(
                labelText: l10n.bookingSelectService,
                errorText: _serviceError,
              ),
              hint: Text(l10n.bookingSelectServiceHint),
              items: [
                for (final service in services)
                  DropdownMenuItem(
                    value: service.id,
                    child: Text(
                      '${service.name} — \$${service.price.toStringAsFixed(2)} '
                      '(${l10n.serviceDuration(service.durationMinutes)})',
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
            const SizedBox(height: 14),

            InkWell(
              onTap: _submitting ? null : _pickDateTime,
              borderRadius: BorderRadius.circular(6),
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: l10n.bookingDateTime,
                  errorText: _timeError,
                  suffixIcon: const Icon(
                    Icons.calendar_today_outlined,
                    size: 18,
                  ),
                ),
                child: Text(
                  _scheduledAt == null
                      ? l10n.bookingPickDateTime
                      : formatBookingDateTime(_scheduledAt!),
                  style: _scheduledAt == null
                      ? theme.textTheme.bodyMedium?.copyWith(
                          color: status.mutedForeground,
                        )
                      : theme.textTheme.bodyMedium,
                ),
              ),
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _notes,
              enabled: !_submitting,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: l10n.bookingNotes,
                hintText: l10n.bookingNotesHint,
              ),
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
              label: l10n.bookingSubmit,
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
