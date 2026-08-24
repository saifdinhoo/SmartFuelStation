import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/l10n/generated/app_localizations.dart';
import '../../../core/models/admin_models.dart';
import '../../../core/state/async_view.dart';
import '../../../core/state/query_cache.dart';
import '../../customer/widgets/booking_status_ui.dart';
import '../data/admin_repository.dart';
import '../widgets/admin_widgets.dart';

/// One booking in full, from GET /bookings/:id — which an ADMIN may read
/// for any booking on the platform.
///
/// Read-only by design: see [AdminBookingsScreen].
class AdminBookingDetailsScreen extends StatelessWidget {
  const AdminBookingDetailsScreen({super.key, required this.bookingId});

  final int bookingId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final repo = context.read<AdminRepository>();
    context.watchQueries();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aNavBookings)),
      body: AsyncView<Booking>(
        value: repo.watchBooking(bookingId),
        errorTitle: l10n.aNavBookings,
        builder: (context, booking) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            Text(booking.serviceName, style: theme.textTheme.headlineSmall),
            const SizedBox(height: 8),
            BookingStatusChip(status: booking.status),

            const SizedBox(height: 20),
            AdminSectionHeader(title: l10n.aComplaintDetails),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Column(
                  children: [
                    AdminInfoRow(
                      label: l10n.aBookingsCustomer,
                      value: booking.customerName,
                    ),
                    AdminInfoRow(
                      label: l10n.aBookingsBusiness,
                      value: booking.providerName,
                    ),
                    AdminInfoRow(
                      label: l10n.fieldAddress,
                      value: booking.providerAddress,
                    ),
                    AdminInfoRow(
                      label: l10n.aOverviewCategories,
                      value: booking.categoryName,
                    ),
                    AdminInfoRow(
                      label: l10n.bookingDateTime,
                      value: formatBookingDateTime(booking.scheduledAt),
                    ),
                    AdminInfoRow(
                      label: l10n.bookingPrice,
                      value: booking.priceAtBooking.toStringAsFixed(2),
                    ),
                    AdminInfoRow(
                      label: l10n.aComplaintFiled,
                      value: adminDate(booking.createdAt),
                    ),
                    if (booking.completedAt != null)
                      AdminInfoRow(
                        label: l10n.statusCompleted,
                        value: adminDate(booking.completedAt!),
                      ),
                    if (booking.cancelledAt != null)
                      AdminInfoRow(
                        label: l10n.statusCancelled,
                        value: adminDate(booking.cancelledAt!),
                      ),
                  ],
                ),
              ),
            ),

            if (booking.notes != null && booking.notes!.trim().isNotEmpty) ...[
              const SizedBox(height: 20),
              AdminSectionHeader(title: l10n.aBookingNotes),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Text(
                    booking.notes!,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              ),
            ],

            const SizedBox(height: 20),
            BookingStatusTimeline(
              status: booking.status,
              cancelledAt: booking.cancelledAt,
            ),

            const SizedBox(height: 24),
            AdminGapNote(
              icon: Icons.visibility_outlined,
              text: l10n.aBookingsReadOnly,
            ),
          ],
        ),
      ),
    );
  }
}
