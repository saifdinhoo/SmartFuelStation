import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/provider_repository.dart';
import '../hours/operating_hours_editor.dart';

/// Edits exactly the fields PATCH /providers/me accepts, plus the weekly
/// operating-hours editor (its own independent save unit — see
/// [OperatingHoursEditor]).
class BusinessProfileScreen extends StatefulWidget {
  const BusinessProfileScreen({super.key});

  @override
  State<BusinessProfileScreen> createState() => _BusinessProfileScreenState();
}

class _BusinessProfileScreenState extends State<BusinessProfileScreen> {
  final _businessName = TextEditingController();
  final _description = TextEditingController();
  final _address = TextEditingController();
  final _contactName = TextEditingController();
  final _phone = TextEditingController();
  final _latitude = TextEditingController();
  final _longitude = TextEditingController();

  /// Seeded once from the first loaded profile; re-seeding on every rebuild
  /// would wipe whatever the provider is mid-way through typing.
  bool _seeded = false;
  bool _saving = false;
  String? _error;
  String? _nameError;
  String? _addressError;
  String? _latError;
  String? _lngError;

  @override
  void dispose() {
    for (final controller in [
      _businessName,
      _description,
      _address,
      _contactName,
      _phone,
      _latitude,
      _longitude,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _seed(OwnProviderProfile profile) {
    if (_seeded) return;
    _seeded = true;
    _businessName.text = profile.businessName;
    _description.text = profile.description ?? '';
    _address.text = profile.address;
    _contactName.text = profile.contactName;
    _phone.text = profile.phone ?? '';
    _latitude.text = profile.latitude?.toString() ?? '';
    _longitude.text = profile.longitude?.toString() ?? '';
  }

  double? _parseCoordinate(
    String raw,
    double limit,
    void Function(String?) setError,
    String message,
  ) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      setError(null);
      return null;
    }
    final value = double.tryParse(trimmed);
    if (value == null || value < -limit || value > limit) {
      setError(message);
      return null;
    }
    setError(null);
    return value;
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;

    String? latError;
    String? lngError;
    final latitude = _parseCoordinate(
      _latitude.text,
      90,
      (e) => latError = e,
      l10n.pProfileCoordinateInvalid,
    );
    final longitude = _parseCoordinate(
      _longitude.text,
      180,
      (e) => lngError = e,
      l10n.pProfileCoordinateInvalid,
    );

    setState(() {
      _nameError = _businessName.text.trim().isEmpty
          ? l10n.pProfileNameRequired
          : null;
      _addressError = _address.text.trim().isEmpty
          ? l10n.pProfileAddressRequired
          : null;
      _latError = latError;
      _lngError = lngError;
      _error = null;
    });

    if (_nameError != null ||
        _addressError != null ||
        latError != null ||
        lngError != null) {
      return;
    }

    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await context.read<ProviderRepository>().updateProfile({
        'businessName': _businessName.text.trim(),
        'description': _description.text.trim().isEmpty
            ? null
            : _description.text.trim(),
        'address': _address.text.trim(),
        'name': _contactName.text.trim(),
        'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'latitude': latitude,
        'longitude': longitude,
      });
      messenger.showSnackBar(SnackBar(content: Text(l10n.pProfileSaved)));
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.pProfileTitle)),
      body: AsyncView<OwnProviderProfile>(
        value: repo.watchProfile(),
        onRetry: repo.refreshProfile,
        builder: (context, profile) {
          _seed(profile);

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              Wrap(
                spacing: 8,
                children: [
                  StatusChip(
                    label: profile.isApproved
                        ? l10n.pOverviewApproved
                        : l10n.pOverviewPending,
                    tone: profile.isApproved
                        ? StatusTone.success
                        : StatusTone.warning,
                  ),
                  StatusChip(
                    label: profile.isOpen
                        ? l10n.pOverviewOpen
                        : l10n.pOverviewClosed,
                    tone: profile.isOpen
                        ? StatusTone.success
                        : StatusTone.neutral,
                  ),
                ],
              ),

              const SizedBox(height: 20),
              _Heading(l10n.pProfileBusinessDetails),
              const SizedBox(height: 10),
              TextField(
                controller: _businessName,
                enabled: !_saving,
                decoration: InputDecoration(
                  labelText: l10n.pProfileBusinessName,
                  errorText: _nameError,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _description,
                enabled: !_saving,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: l10n.pProfileDescription,
                  hintText: l10n.pProfileDescriptionHint,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _address,
                enabled: !_saving,
                decoration: InputDecoration(
                  labelText: l10n.pProfileAddress,
                  errorText: _addressError,
                ),
              ),

              const SizedBox(height: 20),
              _Heading(l10n.pProfileContact),
              const SizedBox(height: 10),
              TextField(
                controller: _contactName,
                enabled: !_saving,
                decoration: InputDecoration(
                  labelText: l10n.pProfileContactName,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phone,
                enabled: !_saving,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(labelText: l10n.pProfilePhone),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: TextEditingController(text: profile.email),
                readOnly: true,
                enabled: false,
                decoration: InputDecoration(labelText: l10n.fieldEmail),
              ),
              const SizedBox(height: 4),
              Text(
                l10n.pProfileEmailReadOnly,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),

              const SizedBox(height: 20),
              _Heading(l10n.pProfileLocation),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _latitude,
                      enabled: !_saving,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                        signed: true,
                      ),
                      decoration: InputDecoration(
                        labelText: l10n.pProfileLatitude,
                        errorText: _latError,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _longitude,
                      enabled: !_saving,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                        signed: true,
                      ),
                      decoration: InputDecoration(
                        labelText: l10n.pProfileLongitude,
                        errorText: _lngError,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                l10n.pProfileLocationHint,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),

              const SizedBox(height: 20),
              const OperatingHoursEditor(),

              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
              ],

              const SizedBox(height: 20),
              PrimaryButton(
                label: l10n.pProfileSave,
                isLoading: _saving,
                onPressed: _save,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: Theme.of(
      context,
    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  );
}
