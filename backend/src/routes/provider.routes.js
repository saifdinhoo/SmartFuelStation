const express = require('express');
const providerController = require('../controllers/provider.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// The /me routes are registered before the /:id ones so Express never tries
// to parse "me" as a provider id. They are PROVIDER-only and always resolve
// the business from the JWT — a provider id is never accepted from the
// client on any of them, so one provider cannot address another's data.
router.get('/me', authenticate, authorize('PROVIDER'), providerController.getMe);
router.patch('/me', authenticate, authorize('PROVIDER'), providerController.updateMe);
router.get('/me/analytics', authenticate, authorize('PROVIDER'), providerController.myAnalytics);
router.get('/me/hours', authenticate, authorize('PROVIDER'), providerController.getMyHours);
router.put('/me/hours', authenticate, authorize('PROVIDER'), providerController.updateMyHours);
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

module.exports = router;
