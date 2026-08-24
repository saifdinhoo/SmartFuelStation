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

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                Text(
                  l10n.homeGreeting(auth.displayName ?? ''),
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 20),

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
