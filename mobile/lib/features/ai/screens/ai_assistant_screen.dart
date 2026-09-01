import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/l10n/locale_controller.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/state/auth_state.dart';
import '../data/ai_repository.dart';
import '../models/ai_models.dart';
import '../state/ai_chat_state.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/mode_selector.dart';
import '../widgets/typing_indicator.dart';

/// Entry point — owns a fresh, screen-scoped [AiChatState] for this visit
/// (see the class doc on AiChatState for why this isn't a global provider).
class AiAssistantScreen extends StatelessWidget {
  const AiAssistantScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AiChatState>(
      create: (context) => AiChatState(context.read<AiRepository>()),
      child: const _AiAssistantView(),
    );
  }
}

class _AiAssistantView extends StatefulWidget {
  const _AiAssistantView();

  @override
  State<_AiAssistantView> createState() => _AiAssistantViewState();
}

class _AiAssistantViewState extends State<_AiAssistantView> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  late final AiChatState _chatState;

  @override
  void initState() {
    super.initState();
    _chatState = context.read<AiChatState>();
    _chatState.addListener(_scrollToEnd);
    // Rebuilds just to toggle the Send button's enabled state as the user
    // types — not tied to AiChatState, so it never triggers an auto-scroll.
    _controller.addListener(_onDraftChanged);
  }

  @override
  void dispose() {
    _chatState.removeListener(_scrollToEnd);
    _controller.removeListener(_onDraftChanged);
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onDraftChanged() => setState(() {});

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  void _send() {
    final text = _controller.text;
    if (text.trim().isEmpty || _chatState.isSending) return;
    final locale = context.read<LocaleController>().locale.languageCode;
    _controller.clear();
    _chatState.sendMessage(text, locale: locale);
  }

  void _onFindProviders(int? categoryId) {
    context.go(Routes.customerExplore, extra: categoryId);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final state = context.watch<AiChatState>();
    final role = context.watch<AuthState>().role;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.aiAssistantTitle),
        actions: [
          if (state.messages.isNotEmpty)
            IconButton(
              tooltip: l10n.aiAssistantClear,
              onPressed: () => state.clear(),
              icon: const Icon(Icons.delete_outline),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.aiAssistantDescription,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: status.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 10),
                  ModeSelector(
                    mode: state.mode,
                    onChanged: state.isSending ? null : state.setMode,
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  if (state.messages.isEmpty)
                    ChatBubble(
                      message: ChatMessage(
                        id: 'welcome',
                        role: ChatRole.assistant,
                        content: l10n.aiAssistantWelcome,
                      ),
                      role: role,
                      onFindProviders: _onFindProviders,
                    ),
                  for (final message in state.messages)
                    ChatBubble(
                      message: message,
                      role: role,
                      onFindProviders: _onFindProviders,
                    ),
                  if (state.isSending) const TypingIndicator(),
                  if (state.hasError)
                    _ErrorBanner(
                      onRetry: state.canRetry ? () => state.retry() : null,
                    ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        enabled: !state.isSending,
                        minLines: 1,
                        maxLines: 5,
                        textInputAction: TextInputAction.newline,
                        decoration: InputDecoration(
                          hintText: l10n.aiAssistantInputHint,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      key: const Key('aiAssistantSendButton'),
                      tooltip: l10n.aiSend,
                      onPressed:
                          state.isSending || _controller.text.trim().isEmpty
                          ? null
                          : _send,
                      icon: state.isSending
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.send),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.onRetry});

  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: theme.colorScheme.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, color: theme.colorScheme.error, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              l10n.aiAssistantUnavailable,
              style: theme.textTheme.bodySmall,
            ),
          ),
          if (onRetry != null)
            TextButton(onPressed: onRetry, child: Text(l10n.actionRetry)),
        ],
      ),
    );
  }
}
