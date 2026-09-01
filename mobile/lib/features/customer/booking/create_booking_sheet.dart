import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/customer_repository.dart';

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

/// Local calendar date, "YYYY-MM-DD" — never derived via
/// `toIso8601String()` on a full DateTime, which reports UTC and can land
/// on the wrong day near midnight.
String _dateOnly(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Combines a local calendar date with a "HH:mm" slot start into a real
/// instant, via the unambiguous multi-arg local DateTime constructor —
/// mirroring the backend's own documented strategy (see
/// availabilityRules.js) so this can never land on the wrong day the way
/// parsing a concatenated string would.
DateTime _slotToLocalDateTime(DateTime date, String startTime) {
  final parts = startTime.split(':');
  return DateTime(
    date.year,
    date.month,
    date.day,
    int.parse(parts[0]),
    int.parse(parts[1]),
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
  late DateTime _date;
  AvailabilitySlot? _selectedSlot;
  String? _serviceError;
  String? _slotError;
  String? _submitError;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final services = widget.provider.bookableServices;
    if (services.length == 1) _serviceId = services.first.id;
    final now = DateTime.now();
    _date = DateTime(now.year, now.month, now.day);
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked == null || !mounted) return;
    setState(() {
      _date = DateTime(picked.year, picked.month, picked.day);
      _selectedSlot = null;
    });
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;

    setState(() {
      _serviceError = _serviceId == null ? l10n.bookingErrorSelectService : null;
      _slotError = _selectedSlot == null ? l10n.bookingErrorSelectSlot : null;
      _submitError = null;
    });
    if (_serviceError != null || _slotError != null) return;

    final scheduledAt = _slotToLocalDateTime(_date, _selectedSlot!.startTime);

    setState(() => _submitting = true);
    final repo = context.read<CustomerRepository>();
    try {
      final booking = await repo.createBooking(
        providerServiceId: _serviceId!,
        scheduledAt: scheduledAt,
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
      if (e.statusCode == 409) {
        // Someone else took the slot first — refresh so it disappears from
        // the grid immediately rather than waiting on the cache's normal
        // staleness window.
        setState(() {
          _submitError = l10n.bookingConflictRetry;
          _selectedSlot = null;
        });
        await repo.refreshAvailability(
          providerId: widget.provider.id,
          serviceId: _serviceId!,
          date: _dateOnly(_date),
        );
      } else {
        setState(() => _submitError = e.message);
      }
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
    final repo = context.read<CustomerRepository>();
    context.watchQueries();

    final availabilityState = _serviceId == null
        ? null
        : repo.watchAvailability(
            providerId: widget.provider.id,
            serviceId: _serviceId!,
            date: _dateOnly(_date),
          );

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
                      _selectedSlot = null;
                    }),
            ),
            const SizedBox(height: 14),

            InkWell(
              onTap: (_submitting || _serviceId == null) ? null : _pickDate,
              borderRadius: BorderRadius.circular(6),
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: l10n.bookingSelectDate,
                  suffixIcon: const Icon(Icons.calendar_today_outlined, size: 18),
                ),
                child: Text(
                  '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
                ),
              ),
            ),
            const SizedBox(height: 14),

            if (_serviceId != null && availabilityState != null)
              availabilityState.map(
                onData: (availability) => _AvailabilityPanel(
                  availability: availability,
                  selectedSlot: _selectedSlot,
                  onSelect: (slot) => setState(() {
                    _selectedSlot = slot;
                    _slotError = null;
                  }),
                ),
                onLoading: (previous) => previous == null
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    : _AvailabilityPanel(
                        availability: previous,
                        selectedSlot: _selectedSlot,
                        onSelect: (slot) => setState(() {
                          _selectedSlot = slot;
                          _slotError = null;
                        }),
                      ),
                onError: (error, previous) => Text(
                  error.message,
                  style: TextStyle(color: theme.colorScheme.error),
                ),
              ),
            if (_slotError != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(_slotError!, style: TextStyle(color: theme.colorScheme.error, fontSize: 12)),
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

class _AvailabilityPanel extends StatelessWidget {
  const _AvailabilityPanel({
    required this.availability,
    required this.selectedSlot,
    required this.onSelect,
  });

  final Availability availability;
  final AvailabilitySlot? selectedSlot;
  final ValueChanged<AvailabilitySlot> onSelect;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    switch (availability.status) {
      case AvailabilityStatusModel.hoursNotConfigured:
        return Text(
          l10n.bookingHoursNotConfigured,
          style: theme.textTheme.bodyMedium?.copyWith(color: status.mutedForeground),
        );
      case AvailabilityStatusModel.closed:
        return Text(
          l10n.bookingClosedOnDate,
          style: theme.textTheme.bodyMedium?.copyWith(color: status.mutedForeground),
        );
      case AvailabilityStatusModel.open:
        if (availability.slots.isEmpty) {
          return Text(
            l10n.bookingNoSlotsFit,
            style: theme.textTheme.bodyMedium?.copyWith(color: status.mutedForeground),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.bookingOpenHours(
                availability.openingTime ?? '',
                availability.closingTime ?? '',
              ),
              style: theme.textTheme.bodySmall?.copyWith(color: status.mutedForeground),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final slot in availability.slots)
                  _SlotChip(
                    slot: slot,
                    selected: selectedSlot?.startTime == slot.startTime,
                    bookedLabel: l10n.bookingSlotBookedLabel,
                    pastLabel: l10n.bookingSlotPastLabel,
                    onTap: slot.status == SlotStatusModel.available
                        ? () => onSelect(slot)
                        : null,
                  ),
              ],
            ),
          ],
        );
    }
  }
}

class _SlotChip extends StatelessWidget {
  const _SlotChip({
    required this.slot,
    required this.selected,
    required this.bookedLabel,
    required this.pastLabel,
    required this.onTap,
  });

  final AvailabilitySlot slot;
  final bool selected;
  final String bookedLabel;
  final String pastLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final disabled = onTap == null;

    final semanticLabel = switch (slot.status) {
      SlotStatusModel.booked => '${slot.startTime} · $bookedLabel',
      SlotStatusModel.past => '${slot.startTime} · $pastLabel',
      SlotStatusModel.available => slot.startTime,
    };

    return Semantics(
      label: semanticLabel,
      button: true,
      enabled: !disabled,
      child: ChoiceChip(
        label: Text(
          slot.startTime,
          style: disabled
              ? TextStyle(color: status.mutedForeground, decoration: TextDecoration.lineThrough)
              : null,
        ),
        selected: selected,
        onSelected: disabled ? null : (_) => onTap!(),
      ),
    );
  }
}
