import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/widgets/status_chip.dart';
import '../data/customer_repository.dart';
import '../widgets/favorite_toggle_button.dart';

/// The customer's own saved businesses — GET /favorites/me. Real,
/// backend-persisted state shared with the "Save" button on Provider
/// Details and the discovery list, not a local-only toggle.
class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<CustomerRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.favoritesTitle)),
      body: RefreshIndicator(
        onRefresh: () => repo.refreshMyFavorites(),
        child: AsyncView<List<Favorite>>(
          value: repo.watchMyFavorites(),
          errorTitle: l10n.favoritesTitle,
          onRetry: () => repo.refreshMyFavorites(),
          builder: (context, favorites) {
            if (favorites.isEmpty) {
              return ListView(
                children: [
                  SizedBox(
                    height: MediaQuery.sizeOf(context).height * 0.6,
                    child: EmptyView(
                      icon: Icons.favorite_border,
                      title: l10n.favoritesEmpty,
                    ),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: favorites.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) => _FavoriteCard(favorite: favorites[index]),
            );
          },
        ),
      ),
    );
  }
}

class _FavoriteCard extends StatelessWidget {
  const _FavoriteCard({required this.favorite});

  final Favorite favorite;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => context.push(
          Routes.customerProviderDetails(favorite.providerId),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(favorite.providerBusinessName, style: theme.textTheme.titleSmall),
                    const SizedBox(height: 4),
                    Text(
                      favorite.providerAddress,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: status.mutedForeground,
                      ),
                    ),
                    const SizedBox(height: 8),
                    StatusChip(
                      label: favorite.providerIsOpen
                          ? l10n.providerOpen
                          : l10n.providerClosed,
                      tone: favorite.providerIsOpen
                          ? StatusTone.success
                          : StatusTone.neutral,
                    ),
                  ],
                ),
              ),
              FavoriteToggleButton(providerId: favorite.providerId, compact: true),
            ],
          ),
        ),
      ),
    );
  }
}
