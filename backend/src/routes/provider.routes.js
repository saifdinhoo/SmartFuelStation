const express = require('express');
const providerController = require('../controllers/provider.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Providers register via POST /api/auth/register (role = PROVIDER).
// This route lists them and lets an admin approve them.
router.get('/', authenticate, providerController.list);
router.patch('/:id/approve', authenticate, authorize('ADMIN'), providerController.approve);

module.exports = router;
