const prisma = require('../config/prisma');
const { getIO, roomForUser } = require('../sockets');
const notificationPreferenceService = require('./notificationPreference.service');

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

function toId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id)) {
    const err = new Error(`${label} must be a valid integer`);
    err.statusCode = 400;
    throw err;
  }
  return id;
}

// Persists the notification first, then emits it to the recipient's own
// room only. `userId` is always derived server-side by the caller (never
// from client input), so a notification can never be redirected to
// another user's room — same guarantee sockets/queueEvents.js relies on
// for booking/queue pushes.
// Every one of today's NotificationType values is optional/user-configurable
// (see notificationPreference.service.js's doc comment — nothing
// security/system-critical exists yet), so a disabled category simply skips
// creation entirely: no row, no socket push, no unread-count bump. If a
// mandatory type is ever introduced it must bypass this check explicitly
// rather than being added to CATEGORY_BY_TYPE as "always on".
async function createNotification({
  userId,
  type,
  title,
  message,
  relatedBookingId = null,
  relatedProviderId = null,
  relatedReviewId = null,
  relatedQueueEntryId = null,
}) {
  const enabled = await notificationPreferenceService.isCategoryEnabled(userId, type);
  if (!enabled) return null;

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      relatedBookingId,
      relatedProviderId,
      relatedReviewId,
      relatedQueueEntryId,
    },
  });

  getIO()?.to(roomForUser(userId)).emit('notification:new', notification);

  return notification;
}

function createNotifications(items) {
  return Promise.all(items.map((item) => createNotification(item)));
}

// Queue's "almost your turn" notification needs to fire exactly once per
// queue entry, even though the snapshot it's derived from gets recomputed
// and broadcast on every queue mutation for that provider (any of which
// could shift someone else into the front position). Existence-checking
// on relatedQueueEntryId — rather than tracking a flag on QueueEntry
// itself — keeps this a pure notifications concern with no schema/service
// coupling back into queue.service.js.
async function notifyAlmostTurnIfNeeded(snapshot) {
  const candidates = snapshot.entries.filter(
    (entry) => entry.status === 'WAITING' && entry.customersAhead === 0 && entry.customerId,
  );
  if (candidates.length === 0) return;

  for (const entry of candidates) {
    const alreadyNotified = await prisma.notification.findFirst({
      where: { type: 'QUEUE_ALMOST_TURN', relatedQueueEntryId: entry.id },
      select: { id: true },
    });
    if (alreadyNotified) continue;

    await createNotification({
      userId: entry.customerId,
      type: 'QUEUE_ALMOST_TURN',
      title: "You're next in line",
      message: `You're next in line at ${entry.provider?.businessName ?? 'the provider'}.`,
      relatedQueueEntryId: entry.id,
    });
  }
}

async function listNotifications(userId, { unreadOnly = false } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly && { isRead: false }) },
    orderBy: { createdAt: 'desc' },
  });
}

async function getUnreadCount(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

async function markAsRead(idParam, userId) {
  const id = toId(idParam, 'notification id');

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw notFound('Notification not found');
  if (notification.userId !== userId) {
    throw forbidden('You can only update your own notifications');
  }

  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

async function markAllAsRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

async function deleteNotification(idParam, userId) {
  const id = toId(idParam, 'notification id');

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw notFound('Notification not found');
  if (notification.userId !== userId) {
    throw forbidden('You can only delete your own notifications');
  }

  await prisma.notification.delete({ where: { id } });
}

module.exports = {
  createNotification,
  createNotifications,
  notifyAlmostTurnIfNeeded,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
