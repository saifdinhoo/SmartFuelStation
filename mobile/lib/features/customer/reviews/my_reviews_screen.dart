import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../data/customer_repository.dart';
import '../widgets/rating_stars.dart';

/// The customer's own reviews across every provider — GET /reviews/me.
/// Distinct from write_review_sheet.dart (submitting one) and
/// provider_reviews_screen.dart (a provider reading reviews about them).
class MyReviewsScreen extends StatelessWidget {
  const MyReviewsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<CustomerRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.myReviewsTitle)),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshMyReviews(),
        child: AsyncView<List<MyReview>>(
          value: repo.watchMyReviews(),
          errorTitle: l10n.myReviewsTitle,
          onRetry: () => repo.refreshMyReviews(),
          builder: (context, reviews) {
            if (reviews.isEmpty) {
              return ListView(
                children: [
                  SizedBox(
                    height: MediaQuery.sizeOf(context).height * 0.6,
                    child: EmptyView(
                      icon: Icons.star_outline_rounded,
                      title: l10n.myReviewsEmpty,
                    ),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: reviews.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) =>
                  _MyReviewCard(review: reviews[index], repo: repo),
            );
          },
        ),
      ),
    );
  }
}

class _MyReviewCard extends StatelessWidget {
  const _MyReviewCard({required this.review, required this.repo});

  final MyReview review;
  final CustomerRepository repo;

  Future<void> _confirmDelete(BuildContext context) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.reviewDeleteConfirmTitle),
        content: Text(l10n.reviewDeleteConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.actionCancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(
              l10n.reviewDelete,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      await repo.deleteReview(review.id);
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.reviewDeleted)));
    } on ApiException catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(review.providerBusinessName, style: theme.textTheme.titleSmall),
                  const SizedBox(height: 6),
                  RatingStars(rating: review.rating.toDouble(), showEmptyLabel: false),
                  if (review.comment != null && review.comment!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(review.comment!, style: theme.textTheme.bodyMedium),
                  ],
                  const SizedBox(height: 6),
                  Text(
                    _formatDate(review.createdAt),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: status.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: () => _confirmDelete(context),
              tooltip: AppLocalizations.of(context)!.reviewDelete,
              icon: Icon(Icons.delete_outline, color: status.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }

  static String _twoDigits(int n) => n.toString().padLeft(2, '0');

  String _formatDate(DateTime dateTime) {
    final local = dateTime.toLocal();
    return '${local.year}-${_twoDigits(local.month)}-${_twoDigits(local.day)}';
  }
}
