const bookingService = require('../services/booking.service');
const socketEvents = require('../sockets/queueEvents');
const notificationService = require('../services/notification.service');
const { bookingStatusNotification } = require('../services/shared/bookingStatusNotification');

// Same contract as queue.controller.js's `safely`: socket pushes run only
// after the REST response has already been sent, and a failed push must
// never turn an request that already succeeded into a 500.
async function safely(fn) {
  try {
    await fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Socket.IO notification failed:', err);
  }
}

async function create(req, res, next) {
  try {
    const booking = await bookingService.createBooking({
      customerId: req.user.userId,
      providerServiceId: req.body.providerServiceId,
      scheduledAt: req.body.scheduledAt,
      notes: req.body.notes,
    });
    res.status(201).json({ success: true, data: booking });

    // The owning provider's user id comes off the booking the service just
    // returned (via its own providerService->provider include) — never
    // from the request — so a client cannot address someone else's inbox.
    await safely(() =>
      notificationService.createNotification({
        userId: booking.providerService.provider.userId,
        type: 'BOOKING_CREATED',
        title: 'New booking',
        message: `A customer requested ${booking.providerService.name} for ${new Date(
          booking.scheduledAt,
        ).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`,
        relatedBookingId: booking.id,
      }),
    );
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const bookings = await bookingService.listBookings(req.user);
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.params.id, req.user);
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const booking = await bookingService.updateBookingStatus(
      req.params.id,
      req.body.status,
      req.user,
    );
    res.json({ success: true, data: booking });

    // Booking-only edges (PENDING->CONFIRMED, CONFIRMED->ARRIVED, reject,
    // cancel) never touch the Queue, so queue.controller.js's pushes don't
    // cover them and the customer's client would otherwise learn about a
    // provider's decision only on its next manual refetch. The event and
    // its listener already exist (sockets/queueEvents.js and the web
    // SocketProvider) — this is the emit that was missing.
    //
    // The owning provider is read off the booking row the service just
    // returned — never from the request — so a client cannot address
    // someone else's room by forging a providerId.
    await safely(() =>
      socketEvents.notifyBookingStatusChanged(
        booking.customerId,
        booking.id,
        booking.status,
        booking.providerService?.provider?.id ?? null,
      ),
    );

    const notification = bookingStatusNotification(
      {
        id: booking.id,
        status: booking.status,
        scheduledAt: booking.scheduledAt,
        customerId: booking.customerId,
        businessName: booking.providerService.provider.businessName,
        providerUserId: booking.providerService.provider.userId,
      },
      req.user.role,
    );
    if (notification) {
      await safely(() => notificationService.createNotification(notification));
    }
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await bookingService.deleteBooking(req.params.id, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, updateStatus, remove };
