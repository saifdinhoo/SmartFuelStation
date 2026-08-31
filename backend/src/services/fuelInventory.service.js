const prisma = require('../config/prisma');
const { requireOwnProvider, assertProviderReadAccess } = require('./providerHours.service');
const { FUEL_TYPES, FUEL_TYPE_LABELS } = require('./shared/fuelTypes');

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

function toFiniteNumber(value, label) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw badRequest(`${label} must be a valid number`);
  }
  return num;
}

// Always derived from capacity/current — there is no separately stored
// percentage column that could drift out of sync with them. Clamped so a
// bad row (or a division by a since-changed capacity) can never surface as
// NaN, Infinity, a negative number, or something over 100.
function percentageRemaining(currentLiters, capacityLiters) {
  if (!(capacityLiters > 0)) return 0;
  const pct = (currentLiters / capacityLiters) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

// Public shape — used for both the customer-facing read and the
// provider's own read. Never includes updatedByAdminId or any other audit
// metadata; see serializeAdmin for the admin-only superset.
function serializePublic(row) {
  const capacityLiters = Number(row.capacityLiters);
  const currentLiters = Number(row.currentLiters);
  return {
    fuelType: row.fuelType,
    displayName: FUEL_TYPE_LABELS[row.fuelType],
    capacityLiters,
    currentLiters,
    percentageRemaining: percentageRemaining(currentLiters, capacityLiters),
    pricePerLiter: row.pricePerLiter === null ? null : Number(row.pricePerLiter),
    updatedAt: row.updatedAt,
  };
}

function serializeAdmin(row) {
  return {
    ...serializePublic(row),
    id: row.id,
    providerId: row.providerId,
    updatedByAdminId: row.updatedByAdminId,
    updatedByAdminName: row.updatedByAdmin?.name ?? null,
    createdAt: row.createdAt,
  };
}

function validateFuelType(fuelType) {
  if (!FUEL_TYPES.includes(fuelType)) {
    throw badRequest(`fuelType must be one of: ${FUEL_TYPES.join(', ')}`);
  }
}

async function requireProvider(providerIdParam) {
  const providerId = toId(providerIdParam, 'provider id');
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound('Provider not found');
  return provider;
}

// ---------------------------------------------------------------------------
// Public / provider-own reads
// ---------------------------------------------------------------------------

async function listPublicFuelForProviderId(providerId) {
  const rows = await prisma.providerFuelInventory.findMany({
    where: { providerId },
    orderBy: { fuelType: 'asc' },
  });
  return rows.map(serializePublic);
}

// GET /providers/:id/fuel — same access rule as providerHours.service.js's
// getHours: a customer gets 404 (never 403) for an unapproved provider, a
// provider may only read their own business, an admin is unrestricted.
async function getPublicFuel(providerIdParam, requestingUser) {
  const providerId = toId(providerIdParam, 'provider id');
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound('Provider not found');
  await assertProviderReadAccess(provider, requestingUser);
  return listPublicFuelForProviderId(providerId);
}

// GET /providers/me/fuel — the provider is always resolved from the JWT.
async function getOwnFuel(userId) {
  const provider = await requireOwnProvider(userId);
  return listPublicFuelForProviderId(provider.id);
}

// ---------------------------------------------------------------------------
// Admin reads/writes
// ---------------------------------------------------------------------------

async function listAdminFuelForProvider(providerIdParam) {
  const provider = await requireProvider(providerIdParam);
  const rows = await prisma.providerFuelInventory.findMany({
    where: { providerId: provider.id },
    include: { updatedByAdmin: { select: { name: true } } },
    orderBy: { fuelType: 'asc' },
  });
  return rows.map(serializeAdmin);
}

function validateWriteInput({ capacityLiters, currentLiters, pricePerLiter }) {
  const capacity = toFiniteNumber(capacityLiters, 'capacityLiters');
  const current = toFiniteNumber(currentLiters, 'currentLiters');
  if (!(capacity > 0)) throw badRequest('capacityLiters must be greater than 0');
  if (current < 0) throw badRequest('currentLiters must not be negative');
  if (current > capacity) throw badRequest('currentLiters must not exceed capacityLiters');

  let price = null;
  if (pricePerLiter !== undefined && pricePerLiter !== null) {
    price = toFiniteNumber(pricePerLiter, 'pricePerLiter');
    if (price < 0) throw badRequest('pricePerLiter must not be negative');
  }
  return { capacity, current, price };
}

// Admin create-or-update for one (providerId, fuelType) pair. Atomic: the
// inventory upsert and the history insert either both land or neither
// does, via a single Prisma transaction — see the Phase B report's
// "Transaction" section.
//
// On the very first write for a (providerId, fuelType) pair, the history
// row's previous* fields record "nothing existed yet" (0 liters, null
// capacity/price) rather than being skipped — a real chart needs a real
// first point, and this is that point.
async function adminUpsertFuel(providerIdParam, fuelTypeParam, input, adminUserId) {
  const provider = await requireProvider(providerIdParam);
  const fuelType = String(fuelTypeParam);
  validateFuelType(fuelType);
  const { capacity, current, price } = validateWriteInput(input);

  const saved = await prisma.$transaction(async (tx) => {
    const existing = await tx.providerFuelInventory.findUnique({
      where: { providerId_fuelType: { providerId: provider.id, fuelType } },
    });

    const row = await tx.providerFuelInventory.upsert({
      where: { providerId_fuelType: { providerId: provider.id, fuelType } },
      create: {
        providerId: provider.id,
        fuelType,
        capacityLiters: capacity,
        currentLiters: current,
        pricePerLiter: price,
        updatedByAdminId: adminUserId,
      },
      update: {
        capacityLiters: capacity,
        currentLiters: current,
        pricePerLiter: price,
        updatedByAdminId: adminUserId,
      },
    });

    await tx.fuelInventoryHistory.create({
      data: {
        inventoryId: row.id,
        providerId: provider.id,
        fuelType,
        previousLiters: existing ? existing.currentLiters : 0,
        newLiters: current,
        previousCapacityLiters: existing ? existing.capacityLiters : null,
        newCapacityLiters: capacity,
        previousPricePerLiter: existing ? existing.pricePerLiter : null,
        newPricePerLiter: price,
        changedByAdminId: adminUserId,
      },
    });

    return row;
  });

  return serializePublic(saved);
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

const HISTORY_RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

function sinceFor(rangeKey) {
  const days = HISTORY_RANGE_DAYS[rangeKey ?? '30d'];
  if (!days) {
    throw badRequest(`range must be one of: ${Object.keys(HISTORY_RANGE_DAYS).join(', ')}`);
  }
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since;
}

// Public/customer-safe chart points for GET /providers/:id/fuel/history —
// only a timestamp and the resulting liters. Never changedByAdminId or any
// other audit field; that is exactly what separates this from
// getAdminHistory below.
async function getPublicHistory(providerIdParam, { fuelType, range } = {}, requestingUser) {
  const providerId = toId(providerIdParam, 'provider id');
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound('Provider not found');
  await assertProviderReadAccess(provider, requestingUser);

  const where = { providerId, createdAt: { gte: sinceFor(range) } };
  if (fuelType !== undefined) {
    validateFuelType(fuelType);
    where.fuelType = fuelType;
  }

  const rows = await prisma.fuelInventoryHistory.findMany({
    where,
    select: { fuelType: true, newLiters: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((r) => ({
    fuelType: r.fuelType,
    liters: Number(r.newLiters),
    timestamp: r.createdAt,
  }));
}

// Full audit trail for GET /admin/providers/:id/fuel/history — admin only,
// includes who made each change and every previous/new value.
async function getAdminHistory(providerIdParam, { fuelType, range } = {}) {
  const provider = await requireProvider(providerIdParam);

  const where = { providerId: provider.id };
  if (fuelType !== undefined) {
    validateFuelType(fuelType);
    where.fuelType = fuelType;
  }
  if (range !== undefined) where.createdAt = { gte: sinceFor(range) };

  const rows = await prisma.fuelInventoryHistory.findMany({
    where,
    include: { changedByAdmin: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((r) => ({
    id: r.id,
    fuelType: r.fuelType,
    previousLiters: Number(r.previousLiters),
    newLiters: Number(r.newLiters),
    previousCapacityLiters:
      r.previousCapacityLiters === null ? null : Number(r.previousCapacityLiters),
    newCapacityLiters: r.newCapacityLiters === null ? null : Number(r.newCapacityLiters),
    previousPricePerLiter:
      r.previousPricePerLiter === null ? null : Number(r.previousPricePerLiter),
    newPricePerLiter: r.newPricePerLiter === null ? null : Number(r.newPricePerLiter),
    changedByAdminId: r.changedByAdmin.id,
    changedByAdminName: r.changedByAdmin.name,
    createdAt: r.createdAt,
  }));
}

module.exports = {
  FUEL_TYPES,
  FUEL_TYPE_LABELS,
  percentageRemaining,
  listPublicFuelForProviderId,
  getPublicFuel,
  getOwnFuel,
  listAdminFuelForProvider,
  adminUpsertFuel,
  getPublicHistory,
  getAdminHistory,
};
