import 'package:flutter/material.dart';

import '../l10n/generated/app_localizations.dart';
import '../location/location_service.dart';
import '../location/map_actions.dart';

/// Shared by every screen that shows a provider's location — Customer
/// Provider Details, Admin's provider list/details. Keeps the two actions
/// ("view" vs "navigate") and their disabled states identical everywhere
/// instead of each screen re-implementing them. Mirrors the web app's
/// LocationActions component.
class LocationActionButtons extends StatelessWidget {
  const LocationActionButtons({
    super.key,
    required this.latitude,
    required this.longitude,
    this.address,
    this.origin,
    this.showDirections = true,
    this.showViewLocation = true,
  });

  final double? latitude;
  final double? longitude;

  /// Used as a fallback for "View location" when coordinates aren't set yet.
  final String? address;

  /// Customer's own position, if known — becomes the directions origin.
  final LatLng? origin;
  final bool showDirections;
  final bool showViewLocation;

  Future<void> _open(BuildContext context, Uri? uri) async {
    if (uri == null) return;
    final l10n = AppLocalizations.of(context)!;
    bool opened;
    try {
      opened = await openMapUri(uri);
    } catch (_) {
      // No Maps app/browser able to handle it (or, on a platform with no
      // url_launcher channel at all) — surfaced the same as a plain "no".
      opened = false;
    }
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.locationCouldNotOpenMaps)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final viewUri = buildViewLocationUri(
      latitude,
      longitude,
      addressFallback: address,
    );
    final directionsUri = buildDirectionsUri(
      latitude,
      longitude,
      origin: origin,
    );

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (showViewLocation)
          OutlinedButton.icon(
            onPressed: viewUri == null ? null : () => _open(context, viewUri),
            icon: const Icon(Icons.place_outlined, size: 18),
            label: Text(l10n.locationViewLocation),
          ),
        if (showDirections)
          OutlinedButton.icon(
            onPressed: directionsUri == null
                ? null
                : () => _open(context, directionsUri),
            icon: const Icon(Icons.directions_outlined, size: 18),
            label: Text(l10n.locationGetDirections),
          ),
      ],
    );
  }
}
