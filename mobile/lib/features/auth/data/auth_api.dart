import '../../../core/network/api_client.dart';

/// Auth endpoints. The token is attached by the Dio interceptor, so nothing
/// here passes one by hand the way the old `auth_api.dart` did.
class AuthApi {
  const AuthApi(this._client);

  final ApiClient _client;

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async => Map<String, dynamic>.from(
    await _client.post(
          '/auth/login',
          body: {'email': email, 'password': password},
        )
        as Map,
  );

  Future<Map<String, dynamic>> register(Map<String, dynamic> payload) async =>
      Map<String, dynamic>.from(
        await _client.post('/auth/register', body: payload) as Map,
      );

  Future<Map<String, dynamic>> currentUser() async =>
      Map<String, dynamic>.from(await _client.get('/auth/me') as Map);

  /// Only name/phone are ever sent — email, role and password each have
  /// their own separate path and are never accepted here (see the
  /// backend's auth.service.js updateCurrentUser doc comment). Passing an
  /// empty string for `phone` clears the stored number (the backend treats
  /// a blank value as "clear"); passing Dart `null` omits the field
  /// entirely, leaving it untouched.
  Future<Map<String, dynamic>> updateProfile({
    String? name,
    String? phone,
  }) async => Map<String, dynamic>.from(
    await _client.patch(
          '/auth/me',
          body: {'name': ?name, 'phone': ?phone},
        )
        as Map,
  );

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _client.patch(
      '/auth/change-password',
      body: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
  }

  /// Always succeeds the same way whether or not the email belongs to a
  /// real account — the backend's response never reveals which.
  Future<void> requestPasswordReset(String email) async {
    await _client.post('/auth/forgot-password', body: {'email': email});
  }
}
