// Maps a booking's new status + the acting role to the notification that
// should be created for it, or null if that transition isn't
// notification-worthy (PENDING, ARRIVED, IN_QUEUE — no one needs a
// persistent message for those). Shared between booking.controller.js
// (direct status changes) and queue.controller.js (status changes that
// happen as a queue-sync side effect via booking.service.js's
// updateBookingStatus), since both paths already announce the same
// booking:status_changed socket event today and both need the same
// notification for the same real-world transition, never twice.
function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// `booking` here is a plain object with just the fields needed — not a
// Prisma model — so both call sites can build it from whatever shape they
// already have in hand (booking.service.js's WITH_DETAILS vs.
// queue.service.js's own WITH_DETAILS) without an extra query.
function bookingStatusNotification(booking, actingRole) {
  const { id: bookingId, status, scheduledAt, customerId, businessName, providerUserId } = booking;
  const time = formatTime(scheduledAt);

  switch (status) {
    case 'CONFIRMED':
      return {
        userId: customerId,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking confirmed',
        message: `${businessName} confirmed your booking for ${time}.`,
        relatedBookingId: bookingId,
      };
    case 'REJECTED':
      return {
        userId: customerId,
        type: 'BOOKING_REJECTED',
        title: 'Booking rejected',
        message: `${businessName} rejected your booking for ${time}.`,
        relatedBookingId: bookingId,
      };
    case 'CANCELLED': {
      const customerCancelled = actingRole === 'CUSTOMER';
      return {
        userId: customerCancelled ? providerUserId : customerId,
        type: 'BOOKING_CANCELLED',
        title: 'Booking cancelled',
        message: customerCancelled
          ? `A customer cancelled their booking for ${time}.`
          : `${businessName} cancelled your booking for ${time}.`,
        relatedBookingId: bookingId,
      };
    }
    case 'IN_SERVICE':
      return {
        userId: customerId,
        type: 'SERVICE_STARTED',
        title: 'Service started',
        message: `${businessName} has started your service.`,
        relatedBookingId: bookingId,
      };
    case 'COMPLETED':
      return {
        userId: customerId,
        type: 'SERVICE_COMPLETED',
        title: 'Service completed',
        message: 'Your service has been marked as completed.',
        relatedBookingId: bookingId,
      };
    default:
      return null;
  }
}

module.exports = { bookingStatusNotification };
