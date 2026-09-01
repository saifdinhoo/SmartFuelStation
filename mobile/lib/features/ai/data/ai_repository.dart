import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../models/ai_models.dart';

/// The one HTTP call this feature ever makes — always our own backend, never
/// Gemini directly. There is no GEMINI_API_KEY and no Google endpoint
/// anywhere in this app; `ApiClient` already carries the JWT via its own
/// interceptor, so this never needs to attach a token or a role by hand.
class AiRepository {
  AiRepository(this._api);

  final ApiClient _api;

  // The backend's own Gemini call is capped at 30s (see
  // backend/src/services/ai/providers/gemini.provider.js's
  // REQUEST_TIMEOUT_MS) and always answers with a controlled response by
  // then — either a real reply or its own 502/503/504 error. ApiClient's
  // shared default receiveTimeout is only 20s (unchanged, still correct for
  // every other endpoint), which would race the backend's own timeout: on a
  // slow-but-real Gemini reply landing close to the backend's ceiling, Dio
  // could cut the connection a moment before the backend's already-in-flight
  // (and about to succeed) response arrived, showing a false "temporarily
  // unavailable" for a request the backend was about to complete correctly.
  // 40s keeps a safety margin above the backend's 30s ceiling — this
  // override is scoped to this one call, not a global timeout change.
  static const _receiveTimeout = Duration(seconds: 40);

  Future<AiChatResponse> sendMessage(AiChatRequest request) async {
    final raw = await _api.post(
      '/ai/chat',
      body: request.toJson(),
      options: Options(receiveTimeout: _receiveTimeout),
    );
    return AiChatResponse.fromJson(Map<String, dynamic>.from(raw as Map));
  }
}
