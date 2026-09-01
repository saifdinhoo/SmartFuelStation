import 'package:flutter/material.dart';

import '../../auth/state/auth_state.dart';
import '../models/ai_models.dart';
import '../state/ai_chat_state.dart';
import 'diagnosis_card.dart';

/// One user or assistant turn. `CrossAxisAlignment.start`/`.end` are already
/// logical (RTL-aware) in Flutter, so the user's own bubble stays visually
/// distinguishable from the assistant's without any left/right assumption —
/// it is always the "end"-aligned, primary-colored one, on whichever side
/// that resolves to for the active text direction.
class ChatBubble extends StatelessWidget {
  const ChatBubble({
    super.key,
    required this.message,
    required this.role,
    required this.onFindProviders,
  });

  final ChatMessage message;
  final UserRole? role;
  final ValueChanged<int?> onFindProviders;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isUser = message.role == ChatRole.user;
    final showDiagnosis =
        !isUser &&
        message.responseMode == AiResponseMode.diagnosis &&
        message.diagnosis != null;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: isUser
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * 0.8,
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser
                    ? theme.colorScheme.primary
                    : theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadiusDirectional.only(
                  topStart: const Radius.circular(16),
                  topEnd: const Radius.circular(16),
                  bottomStart: Radius.circular(isUser ? 16 : 4),
                  bottomEnd: Radius.circular(isUser ? 4 : 16),
                ),
              ),
              child: Text(
                message.content,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isUser
                      ? theme.colorScheme.onPrimary
                      : theme.colorScheme.onSurface,
                ),
              ),
            ),
          ),
          if (showDiagnosis) ...[
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.sizeOf(context).width,
              ),
              child: DiagnosisCard(
                diagnosis: message.diagnosis!,
                suggestedAction: message.suggestedAction,
                suggestedCategoryId: message.suggestedCategoryId,
                role: role,
                onFindProviders: onFindProviders,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
