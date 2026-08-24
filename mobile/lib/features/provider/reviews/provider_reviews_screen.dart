import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../customer/widgets/rating_stars.dart';
import '../data/provider_repository.dart';

/// The business's own reviews.
///
/// Read-only by necessity: `Review` has no reply column, so there is no
/// response feature to build. The screen says that rather than showing a
/// disabled reply box.
class ProviderReviewsScreen extends StatefulWidget {
  const ProviderReviewsScreen({super.key});

  @override
  State<ProviderReviewsScreen> createState() => _ProviderReviewsScreenState();
}

class _ProviderReviewsScreenState extends State<ProviderReviewsScreen> {
  int? _ratingFilter;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.pReviewsTitle)),
      body: AsyncView<OwnProviderProfile>(
        value: repo.watchProfile(),
        onRetry: repo.refreshProfile,
        builder: (context, profile) {
          final all =
              repo.watchReviews(profile.id).valueOrNull ?? const <Review>[];
          final reviews = _ratingFilter == null
              ? all
              : all.where((r) => r.rating == _ratingFilter).toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              // A dash, never 0.0 — no reviews is not a bad
                              // score.
                              profile.rating.averageRating == null
                                  ? '—'
                                  : profile.rating.averageRating!
                                        .toStringAsFixed(1),
                              style: theme.textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            RatingStars(
                              rating: profile.rating.averageRating,
                              showEmptyLabel: false,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              l10n.pReviewsAverage,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: status.mutedForeground,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${profile.rating.reviewCount}',
                              style: theme.textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 26),
                            Text(
                              l10n.pReviewsTotal,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: status.mutedForeground,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    ChoiceChip(
                      label: Text(l10n.pReviewsFilterAll),
                      selected: _ratingFilter == null,
                      onSelected: (_) => setState(() => _ratingFilter = null),
                    ),
                    for (var stars = 5; stars >= 1; stars--) ...[
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: Text('$stars ★'),
                        selected: _ratingFilter == stars,
                        onSelected: (_) =>
                            setState(() => _ratingFilter = stars),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 16),
              if (reviews.isEmpty)
                SizedBox(
                  height: 200,
                  child: EmptyView(
                    icon: Icons.reviews_outlined,
                    title: l10n.pReviewsNone,
                    message: all.isEmpty ? l10n.pReviewsNoneBody : null,
                  ),
                )
              else
                ...reviews.map(
                  (review) => Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      review.customerName,
                                      style: theme.textTheme.titleSmall,
                                    ),
                                    Text(
                                      '${review.createdAt.year}-'
                                      '${review.createdAt.month.toString().padLeft(2, '0')}-'
                                      '${review.createdAt.day.toString().padLeft(2, '0')}',
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(
                                            color: status.mutedForeground,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              RatingStars(
                                rating: review.rating.toDouble(),
                                showEmptyLabel: false,
                                size: 12,
                              ),
                            ],
                          ),
                          if (review.comment != null &&
                              review.comment!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              review.comment!,
                              style: theme.textTheme.bodyMedium,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),

              const SizedBox(height: 8),
              Text(
                l10n.pReviewsNoReplies,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
