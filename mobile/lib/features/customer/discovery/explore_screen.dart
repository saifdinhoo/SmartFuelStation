import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/location/location_service.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/state/query_cache.dart';
import '../data/customer_repository.dart';
import '../widgets/provider_card.dart';

enum ProviderSort { distance, price, rating }

/// Ascending compare that pushes missing values to the end of the list
/// instead of treating them as zero, falling back to name for ties.
int _nullsLast(double? a, double? b, ServiceProvider pa, ServiceProvider pb) {
  if (a == null && b == null) return pa.businessName.compareTo(pb.businessName);
  if (a == null) return 1;
  if (b == null) return -1;
  return a.compareTo(b);
}

/// Full discovery: search, category filter, open-only toggle, and sorting.
class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key, this.initialCategoryId});

  final int? initialCategoryId;

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final _search = TextEditingController();
  int? _categoryId;
  bool _openOnly = false;
  ProviderSort _sort = ProviderSort.rating;

  @override
  void initState() {
    super.initState();
    _categoryId = widget.initialCategoryId;
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  /// Distance sorting needs a device position; asking for it is opt-in
  /// rather than on app start, so the permission prompt has obvious context.
  /// Always forces a fresh GPS reading — this is the explicit "update my
  /// location" action, not just a one-time enable, so it must work again
  /// even after a position is already known.
  Future<void> _useLocation() async {
    final location = context.read<LocationService>();
    final hadPosition = location.hasPosition;
    await location.refreshPosition();
    if (!mounted) return;
    if (location.hasPosition && !hadPosition) {
      setState(() => _sort = ProviderSort.distance);
    }
  }

  List<ServiceProvider> _apply(List<ServiceProvider> input, LatLng? origin) {
    final term = _search.text.trim().toLowerCase();

    final withDistance = input.map((p) {
      if (origin == null || p.latitude == null || p.longitude == null) {
        return p.copyWithDistance(null);
      }
      return p.copyWithDistance(
        distanceKmBetween(origin, p.latitude!, p.longitude!),
      );
    }).toList();

    final filtered = withDistance.where((p) {
      if (_openOnly && !p.isOpen) return false;
      if (_categoryId != null &&
          !p.services.any((s) => s.categoryId == _categoryId)) {
        return false;
      }
      if (term.isEmpty) return true;
      return p.businessName.toLowerCase().contains(term) ||
          p.address.toLowerCase().contains(term) ||
          p.services.any((s) => s.name.toLowerCase().contains(term));
    }).toList();

    filtered.sort((a, b) {
      switch (_sort) {
        case ProviderSort.distance:
          // Providers without coordinates sort last rather than as zero.
          return _nullsLast(a.distanceKm, b.distanceKm, a, b);
        case ProviderSort.price:
          // Same for providers with nothing bookable.
          return _nullsLast(a.lowestPrice, b.lowestPrice, a, b);
        case ProviderSort.rating:
          // GET /providers has no average rating, only a count. Ranking by
          // review count is the honest proxy — fetching a rating per card
          // would mean one request per row.
          return b.reviewCount.compareTo(a.reviewCount);
      }
    });

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<CustomerRepository>();
    // Rebuild when any watched cache key resolves or is invalidated.
    context.watchQueries();
    final location = context.watch<LocationService>();
    final providersState = repo.watchProviders();
    final categoriesState = repo.watchCategories();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: repo.refreshProviders,
        child: AsyncView<List<ServiceProvider>>(
          value: providersState,
          errorTitle: l10n.exploreTitle,
          onRetry: repo.refreshProviders,
          builder: (context, providers) {
            final results = _apply(providers, location.position);
            final categories =
                categoriesState.valueOrNull ?? const <ServiceCategory>[];

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextField(
                          controller: _search,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: l10n.exploreSearchHint,
                            prefixIcon: const Icon(Icons.search),
                            suffixIcon: _search.text.isEmpty
                                ? null
                                : IconButton(
                                    icon: const Icon(Icons.clear),
                                    onPressed: () {
                                      _search.clear();
                                      setState(() {});
                                    },
                                  ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              FilterChip(
                                label: Text(l10n.exploreOpenOnly),
                                selected: _openOnly,
                                onSelected: (v) =>
                                    setState(() => _openOnly = v),
                              ),
                              const SizedBox(width: 8),
                              ChoiceChip(
                                label: Text(l10n.exploreFilterAll),
                                selected: _categoryId == null,
                                onSelected: (_) =>
                                    setState(() => _categoryId = null),
                              ),
                              for (final category in categories) ...[
                                const SizedBox(width: 8),
                                ChoiceChip(
                                  label: Text(category.name),
                                  selected: _categoryId == category.id,
                                  onSelected: (_) =>
                                      setState(() => _categoryId = category.id),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                l10n.exploreResultCount(results.length),
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: status.mutedForeground,
                                ),
                              ),
                            ),
                            _SortMenu(
                              value: _sort,
                              canSortByDistance: location.hasPosition,
                              onSelected: (value) =>
                                  setState(() => _sort = value),
                            ),
                          ],
                        ),
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: TextButton.icon(
                            onPressed: location.isLoading ? null : _useLocation,
                            icon: location.isLoading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.my_location, size: 18),
                            label: Text(l10n.exploreUseLocation),
                          ),
                        ),
                        if (location.isDenied)
                          Text(
                            l10n.exploreLocationDenied,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: status.mutedForeground,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                if (results.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyView(
                      icon: Icons.storefront_outlined,
                      title: providers.isEmpty
                          ? l10n.exploreNoProviders
                          : l10n.exploreNoResults,
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                    sliver: SliverList.separated(
                      itemCount: results.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final provider = results[index];
                        return ProviderCard(
                          provider: provider,
                          onTap: () => context.push(
                            Routes.customerProviderDetails(provider.id),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SortMenu extends StatelessWidget {
  const _SortMenu({
    required this.value,
    required this.canSortByDistance,
    required this.onSelected,
  });

  final ProviderSort value;
  final bool canSortByDistance;
  final ValueChanged<ProviderSort> onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    String label(ProviderSort sort) => switch (sort) {
      ProviderSort.distance => l10n.exploreSortDistance,
      ProviderSort.price => l10n.exploreSortPrice,
      ProviderSort.rating => l10n.exploreSortRating,
    };

    return PopupMenuButton<ProviderSort>(
      initialValue: value,
      onSelected: onSelected,
      tooltip: l10n.exploreSortLabel,
      itemBuilder: (context) => [
        // Distance is offered only once a position is known; without one it
        // would silently do nothing.
        if (canSortByDistance)
          PopupMenuItem(
            value: ProviderSort.distance,
            child: Text(label(ProviderSort.distance)),
          ),
        PopupMenuItem(
          value: ProviderSort.price,
          child: Text(label(ProviderSort.price)),
        ),
        PopupMenuItem(
          value: ProviderSort.rating,
          child: Text(label(ProviderSort.rating)),
        ),
      ],
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.sort, size: 18),
          const SizedBox(width: 4),
          Text(label(value)),
        ],
      ),
    );
  }
}
