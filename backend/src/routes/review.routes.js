const express = require('express');
const reviewController = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Only customers create reviews, against their own completed bookings
// (enforced in review.service.js). Customers can delete their own;
// admins can delete any — both checked in the service layer since the
// rule depends on row ownership, not just role.
router.post('/', authenticate, authorize('CUSTOMER'), reviewController.create);
router.delete('/:id', authenticate, authorize('CUSTOMER', 'ADMIN'), reviewController.remove);

module.exports = router;
