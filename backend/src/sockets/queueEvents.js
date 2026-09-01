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
// Returns the snapshot it just broadcast so a caller that also wants to
// react to it (e.g. queue.controller.js checking for an "almost your turn"
// notification) doesn't need a second, separate query for the same data.
async function broadcastProviderQueueUpdate(providerId) {
  const io = getIO();
  if (!io) return null; // sockets not initialized (e.g. under Jest) — no-op

  const snapshot = await queueService.getProviderQueueSnapshot(providerId);
  io.to(roomForProvider(providerId)).emit('queue:provider_updated', snapshot);

  for (const entry of snapshot.entries) {
    if (entry.customerId) {
      io.to(roomForUser(entry.customerId)).emit('queue:my_update', entry);
    }
  }

  return snapshot;
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

// The booking's own customer always gets this. The owning provider does
// too when `providerId` is supplied — booking-only edges (a customer
// cancelling a PENDING or CONFIRMED booking) never touch the Queue, so
// broadcastProviderQueueUpdate does not cover them and the provider would
// otherwise learn about the cancellation only on its next refetch.
//
// `providerId` is always derived server-side from the booking row by the
// caller; it is never accepted from client input. Omitting it keeps the
// old customer-only behaviour, which is what the queue-driven call sites
// want — those already push a fresh snapshot to the provider room.
//
// The rooms are chained into a single emit rather than sent as two,
// because Socket.IO delivers a union broadcast once per socket: a client
// that somehow sat in both rooms would still receive exactly one frame.
// `.to()` returns a new operator rather than mutating it, hence the
// reassignment.
//
// The payload stays `{ bookingId, status }` for both audiences — it adds
// nothing the provider's own booking endpoints do not already return.
function notifyBookingStatusChanged(customerId, bookingId, status, providerId = null) {
  const io = getIO();
  if (!io) return;

  let target = io.to(roomForUser(customerId));
  if (providerId != null) {
    target = target.to(roomForProvider(providerId));
  }
  target.emit('booking:status_changed', { bookingId, status });
}

// A provider's *public* availability changed — the two fields a customer
// browsing discovery can already see on any provider card.
//
// Deliberately broadcast to every connected socket rather than a room:
// this payload is a strict subset of what GET /providers already returns
// to any authenticated caller, and the handshake middleware rejects
// unauthenticated sockets, so this reaches exactly the audience that could
// have fetched the same values over REST a second earlier.
//
// A per-provider room would be the alternative, but a customer scrolling
// discovery is looking at every provider at once, so they would end up
// subscribed to all of them anyway — more moving parts, identical
// exposure. Worth revisiting if the platform ever has enough providers
// that per-client fan-out becomes the bottleneck.
//
// Only the public availability fields are sent. Address, phone, owner
// identity, approval trail and queue entries are all omitted.
function notifyProviderStatusChanged({ providerId, isOpen, estimatedWaitMinutes, isApproved }) {
  const io = getIO();
  if (!io) return;
  io.emit('provider:status_changed', {
    providerId,
    isOpen,
    estimatedWaitMinutes,
    isApproved,
  });
}

// A provider's booking calendar changed (created, or a status transition
// that moves a booking into or out of the ACTIVE_STATUSES that block a
// slot — see availabilityRules.js/booking.service.js). Any client
// currently viewing GET /providers/:id/availability for this provider
// should treat its last-fetched slot list as stale and refetch.
//
// Broadcast rather than room-targeted, for the same reason as
// notifyProviderStatusChanged: the payload is strictly less than what the
// availability endpoint itself already returns to any authenticated
// caller (just the provider id — no date, no slot data, no customer
// identity), so broadcasting it exposes nothing a socket couldn't already
// learn by calling the REST endpoint directly.
function notifyProviderAvailabilityChanged({ providerId }) {
  const io = getIO();
  if (!io) return;
  io.emit('provider:availability_changed', { providerId });
}

// An Admin changed a provider's fuel inventory. Any client currently
// viewing that provider's fuel status or history (customer or provider)
// should treat its last-fetched data as stale and refetch.
//
// Broadcast rather than room-targeted, for the same reason as
// notifyProviderStatusChanged/notifyProviderAvailabilityChanged: the
// payload is strictly less than what GET /providers/:id/fuel already
// returns to any authenticated caller — just the provider id, never the
// acting admin's identity or the new values themselves.
function notifyProviderFuelUpdated({ providerId }) {
  const io = getIO();
  if (!io) return;
  io.emit('provider:fuel_updated', { providerId });
}

// A booking completed (creating/finding its FinancialTransaction), a
// settlement status changed, or a provider's commission rate changed.
// Broadcast rather than room-targeted, for the same reason as
// notifyProviderFuelUpdated: the payload is strictly less than what the
// finance endpoints already return to any authenticated, authorized
// caller — just the provider id, never a money figure or the acting
// admin's identity (see the Phase D report's "Socket.IO behavior"
// section).
function notifyFinanceUpdated({ providerId }) {
  const io = getIO();
  if (!io) return;
  io.emit('finance:updated', { providerId });
}

module.exports = {
  broadcastProviderQueueUpdate,
  notifyCustomerEntry,
  notifyCustomerRemoved,
  notifyBookingStatusChanged,
  notifyProviderStatusChanged,
  notifyProviderAvailabilityChanged,
  notifyProviderFuelUpdated,
  notifyFinanceUpdated,
};
