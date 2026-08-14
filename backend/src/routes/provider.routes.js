const express = require('express');
const providerController = require('../controllers/provider.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Providers register via POST /api/auth/register (role = PROVIDER).
// This route lists them and lets an admin approve them.
router.get('/', authenticate, providerController.list);
router.patch('/:id/approve', authenticate, authorize('ADMIN'), providerController.approve);

// Review read access — see review.service.js for the permission rules
// (providers are limited to their own business's reviews).
router.get('/:id/reviews', authenticate, providerController.listReviews);
router.get('/:id/rating-summary', authenticate, providerController.ratingSummary);

module.exports = router;
