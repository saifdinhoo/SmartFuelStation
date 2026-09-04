const express = require('express');
const providerController = require('../controllers/provider.controller');
const { authenticate, authorize, authenticateForMedia } = require('../middleware/auth');

const router = express.Router();

// The /me routes are registered before the /:id ones so Express never tries
// to parse "me" as a provider id. They are PROVIDER-only and always resolve
// the business from the JWT — a provider id is never accepted from the
// client on any of them, so one provider cannot address another's data.
router.get('/me', authenticate, authorize('PROVIDER'), providerController.getMe);
router.patch('/me', authenticate, authorize('PROVIDER'), providerController.updateMe);
router.post(
  '/me/deactivate',
  authenticate,
  authorize('PROVIDER'),
  providerController.deactivateMe,
);
router.get('/me/analytics', authenticate, authorize('PROVIDER'), providerController.myAnalytics);
router.get('/me/hours', authenticate, authorize('PROVIDER'), providerController.getMyHours);
router.put('/me/hours', authenticate, authorize('PROVIDER'), providerController.updateMyHours);
// Read-only — there is deliberately no PATCH/PUT for a provider's own fuel
// inventory anywhere in this file. Only /admin/providers/:id/fuel writes it.
router.get('/me/fuel', authenticate, authorize('PROVIDER'), providerController.getMyFuel);
// Read-only — there is deliberately no PATCH/PUT for finance or commission
// anywhere in this file. Only /admin/finance/* and
// /admin/providers/:id/commission may write those (Phase D).
router.get('/me/finance/summary', authenticate, authorize('PROVIDER'), providerController.myFinanceSummary);
router.get(
  '/me/finance/transactions',
  authenticate,
  authorize('PROVIDER'),
  providerController.myFinanceTransactions,
);
router.get('/me/commission', authenticate, authorize('PROVIDER'), providerController.myCommission);
router.post('/me/services', authenticate, authorize('PROVIDER'), providerController.createMyService);
router.patch(
  '/me/services/:serviceId',
  authenticate,
  authorize('PROVIDER'),
  providerController.updateMyService,
);
router.delete(
  '/me/services/:serviceId',
  authenticate,
  authorize('PROVIDER'),
  providerController.deleteMyService,
);

router.get('/', authenticate, providerController.list);
router.patch('/:id/approve', authenticate, authorize('ADMIN'), providerController.approve);
// Approve or revoke in one call — the admin UI needs both directions.
// The older /approve route above is left as-is so nothing calling it breaks.
router.patch('/:id/approval', authenticate, authorize('ADMIN'), providerController.setApproval);
router.get('/:id/reviews', authenticate, providerController.listReviews);
router.get('/:id/rating-summary', authenticate, providerController.ratingSummary);
router.get('/:id/hours', authenticate, providerController.getHours);
router.get('/:id/availability', authenticate, providerController.getAvailability);
router.get('/:id/fuel', authenticate, providerController.getFuel);
router.get('/:id/fuel/history', authenticate, providerController.getFuelHistory);

// Live camera (Phase F). The status endpoint is a normal JSON request, so
// it uses the same authenticate() as every other provider sub-resource.
// The stream endpoint is loaded by a native <video> element or by hls.js's
// internal segment requests, neither of which can attach a custom
// Authorization header — see authenticateForMedia's own doc comment for
// why this one route accepts the token via `?token=` as a fallback.
router.get('/:id/live-camera', authenticate, providerController.getLiveCameraStatus);
router.get('/:id/live-camera/stream', authenticateForMedia, providerController.streamLiveCamera);
router.get('/:id/live-camera/stream/*', authenticateForMedia, providerController.streamLiveCamera);

module.exports = router;
