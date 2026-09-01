import '../../../core/models/parsing.dart';

/// Typed mirror of the real POST /api/ai/chat contract (see
/// backend/src/services/ai.service.js and diagnosisSchema.js) — no invented
/// fields. Parsing uses the same tolerant coercion helpers as every other
/// model in core/models/parsing.dart: an unexpected shape becomes null or a
/// safe fallback, never a thrown exception.

enum ChatRole {
  user,
  assistant;

  String get apiValue => switch (this) {
    ChatRole.user => 'user',
    ChatRole.assistant => 'assistant',
  };
}

/// The mode a request asks for. AUTO is only ever sent, never received back
/// — see [AiResponseMode] for what a response actually resolved to.
enum AiMode {
  auto,
  support,
  diagnosis;

  String get apiValue => switch (this) {
    AiMode.auto => 'AUTO',
    AiMode.support => 'SUPPORT',
    AiMode.diagnosis => 'DIAGNOSIS',
  };
}

/// The mode a response actually resolved to. The backend always answers with
/// a concrete mode — a response is never itself tagged AUTO.
enum AiResponseMode {
  support,
  diagnosis,
  unknown;

  static AiResponseMode fromApi(String? value) => switch (value) {
    'SUPPORT' => AiResponseMode.support,
    'DIAGNOSIS' => AiResponseMode.diagnosis,
    _ => AiResponseMode.unknown,
  };
}

enum DiagnosisUrgency {
  low,
  medium,
  high,
  emergency,
  unknown;

  static DiagnosisUrgency fromApi(String? value) => switch (value) {
    'LOW' => DiagnosisUrgency.low,
    'MEDIUM' => DiagnosisUrgency.medium,
    'HIGH' => DiagnosisUrgency.high,
    'EMERGENCY' => DiagnosisUrgency.emergency,
    _ => DiagnosisUrgency.unknown,
  };
}

enum DiagnosisLikelihood {
  likely,
  possible,
  lessLikely,
  unknown;

  static DiagnosisLikelihood fromApi(String? value) => switch (value) {
    'LIKELY' => DiagnosisLikelihood.likely,
    'POSSIBLE' => DiagnosisLikelihood.possible,
    'LESS_LIKELY' => DiagnosisLikelihood.lessLikely,
    _ => DiagnosisLikelihood.unknown,
  };
}

/// Nullable by design — a missing or unrecognized value collapses to "no
/// action to suggest" rather than a fabricated one, same as the real `NONE`
/// value collapses to no CTA in the UI.
enum SuggestedAction {
  findProvider,
  seekImmediateHelp,
  none;

  static SuggestedAction? fromApi(String? value) => switch (value) {
    'FIND_PROVIDER' => SuggestedAction.findProvider,
    'SEEK_IMMEDIATE_HELP' => SuggestedAction.seekImmediateHelp,
    'NONE' => SuggestedAction.none,
    _ => null,
  };
}

class DiagnosisCause {
  const DiagnosisCause({
    required this.name,
    required this.likelihood,
    required this.explanation,
  });

  final String name;
  final DiagnosisLikelihood likelihood;
  final String explanation;

  factory DiagnosisCause.fromJson(Map<String, dynamic> json) => DiagnosisCause(
    name: asString(json['name']),
    likelihood: DiagnosisLikelihood.fromApi(asStringOrNull(json['likelihood'])),
    explanation: asString(json['explanation']),
  );
}

class Diagnosis {
  const Diagnosis({
    required this.urgency,
    required this.possibleCauses,
    required this.recommendedServiceCategory,
    required this.safetyAdvice,
    required this.followUpQuestion,
  });

  final DiagnosisUrgency urgency;
  final List<DiagnosisCause> possibleCauses;
  final String? recommendedServiceCategory;
  final String? safetyAdvice;
  final String? followUpQuestion;

  factory Diagnosis.fromJson(Map<String, dynamic> json) => Diagnosis(
    urgency: DiagnosisUrgency.fromApi(asStringOrNull(json['urgency'])),
    possibleCauses: asMapList(
      json['possibleCauses'],
    ).map(DiagnosisCause.fromJson).toList(),
    recommendedServiceCategory: asStringOrNull(
      json['recommendedServiceCategory'],
    ),
    safetyAdvice: asStringOrNull(json['safetyAdvice']),
    followUpQuestion: asStringOrNull(json['followUpQuestion']),
  );

  /// `diagnosis` is null on a SUPPORT response — this is the one place that
  /// nullability is handled so every call site gets a real [Diagnosis] or
  /// nothing, never a crash on an unexpected shape.
  static Diagnosis? fromJsonOrNull(Object? value) {
    final map = asMapOrNull(value);
    return map == null ? null : Diagnosis.fromJson(map);
  }
}

class AiChatResponse {
  const AiChatResponse({
    required this.reply,
    required this.mode,
    required this.suggestedAction,
    required this.suggestedCategoryId,
    required this.diagnosis,
  });

  final String reply;
  final AiResponseMode mode;
  final SuggestedAction? suggestedAction;
  final int? suggestedCategoryId;
  final Diagnosis? diagnosis;

  factory AiChatResponse.fromJson(Map<String, dynamic> json) => AiChatResponse(
    reply: asString(json['reply']),
    mode: AiResponseMode.fromApi(asStringOrNull(json['mode'])),
    suggestedAction: SuggestedAction.fromApi(
      asStringOrNull(json['suggestedAction']),
    ),
    suggestedCategoryId: asIntOrNull(json['suggestedCategoryId']),
    diagnosis: Diagnosis.fromJsonOrNull(json['diagnosis']),
  );
}

/// A single prior turn, sent back as bounded history. Only role/content ever
/// cross the wire — no UI metadata (ids, timestamps, diagnosis payloads).
class AiConversationMessage {
  const AiConversationMessage({required this.role, required this.content});

  final ChatRole role;
  final String content;

  Map<String, dynamic> toJson() => {'role': role.apiValue, 'content': content};
}

class AiChatRequest {
  const AiChatRequest({
    required this.message,
    required this.mode,
    required this.conversation,
    required this.locale,
  });

  final String message;
  final AiMode mode;
  final List<AiConversationMessage> conversation;
  final String locale;

  // Deliberately exactly these four keys — no `role`. The backend derives
  // the caller's role from the verified JWT (see ApiClient/AuthInterceptor),
  // never from the request body.
  Map<String, dynamic> toJson() => {
    'message': message,
    'mode': mode.apiValue,
    'conversation': conversation.map((entry) => entry.toJson()).toList(),
    'locale': locale,
  };
}
