import '../../../core/network/api_client.dart';

/// Category and provider endpoints used by the existing admin screens.
///
/// Behaviour is unchanged from the pre-Phase-0 `categories_api.dart` and
/// `providers_api.dart`; the only difference is that the token now comes
/// from the Dio interceptor instead of being threaded through every call.
class AdminApi {
  const AdminApi(this._client);

  final ApiClient _client;

  Future<List<dynamic>> listCategories() async =>
      (await _client.get('/categories')) as List<dynamic>;

  Future<void> createCategory(Map<String, dynamic> body) =>
      _client.post('/categories', body: body);

  Future<void> updateCategory(int id, Map<String, dynamic> body) =>
      _client.put('/categories/$id', body: body);

  Future<void> deleteCategory(int id) => _client.delete('/categories/$id');

  Future<List<dynamic>> listProviders() async =>
      (await _client.get('/providers')) as List<dynamic>;

  Future<void> approveProvider(int id) =>
      _client.patch('/providers/$id/approve');
}
