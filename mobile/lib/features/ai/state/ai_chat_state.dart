import 'package:flutter/foundation.dart';

import '../../../core/network/api_exception.dart';
import '../data/ai_repository.dart';
import '../models/ai_models.dart';

/// One rendered bubble. Only [role]/[content] ever cross back into a future
/// request's `conversation` — everything else here is local presentation
/// state (which diagnosis panel to show, which CTA, etc.).
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    this.responseMode,
    this.diagnosis,
    this.suggestedAction,
    this.suggestedCategoryId,
  });

  final String id;
  final ChatRole role;
  final String content;
  final AiResponseMode? responseMode;
  final Diagnosis? diagnosis;
  final SuggestedAction? suggestedAction;
  final int? suggestedCategoryId;
}

/// Conversation state for one visit to the AI Assistant screen.
///
/// Deliberately screen-scoped — created fresh by a local
/// ChangeNotifierProvider in AiAssistantScreen, not registered in
/// app_providers.dart like AuthState/LocationService. Chat is transient
/// client state, not a session concern: there is nothing to persist and
/// nothing to clear on logout, since leaving the screen already disposes it.
class AiChatState extends ChangeNotifier {
  AiChatState(this._repository);

  final AiRepository _repository;

  // Mirrors the backend's own validateConversation() cap
  // (backend/src/services/ai.service.js) — kept in sync by hand since there
  // is no shared package between mobile and backend.
  static const _maxHistoryEntries = 20;

  final List<ChatMessage> _messages = [];
  AiMode _mode = AiMode.auto;
  bool _isSending = false;
  bool _hasError = false;
  AiChatRequest? _lastFailedRequest;
  int _idCounter = 0;

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  AiMode get mode => _mode;
  bool get isSending => _isSending;
  bool get hasError => _hasError;
  bool get canRetry => _hasError && _lastFailedRequest != null;

  String _newId() => 'msg-${_idCounter++}';

  /// Switching modes never reinterprets earlier bubbles — each already
  /// carries the real mode it was answered in via [ChatMessage.responseMode].
  void setMode(AiMode mode) {
    if (_mode == mode || _isSending) return;
    _mode = mode;
    notifyListeners();
  }

  // A follow-up question is folded into the assistant's own history content
  // so a future turn still has it even if `reply` didn't restate it
  // verbatim — conversation entries only ever carry role/content, never a
  // separate diagnosis field.
  AiConversationMessage _toConversationEntry(ChatMessage message) {
    final followUp = message.diagnosis?.followUpQuestion;
    final content = (followUp != null && followUp.isNotEmpty)
        ? '${message.content}\n\n$followUp'
        : message.content;
    return AiConversationMessage(role: message.role, content: content);
  }

  Future<void> sendMessage(String text, {required String locale}) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isSending) return;

    // Snapshot of prior turns BEFORE this turn's user bubble is appended —
    // the current message is only ever sent once, as `message`, never
    // duplicated as the last conversation entry too.
    final priorMessages = _messages.length > _maxHistoryEntries
        ? _messages.sublist(_messages.length - _maxHistoryEntries)
        : _messages;
    final conversation = priorMessages.map(_toConversationEntry).toList();

    _messages.add(ChatMessage(id: _newId(), role: ChatRole.user, content: trimmed));

    final request = AiChatRequest(
      message: trimmed,
      mode: _mode,
      conversation: conversation,
      locale: locale,
    );
    notifyListeners();
    await _send(request);
  }

  /// Replays the exact request that failed — never a fresh message bubble.
  Future<void> retry() async {
    final request = _lastFailedRequest;
    if (request == null || _isSending) return;
    await _send(request);
  }

  Future<void> _send(AiChatRequest request) async {
    _isSending = true;
    _hasError = false;
    notifyListeners();

    try {
      final response = await _repository.sendMessage(request);
      _messages.add(
        ChatMessage(
          id: _newId(),
          role: ChatRole.assistant,
          content: response.reply,
          responseMode: response.mode,
          diagnosis: response.diagnosis,
          suggestedAction: response.suggestedAction,
          suggestedCategoryId: response.suggestedCategoryId,
        ),
      );
      _lastFailedRequest = null;
    } on ApiException {
      // The screen renders one fixed, localized, safe message regardless of
      // the underlying status/network failure — never the raw exception
      // text (which for a network error can include the API host).
      _hasError = true;
      _lastFailedRequest = request;
    } finally {
      _isSending = false;
      notifyListeners();
    }
  }

  void clear() {
    _messages.clear();
    _hasError = false;
    _lastFailedRequest = null;
    _isSending = false;
    notifyListeners();
  }
}
