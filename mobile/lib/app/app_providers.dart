import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/l10n/locale_controller.dart';
import '../core/network/api_client.dart';
import '../core/storage/prefs_store.dart';
import '../core/storage/secure_token_store.dart';
import '../core/theme/theme_controller.dart';
import '../features/admin/data/admin_api.dart';
import '../features/auth/data/auth_api.dart';
import '../features/auth/state/auth_state.dart';

/// Composition root: builds every singleton once and wires the dependency
/// cycle between AuthState and ApiClient.
///
/// The cycle is real and unavoidable — the client needs the token from
/// AuthState, and AuthState's interceptor needs to log out through the
/// client's error path. It is resolved by constructing AuthState first and
/// handing it callbacks rather than the client itself, then assigning the
/// API onto it once the client exists.
class AppProviders extends StatefulWidget {
  const AppProviders({super.key, required this.child});

  final Widget child;

  @override
  State<AppProviders> createState() => _AppProvidersState();
}

class _AppProvidersState extends State<AppProviders> {
  late final AuthState _auth;
  late final ApiClient _apiClient;
  late final AdminApi _adminApi;
  late final ThemeController _theme;
  late final LocaleController _locale;

  @override
  void initState() {
    super.initState();

    const prefs = PrefsStore();
    _auth = AuthState(SecureTokenStore.standard());

    _apiClient = ApiClient(
      readToken: _auth.readToken,
      // A 401 on any request other than a login attempt means the session is
      // dead; clearing it here makes the router redirect to login.
      onUnauthorized: _auth.logout,
    );

    _auth.api = AuthApi(_apiClient);
    _adminApi = AdminApi(_apiClient);
    _theme = ThemeController(prefs);
    _locale = LocaleController(prefs);

    // Kicked off after wiring so the interceptor can attach the restored
    // token to the /auth/me validation call.
    _auth.restoreSession();
  }

  @override
  void dispose() {
    _auth.dispose();
    _theme.dispose();
    _locale.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthState>.value(value: _auth),
        ChangeNotifierProvider<ThemeController>.value(value: _theme),
        ChangeNotifierProvider<LocaleController>.value(value: _locale),
        Provider<ApiClient>.value(value: _apiClient),
        Provider<AdminApi>.value(value: _adminApi),
      ],
      child: widget.child,
    );
  }
}
