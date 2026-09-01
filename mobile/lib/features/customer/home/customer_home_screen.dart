import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../auth/state/auth_state.dart';
import '../../../core/state/query_cache.dart';
import '../data/customer_repository.dart';
import '../widgets/booking_card.dart';
import '../widgets/live_station_card.dart';
import '../widgets/provider_card.dart';

/// Landing screen: what's open now, categories to jump into, and the
/// customer's current activity. Explore holds the full searchable list.
class CustomerHomeScreen extends StatelessWidget {
  const CustomerHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<CustomerRepository>();
    // Rebuild when any watched cache key resolves or is invalidated.
    context.watchQueries();
    final auth = context.watch<AuthState>();

    final providersState = repo.watchProviders();
    final categoriesState = repo.watchCategories();
    final bookingsState = repo.watchBookings();
    final favoritesState = repo.watchMyFavorites();
    final vehiclesState = repo.watchMyVehicles();
    final queueState = repo.watchMyQueue();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([repo.refreshProviders(), repo.refreshBookings()]);
        },
        child: AsyncView<List<ServiceProvider>>(
          value: providersState,
          onRetry: repo.refreshProviders,
          builder: (context, providers) {
            final open = providers.where((p) => p.isOpen).take(5).toList();
            final categories =
                categoriesState.valueOrNull ?? const <ServiceCategory>[];
            final active = (bookingsState.valueOrNull ?? const <Booking>[])
                .where((b) => !b.status.isTerminal)
                .toList();
            // At most one provider is expected to have a camera in this
            // proof of concept, but nothing here assumes that — the first
            // one found is used, and the architecture supports more being
            // enabled later with no UI change.
            final cameraProvider = providers
                .where((p) => p.liveCameraEnabled)
                .firstOrNull;
            final cameraState = cameraProvider == null
                ? null
                : repo.watchLiveCameraStatus(cameraProvider.id);

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                Text(
                  l10n.homeGreeting(auth.displayName ?? ''),
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 20),

                // --- quick actions ---
                // Real counts only — a query still loading shows no badge
                // rather than a fake "0".
                _SectionHeader(title: l10n.homeQuickActions),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionTile(
                        icon: Icons.favorite_border,
                        label: l10n.favoritesTitle,
                        count: favoritesState.valueOrNull?.length,
                        onTap: () => context.push(Routes.customerFavorites),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _QuickActionTile(
                        icon: Icons.directions_car_outlined,
                        label: l10n.myVehiclesTitle,
                        count: vehiclesState.valueOrNull?.length,
                        onTap: () => context.push(Routes.customerVehicles),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _QuickActionTile(
                        icon: Icons.confirmation_number_outlined,
                        label: l10n.navQueue,
                        count: queueState.valueOrNull
                            ?.where((e) => e.status.isActive)
                            .length,
                        onTap: () => context.go(Routes.customerQueue),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // --- current activity ---
                _SectionHeader(title: l10n.homeActiveBooking),
                const SizedBox(height: 8),
                if (active.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(
                            Icons.event_available_outlined,
                            color: status.mutedForeground,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              l10n.homeNoActivity,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: status.mutedForeground,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...active
                      .take(2)
                      .map(
                        (booking) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: BookingCard(
                            booking: booking,
                            onTap: () => context.push(
                              Routes.customerBookingDetails(booking.id),
                            ),
                          ),
                        ),
                      ),

                const SizedBox(height: 24),

                // --- live station (Phase F) ---
                // No card at all when no provider has a camera enabled —
                // never an empty/placeholder card.
                if (cameraProvider != null) ...[
                  _SectionHeader(title: l10n.homeLiveStationSection),
                  const SizedBox(height: 8),
                  LiveStationCard(
                    businessName: cameraProvider.businessName,
                    status: cameraState?.valueOrNull?.status,
                    onWatchLive: () => context.push(
                      Routes.customerLiveStation(cameraProvider.id),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // --- categories ---
                if (categories.isNotEmpty) ...[
                  _SectionHeader(title: l10n.homeBrowseCategories),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final category in categories)
                        ActionChip(
                          label: Text(category.name),
                          onPressed: () => context.go(
                            Routes.customerExplore,
                            extra: category.id,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],

                // --- open now ---
                Row(
                  children: [
                    Expanded(child: _SectionHeader(title: l10n.homeOpenNow)),
                    TextButton(
                      onPressed: () => context.go(Routes.customerExplore),
                      child: Text(l10n.homeSeeAll),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                if (open.isEmpty)
                  EmptyView(
                    icon: Icons.storefront_outlined,
                    title: l10n.homeNoOpenProviders,
                    actionLabel: l10n.homeFindService,
                    onAction: () => context.go(Routes.customerExplore),
                  )
                else
                  ...open.map(
                    (provider) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: ProviderCard(
                        provider: provider,
                        onTap: () => context.push(
                          Routes.customerProviderDetails(provider.id),
                        ),
                      ),
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

/// A compact shortcut card with an optional real count badge. The badge is
/// omitted entirely (not shown as "0" or a spinner) while its query hasn't
/// resolved yet or came back empty — the tile itself is still a real, live
/// shortcut either way.
class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.count,
  });

  final IconData icon;
  final String label;
  final int? count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          child: Column(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(icon, color: theme.colorScheme.primary),
                  if (count != null && count! > 0)
                    Positioned(
                      right: -8,
                      top: -6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          count.toString(),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) => Text(
    title,
    style: Theme.of(
      context,
    ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
  );
}
