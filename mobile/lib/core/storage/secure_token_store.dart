import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The JWT's only home. Backed by the Android Keystore / iOS Keychain
/// rather than SharedPreferences, which stores plaintext readable by
/// anything with filesystem access on a rooted or jailbroken device.
class SecureTokenStore {
  static const _key = 'auth_token';

  /// The key the pre-Phase-0 app wrote its token to in SharedPreferences.
  static const _legacyKey = 'token';

  const SecureTokenStore(this._storage);

  final FlutterSecureStorage _storage;

  /// v11's default AndroidOptions already encrypts with AES-GCM and wraps
  /// the key with RSA-OAEP in the Keystore — the old
  /// `encryptedSharedPreferences` flag was removed because that is now the
  /// only behaviour. `resetOnError` (also default) wipes the entry if it
  /// ever fails to decrypt, which for a JWT just means signing in again
  /// rather than the app getting stuck on an unreadable key.
  factory SecureTokenStore.standard() =>
      const SecureTokenStore(FlutterSecureStorage());

  Future<String?> read() async => _storage.read(key: _key);

  Future<void> write(String token) => _storage.write(key: _key, value: token);

  Future<void> clear() => _storage.delete(key: _key);

  /// One-time move of a token written by the previous SharedPreferences
  /// implementation. Without this, everyone already signed in would be
  /// silently logged out by the upgrade. The old copy is deleted after the
  /// move so the plaintext value does not linger on disk.
  ///
  /// Returns the migrated token, or null if there was nothing to migrate.
  Future<String?> migrateLegacyTokenIfPresent() async {
    final prefs = await SharedPreferences.getInstance();
    final legacy = prefs.getString(_legacyKey);
    if (legacy == null || legacy.isEmpty) return null;

    await write(legacy);
    await prefs.remove(_legacyKey);
    return legacy;
  }
}
