const prisma = require('../config/prisma');
const { ACTIVE_STATUSES } = require('./shared/bookingTransitions');
const {
  parseDateOnly,
  parseTimeOnly,
  timeToMinutes,
  minutesToTimeString,
  combineLocalDateTime,
  dayOfWeekOf,
  formatDateOnly,
  overlaps,
} = require('./shared/availabilityRules');
const { assertProviderReadAccess } = require('./providerHours.service');

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

function toId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id)) {
    throw badRequest(`${label} must be a valid integer`);
  }
  return id;
}

// Predictable, documented start-time granularity — distinct from service
// duration (see availabilityRules.js's doc comment and the Phase report's
// "Slot increment" section). 30 minutes matches the professor's own worked
// example and needs no per-provider configuration.
const SLOT_INTERVAL_MINUTES = 30;

// GET /providers/:id/availability?serviceId=&date=YYYY-MM-DD
//
// Backend-authoritative: this is the exact same calculation
// booking.service.js's createBooking() re-derives independently at booking
// time (see its "operating hours" section) — nothing here is trusted input
// from a client, and nothing there trusts this endpoint's output either.
async function getAvailability({ providerId: providerIdParam, serviceId: serviceIdParam, date: dateParam }, requestingUser) {
  const providerId = toId(providerIdParam, 'provider id');
  const serviceId = toId(serviceIdParam, 'serviceId');
  const dateOnly = parseDateOnly(dateParam, 'date');

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound('Provider not found');
  await assertProviderReadAccess(provider, requestingUser);

  const service = await prisma.providerService.findUnique({ where: { id: serviceId } });
  if (!service) throw notFound('Service not found');
  if (service.providerId !== providerId) {
    throw badRequest('This service does not belong to the specified provider');
  }
  if (!service.isAvailable) {
    throw badRequest('This service is not currently available for booking');
  }

  const base = {
    providerId,
    serviceId,
    date: formatDateOnly(dateOnly),
    serviceDurationMinutes: service.durationMinutes,
  };

  const dayOfWeek = dayOfWeekOf(dateOnly);
  const hours = await prisma.providerOperatingHour.findUnique({
    where: { providerId_dayOfWeek: { providerId, dayOfWeek } },
  });

  // Never fabricate hours for a provider that hasn't configured any — an
  // absent row is reported honestly rather than assumed to mean 24/7 (or
  // closed).
  if (!hours) {
    return { ...base, status: 'HOURS_NOT_CONFIGURED', openingTime: null, closingTime: null, slots: [] };
  }
  if (hours.isClosed) {
    return { ...base, status: 'CLOSED', openingTime: null, closingTime: null, slots: [] };
  }

  const openTime = parseTimeOnly(hours.openTime, 'openTime');
  const closeTime = parseTimeOnly(hours.closeTime, 'closeTime');
  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);

  const dayStart = combineLocalDateTime(dateOnly, { hour: 0, minute: 0 });
  // `day + 1` deliberately overflows past the end of the month — the
  // multi-arg Date constructor normalizes that correctly (e.g. day 32 in
  // January becomes February 1st), so this is a safe "start of the next
  // calendar day" boundary across month/year edges too.
  const dayEnd = combineLocalDateTime(
    { year: dateOnly.year, month: dateOnly.month, day: dateOnly.day + 1 },
    { hour: 0, minute: 0 },
  );

  // Only the fields needed to compute blocking time ranges — never a
  // customer id, name, or the booking id itself. This response is reachable
  // by any authenticated customer, not just the booking's owner.
  const activeBookings = await prisma.booking.findMany({
    where: {
      providerService: { providerId },
      status: { in: ACTIVE_STATUSES },
      scheduledAt: { gte: dayStart, lt: dayEnd },
    },
    select: {
      scheduledAt: true,
      providerService: { select: { durationMinutes: true } },
    },
  });

  const blockingRanges = activeBookings.map((booking) => {
    const start = booking.scheduledAt;
    const end = new Date(start.getTime() + booking.providerService.durationMinutes * 60_000);
    return { start, end };
  });

  const now = new Date();
  const slots = [];

  // A candidate start must let the *entire* service fit before closing —
  // `start + duration <= closeMinutes`, not just `start < closeMinutes`.
  for (
    let start = openMinutes;
    start + service.durationMinutes <= closeMinutes;
    start += SLOT_INTERVAL_MINUTES
  ) {
    const end = start + service.durationMinutes;
    const slotStart = combineLocalDateTime(dateOnly, {
      hour: Math.floor(start / 60),
      minute: start % 60,
    });
    const slotEnd = combineLocalDateTime(dateOnly, { hour: Math.floor(end / 60), minute: end % 60 });

    let status;
    if (slotStart.getTime() <= now.getTime()) {
      status = 'PAST';
    } else if (blockingRanges.some((range) => overlaps(slotStart, slotEnd, range.start, range.end))) {
      status = 'BOOKED';
    } else {
      status = 'AVAILABLE';
    }

    slots.push({ startTime: minutesToTimeString(start), endTime: minutesToTimeString(end), status });
  }

  return {
    ...base,
    status: 'OPEN',
    openingTime: hours.openTime,
    closingTime: hours.closeTime,
    slots,
  };
}

module.exports = { getAvailability, SLOT_INTERVAL_MINUTES };
