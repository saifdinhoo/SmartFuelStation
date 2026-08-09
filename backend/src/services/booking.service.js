const prisma = require('../config/prisma');

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

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_QUEUE', 'IN_SERVICE'];
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED'];

// Who may drive each transition, and which side-effect field it sets.
// Admins can invoke anything a provider can — the state machine itself
// (which edges exist at all) applies equally to every role.
const TRANSITIONS = {
  PENDING: {
    CONFIRMED: { roles: ['PROVIDER', 'ADMIN'] },
    REJECTED: { roles: ['PROVIDER', 'ADMIN'] },
    CANCELLED: { roles: ['CUSTOMER', 'PROVIDER', 'ADMIN'], sets: 'cancelledAt' },
  },
  CONFIRMED: {
    ARRIVED: { roles: ['PROVIDER', 'ADMIN'] },
    CANCELLED: { roles: ['CUSTOMER', 'PROVIDER', 'ADMIN'], sets: 'cancelledAt' },
  },
  // Once the customer has arrived, cancellation becomes a front-desk
  // (provider/admin) action rather than something the app self-serves.
  ARRIVED: {
    IN_QUEUE: { roles: ['PROVIDER', 'ADMIN'] },
    CANCELLED: { roles: ['PROVIDER', 'ADMIN'], sets: 'cancelledAt' },
  },
  IN_QUEUE: {
    IN_SERVICE: { roles: ['PROVIDER', 'ADMIN'] },
    CANCELLED: { roles: ['PROVIDER', 'ADMIN'], sets: 'cancelledAt' },
  },
  IN_SERVICE: {
    COMPLETED: { roles: ['PROVIDER', 'ADMIN'], sets: 'completedAt' },
  },
};

const WITH_DETAILS = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  providerService: {
    include: {
      category: true,
      provider: { select: { id: true, businessName: true, address: true, userId: true } },
    },
  },
};

async function requireOwnProviderId(userId) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
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

  const candidateBookings = await prisma.booking.findMany({
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

  return prisma.booking.create({
    data: {
      customerId,
      providerServiceId: parsedServiceId,
      scheduledAt: newStart,
      notes: notes || null,
      priceAtBooking: service.price,
    },
    include: WITH_DETAILS,
  });
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

const ALL_STATUSES = [...ACTIVE_STATUSES, ...TERMINAL_STATUSES];

async function updateBookingStatus(idParam, nextStatus, requestingUser) {
  const id = toId(idParam, 'booking id');

  if (!ALL_STATUSES.includes(nextStatus)) {
    throw badRequest('status is not a recognized booking status');
  }

  const booking = await prisma.booking.findUnique({ where: { id }, include: WITH_DETAILS });
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

  return prisma.booking.update({ where: { id }, data, include: WITH_DETAILS });
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
  TRANSITIONS,
};
