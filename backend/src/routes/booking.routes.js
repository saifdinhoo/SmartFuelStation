const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Only customers create bookings. Listing/reading is open to every
// authenticated role — booking.service.js scopes what each role actually
// sees (own bookings / own business's bookings / everything for admin).
// Status transitions and deletes are similarly permission-checked inside
// the service, since the rule depends on the booking's current state and
// ownership, not just the caller's role.
router.post('/', authenticate, authorize('CUSTOMER'), bookingController.create);
router.get('/', authenticate, bookingController.list);
router.get('/:id', authenticate, bookingController.getOne);
router.patch('/:id', authenticate, bookingController.updateStatus);
router.delete('/:id', authenticate, bookingController.remove);

module.exports = router;
