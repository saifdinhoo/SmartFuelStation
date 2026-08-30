const notificationService = require('../services/notification.service');

async function list(req, res, next) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationService.listNotifications(req.user.userId, {
      unreadOnly,
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    const count = await notificationService.getUnreadCount(req.user.userId);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.userId);
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await notificationService.markAllAsRead(req.user.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, unreadCount, markRead, markAllRead, remove };
