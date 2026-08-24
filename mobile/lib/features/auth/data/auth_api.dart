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
}
