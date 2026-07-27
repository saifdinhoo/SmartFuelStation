import 'dart:convert';
import 'package:http/http.dart' as http;

// Android emulator reaches the host machine's localhost via 10.0.2.2,
// not 127.0.0.1/localhost (that would point at the emulator itself).
const String apiBaseUrl = 'http://10.0.2.2:5000/api';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}

// Thin wrapper around http: adds the base URL, JSON headers, the auth
// token (if present), and throws on non-2xx so callers can just await.
Future<dynamic> apiRequest(
  String path, {
  String method = 'GET',
  Map<String, dynamic>? body,
  String? token,
}) async {
  final uri = Uri.parse('$apiBaseUrl$path');
  final headers = {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  http.Response response;
  switch (method) {
    case 'POST':
      response = await http.post(uri, headers: headers, body: jsonEncode(body));
      break;
    case 'PUT':
      response = await http.put(uri, headers: headers, body: jsonEncode(body));
      break;
    case 'PATCH':
      response = await http.patch(uri, headers: headers, body: jsonEncode(body));
      break;
    case 'DELETE':
      response = await http.delete(uri, headers: headers);
      break;
    default:
      response = await http.get(uri, headers: headers);
  }

  final data = response.body.isEmpty ? null : jsonDecode(response.body);

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw ApiException(data?['message'] ?? 'Request failed');
  }

  return data;
}
