import 'package:dio/dio.dart';

/// Attaches the JWT to every outgoing request and reports 401s once,
/// centrally.
///
/// Before Phase 0 each call site passed the token by hand and every screen
/// invented its own handling for an expired session. Both concerns now live
/// here, so a screen can no longer forget either one.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({required this.readToken, required this.onUnauthorized});

  /// Read lazily per request rather than captured once — the token changes
  /// on login and logout, and a captured copy would go stale.
  final String? Function() readToken;

  /// Invoked when the server rejects the token. Wired to AuthState.logout,
  /// which clears the session and lets the router redirect to login.
  final Future<void> Function() onUnauthorized;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = readToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // 401 means the token is missing, malformed, or expired — the session is
    // no longer usable, so it is torn down here instead of leaving the app in
    // a signed-in-but-broken state.
    //
    // Login and register are excluded on purpose: a 401 there is "wrong
    // email or password", not an expired session, and logging out in
    // response would be both pointless and confusing.
    final path = err.requestOptions.path;
    final isAuthAttempt =
        path.contains('/auth/login') || path.contains('/auth/register');

    if (err.response?.statusCode == 401 && !isAuthAttempt) {
      await onUnauthorized();
    }

    handler.next(err);
  }
}
