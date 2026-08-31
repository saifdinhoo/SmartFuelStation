import 'package:url_launcher/url_launcher.dart';

import 'location_service.dart';

/// The one place every "open an external map" URL is built — nothing else
/// in the app should construct a maps.google.com URL by hand. Mirrors the
/// web app's src/utils/location.ts so both clients agree on the exact same
/// two actions:
///   - "View/Preview location": a pin at a fixed point, never modifies data.
///   - "Get directions": customer -> destination, origin omitted when the
///     customer's own position isn't known (the external Maps app then
///     asks the device for it instead of us guessing).

bool isValidLatitude(double? value) =>
    value != null && value.isFinite && value >= -90 && value <= 90;

bool isValidLongitude(double? value) =>
    value != null && value.isFinite && value >= -180 && value <= 180;

bool hasValidCoordinates(double? latitude, double? longitude) =>
    isValidLatitude(latitude) && isValidLongitude(longitude);

/// A pin at the given point — never a route, never modifies anything. Falls
/// back to a text search on the raw address when no valid coordinates exist
/// yet, so "View location" stays useful even before a provider has set
/// precise coordinates.
Uri? buildViewLocationUri(
  double? latitude,
  double? longitude, {
  String? addressFallback,
}) {
  if (hasValidCoordinates(latitude, longitude)) {
    return Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude',
    );
  }
  final address = addressFallback?.trim();
  if (address != null && address.isNotEmpty) {
    return Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}',
    );
  }
  return null;
}

/// Customer -> provider. Destination coordinates are required; origin is
/// optional — when omitted, the external Maps app determines it from the
/// device opening the link.
Uri? buildDirectionsUri(
  double? destinationLatitude,
  double? destinationLongitude, {
  LatLng? origin,
}) {
  if (!hasValidCoordinates(destinationLatitude, destinationLongitude)) {
    return null;
  }
  final destination = '$destinationLatitude,$destinationLongitude';
  if (origin != null &&
      isValidLatitude(origin.latitude) &&
      isValidLongitude(origin.longitude)) {
    return Uri.parse(
      'https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=$destination',
    );
  }
  return Uri.parse(
    'https://www.google.com/maps/dir/?api=1&destination=$destination',
  );
}

/// Opens [uri] in the device's Maps app or browser. Returns false (rather
/// than throwing) if nothing on the device can handle it, so callers can
/// show a message instead of crashing.
Future<bool> openMapUri(Uri uri) =>
    launchUrl(uri, mode: LaunchMode.externalApplication);
