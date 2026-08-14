const prisma = require('../config/prisma');
const bookingService = require('./booking.service');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

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

function conflict(message) {
  const err = new Error(message);
  err.statusCode = 409;
  return err;
}

function toId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id)) {
    throw badRequest(`${label} must be a valid integer`);
  }
  return id;
}

const WITH_DETAILS = {
  provider: { select: { id: true, userId: true, businessName: true } },
  providerService: { select: { id: true, providerId: true, name: true, durationMinutes: true } },
  customer: { select: { id: true, name: true, email: true } },
  booking: { select: { id: true, status: true, customerId: true, scheduledAt: true } },
};

// Provider-facing queue actions only (matches the audit: customers never
// mutate the queue directly, and there's no queue-specific role beyond the
// existing PROVIDER/ADMIN/CUSTOMER set).
const QUEUE_TRANSITIONS = {
  WAITING: {
    IN_SERVICE: { roles: ['PROVIDER', 'ADMIN'] },
    CANCELLED: { roles: ['PROVIDER', 'ADMIN'] },
  },
  IN_SERVICE: {
    COMPLETED: { roles: ['PROVIDER', 'ADMIN'] },
  },
  // No IN_SERVICE -> CANCELLED edge: the linked Booking has no valid edge
  // for "cancelled after service already started" (see booking
  // TRANSITIONS — IN_SERVICE only leads to COMPLETED), and Queue is not
  // allowed to put Booking in a state Booking itself doesn't recognize.
};

// Mirrors each Queue transition onto the Booking it's linked to, reusing
// booking.service.js's own transition validation rather than duplicating
// it (see the Queue audit).
const BOOKING_SYNC = { IN_SERVICE: 'IN_SERVICE', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' };

// Fallback only: ProviderService.durationMinutes is a required column, so
// this should never actually be hit. It exists so a wait-time computation
// can never silently fabricate a number for a row with missing data —
// falling back to a fixed, documented value instead of NaN/undefined.
const DEFAULT_SERVICE_DURATION_MINUTES = 15;

async function requireOwnProviderId(userId, tx = prisma) {
  return bookingService.requireOwnProviderId(userId, tx);
}

async function assertQueueAccess(entry, requestingUser, tx = prisma) {
  if (requestingUser.role === 'ADMIN') return;
  if (requestingUser.role === 'PROVIDER') {
    const ownProviderId = await requireOwnProviderId(requestingUser.userId, tx);
    if (ownProviderId !== entry.providerId) {
      throw forbidden("You can only access your own business's queue");
    }
    return;
  }
  // CUSTOMER: only their own entry, never another customer's.
  if (entry.customerId !== requestingUser.userId) {
    throw forbidden('You can only view your own queue entry');
  }
}

function estimateRemainingMinutes(entry) {
  const duration = entry.providerService?.durationMinutes ?? DEFAULT_SERVICE_DURATION_MINUTES;
  if (entry.status !== 'IN_SERVICE' || !entry.startedAt) return duration;
  const elapsedMinutes = (Date.now() - new Date(entry.startedAt).getTime()) / 60_000;
  return Math.max(duration - elapsedMinutes, 0);
}

// Deterministic wait estimate: for each WAITING entry, sum the remaining
// time of whichever entry is currently IN_SERVICE for that provider (if
// any) plus the full duration of every WAITING entry ahead of it
// (lower position). COMPLETED/CANCELLED entries never contribute — they're
// not actually occupying the line anymore. Also attaches customersAhead —
// a plain count, safe to expose to a customer even though the entries used
// to compute it (other customers' rows) are never themselves returned to
// one — see the CUSTOMER branch of listQueue/getQueueEntryById, which call
// this over the *full* provider queue and then discard everything but the
// caller's own entry.
function attachWaitEstimates(entries) {
  const byProvider = new Map();
  for (const entry of entries) {
    const list = byProvider.get(entry.providerId) || [];
    list.push(entry);
    byProvider.set(entry.providerId, list);
  }

  const estimateById = new Map();
  const aheadById = new Map();
  for (const list of byProvider.values()) {
    const inServiceEntries = list.filter((e) => e.status === 'IN_SERVICE');
    const inServiceMinutes = inServiceEntries.reduce(
      (sum, e) => sum + estimateRemainingMinutes(e),
      0,
    );

    const waiting = list
      .filter((e) => e.status === 'WAITING')
      .sort((a, b) => a.position - b.position);

    let cumulative = inServiceMinutes;
    waiting.forEach((entry, index) => {
      estimateById.set(entry.id, Math.round(cumulative));
      aheadById.set(entry.id, inServiceEntries.length + index);
      cumulative += estimateRemainingMinutes(entry);
    });
  }

  return entries.map((entry) => ({
    ...entry,
    estimatedWaitMinutes: entry.status === 'WAITING' ? (estimateById.get(entry.id) ?? 0) : null,
    customersAhead: entry.status === 'WAITING' ? (aheadById.get(entry.id) ?? 0) : null,
  }));
}

async function nextPosition(tx, providerId) {
  const last = await tx.queueEntry.findFirst({
    where: { providerId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  return (last?.position ?? 0) + 1;
}

// A customer's own wait estimate/position depends on who else is ahead of
// them — but they must never receive those other rows. This computes
// estimates over the *entire* queue for every provider the customer has an
// entry with, then returns only the customer's own entries (now carrying
// correct numbers). Restricting the DB query itself to `customerId` first
// (as the old version did) would make attachWaitEstimates think the
// customer is alone in the queue and understate everyone's wait.
async function listOwnQueueEntries(customerId) {
  const ownEntries = await prisma.queueEntry.findMany({
    where: { customerId },
    include: WITH_DETAILS,
    orderBy: { joinedAt: 'desc' },
  });
  if (ownEntries.length === 0) return [];

  const providerIds = [...new Set(ownEntries.map((e) => e.providerId))];
  const allForThoseProviders = await prisma.queueEntry.findMany({
    where: { providerId: { in: providerIds } },
    include: WITH_DETAILS,
  });
  const withEstimates = attachWaitEstimates(allForThoseProviders);
  const byId = new Map(withEstimates.map((e) => [e.id, e]));

  return ownEntries.map((e) => byId.get(e.id) ?? { ...e, estimatedWaitMinutes: null, customersAhead: null });
}

async function listQueue(requestingUser, { providerId } = {}) {
  if (requestingUser.role === 'CUSTOMER') {
    return listOwnQueueEntries(requestingUser.userId);
  }

  let where = {};
  if (requestingUser.role === 'PROVIDER') {
    const ownProviderId = await requireOwnProviderId(requestingUser.userId);
    where = { providerId: ownProviderId };
  } else if (providerId !== undefined) {
    // ADMIN: platform-wide by default, optionally narrowed to one provider.
    where = { providerId: toId(providerId, 'providerId') };
  }

  const entries = await prisma.queueEntry.findMany({
    where,
    include: WITH_DETAILS,
    orderBy: [{ providerId: 'asc' }, { position: 'asc' }],
  });

  return attachWaitEstimates(entries);
}

async function getQueueEntryById(idParam, requestingUser) {
  const id = toId(idParam, 'queue entry id');
  const entry = await prisma.queueEntry.findUnique({ where: { id }, include: WITH_DETAILS });
  if (!entry) throw notFound('Queue entry not found');

  await assertQueueAccess(entry, requestingUser);

  // Same reasoning as listOwnQueueEntries: compute over the whole
  // provider's queue so the estimate/position account for everyone ahead,
  // then return only the one entry the caller was already allowed to see.
  const allForProvider = await prisma.queueEntry.findMany({
    where: { providerId: entry.providerId },
    include: WITH_DETAILS,
  });
  const withEstimates = attachWaitEstimates(allForProvider);
  return withEstimates.find((e) => e.id === entry.id) ?? entry;
}

// Privacy-safe aggregate for discovery/browsing — no entry-level detail,
// no customer identities, just how busy the provider is right now and how
// long the current backlog would take to clear (i.e. roughly how long
// someone joining this instant would wait).
async function getQueueSummary(providerIdParam) {
  const providerId = toId(providerIdParam, 'provider id');

  const entries = await prisma.queueEntry.findMany({
    where: { providerId, status: { in: ['WAITING', 'IN_SERVICE'] } },
    include: { providerService: { select: { durationMinutes: true } } },
  });

  const inService = entries.filter((e) => e.status === 'IN_SERVICE');
  const waiting = entries.filter((e) => e.status === 'WAITING');
  const inServiceMinutes = inService.reduce((sum, e) => sum + estimateRemainingMinutes(e), 0);
  const waitingMinutes = waiting.reduce(
    (sum, e) => sum + (e.providerService?.durationMinutes ?? DEFAULT_SERVICE_DURATION_MINUTES),
    0,
  );

  return {
    providerId,
    queueLength: inService.length + waiting.length,
    estimatedWaitMinutes: Math.round(inServiceMinutes + waitingMinutes),
  };
}

// Feeds the Socket.IO layer (sockets/queueEvents.js) after a mutation —
// deliberately scoped to WAITING/IN_SERVICE only, not full history, since
// this is "what does the live queue look like right now", not an audit
// log. A caller who just transitioned an entry to COMPLETED/CANCELLED
// won't find it here anymore; that's the socket layer's job to notify
// directly with the one entry it already has in hand, not this function's.
async function getProviderQueueSnapshot(providerId) {
  const entries = await prisma.queueEntry.findMany({
    where: { providerId, status: { in: ['WAITING', 'IN_SERVICE'] } },
    include: WITH_DETAILS,
    orderBy: [{ position: 'asc' }],
  });
  const withEstimates = attachWaitEstimates(entries);
  const summary = await getQueueSummary(providerId);
  return { providerId, entries: withEstimates, summary };
}

async function createFromBooking(bookingId, requestingUser) {
  const id = toId(bookingId, 'bookingId');

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        providerService: true,
        queueEntry: true,
      },
    });
    if (!booking) throw notFound('Booking not found');

    const providerId = booking.providerService.providerId;
    if (requestingUser.role === 'PROVIDER') {
      const ownProviderId = await requireOwnProviderId(requestingUser.userId, tx);
      if (ownProviderId !== providerId) {
        throw forbidden("You can only manage your own business's queue");
      }
    }

    // Requirement 9 (duplicate prevention): the schema's own
    // bookingId @unique already guarantees this at the DB level for any
    // status, not just active ones — a booking can never be linked to a
    // second queue entry even after its first one is completed/cancelled.
    // This check just turns that into a clean 409 instead of a raw P2002.
    if (booking.queueEntry) {
      throw conflict('This booking already has a queue entry');
    }
    // Requirement 10: only a booking that has actually reached the front
    // desk (ARRIVED) is eligible — this also covers "completed/cancelled/
    // rejected bookings can't be added" since none of those are ARRIVED.
    if (booking.status !== 'ARRIVED') {
      throw badRequest(
        `Only a booking with status ARRIVED can be added to the queue (current status: ${booking.status})`,
      );
    }

    const position = await nextPosition(tx, providerId);

    const entry = await tx.queueEntry.create({
      data: {
        providerId,
        providerServiceId: booking.providerServiceId,
        bookingId: booking.id,
        customerId: booking.customerId,
        customerName: booking.customer.name,
        status: 'WAITING',
        position,
      },
      include: WITH_DETAILS,
    });

    // Reuses booking.service.js's own transition validation — the
    // ARRIVED -> IN_QUEUE edge already exists in the shared state machine.
    await bookingService.updateBookingStatus(booking.id, 'IN_QUEUE', requestingUser, tx);

    // `entry.booking` was captured before the update above and would
    // still read ARRIVED — re-fetch so callers (the REST response and,
    // via the controller, the Socket.IO payload) see the booking's actual
    // current status rather than a one-step-stale snapshot.
    return tx.queueEntry.findUnique({ where: { id: entry.id }, include: WITH_DETAILS });
  });
}

async function createWalkIn({ providerServiceId, customerName, customerId }, requestingUser) {
  if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
    throw badRequest('customerName is required for a walk-in queue entry');
  }
  const parsedServiceId = toId(providerServiceId, 'providerServiceId');

  return prisma.$transaction(async (tx) => {
    const service = await tx.providerService.findUnique({ where: { id: parsedServiceId } });
    if (!service) throw notFound('Service not found');

    const providerId = service.providerId;
    if (requestingUser.role === 'PROVIDER') {
      const ownProviderId = await requireOwnProviderId(requestingUser.userId, tx);
      if (ownProviderId !== providerId) {
        throw forbidden("You can only manage your own business's queue");
      }
    }

    const position = await nextPosition(tx, providerId);

    return tx.queueEntry.create({
      data: {
        providerId,
        providerServiceId: parsedServiceId,
        customerName: customerName.trim(),
        customerId: customerId !== undefined && customerId !== null ? toId(customerId, 'customerId') : null,
        status: 'WAITING',
        position,
      },
      include: WITH_DETAILS,
    });
  });
}

async function createQueueEntry(input, requestingUser) {
  if (requestingUser.role === 'CUSTOMER') {
    throw forbidden('Customers cannot add entries to a queue');
  }

  const hasBooking = input.bookingId !== undefined && input.bookingId !== null;
  const hasWalkIn = input.providerServiceId !== undefined || input.customerName !== undefined;
  if (hasBooking && hasWalkIn) {
    throw badRequest('Provide either bookingId or providerServiceId/customerName, not both');
  }
  if (!hasBooking && !hasWalkIn) {
    throw badRequest(
      'Provide either bookingId (booking-backed) or providerServiceId and customerName (walk-in)',
    );
  }

  try {
    if (hasBooking) return await createFromBooking(input.bookingId, requestingUser);
    return await createWalkIn(input, requestingUser);
  } catch (err) {
    // Belt-and-suspenders: a race on nextPosition() between two concurrent
    // inserts for the same provider would surface here as a raw unique
    // violation on (providerId, position) — translate it into a clean,
    // retry-able 409 rather than letting a Prisma error code leak out.
    if (err.code === 'P2002') throw conflict('Queue position conflict, please retry');
    throw err;
  }
}

async function updateQueueEntryStatus(idParam, nextStatus, requestingUser) {
  if (requestingUser.role === 'CUSTOMER') {
    throw forbidden('Customers cannot change queue status');
  }
  const id = toId(idParam, 'queue entry id');

  return prisma.$transaction(async (tx) => {
    const entry = await tx.queueEntry.findUnique({ where: { id }, include: WITH_DETAILS });
    if (!entry) throw notFound('Queue entry not found');

    if (requestingUser.role === 'PROVIDER') {
      const ownProviderId = await requireOwnProviderId(requestingUser.userId, tx);
      if (ownProviderId !== entry.providerId) {
        throw forbidden("You can only manage your own business's queue");
      }
    }

    const edge = QUEUE_TRANSITIONS[entry.status]?.[nextStatus];
    if (!edge) {
      throw badRequest(`Cannot move a queue entry from ${entry.status} to ${nextStatus}`);
    }
    if (!edge.roles.includes(requestingUser.role)) {
      throw forbidden(`Your role cannot move a queue entry from ${entry.status} to ${nextStatus}`);
    }

    const data = { status: nextStatus };
    if (nextStatus === 'IN_SERVICE') data.startedAt = new Date();
    if (nextStatus === 'COMPLETED') data.completedAt = new Date();

    let updated = await tx.queueEntry.update({ where: { id }, data, include: WITH_DETAILS });

    if (entry.bookingId) {
      const bookingNextStatus = BOOKING_SYNC[nextStatus];
      // If this ever fails (e.g. the linked booking somehow isn't in the
      // state the queue side expects), the whole transaction — queue
      // status change included — rolls back rather than leaving Queue and
      // Booking disagreeing about reality.
      await bookingService.updateBookingStatus(entry.bookingId, bookingNextStatus, requestingUser, tx);
      // `updated.booking` was captured before the line above and would
      // still show the pre-sync status — re-fetch so callers (the REST
      // response and, via the controller, the Socket.IO payload) see the
      // booking's actual current status.
      updated = await tx.queueEntry.findUnique({ where: { id }, include: WITH_DETAILS });
    }

    return updated;
  });
}

async function removeQueueEntry(idParam, requestingUser) {
  if (requestingUser.role === 'CUSTOMER') {
    throw forbidden('Customers cannot remove queue entries');
  }
  const id = toId(idParam, 'queue entry id');

  return prisma.$transaction(async (tx) => {
    const entry = await tx.queueEntry.findUnique({ where: { id }, include: WITH_DETAILS });
    if (!entry) throw notFound('Queue entry not found');

    if (requestingUser.role === 'PROVIDER') {
      const ownProviderId = await requireOwnProviderId(requestingUser.userId, tx);
      if (ownProviderId !== entry.providerId) {
        throw forbidden("You can only manage your own business's queue");
      }
    }

    // A booking linked to an in-service entry has Booking.status =
    // IN_SERVICE, which has no CANCELLED edge (see QUEUE_TRANSITIONS
    // comment) — removing it here would leave no way to keep Booking
    // consistent, so it's refused rather than silently desynced.
    if (entry.bookingId && entry.status === 'IN_SERVICE') {
      throw badRequest(
        'Cannot remove an in-service, booking-linked queue entry — complete it first, ' +
          'or update the booking directly.',
      );
    }

    const wasLinkedAndWaiting = Boolean(entry.bookingId) && entry.status === 'WAITING';

    await tx.queueEntry.delete({ where: { id } });

    if (wasLinkedAndWaiting) {
      await bookingService.updateBookingStatus(entry.bookingId, 'CANCELLED', requestingUser, tx);
    }

    // The row is gone, so there's nothing left to re-fetch — the socket
    // layer (sockets/queueEvents.js) needs exactly these fields to notify
    // the right customer that their entry is gone and, if applicable,
    // that their booking was cancelled.
    return {
      id: entry.id,
      providerId: entry.providerId,
      customerId: entry.customerId,
      bookingId: wasLinkedAndWaiting ? entry.bookingId : null,
    };
  });
}

async function reorderQueue({ orderedIds }, requestingUser) {
  if (requestingUser.role === 'CUSTOMER') {
    throw forbidden('Customers cannot reorder the queue');
  }
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw badRequest('orderedIds must be a non-empty array of queue entry ids');
  }
  const ids = orderedIds.map((value) => toId(value, 'queue entry id'));
  if (new Set(ids).size !== ids.length) {
    throw badRequest('orderedIds must not contain duplicates');
  }

  return prisma.$transaction(async (tx) => {
    const entries = await tx.queueEntry.findMany({ where: { id: { in: ids } } });
    if (entries.length !== ids.length) {
      throw notFound('One or more queue entries were not found');
    }

    const providerIds = new Set(entries.map((e) => e.providerId));
    if (providerIds.size > 1) {
      throw badRequest('All entries being reordered must belong to the same provider');
    }
    const providerId = entries[0].providerId;

    if (requestingUser.role === 'PROVIDER') {
      const ownProviderId = await requireOwnProviderId(requestingUser.userId, tx);
      if (ownProviderId !== providerId) {
        throw forbidden("You can only manage your own business's queue");
      }
    }

    if (entries.some((e) => e.status !== 'WAITING')) {
      throw badRequest('Only WAITING entries can be reordered');
    }

    // Deterministic + no duplicate positions (requirements 4 and 6):
    // orderedIds must be exactly the provider's current WAITING set, not
    // an arbitrary subset — otherwise "reorder" would be ambiguous about
    // where left-out entries land.
    const currentWaiting = await tx.queueEntry.findMany({
      where: { providerId, status: 'WAITING' },
      select: { id: true },
    });
    const currentIds = new Set(currentWaiting.map((e) => e.id));
    if (currentIds.size !== ids.length || !ids.every((entryId) => currentIds.has(entryId))) {
      throw badRequest(
        'orderedIds must include exactly the full current set of WAITING entries for this provider',
      );
    }

    const targetPositions = entries.map((e) => e.position).sort((a, b) => a - b);

    // Two-phase update: first move every row to a sentinel position unique
    // to itself, so phase two's writes can never collide with another
    // row's still-current position mid-transaction —
    // @@unique([providerId, position]) doesn't tolerate even a transient
    // overlap between two UPDATEs in the same transaction. The sentinel
    // must stay positive: the schema also has a DB-level CHECK
    // (position > 0) that a negative placeholder would violate.
    const SENTINEL_OFFSET = 1_000_000_000;
    await Promise.all(
      ids.map((entryId) =>
        tx.queueEntry.update({
          where: { id: entryId },
          data: { position: SENTINEL_OFFSET + entryId },
        }),
      ),
    );
    await Promise.all(
      ids.map((entryId, index) =>
        tx.queueEntry.update({ where: { id: entryId }, data: { position: targetPositions[index] } }),
      ),
    );

    const reordered = await tx.queueEntry.findMany({
      where: { providerId, status: 'WAITING' },
      include: WITH_DETAILS,
      orderBy: { position: 'asc' },
    });
    return attachWaitEstimates(reordered);
  });
}

module.exports = {
  listQueue,
  getQueueEntryById,
  getQueueSummary,
  getProviderQueueSnapshot,
  createQueueEntry,
  updateQueueEntryStatus,
  removeQueueEntry,
  reorderQueue,
};
