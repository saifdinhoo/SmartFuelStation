const queueService = require('../services/queue.service');
const socketEvents = require('../sockets/queueEvents');
const notificationService = require('../services/notification.service');
const { bookingStatusNotification } = require('../services/shared/bookingStatusNotification');

// Shared by every handler below that syncs a Queue transition onto its
// linked Booking — mirrors the same helper booking.controller.js uses for
// direct booking-status changes, so the customer gets exactly one
// notification for a status change regardless of which surface drove it.
function notifyBookingSync(entry, actingRole) {
  if (!(entry.bookingId && entry.customerId && entry.booking)) return null;
  return bookingStatusNotification(
    {
      id: entry.bookingId,
      status: entry.booking.status,
      scheduledAt: entry.booking.scheduledAt,
      customerId: entry.booking.customerId,
      businessName: entry.provider.businessName,
      providerUserId: entry.provider.userId,
    },
    actingRole,
  );
}

// Socket pushes always run after the REST response has already been sent
// — the response is the source of truth for the caller who made the
// change, sockets are purely a notification to everyone (including other
// sessions of the same user) that it happened. A push failing here must
// never turn into a 500 for a request that already succeeded and already
// got a response, hence the local try/catch instead of passing to next().
async function safely(fn) {
  try {
    await fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Socket.IO notification failed:', err);
  }
}

async function create(req, res, next) {
  try {
    const entry = await queueService.createQueueEntry(req.body, req.user);
    res.status(201).json({ success: true, data: entry });

    await safely(async () => {
      const snapshot = await socketEvents.broadcastProviderQueueUpdate(entry.providerId);
      if (entry.bookingId && entry.customerId && entry.booking) {
        await socketEvents.notifyBookingStatusChanged(
          entry.customerId,
          entry.bookingId,
          entry.booking.status,
        );
      }
      // Walk-ins with no linked customer account have no inbox to notify.
      if (entry.customerId) {
        await notificationService.createNotification({
          userId: entry.customerId,
          type: 'QUEUE_JOINED',
          title: 'Added to queue',
          message: `You've been added to the queue at ${entry.provider.businessName}.`,
          relatedQueueEntryId: entry.id,
        });
      }
      if (snapshot) await notificationService.notifyAlmostTurnIfNeeded(snapshot);
    });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const entries = await queueService.listQueue(req.user, { providerId: req.query.providerId });
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const entry = await queueService.getQueueEntryById(req.params.id, req.user);
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

async function getSummary(req, res, next) {
  try {
    const summary = await queueService.getQueueSummary(req.params.providerId);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const entry = await queueService.updateQueueEntryStatus(
      req.params.id,
      req.body.status,
      req.user,
    );
    res.json({ success: true, data: entry });

    await safely(async () => {
      const snapshot = await socketEvents.broadcastProviderQueueUpdate(entry.providerId);
      if (entry.customerId) {
        await socketEvents.notifyCustomerEntry(entry.customerId, entry);
      }
      if (entry.bookingId && entry.customerId && entry.booking) {
        await socketEvents.notifyBookingStatusChanged(
          entry.customerId,
          entry.bookingId,
          entry.booking.status,
        );
      }
      const notification = notifyBookingSync(entry, req.user.role);
      if (notification) await notificationService.createNotification(notification);
      if (snapshot) await notificationService.notifyAlmostTurnIfNeeded(snapshot);

      // A queue completion syncs the linked booking to COMPLETED inside
      // the same transaction that atomically created its
      // FinancialTransaction (see booking.service.js's updateBookingStatus)
      // — the ledger row is already committed by the time this runs.
      if (entry.booking?.status === 'COMPLETED') {
        await socketEvents.notifyFinanceUpdated({ providerId: entry.providerId });
      }
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const removed = await queueService.removeQueueEntry(req.params.id, req.user);
    res.status(204).send();

    await safely(async () => {
      const snapshot = await socketEvents.broadcastProviderQueueUpdate(removed.providerId);
      if (removed.customerId) {
        await socketEvents.notifyCustomerRemoved(removed.customerId, removed.id);
      }
      if (removed.bookingId && removed.customerId) {
        await socketEvents.notifyBookingStatusChanged(removed.customerId, removed.bookingId, 'CANCELLED');
        // removeQueueEntry's return is deliberately minimal (the row is
        // gone, nothing left to re-fetch — see queue.service.js), so this
        // is a simpler message than bookingStatusNotification's, which
        // needs schedule/business-name fields this shape doesn't have.
        await notificationService.createNotification({
          userId: removed.customerId,
          type: 'BOOKING_CANCELLED',
          title: 'Booking cancelled',
          message: 'Your booking was cancelled.',
          relatedBookingId: removed.bookingId,
        });
      }
      if (snapshot) await notificationService.notifyAlmostTurnIfNeeded(snapshot);
    });
  } catch (err) {
    next(err);
  }
}

async function reorder(req, res, next) {
  try {
    const entries = await queueService.reorderQueue(req.body, req.user);
    res.json({ success: true, data: entries });

    if (entries[0]) {
      await safely(async () => {
        const snapshot = await socketEvents.broadcastProviderQueueUpdate(entries[0].providerId);
        if (snapshot) await notificationService.notifyAlmostTurnIfNeeded(snapshot);
      });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, getSummary, updateStatus, remove, reorder };
