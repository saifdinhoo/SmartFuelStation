import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/l10n/locale_controller.dart';
import '../core/location/location_service.dart';
import '../core/network/api_client.dart';
import '../core/realtime/composite_realtime_handler.dart';
import '../core/realtime/socket_service.dart';
import '../core/state/query_cache.dart';
import '../core/storage/prefs_store.dart';
import '../core/storage/secure_token_store.dart';
import '../core/theme/theme_controller.dart';
import '../features/admin/data/admin_api.dart';
import '../features/auth/data/auth_api.dart';
import '../features/auth/state/auth_state.dart';
import '../features/customer/data/customer_realtime_handler.dart';
import '../features/customer/data/customer_repository.dart';
import '../features/provider/data/provider_realtime_handler.dart';
import '../features/provider/data/provider_repository.dart';

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
  late final QueryCache _queryCache;
  late final CustomerRepository _customerRepo;
  late final ProviderRepository _providerRepo;
  late final LocationService _location;
  late final SocketService _socket;
  late final ThemeController _theme;
  late final LocaleController _locale;

  @override
  void initState() {
    super.initState();

    const prefs = PrefsStore();
    _auth = AuthState(SecureTokenStore.standard());
    _queryCache = QueryCache();

    _apiClient = ApiClient(
      readToken: _auth.readToken,
      // A 401 on any request other than a login attempt means the session is
      // dead; clearing it here makes the router redirect to login.
      onUnauthorized: _auth.logout,
    );

    _auth.api = AuthApi(_apiClient);
    _adminApi = AdminApi(_apiClient);
    _customerRepo = CustomerRepository(_apiClient, _queryCache);
    _providerRepo = ProviderRepository(_apiClient, _queryCache);
    _location = LocationService();
    _theme = ThemeController(prefs);
    _locale = LocaleController(prefs);

    // One socket, one handler chain. The role is unknown at build time, so
    // both handlers are wired and each no-ops on events its role never
    // receives — rooms are assigned server-side, so a customer socket is
    // never sent a provider event in the first place.
    _socket = SocketService(
      readToken: _auth.readToken,
      handler: CompositeRealtimeHandler([
        CustomerRealtimeHandler(_queryCache),
        ProviderRealtimeHandler(_queryCache),
      ]),
    );

    // One listener drives both concerns: cached data belongs to whoever was
    // signed in, and the socket must be authenticated as them. Signing out
    // clears the cache and closes the socket; signing in (or switching
    // accounts) opens a fresh one with the new token.
    _auth.addListener(_onAuthChanged);

    // Kicked off after wiring so the interceptor can attach the restored
    // token to the /auth/me validation call.
    _auth.restoreSession();
  }

  void _onAuthChanged() {
    if (_auth.isAuthenticated) {
      // connect() is a no-op when a socket is already open for this exact
      // token, so repeated notifications cannot stack up connections.
      _socket.connect();
    } else {
      _socket.disconnect();
      _queryCache.clear();
    }
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    _socket.dispose();
    _auth.dispose();
    _queryCache.dispose();
    _location.dispose();
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
        ChangeNotifierProvider<LocationService>.value(value: _location),
        // Exposed so the shell can show a live/offline indicator; screens
        // never read events from it directly.
        ChangeNotifierProvider<SocketService>.value(value: _socket),
        // The cache is a ChangeNotifier so screens rebuild when a watched
        // key resolves; the repository reads through it.
        ChangeNotifierProvider<QueryCache>.value(value: _queryCache),
        Provider<ApiClient>.value(value: _apiClient),
        Provider<AdminApi>.value(value: _adminApi),
        Provider<CustomerRepository>.value(value: _customerRepo),
        Provider<ProviderRepository>.value(value: _providerRepo),
      ],
      child: widget.child,
    );
  }
}
