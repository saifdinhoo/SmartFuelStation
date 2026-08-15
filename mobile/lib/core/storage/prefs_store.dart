import 'package:shared_preferences/shared_preferences.dart';

/// Non-sensitive, user-visible preferences only — language and theme.
///
/// The JWT deliberately does not live here; see [SecureTokenStore]. Keeping
/// the two apart makes it obvious at a glance that nothing secret is being
/// written to plaintext preferences.
class PrefsStore {
  static const _languageKey = 'language';
  static const _themeKey = 'theme_mode';

  const PrefsStore();

  Future<String?> readLanguage() async =>
      (await SharedPreferences.getInstance()).getString(_languageKey);

  Future<void> writeLanguage(String code) async =>
      (await SharedPreferences.getInstance()).setString(_languageKey, code);

  Future<String?> readThemeMode() async =>
      (await SharedPreferences.getInstance()).getString(_themeKey);

  Future<void> writeThemeMode(String mode) async =>
      (await SharedPreferences.getInstance()).setString(_themeKey, mode);
}
