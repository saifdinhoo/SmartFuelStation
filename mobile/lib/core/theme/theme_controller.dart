import 'package:flutter/material.dart';

import '../storage/prefs_store.dart';

/// Light/dark selection, persisted in SharedPreferences.
///
/// Mirrors the web's ThemeProvider: an explicit choice wins, and the
/// default follows the operating system.
class ThemeController extends ChangeNotifier {
  ThemeController(this._prefs) {
    _restore();
  }

  final PrefsStore _prefs;

  ThemeMode _mode = ThemeMode.system;
  ThemeMode get mode => _mode;

  bool isDark(BuildContext context) => switch (_mode) {
    ThemeMode.dark => true,
    ThemeMode.light => false,
    ThemeMode.system =>
      MediaQuery.platformBrightnessOf(context) == Brightness.dark,
  };

  Future<void> _restore() async {
    final saved = await _prefs.readThemeMode();
    _mode = switch (saved) {
      'dark' => ThemeMode.dark,
      'light' => ThemeMode.light,
      _ => ThemeMode.system,
    };
    notifyListeners();
  }

  Future<void> setMode(ThemeMode mode) async {
    _mode = mode;
    notifyListeners();
    await _prefs.writeThemeMode(mode.name);
  }

  /// Cycles light → dark → system, matching the web toggle's behaviour.
  Future<void> toggle(BuildContext context) =>
      setMode(isDark(context) ? ThemeMode.light : ThemeMode.dark);
}
