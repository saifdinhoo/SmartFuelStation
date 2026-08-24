import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/router.dart';
import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_view.dart';
import '../../customer/widgets/booking_status_ui.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

/// Platform-wide booking list.
///
/// GET /bookings returns every booking for an ADMIN token — the same
/// endpoint a customer and a provider call, scoped server-side by role.
/// The screen is a read-only window: driving a booking through its
/// lifecycle belongs to the business that owns it, and the backend's
/// transition table only permits PROVIDER or ADMIN on those edges through
/// the provider's own workflow.
class AdminBookingsScreen extends StatefulWidget {
  const AdminBookingsScreen({super.key});

  @override
  State<AdminBookingsScreen> createState() => _AdminBookingsScreenState();
}

class _AdminBookingsScreenState extends State<AdminBookingsScreen> {
  final _search = TextEditingController();
  BookingStatus? _status;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    // `null` is the "all" option, so the filter list is nullable.
    final statuses = <BookingStatus?>[null, ...BookingStatus.values];

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: repo.refreshBookings,
        child: AsyncView<List<Booking>>(
          value: repo.watchBookings(),
          errorTitle: l10n.aNavBookings,
          onRetry: repo.refreshBookings,
          builder: (context, bookings) {
            final term = _search.text.trim().toLowerCase();
            final results = bookings
                .where((b) => _status == null || b.status == _status)
                .where(
                  (b) =>
                      term.isEmpty ||
                      b.customerName.toLowerCase().contains(term) ||
                      b.providerName.toLowerCase().contains(term) ||
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
                            hintText: l10n.aBookingsSearchHint,
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
                        AdminFilterBar<BookingStatus?>(
                          options: statuses,
                          selected: _status,
                          labelOf: (s) => s == null
                              ? l10n.aBookingsAll
                              : bookingStatusLabel(l10n, s),
                          onSelected: (s) => setState(() => _status = s),
                        ),
                      ],
                    ),
                  ),
                ),
                if (results.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyView(title: l10n.aBookingsNoResults),
                  )
                else
                  SliverList.builder(
                    itemCount: results.length,
                    itemBuilder: (context, i) => Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                      child: _AdminBookingCard(booking: results[i]),
                    ),
                  ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                    child: AdminGapNote(
                      icon: Icons.visibility_outlined,
                      text: l10n.aBookingsReadOnly,
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

class _AdminBookingCard extends StatelessWidget {
  const _AdminBookingCard({required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final status = theme.extension<AppStatusColors>()!;

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push(Routes.adminBookingDetails(booking.id)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      booking.serviceName,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  BookingStatusChip(status: booking.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${l10n.aBookingsCustomer}: ${booking.customerName}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
              Text(
                '${l10n.aBookingsBusiness}: ${booking.providerName}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: status.mutedForeground,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                formatBookingDateTime(booking.scheduledAt),
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
