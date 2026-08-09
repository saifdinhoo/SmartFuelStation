const bookingService = require('../services/booking.service');

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
