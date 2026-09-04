const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Every route here is scoped to req.user.userId inside the service layer —
// there is no way for any role to read or modify another user's
// notifications by id (see notification.service.js for the ownership checks).
router.get('/', authenticate, notificationController.list);
router.get('/unread-count', authenticate, notificationController.unreadCount);
router.patch('/read-all', authenticate, notificationController.markAllRead);
router.patch('/:id/read', authenticate, notificationController.markRead);
router.delete('/:id', authenticate, notificationController.remove);

// Per-user category preferences — always the caller's own (req.user.userId
// is authoritative; there is no id parameter to spoof), same ownership
// model as the routes above.
router.get('/preferences', authenticate, notificationController.getPreferences);
router.patch('/preferences', authenticate, notificationController.updatePreferences);

module.exports = router;
