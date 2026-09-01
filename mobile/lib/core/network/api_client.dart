import 'package:dio/dio.dart';

import '../config/env.dart';
import 'api_exception.dart';
import 'auth_interceptor.dart';

/// The single Dio instance the whole app talks through.
///
/// Every feature's data layer takes this rather than building its own
/// client, so base URL, auth header, timeouts and 401 handling are defined
/// exactly once.
class ApiClient {
  ApiClient({
    required String? Function() readToken,
    required Future<void> Function() onUnauthorized,
  }) : _dio = Dio(
         BaseOptions(
           baseUrl: Env.apiBaseUrl,
           connectTimeout: const Duration(seconds: 15),
           receiveTimeout: const Duration(seconds: 20),
           contentType: Headers.jsonContentType,
           // Non-2xx is surfaced as a DioException so it can be translated
           // into an ApiException in one place, below.
           validateStatus: (status) =>
               status != null && status >= 200 && status < 300,
         ),
       ) {
    _dio.interceptors.add(
      AuthInterceptor(readToken: readToken, onUnauthorized: onUnauthorized),
    );
  }

  final Dio _dio;

  /// Exposed for a future Socket.IO layer and for tests that need to swap
  /// the transport; features should prefer the typed helpers below.
  Dio get raw => _dio;

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      _send(() => _dio.get(path, queryParameters: query));

  /// [options] lets one call override a base setting (e.g. a longer
  /// receiveTimeout for a slow endpoint) without changing the shared
  /// default every other request still uses — see AiRepository for why
  /// this exists.
  Future<dynamic> post(String path, {Object? body, Options? options}) =>
      _send(() => _dio.post(path, data: body, options: options));

  Future<dynamic> put(String path, {Object? body}) =>
      _send(() => _dio.put(path, data: body));

  Future<dynamic> patch(String path, {Object? body}) =>
      _send(() => _dio.patch(path, data: body));

  Future<dynamic> delete(String path) => _send(() => _dio.delete(path));

  /// Unwraps the API's `{ success, data }` envelope and converts any failure
  /// into an [ApiException], so callers only ever handle one error type.
  Future<dynamic> _send(Future<Response<dynamic>> Function() request) async {
    try {
      final response = await request();
      final body = response.data;
      if (body is Map && body.containsKey('data')) return body['data'];
      return body;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
