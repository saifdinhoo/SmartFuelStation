const prisma = require('../config/prisma');
const { DAY_NAMES, parseTimeOnly, timeToMinutes } = require('./shared/availabilityRules');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
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

// Every "my own business" route resolves the provider from the JWT's
// userId, never from a client-supplied id — see providerProfile.service.js
// for the same pattern.
async function requireOwnProvider(userId) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) {
    throw forbidden('No provider profile is linked to this account');
  }
  return provider;
}

// Same rule as review.service.js's assertProviderReadAccess, plus the
// explicit "approved only" gate the professor's spec calls for: a customer
// looking up a specific provider's hours by id gets a 404 (not 403) for an
// unapproved one, so the response never confirms that provider even exists.
async function assertProviderReadAccess(provider, requestingUser) {
  if (requestingUser.role === 'PROVIDER') {
    const own = await prisma.provider.findUnique({ where: { userId: requestingUser.userId } });
    if (!own || own.id !== provider.id) {
      throw forbidden('You can only view your own business');
    }
    return;
  }
  if (requestingUser.role === 'CUSTOMER' && !provider.isApproved) {
    throw notFound('Provider not found');
  }
  // ADMIN: unrestricted.
}

function serializeHour(row) {
  return {
    dayOfWeek: row.dayOfWeek,
    isClosed: row.isClosed,
    openTime: row.openTime,
    closeTime: row.closeTime,
  };
}

async function listHoursForProviderId(providerId) {
  const rows = await prisma.providerOperatingHour.findMany({
    where: { providerId },
    orderBy: { dayOfWeek: 'asc' },
  });
  return rows.map(serializeHour);
}

async function getHours(providerIdParam, requestingUser) {
  const providerId = toId(providerIdParam, 'provider id');
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound('Provider not found');

  await assertProviderReadAccess(provider, requestingUser);
  return listHoursForProviderId(providerId);
}

async function getOwnHours(userId) {
  const provider = await requireOwnProvider(userId);
  return listHoursForProviderId(provider.id);
}

// Validates one weekday entry. A closed day carries no opening interval —
// openTime/closeTime are forced to null regardless of what was sent, so a
// stale time pair left over from before a day was marked closed can never
// leak into a response or accidentally get treated as real hours.
function validateHourEntry(entry, index) {
  if (!entry || typeof entry !== 'object') {
    throw badRequest(`hours[${index}] must be an object`);
  }
  if (!DAY_NAMES.includes(entry.dayOfWeek)) {
    throw badRequest(`hours[${index}].dayOfWeek must be one of: ${DAY_NAMES.join(', ')}`);
  }
  if (typeof entry.isClosed !== 'boolean') {
    throw badRequest(`hours[${index}].isClosed must be a boolean`);
  }

  if (entry.isClosed) {
    return { dayOfWeek: entry.dayOfWeek, isClosed: true, openTime: null, closeTime: null };
  }

  const open = parseTimeOnly(entry.openTime, `hours[${index}].openTime`);
  const close = parseTimeOnly(entry.closeTime, `hours[${index}].closeTime`);
  if (timeToMinutes(close) <= timeToMinutes(open)) {
    throw badRequest(`hours[${index}].closeTime must be after hours[${index}].openTime`);
  }

  return {
    dayOfWeek: entry.dayOfWeek,
    isClosed: false,
    openTime: entry.openTime,
    closeTime: entry.closeTime,
  };
}

// Accepts 1-7 weekday entries (normally the whole week, sent together by
// the settings screen) and upserts each by the same @@unique([providerId,
// dayOfWeek]) the schema enforces, so this can never create a duplicate row
// for a weekday no matter how it's called.
async function updateOwnHours(userId, input) {
  const provider = await requireOwnProvider(userId);

  if (!Array.isArray(input)) {
    throw badRequest('Request body must be an array of operating-hour entries');
  }
  if (input.length === 0) {
    throw badRequest('At least one operating-hour entry is required');
  }
  if (input.length > DAY_NAMES.length) {
    throw badRequest('At most one entry per weekday is allowed');
  }

  const entries = input.map(validateHourEntry);

  const seenDays = new Set();
  for (const entry of entries) {
    if (seenDays.has(entry.dayOfWeek)) {
      throw badRequest(`Duplicate entry for ${entry.dayOfWeek} — each weekday may appear only once`);
    }
    seenDays.add(entry.dayOfWeek);
  }

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.providerOperatingHour.upsert({
        where: {
          providerId_dayOfWeek: { providerId: provider.id, dayOfWeek: entry.dayOfWeek },
        },
        create: { providerId: provider.id, ...entry },
        update: {
          isClosed: entry.isClosed,
          openTime: entry.openTime,
          closeTime: entry.closeTime,
        },
      }),
    ),
  );

  return listHoursForProviderId(provider.id);
}

module.exports = {
  requireOwnProvider,
  assertProviderReadAccess,
  listHoursForProviderId,
  getHours,
  getOwnHours,
  updateOwnHours,
};
