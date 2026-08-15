import 'package:flutter/material.dart';

import '../storage/prefs_store.dart';

/// Language selection, persisted in SharedPreferences.
///
/// Mirrors the web's DirectionProvider, which stores `language` under the
/// same key and flips `document.dir`. Here the direction flip is automatic:
/// MaterialApp derives text direction from the locale, so selecting `ar`
/// lays the entire app out right-to-left with no per-widget handling.
class LocaleController extends ChangeNotifier {
  LocaleController(this._prefs) {
    _restore();
  }

  static const supported = [Locale('en'), Locale('ar')];

  final PrefsStore _prefs;

  Locale _locale = const Locale('en');
  Locale get locale => _locale;

  bool get isArabic => _locale.languageCode == 'ar';

  /// Exposed for tests and for anything that needs the direction before a
  /// Directionality widget is in scope.
  TextDirection get direction =>
      isArabic ? TextDirection.rtl : TextDirection.ltr;

  Future<void> _restore() async {
    final saved = await _prefs.readLanguage();
    if (saved == 'ar') {
      _locale = const Locale('ar');
      notifyListeners();
    }
  }

  Future<void> setLocale(Locale locale) async {
    _locale = locale;
    notifyListeners();
    await _prefs.writeLanguage(locale.languageCode);
  }

  Future<void> toggle() =>
      setLocale(isArabic ? const Locale('en') : const Locale('ar'));
}
