import 'package:flutter/material.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../models/ai_models.dart';

/// AUTO / SUPPORT / DIAGNOSIS, using the same ChoiceChip idiom as the
/// category filter on ExploreScreen. The request always carries the real
/// enum value — only these labels are human-friendly and localized.
class ModeSelector extends StatelessWidget {
  const ModeSelector({super.key, required this.mode, this.onChanged});

  final AiMode mode;
  final ValueChanged<AiMode>? onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    String label(AiMode value) => switch (value) {
      AiMode.auto => l10n.aiModeAuto,
      AiMode.support => l10n.aiModeSupport,
      AiMode.diagnosis => l10n.aiModeDiagnosis,
    };

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final value in AiMode.values) ...[
            if (value != AiMode.values.first) const SizedBox(width: 8),
            ChoiceChip(
              label: Text(label(value)),
              selected: mode == value,
              onSelected: onChanged == null
                  ? null
                  : (_) => onChanged!(value),
            ),
          ],
        ],
      ),
    );
  }
}
