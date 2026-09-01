import 'package:flutter/material.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/status_chip.dart';
import 'favorite_toggle_button.dart';
import 'rating_stars.dart';

/// One business in a discovery list.
///
/// [rating] is passed in rather than fetched here: the list would otherwise
/// fire one rating request per visible card. Callers supply it only where
/// they already have it (details screen); in lists the review count from
/// GET /providers stands in.
class ProviderCard extends StatelessWidget {
  const ProviderCard({
    super.key,
    required this.provider,
    required this.onTap,
    this.rating,
  });

  final ServiceProvider provider;
  final VoidCallback onTap;
  final double? rating;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final status = theme.extension<AppStatusColors>()!;
    final price = provider.lowestPrice;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      provider.businessName,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusChip(
                    label: provider.isOpen
                        ? l10n.providerOpen
                        : l10n.providerClosed,
                    tone: provider.isOpen
                        ? StatusTone.success
                        : StatusTone.neutral,
                  ),
                  FavoriteToggleButton(providerId: provider.id, compact: true),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.place_outlined,
                    size: 14,
                    color: status.mutedForeground,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      provider.address,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: status.mutedForeground,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 12,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (rating != null)
                    RatingStars(
                      rating: rating,
                      reviewCount: provider.reviewCount,
                      showEmptyLabel: false,
                    )
                  else
                    Text(
                      l10n.providerReviewCount(provider.reviewCount),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: status.mutedForeground,
                      ),
                    ),
                  if (provider.distanceKm != null)
                    _Meta(
                      icon: Icons.near_me_outlined,
                      label: l10n.providerDistanceKm(
                        provider.distanceKm!.toStringAsFixed(1),
                      ),
                    ),
                  if (provider.estimatedWaitMinutes > 0)
                    _Meta(
                      icon: Icons.schedule,
                      label: l10n.providerWaitMinutes(
                        provider.estimatedWaitMinutes,
                      ),
                    ),
                  if (price != null)
                    _Meta(
                      icon: Icons.payments_outlined,
                      label: '\$${price.toStringAsFixed(2)}+',
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: status.mutedForeground),
        const SizedBox(width: 4),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: status.mutedForeground,
          ),
        ),
      ],
    );
  }
}
