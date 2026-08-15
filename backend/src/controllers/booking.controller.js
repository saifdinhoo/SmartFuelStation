const bookingService = require('../services/booking.service');
const socketEvents = require('../sockets/queueEvents');

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
    await safely(() =>
      socketEvents.notifyBookingStatusChanged(booking.customerId, booking.id, booking.status),
    );
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
