import 'package:flutter/material.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_chip.dart';
import '../../auth/state/auth_state.dart';
import '../models/ai_models.dart';

/// Structured DIAGNOSIS output — never a raw JSON/text blob. Only fields
/// that are actually present in [diagnosis] are rendered.
class DiagnosisCard extends StatelessWidget {
  const DiagnosisCard({
    super.key,
    required this.diagnosis,
    required this.suggestedAction,
    required this.suggestedCategoryId,
    required this.role,
    required this.onFindProviders,
  });

  final Diagnosis diagnosis;
  final SuggestedAction? suggestedAction;
  final int? suggestedCategoryId;
  final UserRole? role;

  /// Navigates into the real Explore/discovery screen. Passing `null` is
  /// safe — Explore already treats "no initial category" as "all
  /// categories" — so an unresolved id never needs special-casing here.
  final ValueChanged<int?> onFindProviders;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    // Only CUSTOMER has a real provider-discovery route to navigate into —
    // provider/admin still see the full diagnosis, just without a CTA that
    // would lead them into a route their role can't reach.
    final canNavigateToDiscovery = role == UserRole.customer;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.medical_information_outlined,
                  size: 18,
                  color: status.mutedForeground,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l10n.aiDiagnosisTitle,
                    style: theme.textTheme.titleSmall,
                  ),
                ),
                const SizedBox(width: 8),
                _UrgencyChip(urgency: diagnosis.urgency),
              ],
            ),

            // Safety advice always renders before any CTA below, regardless
            // of urgency — most important for EMERGENCY.
            if (diagnosis.safetyAdvice != null) ...[
              const SizedBox(height: 12),
              _CalloutBox(
                icon: Icons.warning_amber_rounded,
                color: _safetyColor(theme, status, diagnosis.urgency),
                title: l10n.aiSafetyAdvice,
                body: diagnosis.safetyAdvice!,
              ),
            ],

            if (diagnosis.possibleCauses.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(l10n.aiPossibleCauses, style: theme.textTheme.labelMedium),
              const SizedBox(height: 6),
              for (final cause in diagnosis.possibleCauses)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _CauseTile(cause: cause),
                ),
            ],

            if (diagnosis.followUpQuestion != null) ...[
              const SizedBox(height: 4),
              _CalloutBox(
                icon: Icons.help_outline,
                color: theme.colorScheme.primary,
                title: l10n.aiNeedMoreInfo,
                body: diagnosis.followUpQuestion!,
              ),
            ],

            if (diagnosis.recommendedServiceCategory != null) ...[
              const SizedBox(height: 12),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '${l10n.aiRecommendedService}: ',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    TextSpan(
                      text: diagnosis.recommendedServiceCategory,
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],

            if (suggestedAction == SuggestedAction.seekImmediateHelp) ...[
              const SizedBox(height: 12),
              _CalloutBox(
                icon: Icons.emergency_outlined,
                color: theme.colorScheme.error,
                title: l10n.aiSeekImmediateHelp,
                body: l10n.aiSeekImmediateHelpBody,
              ),
            ],

            if (canNavigateToDiscovery &&
                suggestedAction == SuggestedAction.findProvider &&
                suggestedCategoryId != null) ...[
              const SizedBox(height: 12),
              PrimaryButton(
                label: l10n.aiFindProviders,
                icon: Icons.search,
                onPressed: () => onFindProviders(suggestedCategoryId),
              ),
            ] else if (canNavigateToDiscovery &&
                suggestedAction == SuggestedAction.seekImmediateHelp) ...[
              // Secondary, non-primary option only — never framed as "Book
              // now" or a substitute for emergency/roadside assistance.
              const SizedBox(height: 8),
              PrimaryButton(
                label: l10n.aiFindNearbySecondary,
                icon: Icons.search,
                variant: ButtonVariant.outline,
                onPressed: () => onFindProviders(suggestedCategoryId),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _safetyColor(
    ThemeData theme,
    AppStatusColors status,
    DiagnosisUrgency urgency,
  ) => switch (urgency) {
    DiagnosisUrgency.emergency => theme.colorScheme.error,
    DiagnosisUrgency.high => status.warning,
    DiagnosisUrgency.medium || DiagnosisUrgency.low || DiagnosisUrgency.unknown =>
      status.mutedForeground,
  };
}

class _UrgencyChip extends StatelessWidget {
  const _UrgencyChip({required this.urgency});

  final DiagnosisUrgency urgency;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    final (label, tone) = switch (urgency) {
      DiagnosisUrgency.low => (l10n.aiUrgencyLow, StatusTone.success),
      DiagnosisUrgency.medium => (l10n.aiUrgencyMedium, StatusTone.warning),
      DiagnosisUrgency.high => (l10n.aiUrgencyHigh, StatusTone.danger),
      DiagnosisUrgency.emergency => (l10n.aiUrgencyEmergency, StatusTone.danger),
      DiagnosisUrgency.unknown => (l10n.aiUrgencyUnknown, StatusTone.neutral),
    };

    return StatusChip(label: label, tone: tone);
  }
}

class _CauseTile extends StatelessWidget {
  const _CauseTile({required this.cause});

  final DiagnosisCause cause;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    String likelihoodLabel(DiagnosisLikelihood value) => switch (value) {
      DiagnosisLikelihood.likely => l10n.aiLikelihoodLikely,
      DiagnosisLikelihood.possible => l10n.aiLikelihoodPossible,
      DiagnosisLikelihood.lessLikely => l10n.aiLikelihoodLessLikely,
      DiagnosisLikelihood.unknown => l10n.aiLikelihoodUnknown,
    };

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        border: Border.all(color: theme.dividerColor),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            // Rendered exactly as the model produced it — never rewritten,
            // and in whichever language the response itself was in.
            cause.name,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: '${l10n.aiLikelihood}: ',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                TextSpan(
                  text: likelihoodLabel(cause.likelihood),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            cause.explanation,
            style: theme.textTheme.bodySmall?.copyWith(
              color: status.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

/// Shared box for safety advice / follow-up question / seek-help — same
/// tinted-container treatment as the booking timeline's cancelled/rejected
/// state, just parameterized by color.
class _CalloutBox extends StatelessWidget {
  const _CalloutBox({
    required this.icon,
    required this.color,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(body, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
