const prisma = require('../config/prisma');
const financeService = require('./finance.service');
const bookingPolicyService = require('./bookingPolicy.service');
const { ACTIVE_STATUSES, ALL_STATUSES, TRANSITIONS } = require('./shared/bookingTransitions');
const {
  parseTimeOnly,
  timeToMinutes,
  localDateOnlyOf,
  localTimeOnlyOf,
  dayOfWeekOf,
  combineLocalDateTime,
} = require('./shared/availabilityRules');

// Postgres's serialization_failure SQLSTATE (see the Serializable
// transaction below) — Prisma's interactive transactions surface it as this
// known-request-error code rather than a raw Postgres error.
const SERIALIZATION_FAILURE_CODE = 'P2034';

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
  customer: { select: { id: true, name: true, email: true, phone: true } },
  providerService: {
    include: {
      category: true,
      provider: { select: { id: true, businessName: true, address: true, userId: true } },
    },
  },
  // Existence only — just enough for a client to know whether "leave a
  // review" should show at all, never the review's own content (that
  // already has its own real endpoints, see review.service.js).
  review: { select: { id: true } },
};

async function requireOwnProviderId(userId, tx = prisma) {
  const provider = await tx.provider.findUnique({ where: { userId } });
  if (!provider) {
    throw forbidden('No provider profile is linked to this account');
  }
  return provider.id;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function createBooking({ customerId, providerServiceId, scheduledAt, notes }) {
  const parsedServiceId = toId(providerServiceId, 'providerServiceId');

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw badRequest('scheduledAt must be a valid date');
  }
  if (scheduledDate.getTime() <= Date.now()) {
    throw badRequest('scheduledAt must be in the future');
  }

  // Platform-wide booking policy (see bookingPolicy.service.js) —
  // re-derived here independently rather than trusted from whatever the
  // availability endpoint showed a moment earlier, matching every other
  // check in this function (operating hours, overlap) that a client could
  // otherwise bypass by posting directly to this endpoint.
  const policy = await bookingPolicyService.getActivePolicy();
  const minAdvanceMs = policy.minAdvanceMinutes * 60_000;
  if (scheduledDate.getTime() < Date.now() + minAdvanceMs) {
    throw badRequest(
      `This provider requires at least ${policy.minAdvanceMinutes} minutes' notice — choose a later time`,
    );
  }

  const requestedDateOnly = localDateOnlyOf(scheduledDate);
  const todayOnly = localDateOnlyOf(new Date());
  const todayMidnight = combineLocalDateTime(todayOnly, { hour: 0, minute: 0 });
  const requestedMidnight = combineLocalDateTime(requestedDateOnly, { hour: 0, minute: 0 });
  const daysFromToday = Math.round((requestedMidnight.getTime() - todayMidnight.getTime()) / 86_400_000);

  if (daysFromToday === 0 && !policy.allowSameDayBooking) {
    throw badRequest('Same-day booking is currently disabled — please choose a later date');
  }
  if (daysFromToday > policy.maxAdvanceDays) {
    throw badRequest(`Bookings can only be made up to ${policy.maxAdvanceDays} days in advance`);
  }

  const service = await prisma.providerService.findUnique({
    where: { id: parsedServiceId },
    include: { provider: true },
  });
  if (!service) {
    throw notFound('Service not found');
  }
  if (!service.isAvailable) {
    throw badRequest('This service is not currently available for booking');
  }
  if (!service.provider.isApproved) {
    throw badRequest('This provider is not currently accepting bookings');
  }

  const newStart = scheduledDate;
  const newEnd = new Date(newStart.getTime() + service.durationMinutes * 60_000);

  // Operating hours are defined per calendar day (see
  // availabilityRules.js) and never span midnight, so a booking whose
  // duration would carry it into the next day can never legally fit —
  // reject it before even looking up hours, rather than comparing an
  // end-of-next-day clock time against today's closing time.
  const startDateOnly = localDateOnlyOf(newStart);
  const endDateOnly = localDateOnlyOf(newEnd);
  if (
    startDateOnly.year !== endDateOnly.year ||
    startDateOnly.month !== endDateOnly.month ||
    startDateOnly.day !== endDateOnly.day
  ) {
    throw badRequest('This service duration would extend past midnight — choose an earlier time');
  }

  // The same operating-hours check the availability endpoint uses to build
  // the slot grid a customer just looked at — enforced again here so a
  // client can never bypass it by posting directly to this endpoint.
  const dayOfWeek = dayOfWeekOf(startDateOnly);
  const hours = await prisma.providerOperatingHour.findUnique({
    where: { providerId_dayOfWeek: { providerId: service.providerId, dayOfWeek } },
  });
  if (!hours) {
    throw badRequest('This provider has not configured operating hours for this day yet');
  }
  if (hours.isClosed) {
    throw badRequest(`This provider is closed on ${dayOfWeek}`);
  }

  const openMinutes = timeToMinutes(parseTimeOnly(hours.openTime, 'openTime'));
  const closeMinutes = timeToMinutes(parseTimeOnly(hours.closeTime, 'closeTime'));
  const startMinutes = timeToMinutes(localTimeOnlyOf(newStart));
  const endMinutes = timeToMinutes(localTimeOnlyOf(newEnd));
  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    throw badRequest(
      `This time is outside the provider's operating hours for ${dayOfWeek} (${hours.openTime}–${hours.closeTime})`,
    );
  }

  // The overlap check-then-create is wrapped in a Serializable transaction
  // so two concurrent requests for the same slot cannot both pass the
  // check before either commits (the read-then-write race the "stale
  // availability" scenario is about) — Postgres aborts the loser with a
  // serialization failure, which is mapped to the same 409 a same-process
  // overlap produces below.
  try {
    return await prisma.$transaction(
      async (tx) => {
        const candidateBookings = await tx.booking.findMany({
          where: {
            status: { in: ACTIVE_STATUSES },
            providerService: { providerId: service.providerId },
          },
          include: { providerService: { select: { durationMinutes: true } } },
        });

        const hasOverlap = candidateBookings.some((existing) => {
          const existingStart = existing.scheduledAt;
          const existingEnd = new Date(
            existingStart.getTime() + existing.providerService.durationMinutes * 60_000,
          );
          return overlaps(newStart, newEnd, existingStart, existingEnd);
        });
        if (hasOverlap) {
          throw conflict('This provider already has a booking that overlaps this time slot');
        }

        return tx.booking.create({
          data: {
            customerId,
            providerServiceId: parsedServiceId,
            scheduledAt: newStart,
            notes: notes || null,
            priceAtBooking: service.price,
          },
          include: WITH_DETAILS,
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err) {
    if (err.code === SERIALIZATION_FAILURE_CODE) {
      throw conflict('This time slot was just booked by someone else — please choose another time');
    }
    throw err;
  }
}

async function listBookings(requestingUser) {
  let where = {};
  if (requestingUser.role === 'CUSTOMER') {
    where = { customerId: requestingUser.userId };
  } else if (requestingUser.role === 'PROVIDER') {
    const providerId = await requireOwnProviderId(requestingUser.userId);
    where = { providerService: { providerId } };
  }
  // ADMIN: no filter — sees everything.

  return prisma.booking.findMany({
    where,
    include: WITH_DETAILS,
    orderBy: { scheduledAt: 'desc' },
  });
}

async function assertBookingAccess(booking, requestingUser) {
  if (requestingUser.role === 'ADMIN') return;
  if (requestingUser.role === 'CUSTOMER') {
    if (booking.customerId !== requestingUser.userId) {
      throw forbidden('You can only view your own bookings');
    }
    return;
  }
  if (requestingUser.role === 'PROVIDER') {
    if (booking.providerService.provider.userId !== requestingUser.userId) {
      throw forbidden('You can only view bookings for your own business');
    }
  }
}

async function getBookingById(idParam, requestingUser) {
  const id = toId(idParam, 'booking id');
  const booking = await prisma.booking.findUnique({ where: { id }, include: WITH_DETAILS });
  if (!booking) throw notFound('Booking not found');

  await assertBookingAccess(booking, requestingUser);
  return booking;
}

// `tx` defaults to the shared prisma client so every existing caller keeps
// working unchanged; queue.service.js passes its own transaction client so
// a queue mutation and the booking-status sync it triggers commit or roll
// back together (see the Queue audit — booking sync must never "silently
// create an impossible Booking state").
//
// A transition to COMPLETED must additionally create the booking's
// FinancialTransaction atomically with the status flip (Phase D) — if the
// caller already opened a transaction (tx !== prisma, e.g. queue.service.js
// syncing a queue completion), the work below simply runs inside it; if
// not, one is opened here so the status update and the ledger row commit
// or roll back together either way. Every other transition is a single
// statement and gains nothing from the wrapper but harmless consistency.
async function updateBookingStatus(idParam, nextStatus, requestingUser, tx = prisma) {
  const id = toId(idParam, 'booking id');

  if (!ALL_STATUSES.includes(nextStatus)) {
    throw badRequest('status is not a recognized booking status');
  }

  async function run(client) {
    const booking = await client.booking.findUnique({ where: { id }, include: WITH_DETAILS });
    if (!booking) throw notFound('Booking not found');

    await assertBookingAccess(booking, requestingUser);

    const edge = TRANSITIONS[booking.status]?.[nextStatus];
    if (!edge) {
      throw badRequest(`Cannot move a booking from ${booking.status} to ${nextStatus}`);
    }
    if (!edge.roles.includes(requestingUser.role)) {
      throw forbidden(`Your role cannot move a booking from ${booking.status} to ${nextStatus}`);
    }

    const data = { status: nextStatus };
    if (edge.sets === 'cancelledAt') data.cancelledAt = new Date();
    if (edge.sets === 'completedAt') data.completedAt = new Date();

    const updated = await client.booking.update({ where: { id }, data, include: WITH_DETAILS });

    if (nextStatus === 'COMPLETED') {
      await financeService.createTransactionForCompletedBooking(updated, client);
    }

    return updated;
  }

  if (tx !== prisma) return run(tx);
  return prisma.$transaction((txClient) => run(txClient));
}

async function deleteBooking(idParam, requestingUser) {
  const id = toId(idParam, 'booking id');
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound('Booking not found');

  const isOwnPendingCustomerBooking =
    requestingUser.role === 'CUSTOMER' &&
    booking.customerId === requestingUser.userId &&
    booking.status === 'PENDING';
  const isAdmin = requestingUser.role === 'ADMIN';

  if (!isOwnPendingCustomerBooking && !isAdmin) {
    throw forbidden(
      requestingUser.role === 'CUSTOMER'
        ? 'Only a still-pending booking can be withdrawn — cancel it instead if it has been confirmed'
        : 'You do not have permission to delete this booking',
    );
  }

  await prisma.booking.delete({ where: { id } });
}

module.exports = {
  createBooking,
  listBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
  requireOwnProviderId,
  TRANSITIONS,
};
