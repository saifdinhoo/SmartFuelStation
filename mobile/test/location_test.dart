import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_automotive_service_app/core/l10n/generated/app_localizations.dart';
import 'package:smart_automotive_service_app/core/location/location_service.dart';
import 'package:smart_automotive_service_app/core/location/map_actions.dart';

Future<AppLocalizations> loadL10n(String code) =>
    AppLocalizations.delegate.load(Locale(code));

/// Exercises the shared map-URL builders and coordinate validation
/// independently of any screen — every location entry point in the app
/// (customer, provider, admin) goes through these same functions.
void main() {
  group('coordinate validation', () {
    test('accepts values within the real range', () {
      expect(isValidLatitude(0), isTrue);
      expect(isValidLatitude(90), isTrue);
      expect(isValidLatitude(-90), isTrue);
      expect(isValidLongitude(180), isTrue);
      expect(isValidLongitude(-180), isTrue);
    });

    test('rejects out-of-range, null, and non-finite values', () {
      expect(isValidLatitude(91), isFalse);
      expect(isValidLatitude(-91), isFalse);
      expect(isValidLongitude(181), isFalse);
      expect(isValidLongitude(-181), isFalse);
      expect(isValidLatitude(null), isFalse);
      expect(isValidLatitude(double.nan), isFalse);
      expect(isValidLatitude(double.infinity), isFalse);
    });

    test('hasValidCoordinates requires both to be present and valid', () {
      expect(hasValidCoordinates(33.5, 35.5), isTrue);
      expect(hasValidCoordinates(null, 35.5), isFalse);
      expect(hasValidCoordinates(33.5, null), isFalse);
      expect(hasValidCoordinates(200, 35.5), isFalse);
    });
  });

  group('buildViewLocationUri', () {
    test('builds a pin URI from valid coordinates', () {
      final uri = buildViewLocationUri(33.8938, 35.5018);
      expect(
        uri.toString(),
        'https://www.google.com/maps/search/?api=1&query=33.8938,35.5018',
      );
    });

    test('falls back to an address text search when coordinates are missing', () {
      final uri = buildViewLocationUri(
        null,
        null,
        addressFallback: 'Hamra Street, Beirut',
      );
      expect(uri, isNotNull);
      expect(uri!.queryParameters['query'], 'Hamra Street, Beirut');
    });

    test('returns null for malformed coordinates and no address — never a broken URI', () {
      expect(buildViewLocationUri(200, 35.5), isNull);
      expect(buildViewLocationUri(null, null), isNull);
      expect(buildViewLocationUri(null, null, addressFallback: ''), isNull);
      expect(buildViewLocationUri(null, null, addressFallback: '   '), isNull);
    });

    test('prefers coordinates over the address fallback when both are present', () {
      final uri = buildViewLocationUri(33.5, 35.5, addressFallback: 'Somewhere');
      expect(uri.toString(), contains('33.5,35.5'));
    });
  });

  group('buildDirectionsUri', () {
    test('builds a destination-only URI when no origin is known', () {
      final uri = buildDirectionsUri(33.8938, 35.5018);
      expect(
        uri.toString(),
        'https://www.google.com/maps/dir/?api=1&destination=33.8938,35.5018',
      );
    });

    test('includes the customer origin when available', () {
      final uri = buildDirectionsUri(
        33.8938,
        35.5018,
        origin: const LatLng(33.89, 35.5),
      );
      expect(uri!.queryParameters['origin'], '33.89,35.5');
      expect(uri.queryParameters['destination'], '33.8938,35.5018');
    });

    test('returns null when the destination is missing or invalid', () {
      expect(buildDirectionsUri(null, null), isNull);
      expect(
        buildDirectionsUri(200, 35.5, origin: const LatLng(33.89, 35.5)),
        isNull,
      );
    });

    test('ignores an invalid origin rather than building a malformed URI', () {
      final uri = buildDirectionsUri(
        33.8938,
        35.5018,
        origin: const LatLng(999, 35.5),
      );
      expect(uri!.queryParameters.containsKey('origin'), isFalse);
      expect(uri.queryParameters['destination'], '33.8938,35.5018');
    });
  });

  group('LocationService', () {
    test('starts with no position and not loading', () {
      final service = LocationService();
      expect(service.hasPosition, isFalse);
      expect(service.isLoading, isFalse);
      expect(service.isDenied, isFalse);
    });

    test('refreshPosition on web/desktop test env resolves to null rather than throwing', () async {
      // No real GPS/permission plumbing exists under flutter test, so this
      // exercises the "everything fails gracefully to null" contract that
      // the rest of the app depends on (see the class doc comment).
      final service = LocationService();
      final result = await service.refreshPosition();
      expect(result, isNull);
      expect(service.isDenied, isTrue);
      expect(service.isLoading, isFalse);
    });

    test('a second concurrent refreshPosition call while loading does not throw', () async {
      final service = LocationService();
      final first = service.refreshPosition();
      final second = service.refreshPosition();
      await Future.wait([first, second]);
      expect(service.isLoading, isFalse);
    });
  });

  group('localization', () {
    test('location strings are translated in both locales, not English fallbacks', () async {
      final en = await loadL10n('en');
      final ar = await loadL10n('ar');

      for (final pair in [
        (en.locationViewLocation, ar.locationViewLocation),
        (en.locationGetDirections, ar.locationGetDirections),
        (en.locationCouldNotOpenMaps, ar.locationCouldNotOpenMaps),
        (en.pProfileUseCurrentLocation, ar.pProfileUseCurrentLocation),
        (en.pProfilePreviewOnMap, ar.pProfilePreviewOnMap),
        (en.pProfileLocationDenied, ar.pProfileLocationDenied),
        (en.exploreUseLocation, ar.exploreUseLocation),
      ]) {
        expect(pair.$1, isNotEmpty);
        expect(pair.$2, isNotEmpty);
        expect(pair.$2, isNot(pair.$1));
      }
    });

    test('exploreUseLocation now reads as an explicit refresh, not a one-time enable', () async {
      final en = await loadL10n('en');
      expect(en.exploreUseLocation, 'Update my location');
    });
  });
}
