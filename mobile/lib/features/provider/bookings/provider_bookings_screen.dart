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
import '../../customer/widgets/booking_status_ui.dart';
import '../data/provider_repository.dart';
import '../workflow/booking_actions.dart';

enum _BookingFilter { needsAction, today, upcoming, past, all }

class ProviderBookingsScreen extends StatefulWidget {
  const ProviderBookingsScreen({super.key});

  @override
  State<ProviderBookingsScreen> createState() => _ProviderBookingsScreenState();
}

class _ProviderBookingsScreenState extends State<ProviderBookingsScreen> {
  final _search = TextEditingController();
  _BookingFilter _filter = _BookingFilter.needsAction;
  BookingStatus? _status;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  bool _matchesFilter(Booking booking, DateTime now) {
    switch (_filter) {
      case _BookingFilter.needsAction:
        return bookingNeedsProviderAction(booking.status);
      case _BookingFilter.today:
        return booking.scheduledAt.year == now.year &&
            booking.scheduledAt.month == now.month &&
            booking.scheduledAt.day == now.day;
      case _BookingFilter.upcoming:
        return booking.scheduledAt.isAfter(now) && !booking.status.isTerminal;
      case _BookingFilter.past:
        return booking.scheduledAt.isBefore(now) || booking.status.isTerminal;
      case _BookingFilter.all:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;
    final repo = context.read<ProviderRepository>();
    context.watchQueries();

    final label = {
      _BookingFilter.needsAction: l10n.pBookingsNeedsAction,
      _BookingFilter.today: l10n.pBookingsToday,
      _BookingFilter.upcoming: l10n.pBookingsUpcoming,
      _BookingFilter.past: l10n.pBookingsPast,
      _BookingFilter.all: l10n.pBookingsAll,
    };

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: repo.refreshBookings,
        child: AsyncView<List<Booking>>(
          value: repo.watchBookings(),
          errorTitle: l10n.pNavBookings,
          onRetry: repo.refreshBookings,
          builder: (context, bookings) {
            // Time is read once per build from a stable reference so the
            // filter cannot shift mid-frame.
            final now = DateTime.now();
            final term = _search.text.trim().toLowerCase();

            final results = bookings
                .where((b) => _matchesFilter(b, now))
                .where((b) => _status == null || b.status == _status)
                .where(
                  (b) =>
                      term.isEmpty ||
                      b.customerName.toLowerCase().contains(term) ||
                      b.serviceName.toLowerCase().contains(term),
                )
                .toList();

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
                            hintText: l10n.pBookingsSearchHint,
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
                              for (final option in _BookingFilter.values) ...[
                                ChoiceChip(
                                  label: Text(label[option]!),
                                  selected: _filter == option,
                                  onSelected: (_) =>
                                      setState(() => _filter = option),
                                ),
                                const SizedBox(width: 8),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              FilterChip(
                                label: Text(l10n.pBookingsAll),
                                selected: _status == null,
                                onSelected: (_) =>
                                    setState(() => _status = null),
                              ),
                              for (final value in BookingStatus.values) ...[
                                const SizedBox(width: 8),
                                FilterChip(
                                  label: Text(bookingStatusLabel(l10n, value)),
                                  selected: _status == value,
                                  onSelected: (_) =>
                                      setState(() => _status = value),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${results.length}',
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
                      icon: Icons.event_note_outlined,
                      title: bookings.isEmpty
                          ? l10n.pBookingsNone
                          : l10n.pBookingsNoneMatch,
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverList.separated(
                      itemCount: results.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final booking = results[index];
                        return Card(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () => context.push(
                              Routes.providerBookingDetails(booking.id),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          booking.customerName,
                                          style: theme.textTheme.titleMedium
                                              ?.copyWith(
                                                fontWeight: FontWeight.w600,
                                              ),
                                        ),
                                      ),
                                      BookingStatusChip(status: booking.status),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    booking.serviceName,
                                    style: theme.textTheme.bodyMedium,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    formatBookingDateTime(booking.scheduledAt),
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: status.mutedForeground,
                                    ),
                                  ),
                                ],
                              ),
                            ),
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
