import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../core/theme/app_colors.dart';
import 'booking_status_ui.dart';

class BookingCard extends StatelessWidget {
  const BookingCard({super.key, required this.booking, required this.onTap});

  final Booking booking;
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
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      booking.providerName,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  BookingStatusChip(status: booking.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(booking.serviceName, style: theme.textTheme.bodyMedium),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.event_outlined,
                    size: 14,
                    color: status.mutedForeground,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    formatBookingDateTime(booking.scheduledAt),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: status.mutedForeground,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '\$${booking.priceAtBooking.toStringAsFixed(2)}',
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
