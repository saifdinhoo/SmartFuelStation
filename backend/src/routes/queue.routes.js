const express = require('express');
const queueController = require('../controllers/queue.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Every authenticated role can hit these routes; queue.service.js scopes
// and authorizes what each role actually sees or is allowed to do (own
// queue / own entry / everything for admin) — same pattern as
// booking.routes.js, since the rule depends on entry ownership and
// current state, not just the caller's role.
//
// /reorder and /summary/:providerId are registered before /:id so Express
// doesn't try to match "reorder"/"summary" as an :id param.
//
// GET /summary/:providerId is intentionally open to every authenticated
// role (no ownership check) — it returns only a queue length and a general
// wait estimate, never entry-level detail, so any logged-in user browsing
// providers can see it (matches GET /providers, which is the same "any
// authenticated role" shape).
router.post('/', authenticate, queueController.create);
router.get('/', authenticate, queueController.list);
router.patch('/reorder', authenticate, queueController.reorder);
router.get('/summary/:providerId', authenticate, queueController.getSummary);
router.get('/:id', authenticate, queueController.getOne);
router.patch('/:id', authenticate, queueController.updateStatus);
router.delete('/:id', authenticate, queueController.remove);

module.exports = router;
