const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Every route in this module is ADMIN-only, enforced once here rather than
// repeated per-handler. Nothing under /admin is reachable by a CUSTOMER or
// PROVIDER token.
router.use(authenticate, authorize('ADMIN'));

router.get('/overview', adminController.overview);
router.get('/analytics', adminController.analytics);
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.get('/reviews', adminController.listReviews);
router.get('/complaints', adminController.listComplaints);
router.patch('/complaints/:id', adminController.updateComplaint);

// Fuel inventory — the ONLY place these values may be written. There is no
// PATCH/PUT for fuel anywhere under /providers/me/* (see provider.routes.js).
router.get('/providers/:providerId/fuel', adminController.listProviderFuel);
router.put('/providers/:providerId/fuel/:fuelType', adminController.updateProviderFuel);
router.get('/providers/:providerId/fuel/history', adminController.listProviderFuelHistory);

module.exports = router;
