import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/status_chip.dart';
import '../booking/create_booking_sheet.dart';
import '../../../core/state/query_cache.dart';
import '../data/customer_repository.dart';
import '../widgets/rating_stars.dart';

class ProviderDetailsScreen extends StatefulWidget {
  const ProviderDetailsScreen({super.key, required this.providerId});

  final int providerId;

  @override
  State<ProviderDetailsScreen> createState() => _ProviderDetailsScreenState();
}

class _ProviderDetailsScreenState extends State<ProviderDetailsScreen> {
  /// Favourites have no backend column, so this is intentionally local and
  /// in-memory only. It is labelled as such in the UI rather than pretending
  /// to sync.
  bool _favorite = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<CustomerRepository>();
    // Rebuild when any watched cache key resolves or is invalidated.
    context.watchQueries();

    // There is no GET /providers/:id endpoint; the list is the source, and
    // it is already cached, so this costs nothing extra.
    final providersState = repo.watchProviders();
    final ratingState = repo.watchRating(widget.providerId);
    final reviewsState = repo.watchProviderReviews(widget.providerId);
    final queueState = repo.watchQueueSummary(widget.providerId);

    return Scaffold(
      appBar: AppBar(),
      body: AsyncView<List<ServiceProvider>>(
        value: providersState,
        onRetry: repo.refreshProviders,
        builder: (context, providers) {
          final provider = providers
              .where((p) => p.id == widget.providerId)
              .firstOrNull;

          if (provider == null) {
            return Center(child: Text(l10n.exploreNoProviders));
          }

          final rating = ratingState.valueOrNull;
          final reviews = reviewsState.valueOrNull ?? const <Review>[];
          final queue = queueState.valueOrNull;
          final bookable = provider.bookableServices;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      provider.businessName,
                      style: theme.textTheme.headlineSmall,
                    ),
                  ),
                  StatusChip(
                    label: provider.isOpen
                        ? l10n.providerOpen
                        : l10n.providerClosed,
                    tone: provider.isOpen
                        ? StatusTone.success
                        : StatusTone.neutral,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              RatingStars(
                rating: rating?.averageRating,
                reviewCount: rating?.reviewCount,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.place_outlined,
                    size: 16,
                    color: status.mutedForeground,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      provider.address,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: status.mutedForeground,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      // No maps integration yet; saying so beats a button
                      // that silently does nothing.
                      onPressed: () =>
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(l10n.providerDirectionsUnavailable),
                            ),
                          ),
                      icon: const Icon(Icons.directions_outlined, size: 18),
                      label: Text(l10n.providerDirections),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        setState(() => _favorite = !_favorite);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(l10n.providerFavoriteLocalOnly),
                          ),
                        );
                      },
                      icon: Icon(
                        _favorite ? Icons.favorite : Icons.favorite_border,
                        size: 18,
                      ),
                      label: Text(
                        _favorite
                            ? l10n.providerUnfavorite
                            : l10n.providerFavorite,
                      ),
                    ),
                  ),
                ],
              ),

              if (provider.description != null &&
                  provider.description!.isNotEmpty) ...[
                const SizedBox(height: 20),
                _Section(title: l10n.providerAbout),
                const SizedBox(height: 6),
                Text(provider.description!, style: theme.textTheme.bodyMedium),
              ],

              const SizedBox(height: 20),
              _Section(title: l10n.providerQueueNow),
              const SizedBox(height: 6),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Icon(Icons.people_outline, color: status.mutedForeground),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          queue == null
                              ? '—'
                              : l10n.providerInLine(queue.queueLength),
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                      Text(
                        queue == null
                            ? ''
                            : l10n.providerWaitMinutes(
                                queue.estimatedWaitMinutes,
                              ),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: status.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),
              _Section(title: l10n.providerServices),
              const SizedBox(height: 6),
              if (bookable.isEmpty)
                Text(
                  l10n.providerNoServices,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: status.mutedForeground,
                  ),
                )
              else
                ...bookable.map(
                  (service) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(service.name),
                      subtitle: Text(
                        '${service.categoryName} · ${l10n.serviceDuration(service.durationMinutes)}',
                      ),
                      trailing: Text(
                        '\$${service.price.toStringAsFixed(2)}',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),

              const SizedBox(height: 20),
              _Section(title: l10n.providerReviews),
              const SizedBox(height: 6),
              if (reviews.isEmpty)
                Text(
                  l10n.providerNoReviews,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: status.mutedForeground,
                  ),
                )
              else
                ...reviews.map(
                  (review) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  review.customerName,
                                  style: theme.textTheme.titleSmall,
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
                            const SizedBox(height: 6),
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

              const SizedBox(height: 24),
              if (!provider.isOpen) ...[
                Text(
                  l10n.providerClosedCannotBook,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: status.mutedForeground,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              PrimaryButton(
                label: l10n.providerBookNow,
                icon: Icons.event_available_outlined,
                // Booking a closed business is allowed: the backend accepts
                // future bookings regardless of the live open flag.
                onPressed: bookable.isEmpty
                    ? null
                    : () => showCreateBookingSheet(context, provider),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) => Text(
    title,
    style: Theme.of(
      context,
    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  );
}
