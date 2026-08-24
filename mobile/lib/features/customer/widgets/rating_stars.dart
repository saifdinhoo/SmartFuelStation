import 'package:flutter/material.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/theme/app_colors.dart';

/// Read-only star display. [rating] is null when a business has no reviews,
/// which renders as "not rated yet" rather than zero stars — showing an
/// empty five-star row would read as a bad rating instead of no data.
class RatingStars extends StatelessWidget {
  const RatingStars({
    super.key,
    required this.rating,
    this.reviewCount,
    this.size = 14,
    this.showEmptyLabel = true,
  });

  final double? rating;
  final int? reviewCount;
  final double size;
  final bool showEmptyLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final l10n = AppLocalizations.of(context)!;

    if (rating == null) {
      if (!showEmptyLabel) return const SizedBox.shrink();
      return Text(
        l10n.providerNoRating,
        style: theme.textTheme.bodySmall?.copyWith(
          color: status.mutedForeground,
        ),
      );
    }

    final rounded = rating!.round();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Icon(
            i <= rounded ? Icons.star_rounded : Icons.star_outline_rounded,
            size: size + 2,
            color: i <= rounded ? status.warning : status.mutedForeground,
          ),
        const SizedBox(width: 6),
        Text(
          rating!.toStringAsFixed(1),
          style: theme.textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        if (reviewCount != null) ...[
          const SizedBox(width: 4),
          Text(
            '(${reviewCount!})',
            style: theme.textTheme.bodySmall?.copyWith(
              color: status.mutedForeground,
            ),
          ),
        ],
      ],
    );
  }
}

/// Tappable 1–5 selector used when writing a review.
class RatingInput extends StatelessWidget {
  const RatingInput({super.key, required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final status = Theme.of(context).extension<AppStatusColors>()!;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          IconButton(
            onPressed: () => onChanged(i),
            // Each star is its own control so screen readers can announce
            // and select a specific value.
            tooltip: '$i',
            icon: Icon(
              i <= value ? Icons.star_rounded : Icons.star_outline_rounded,
              size: 34,
              color: i <= value ? status.warning : status.mutedForeground,
            ),
          ),
      ],
    );
  }
}
