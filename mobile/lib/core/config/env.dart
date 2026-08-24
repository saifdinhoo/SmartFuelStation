import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

/// Where the backend lives, resolved per environment instead of hardcoded.
///
/// Override at build/run time for a physical device or a deployed API:
///
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.20:5000/api
///
/// With no override the default is chosen per platform, because "localhost"
/// means something different on each one:
///   - Android emulator: the host machine is 10.0.2.2 (127.0.0.1 would be
///     the emulator itself)
///   - iOS simulator / desktop / web: the host really is localhost
///   - A physical device: neither works — it must be given the machine's
///     LAN address via the --dart-define above.
class Env {
  const Env._();

  static const String _override = String.fromEnvironment('API_BASE_URL');

  static const int _port = 5000;

  static String get apiBaseUrl {
    if (_override.isNotEmpty) return _override;
    return 'http://$_host:$_port/api';
  }

  /// The Socket.IO origin — same host, without the `/api` suffix, matching
  /// how the web client connects. Used in a later phase; defined here so
  /// there is only one place that knows the host.
  static String get socketUrl {
    if (_override.isNotEmpty) {
      return _override.endsWith('/api')
          ? _override.substring(0, _override.length - 4)
          : _override;
    }
    return 'http://$_host:$_port';
  }

  /// Uses `defaultTargetPlatform` rather than `dart:io`'s `Platform`, because
  /// importing `dart:io` at all makes the app fail to compile for web.
  static String get _host {
    if (kIsWeb) return 'localhost';
    if (defaultTargetPlatform == TargetPlatform.android) return '10.0.2.2';
    return 'localhost';
  }

  /// True when running against a default localhost address, which cannot
  /// work from a physical device. Surfaced in the login screen's error text
  /// so a failed connection points at the cause instead of looking like
  /// wrong credentials.
  static bool get isLocalDefault => _override.isEmpty;
}
