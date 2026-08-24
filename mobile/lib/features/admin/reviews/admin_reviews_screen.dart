import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../customer/widgets/rating_stars.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

/// Platform-wide review moderation.
///
/// Rating and business filters are applied server-side by
/// GET /admin/reviews. Deletion goes through DELETE /reviews/:id, whose
/// service layer lets an admin remove any review while a customer may only
/// remove their own — the role check stays on the backend.
class AdminReviewsScreen extends StatefulWidget {
  const AdminReviewsScreen({super.key});

  @override
  State<AdminReviewsScreen> createState() => _AdminReviewsScreenState();
}

class _AdminReviewsScreenState extends State<AdminReviewsScreen> {
  String _rating = 'ALL';
  String _providerId = 'ALL';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    final ratings = ['ALL', '5', '4', '3', '2', '1'];

    // The business filter is built from the admin provider list, which is
    // already cached for the providers tab — no extra endpoint for it.
    final providers =
        repo.watchProviders().valueOrNull ?? const <AdminProviderRow>[];
    final providerOptions = ['ALL', ...providers.map((p) => '${p.id}')];

    String providerLabel(String value) {
      if (value == 'ALL') return l10n.aReviewsAllProviders;
      final match = providers.where((p) => '${p.id}' == value);
      return match.isEmpty ? value : match.first.businessName;
    }

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aReviewsTitle)),
      body: RefreshIndicator(
        onRefresh: () =>
            repo.refreshReviews(rating: _rating, providerId: _providerId),
        child: AsyncView<List<AdminReview>>(
          value: repo.watchReviews(rating: _rating, providerId: _providerId),
          errorTitle: l10n.aReviewsTitle,
          onRetry: () =>
              repo.refreshReviews(rating: _rating, providerId: _providerId),
          builder: (context, reviews) => CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AdminFilterBar<String>(
                        options: ratings,
                        selected: _rating,
                        labelOf: (r) =>
                            r == 'ALL' ? l10n.pReviewsFilterAll : '$r ★',
                        onSelected: (r) => setState(() => _rating = r),
                      ),
                      if (providerOptions.length > 1) ...[
                        const SizedBox(height: 8),
                        AdminFilterBar<String>(
                          options: providerOptions,
                          selected: _providerId,
                          labelOf: providerLabel,
                          onSelected: (p) => setState(() => _providerId = p),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              if (reviews.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyView(title: l10n.aReviewsNoResults),
                )
              else
                SliverList.builder(
                  itemCount: reviews.length,
                  itemBuilder: (context, i) => Padding(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      0,
                      16,
                      i == reviews.length - 1 ? 28 : 10,
                    ),
                    child: _ReviewCard(review: reviews[i]),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});

  final AdminReview review;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                RatingStars(rating: review.rating.toDouble()),
                const Spacer(),
                Text(
                  adminDate(review.createdAt),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: status.mutedForeground,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              review.comment?.trim().isNotEmpty == true
                  ? review.comment!
                  : l10n.aReviewsNoComment,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 10),
            Text(
              '${review.providerName} · ${l10n.aReviewsBy} '
              '${review.customerName ?? '—'}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: status.mutedForeground,
              ),
            ),
            const SizedBox(height: 6),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton.icon(
                onPressed: () => _confirmDelete(context, review),
                icon: const Icon(Icons.delete_outline, size: 18),
                label: Text(l10n.actionDelete),
                style: TextButton.styleFrom(
                  foregroundColor: theme.colorScheme.error,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, AdminReview review) async {
    final l10n = AppLocalizations.of(context)!;
    final messenger = ScaffoldMessenger.of(context);
    final repo = context.read<AdminRepository>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.aReviewsDeleteTitle),
        content: Text(l10n.aReviewsDeleteBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(l10n.actionCancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(l10n.actionDelete),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await repo.deleteReview(review.id, providerId: review.providerId);
      messenger.showSnackBar(SnackBar(content: Text(l10n.aReviewsDeleted)));
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }
}
