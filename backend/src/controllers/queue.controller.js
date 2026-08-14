const queueService = require('../services/queue.service');
const socketEvents = require('../sockets/queueEvents');

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
      await socketEvents.broadcastProviderQueueUpdate(entry.providerId);
      if (entry.bookingId && entry.customerId && entry.booking) {
        await socketEvents.notifyBookingStatusChanged(
          entry.customerId,
          entry.bookingId,
          entry.booking.status,
        );
      }
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
      await socketEvents.broadcastProviderQueueUpdate(entry.providerId);
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
      await socketEvents.broadcastProviderQueueUpdate(removed.providerId);
      if (removed.customerId) {
        await socketEvents.notifyCustomerRemoved(removed.customerId, removed.id);
      }
      if (removed.bookingId && removed.customerId) {
        await socketEvents.notifyBookingStatusChanged(removed.customerId, removed.bookingId, 'CANCELLED');
      }
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
      await safely(() => socketEvents.broadcastProviderQueueUpdate(entries[0].providerId));
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, getSummary, updateStatus, remove, reorder };
