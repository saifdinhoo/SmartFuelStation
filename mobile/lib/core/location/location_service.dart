import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Device location, used only to sort providers by distance.
///
/// Every failure path — services off, permission denied, timeout, an
/// unsupported platform — resolves to `null` rather than throwing. Location
/// is an enhancement here, so the app must stay fully usable without it;
/// the UI hides distance sorting when this returns null.
class LocationService extends ChangeNotifier {
  LatLng? _position;
  bool _loading = false;
  bool _denied = false;

  LatLng? get position => _position;
  bool get isLoading => _loading;
  bool get isDenied => _denied;
  bool get hasPosition => _position != null;

  Future<LatLng?> ensurePosition() async {
    if (_position != null || _loading) return _position;

    _loading = true;
    _denied = false;
    notifyListeners();

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _denied = true;
        return null;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _denied = true;
        return null;
      }

      final result = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 10),
        ),
      );
      _position = LatLng(result.latitude, result.longitude);
      return _position;
    } catch (_) {
      // Timeouts, platform channel errors, browser refusals — all just mean
      // "no location", never a crash.
      _denied = true;
      return null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}

@immutable
class LatLng {
  const LatLng(this.latitude, this.longitude);

  final double latitude;
  final double longitude;
}

/// Great-circle distance in kilometres (haversine). Matches the formula the
/// web app uses so both clients report the same number for the same pair.
double distanceKmBetween(LatLng from, double lat, double lng) {
  const earthRadiusKm = 6371.0;
  final dLat = _toRadians(lat - from.latitude);
  final dLng = _toRadians(lng - from.longitude);

  final a =
      math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_toRadians(from.latitude)) *
          math.cos(_toRadians(lat)) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);

  return earthRadiusKm * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

double _toRadians(double degrees) => degrees * math.pi / 180;
