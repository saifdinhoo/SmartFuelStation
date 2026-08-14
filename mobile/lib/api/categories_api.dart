import 'api_client.dart';

Future<dynamic> listCategories(String token) {
  return apiRequest('/categories', token: token);
}

Future<dynamic> createCategory(String token, Map<String, dynamic> category) {
  return apiRequest('/categories', method: 'POST', body: category, token: token);
}

Future<dynamic> updateCategory(String token, int id, Map<String, dynamic> category) {
  return apiRequest('/categories/$id', method: 'PUT', body: category, token: token);
}

Future<dynamic> deleteCategory(String token, int id) {
  return apiRequest('/categories/$id', method: 'DELETE', token: token);
}
