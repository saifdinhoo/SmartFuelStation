const express = require('express');
const reviewController = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Only customers create reviews, against their own completed bookings
// (enforced in review.service.js). Customers can delete their own;
// admins can delete any — both checked in the service layer since the
// rule depends on row ownership, not just role.
router.post('/', authenticate, authorize('CUSTOMER'), reviewController.create);
// Registered before /:id-style routes would be, as a matter of habit — there
// is no GET /:id here today, but this keeps the same ordering discipline as
// every other "/me"-style route in this codebase (see auth.routes.js).
router.get('/me', authenticate, authorize('CUSTOMER'), reviewController.listMine);
router.delete('/:id', authenticate, authorize('CUSTOMER', 'ADMIN'), reviewController.remove);

module.exports = router;
