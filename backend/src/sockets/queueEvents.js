// Side-effect layer: turns a queue.service.js mutation result into
// Socket.IO pushes. Deliberately one-directional (this file requires
// queue.service.js, never the reverse) so the service layer stays free of
// socket concerns — it's called from queue.controller.js, after the
// service call and the REST response have already succeeded, never from
// inside a Prisma transaction. REST remains the only place a mutation is
// actually committed; this only announces it afterward.
const { getIO, roomForUser, roomForProvider } = require('./index');
const queueService = require('../services/queue.service');

// Fetches a fresh snapshot and pushes it to the provider's management
// room, then pushes each currently-active entry's own numbers to its
// linked customer's private room. Safe to call after any queue mutation
// for that provider — add, reorder, remove, or status change all shift
// position/customersAhead/estimatedWaitMinutes for other people in the
// same line, not just the entry that was directly touched.
async function broadcastProviderQueueUpdate(providerId) {
  const io = getIO();
  if (!io) return; // sockets not initialized (e.g. under Jest) — no-op

  const snapshot = await queueService.getProviderQueueSnapshot(providerId);
  io.to(roomForProvider(providerId)).emit('queue:provider_updated', snapshot);

  for (const entry of snapshot.entries) {
    if (entry.customerId) {
      io.to(roomForUser(entry.customerId)).emit('queue:my_update', entry);
    }
  }
}

// Direct push of one entry to its own customer — used for the terminal
// transitions (COMPLETED/CANCELLED) that broadcastProviderQueueUpdate's
// snapshot no longer contains, since that snapshot only ever holds
// WAITING/IN_SERVICE rows.
function notifyCustomerEntry(customerId, entry) {
  const io = getIO();
  if (!io) return;
  io.to(roomForUser(customerId)).emit('queue:my_update', entry);
}

// Same idea, for the case where the row itself no longer exists at all
// (removeQueueEntry hard-deletes it) — tells the customer's own client to
// stop showing "in queue" without needing a matching entry to key off of.
function notifyCustomerRemoved(customerId, entryId) {
  const io = getIO();
  if (!io) return;
  io.to(roomForUser(customerId)).emit('queue:my_update', { id: entryId, removed: true });
}

function notifyBookingStatusChanged(customerId, bookingId, status) {
  const io = getIO();
  if (!io) return;
  io.to(roomForUser(customerId)).emit('booking:status_changed', { bookingId, status });
}

module.exports = {
  broadcastProviderQueueUpdate,
  notifyCustomerEntry,
  notifyCustomerRemoved,
  notifyBookingStatusChanged,
};
