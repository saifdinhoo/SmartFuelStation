const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { requireOwnProvider } = require('./providerHours.service');

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

// ---------------------------------------------------------------------------
// Money — every figure is a Prisma.Decimal (decimal.js under the hood) end
// to end, never plain JS floating-point arithmetic, until the very last
// step of turning a row into a JSON response (see the serialize* functions
// below). Rounding policy: 2 decimal places, half-up — the conventional
// rounding for currency. commissionAmount is rounded first and
// providerNetAmount is derived as gross - commissionAmount (never rounded
// independently), so the two always sum exactly back to the gross amount
// with no stray cent from rounding each side separately.
// ---------------------------------------------------------------------------

function round2(decimalLike) {
  return new Prisma.Decimal(decimalLike).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

// Never trusts a client-supplied commission or gross amount — both inputs
// here always come from the database (Booking.priceAtBooking,
// Provider.commissionRate), never from request bodies.
function computeSplit(grossAmount, commissionRate) {
  const gross = new Prisma.Decimal(grossAmount);
  const rate = new Prisma.Decimal(commissionRate);
  const commissionAmount = round2(gross.times(rate).dividedBy(100));
  const providerNetAmount = round2(gross.minus(commissionAmount));
  return { commissionAmount, providerNetAmount };
}

// Decimal columns come back as Prisma Decimal objects (see
// providerProfile.service.js's own note on this) — widened to plain
// numbers once here rather than at every call site.
function num(decimalLike) {
  return decimalLike === null || decimalLike === undefined ? null : Number(decimalLike);
}

// ---------------------------------------------------------------------------
// Ledger creation — the ONLY place a FinancialTransaction row is ever
// created. Called exclusively from booking.service.js's updateBookingStatus,
// inside the same Prisma transaction as the COMPLETED status flip — never
// for any other status, and never reachable directly from a route.
// ---------------------------------------------------------------------------

// `booking` is the just-updated Booking row (booking.service.js's
// WITH_DETAILS shape, so providerService.providerId is present). `tx` is
// always a real transaction client — the caller guarantees this runs
// atomically with the booking's own status update, so a failure here rolls
// the status change back too rather than leaving a COMPLETED booking with
// no ledger row.
//
// Idempotent: Booking's state machine has no COMPLETED -> anything edge
// (see shared/bookingTransitions.js), so a booking can only reach COMPLETED
// once through the normal flow — but two concurrent requests racing to
// complete the same booking could both pass that check before either
// commits. The findUnique below is the fast path for the ordinary
// sequential case; the table's unique constraint on bookingId plus the
// P2002 catch below is what actually guarantees exactly one row per
// booking under a real race.
async function createTransactionForCompletedBooking(booking, tx) {
  const existing = await tx.financialTransaction.findUnique({ where: { bookingId: booking.id } });
  if (existing) return existing;

  const providerId = booking.providerService.providerId;
  const provider = await tx.provider.findUnique({
    where: { id: providerId },
    select: { commissionRate: true },
  });

  const { commissionAmount, providerNetAmount } = computeSplit(
    booking.priceAtBooking,
    provider.commissionRate,
  );

  try {
    return await tx.financialTransaction.create({
      data: {
        bookingId: booking.id,
        providerId,
        grossAmount: booking.priceAtBooking,
        commissionRate: provider.commissionRate,
        commissionAmount,
        providerNetAmount,
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return tx.financialTransaction.findUnique({ where: { bookingId: booking.id } });
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

const TRANSACTION_INCLUDE = {
  provider: { select: { id: true, businessName: true } },
  settledByAdmin: { select: { id: true, name: true } },
  booking: {
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      providerService: { select: { name: true } },
    },
  },
};

function serializeBookingRef(booking) {
  if (!booking) return null;
  return {
    id: booking.id,
    status: booking.status,
    scheduledAt: booking.scheduledAt,
    serviceName: booking.providerService?.name ?? null,
  };
}

function serializeTransactionAdmin(row) {
  return {
    id: row.id,
    bookingId: row.bookingId,
    providerId: row.providerId,
    providerName: row.provider?.businessName ?? null,
    grossAmount: num(row.grossAmount),
    commissionRate: num(row.commissionRate),
    commissionAmount: num(row.commissionAmount),
    providerNetAmount: num(row.providerNetAmount),
    settlementStatus: row.settlementStatus,
    settledAt: row.settledAt,
    settledByAdminId: row.settledByAdminId,
    settledByAdminName: row.settledByAdmin?.name ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    booking: serializeBookingRef(row.booking),
  };
}

// Provider-safe shape — never settledByAdminId/settledByAdminName. The
// spec is explicit: "Do not expose internal Admin identity."
function serializeTransactionProvider(row) {
  return {
    id: row.id,
    bookingId: row.bookingId,
    grossAmount: num(row.grossAmount),
    commissionRate: num(row.commissionRate),
    commissionAmount: num(row.commissionAmount),
    providerNetAmount: num(row.providerNetAmount),
    settlementStatus: row.settlementStatus,
    settledAt: row.settledAt,
    createdAt: row.createdAt,
    booking: serializeBookingRef(row.booking),
  };
}

function serializeCommission(provider) {
  return {
    providerId: provider.id,
    commissionRate: num(provider.commissionRate),
    updatedAt: provider.commissionUpdatedAt,
    updatedByAdminId: provider.commissionUpdatedByAdminId,
  };
}

// ---------------------------------------------------------------------------
// Revenue-over-time trend — real points only, aggregated from
// FinancialTransaction rows grouped by day. Mirrors the RANGE_DAYS
// convention already used by providerAnalytics.service.js and
// admin.service.js's getAnalytics, so the same range values (7d/30d/90d)
// behave identically across every chart in the app.
//
// Deliberately UTC throughout, unlike those two — both compute their
// window boundary in the server's *local* time (`since.setHours(0,0,0,0)`)
// but then bucket rows by the UTC date slice of `toISOString()`. On a
// server whose local zone is ahead of UTC, that mismatch silently drops
// "today"'s rows: local midnight for 30 days ago can land on a UTC day
// that pushes every bucket key one day behind the actual UTC calendar
// day a same-moment row hashes to, so the most recent transactions (the
// ones a freshly completed booking would create) never find a matching
// bucket and vanish from the chart. Computing both the window and the
// keys in UTC end to end removes any dependency on the host's timezone.
// The window is also inclusive of today (the last `days` days up to and
// including now), which is what "Last 7 days" etc. actually promise.
// ---------------------------------------------------------------------------

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

function sinceForRange(rangeKey) {
  const days = RANGE_DAYS[rangeKey ?? '30d'];
  if (!days) {
    throw badRequest(`range must be one of: ${Object.keys(RANGE_DAYS).join(', ')}`);
  }
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)),
  );
  return { since, days };
}

function buildDailyTrend(rows, since, days) {
  const dayKeys = [];
  const buckets = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayKeys.push(key);
    buckets.set(key, {
      gross: new Prisma.Decimal(0),
      commission: new Prisma.Decimal(0),
      net: new Prisma.Decimal(0),
    });
  }
  for (const row of rows) {
    const key = new Date(row.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.gross = bucket.gross.plus(row.grossAmount);
    bucket.commission = bucket.commission.plus(row.commissionAmount);
    bucket.net = bucket.net.plus(row.providerNetAmount);
  }
  return dayKeys.map((label) => {
    const b = buckets.get(label);
    return {
      label,
      gross: num(round2(b.gross)),
      commission: num(round2(b.commission)),
      net: num(round2(b.net)),
    };
  });
}

const TREND_SELECT = { createdAt: true, grossAmount: true, commissionAmount: true, providerNetAmount: true };

async function getRevenueTrend(where, rangeKey) {
  const { since, days } = sinceForRange(rangeKey);
  const rows = await prisma.financialTransaction.findMany({
    where: { ...where, createdAt: { gte: since } },
    select: TREND_SELECT,
  });
  return buildDailyTrend(rows, since, days);
}

// ---------------------------------------------------------------------------
// Admin reads
// ---------------------------------------------------------------------------

const SETTLEMENT_STATUSES = ['PENDING', 'SETTLED'];

function buildAdminWhere({ providerId, status } = {}) {
  const where = {};
  if (providerId !== undefined && providerId !== 'ALL') {
    where.providerId = toId(providerId, 'providerId');
  }
  if (status !== undefined && status !== 'ALL') {
    if (!SETTLEMENT_STATUSES.includes(status)) {
      throw badRequest(`status must be one of: ${SETTLEMENT_STATUSES.join(', ')}`);
    }
    where.settlementStatus = status;
  }
  return where;
}

async function listAdminTransactions({ providerId, status } = {}) {
  const where = buildAdminWhere({ providerId, status });
  const rows = await prisma.financialTransaction.findMany({
    where,
    include: TRANSACTION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeTransactionAdmin);
}

// Real, all-time totals — every figure is aggregated from
// FinancialTransaction rows that exist. No estimate ever multiplies a
// current service price by an old booking; the ledger rows already are
// the historical truth (see the model's own doc comment for the boundary
// this implies for bookings completed before this feature existed).
async function getAdminSummary(rangeKey = '30d') {
  const [totals, pending, settled, transactionCount, trend] = await Promise.all([
    prisma.financialTransaction.aggregate({
      _sum: { grossAmount: true, commissionAmount: true, providerNetAmount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { settlementStatus: 'PENDING' },
      _sum: { providerNetAmount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { settlementStatus: 'SETTLED' },
      _sum: { providerNetAmount: true },
    }),
    prisma.financialTransaction.count(),
    getRevenueTrend({}, rangeKey),
  ]);

  return {
    range: rangeKey,
    grossServiceValue: num(totals._sum.grossAmount) ?? 0,
    platformCommissionRevenue: num(totals._sum.commissionAmount) ?? 0,
    providerNetEarnings: num(totals._sum.providerNetAmount) ?? 0,
    pendingSettlementAmount: num(pending._sum.providerNetAmount) ?? 0,
    settledAmount: num(settled._sum.providerNetAmount) ?? 0,
    transactionCount,
    trend,
  };
}

async function computeProviderTotals(providerId) {
  const [totals, pending, settled] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: { providerId },
      _sum: { grossAmount: true, commissionAmount: true, providerNetAmount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { providerId, settlementStatus: 'PENDING' },
      _sum: { providerNetAmount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { providerId, settlementStatus: 'SETTLED' },
      _sum: { providerNetAmount: true },
    }),
  ]);
  return {
    grossServiceValue: num(totals._sum.grossAmount) ?? 0,
    platformCommissionRevenue: num(totals._sum.commissionAmount) ?? 0,
    providerNetEarnings: num(totals._sum.providerNetAmount) ?? 0,
    pendingSettlementAmount: num(pending._sum.providerNetAmount) ?? 0,
    settledAmount: num(settled._sum.providerNetAmount) ?? 0,
  };
}

async function getAdminProviderFinance(providerIdParam, rangeKey = '30d') {
  const providerId = toId(providerIdParam, 'provider id');
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, businessName: true, commissionRate: true },
  });
  if (!provider) throw notFound('Provider not found');

  const [totals, transactions, trend] = await Promise.all([
    computeProviderTotals(providerId),
    prisma.financialTransaction.findMany({
      where: { providerId },
      include: TRANSACTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    }),
    getRevenueTrend({ providerId }, rangeKey),
  ]);

  return {
    providerId: provider.id,
    providerName: provider.businessName,
    commissionRate: num(provider.commissionRate),
    range: rangeKey,
    ...totals,
    trend,
    transactions: transactions.map(serializeTransactionAdmin),
  };
}

// One-way: PENDING -> SETTLED only. There is deliberately no SETTLED ->
// PENDING workflow — see the Phase D report's "settlement action" section.
async function setSettlementStatus(idParam, adminUserId) {
  const id = toId(idParam, 'transaction id');
  const row = await prisma.financialTransaction.findUnique({ where: { id } });
  if (!row) throw notFound('Financial transaction not found');
  if (row.settlementStatus === 'SETTLED') {
    throw badRequest('This transaction has already been settled');
  }

  const updated = await prisma.financialTransaction.update({
    where: { id },
    data: { settlementStatus: 'SETTLED', settledAt: new Date(), settledByAdminId: adminUserId },
    include: TRANSACTION_INCLUDE,
  });
  return serializeTransactionAdmin(updated);
}

// ---------------------------------------------------------------------------
// Commission configuration
// ---------------------------------------------------------------------------

async function getProviderCommission(providerIdParam) {
  const providerId = toId(providerIdParam, 'provider id');
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, commissionRate: true, commissionUpdatedAt: true, commissionUpdatedByAdminId: true },
  });
  if (!provider) throw notFound('Provider not found');
  return serializeCommission(provider);
}

function validateCommissionRate(value) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) throw badRequest('commissionRate must be a valid number');
  if (rate < 0 || rate > 100) throw badRequest('commissionRate must be between 0 and 100');
  return rate;
}

// Only ever affects FUTURE completions. Every existing FinancialTransaction
// keeps the commissionRate it was created with, because that value was
// already copied onto the row rather than re-derived from this one — see
// createTransactionForCompletedBooking and the FinancialTransaction model's
// own doc comment.
async function setProviderCommission(providerIdParam, commissionRateInput, adminUserId) {
  const providerId = toId(providerIdParam, 'provider id');
  const rate = validateCommissionRate(commissionRateInput);

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw notFound('Provider not found');

  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: {
      commissionRate: rate,
      commissionUpdatedAt: new Date(),
      commissionUpdatedByAdminId: adminUserId,
    },
    select: { id: true, commissionRate: true, commissionUpdatedAt: true, commissionUpdatedByAdminId: true },
  });
  return serializeCommission(updated);
}

// ---------------------------------------------------------------------------
// Provider-own reads — identity always resolved from the JWT via
// requireOwnProvider, never from a client-supplied providerId (same rule
// providerHours.service.js and fuelInventory.service.js already enforce
// for /me routes).
// ---------------------------------------------------------------------------

async function getOwnSummary(userId, rangeKey = '30d') {
  const provider = await requireOwnProvider(userId);
  const [totals, trend] = await Promise.all([
    computeProviderTotals(provider.id),
    getRevenueTrend({ providerId: provider.id }, rangeKey),
  ]);
  return {
    providerId: provider.id,
    commissionRate: num(provider.commissionRate),
    range: rangeKey,
    ...totals,
    trend,
  };
}

async function listOwnTransactions(userId) {
  const provider = await requireOwnProvider(userId);
  const rows = await prisma.financialTransaction.findMany({
    where: { providerId: provider.id },
    include: TRANSACTION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeTransactionProvider);
}

async function getOwnCommission(userId) {
  const provider = await requireOwnProvider(userId);
  return serializeCommission(provider);
}

module.exports = {
  computeSplit,
  createTransactionForCompletedBooking,
  listAdminTransactions,
  getAdminSummary,
  getAdminProviderFinance,
  setSettlementStatus,
  getProviderCommission,
  setProviderCommission,
  getOwnSummary,
  listOwnTransactions,
  getOwnCommission,
};
