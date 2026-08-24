import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../core/state/query_cache.dart';
import '../data/customer_repository.dart';
import '../widgets/booking_card.dart';

/// Active and past bookings, split the same way the web splits them:
/// terminal statuses are history, everything else is active.
class BookingsScreen extends StatelessWidget {
  const BookingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<CustomerRepository>();
    // Rebuild when any watched cache key resolves or is invalidated.
    context.watchQueries();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: TabBar(
          tabs: [
            Tab(text: l10n.bookingsActive),
            Tab(text: l10n.bookingsHistory),
          ],
        ),
        body: AsyncView<List<Booking>>(
          value: repo.watchBookings(),
          errorTitle: l10n.bookingsTitle,
          onRetry: repo.refreshBookings,
          builder: (context, bookings) {
            if (bookings.isEmpty) {
              return EmptyView(
                icon: Icons.event_note_outlined,
                title: l10n.bookingsNone,
                actionLabel: l10n.bookingsFindProvider,
                onAction: () => context.go(Routes.customerExplore),
              );
            }

            final active = bookings.where((b) => !b.status.isTerminal).toList();
            final history = bookings.where((b) => b.status.isTerminal).toList();

            return TabBarView(
              children: [
                _BookingList(
                  bookings: active,
                  emptyLabel: l10n.bookingsNoneActive,
                  onRefresh: repo.refreshBookings,
                ),
                _BookingList(
                  bookings: history,
                  emptyLabel: l10n.bookingsNoneHistory,
                  onRefresh: repo.refreshBookings,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _BookingList extends StatelessWidget {
  const _BookingList({
    required this.bookings,
    required this.emptyLabel,
    required this.onRefresh,
  });

  final List<Booking> bookings;
  final String emptyLabel;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: bookings.isEmpty
          // Still scrollable so pull-to-refresh works on an empty tab.
          ? ListView(
              children: [
                SizedBox(
                  height: MediaQuery.sizeOf(context).height * 0.5,
                  child: EmptyView(
                    icon: Icons.event_note_outlined,
                    title: emptyLabel,
                  ),
                ),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              itemCount: bookings.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final booking = bookings[index];
                return BookingCard(
                  booking: booking,
                  onTap: () =>
                      context.push(Routes.customerBookingDetails(booking.id)),
                );
              },
            ),
    );
  }
}
