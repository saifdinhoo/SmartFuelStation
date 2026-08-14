import 'api_client.dart';

Future<dynamic> listProviders(String token) {
  return apiRequest('/providers', token: token);
}

Future<dynamic> approveProvider(String token, int id) {
  return apiRequest('/providers/$id/approve', method: 'PATCH', token: token);
}
