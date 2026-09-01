import 'package:flutter/foundation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/storage/secure_token_store.dart';
import '../data/auth_api.dart';

enum UserRole {
  customer,
  provider,
  admin;

  static UserRole? fromApi(String? value) => switch (value) {
    'CUSTOMER' => UserRole.customer,
    'PROVIDER' => UserRole.provider,
    'ADMIN' => UserRole.admin,
    _ => null,
  };

  String get apiValue => switch (this) {
    UserRole.customer => 'CUSTOMER',
    UserRole.provider => 'PROVIDER',
    UserRole.admin => 'ADMIN',
  };
}

/// Session state: the token, the signed-in user, and the role the router
/// guards against. The only writer of the secure token store.
class AuthState extends ChangeNotifier {
  AuthState(this._tokens);

  final SecureTokenStore _tokens;

  /// Set once during app composition. AuthState and ApiClient depend on each
  /// other — the client needs the token, the interceptor needs to log out —
  /// so the cycle is broken by injecting the client after both exist.
  late final AuthApi api;

  String? _token;
  Map<String, dynamic>? _user;
  bool _restoring = true;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isRestoring => _restoring;
  bool get isAuthenticated => _token != null;

  String? get displayName => _user?['name'] as String?;
  String? get email => _user?['email'] as String?;
  UserRole? get role => UserRole.fromApi(_user?['role'] as String?);

  /// Read synchronously by the Dio interceptor on every request.
  String? readToken() => _token;

  /// Restores a previous session at startup.
  ///
  /// Migrates any token left in SharedPreferences by the pre-Phase-0 build
  /// first, so upgrading the app does not sign existing users out. The token
  /// is then validated against /auth/me; anything the server rejects is
  /// discarded rather than kept around as a dead session.
  Future<void> restoreSession() async {
    final migrated = await _tokens.migrateLegacyTokenIfPresent();
    final saved = migrated ?? await _tokens.read();

    if (saved == null || saved.isEmpty) {
      _restoring = false;
      notifyListeners();
      return;
    }

    // Set before the call so the interceptor attaches it to /auth/me.
    _token = saved;
    try {
      _user = await api.currentUser();
    } on ApiException {
      // Covers an expired or revoked token, and a backend that is simply
      // unreachable. Either way there is no usable session to restore.
      _token = null;
      _user = null;
      await _tokens.clear();
    }

    _restoring = false;
    notifyListeners();
  }

  Future<void> signIn({required String email, required String password}) async {
    final result = await api.login(email: email, password: password);
    await _acceptSession(result);
  }

  Future<void> register(Map<String, dynamic> payload) async {
    final result = await api.register(payload);
    await _acceptSession(result);
  }

  /// The current session/token is untouched — the backend does not
  /// invalidate it on a password change, so there is nothing to re-fetch
  /// or re-authenticate here.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) => api.changePassword(currentPassword: currentPassword, newPassword: newPassword);

  /// No session exists yet at this point — nothing here to accept or store.
  Future<void> requestPasswordReset(String email) => api.requestPasswordReset(email);

  Future<void> _acceptSession(Map<String, dynamic> result) async {
    final token = result['token'] as String;
    await _tokens.write(token);
    _token = token;
    _user = result['user'] as Map<String, dynamic>?;
    notifyListeners();
  }

  /// Clears the session. Called by the user and by the Dio interceptor on a
  /// 401, which is what turns an expired token into a clean return to login
  /// instead of a screenful of errors.
  Future<void> logout() async {
    if (_token == null && _user == null) return;
    _token = null;
    _user = null;
    await _tokens.clear();
    notifyListeners();
  }
}
