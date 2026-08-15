import 'package:dio/dio.dart';

/// A backend or transport failure reduced to something a screen can show.
///
/// The API answers errors as `{ success: false, message: "..." }` (see the
/// Express errorHandler), so the server's own wording is preferred whenever
/// it is present — those messages are already written for users, e.g.
/// "This service has 1 booking(s) on record and cannot be deleted."
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;

  /// True when the request never reached the server. Almost always a wrong
  /// API base URL on a physical device rather than a real outage, so the UI
  /// can say something more useful than "request failed".
  bool get isNetworkError => statusCode == null;

  factory ApiException.fromDio(DioException error) {
    final status = error.response?.statusCode;
    final data = error.response?.data;

    if (data is Map && data['message'] is String) {
      return ApiException(data['message'] as String, statusCode: status);
    }

    final message = switch (error.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout => 'The server took too long to respond.',
      DioExceptionType.connectionError =>
        'Could not reach the server. Check that the backend is running and '
            'that the app is pointed at the right address.',
      DioExceptionType.badCertificate => 'The server certificate was rejected.',
      DioExceptionType.cancel => 'Request cancelled.',
      _ => status == null ? 'Network error.' : 'Request failed ($status).',
    };

    return ApiException(message, statusCode: status);
  }

  @override
  String toString() => message;
}
