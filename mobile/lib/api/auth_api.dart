import 'api_client.dart';

Future<dynamic> login(String email, String password) {
  return apiRequest('/auth/login', method: 'POST', body: {
    'email': email,
    'password': password,
  });
}

Future<dynamic> register(Map<String, dynamic> userData) {
  return apiRequest('/auth/register', method: 'POST', body: userData);
}

Future<dynamic> getCurrentUser(String token) {
  return apiRequest('/auth/me', token: token);
}
