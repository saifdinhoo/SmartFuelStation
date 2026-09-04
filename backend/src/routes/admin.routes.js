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

// Finance (Phase D) — platform-wide ledger reads and the settlement action.
// There is no PATCH/PUT for the money fields themselves anywhere: the
// server computes gross/commission/net at booking-completion time (see
// finance.service.js) and nothing ever accepts them from a client.
router.get('/finance/summary', adminController.financeSummary);
router.get('/finance/transactions', adminController.financeTransactions);
router.get('/finance/providers/:providerId', adminController.financeProvider);
router.patch('/finance/transactions/:id/settlement', adminController.settleFinanceTransaction);

// Commission configuration — the ONLY place a provider's commissionRate may
// be written. There is no PATCH/PUT for it anywhere under /providers/me/*
// (see provider.routes.js) — a provider may only read its own rate.
router.get('/providers/:providerId/commission', adminController.getProviderCommission);
router.put('/providers/:providerId/commission', adminController.setProviderCommission);

// Booking policy — the ONLY place these values may be written. Enforced by
// availability.service.js and booking.service.js, not just displayed here.
router.get('/booking-policy', adminController.getBookingPolicy);
router.patch('/booking-policy', adminController.updateBookingPolicy);

// Audit log — read-only through the public API. No update/delete route
// exists anywhere: a row, once written, cannot be changed or removed.
router.get('/audit-log', adminController.listAuditLog);

// Application data export — a real JSON snapshot, not pg_dump. See
// backup.service.js for exactly what is (and is never) included.
router.post('/backups/export', adminController.exportBackup);

module.exports = router;
