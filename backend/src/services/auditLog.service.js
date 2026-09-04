const prisma = require('../config/prisma');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

// The closed set of real admin mutations this platform actually audits.
// Deliberately not every admin write (see the doc comment on the
// AdminAuditLog model) — GET requests and cosmetic reads are never logged,
// and nothing here dumps a raw request body. record() below throws if asked
// to log an action not on this list, so a typo or a new call site that
// forgot to register its action here fails loudly in tests rather than
// silently writing an unrecognized string forever.
const ACTIONS = [
  'PROVIDER_APPROVED',
  'PROVIDER_REJECTED',
  'CATEGORY_CREATED',
  'CATEGORY_UPDATED',
  'CATEGORY_DELETED',
  'FUEL_INVENTORY_UPDATED',
  'FINANCE_SETTLED',
  'COMMISSION_RATE_UPDATED',
  'BOOKING_STATUS_CHANGED',
  'BOOKING_POLICY_UPDATED',
  'SYSTEM_BACKUP_EXPORTED',
];

// Fields that must never end up in `metadata`, even by accident — checked
// recursively so a caller that spreads an entire row (e.g. a Prisma result)
// into metadata by mistake cannot leak one of these. Stored already
// lowercased so the lookup below (which lowercases the incoming key) is a
// real match rather than comparing 'passwordhash' against 'passwordHash'.
const FORBIDDEN_METADATA_KEYS = new Set(
  [
    'password',
    'passwordHash',
    'token',
    'tokenHash',
    'resetToken',
    'jwt',
    'apiKey',
    'gmailAppPassword',
    'smtpPassword',
    'cameraCredentials',
  ].map((key) => key.toLowerCase()),
);

function assertSafeMetadata(value, path = 'metadata') {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeMetadata(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase())) {
        throw new Error(`auditLog.service.js: refused to store forbidden metadata key "${path}.${key}"`);
      }
      assertSafeMetadata(nested, `${path}.${key}`);
    }
  }
}

// Never throws out to the caller — an audit-trail write failing must not
// block the real admin action it is describing (the action has already
// committed by the time this runs; see every call site in admin.controller.js
// / booking.controller.js). Mirrors the existing `safely()` pattern already
// used for best-effort Socket.IO notifications in admin.controller.js.
async function record({ adminId, action, entityType, entityId = null, metadata = null }) {
  try {
    if (!ACTIONS.includes(action)) {
      throw new Error(`auditLog.service.js: "${action}" is not a registered audit action`);
    }
    if (!entityType || typeof entityType !== 'string') {
      throw new Error('auditLog.service.js: entityType is required');
    }
    assertSafeMetadata(metadata);

    await prisma.adminAuditLog.create({
      data: { adminId, action, entityType, entityId, metadata: metadata ?? undefined },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit-log] Failed to record audit entry:', err.message);
  }
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

async function list({ page = 1, pageSize = DEFAULT_PAGE_SIZE, action, entityType, from, to } = {}) {
  const parsedPage = Number(page);
  const parsedPageSize = Number(pageSize);
  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    throw badRequest('page must be a positive integer');
  }
  if (!Number.isInteger(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > MAX_PAGE_SIZE) {
    throw badRequest(`pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }

  const where = {};
  if (action !== undefined && action !== 'ALL') {
    if (!ACTIONS.includes(action)) throw badRequest('action is not a recognized audit action');
    where.action = action;
  }
  if (entityType !== undefined && entityType !== 'ALL') {
    where.entityType = entityType;
  }
  if (from !== undefined || to !== undefined) {
    where.createdAt = {};
    if (from !== undefined) {
      const fromDate = new Date(from);
      if (Number.isNaN(fromDate.getTime())) throw badRequest('from must be a valid date');
      where.createdAt.gte = fromDate;
    }
    if (to !== undefined) {
      const toDate = new Date(to);
      if (Number.isNaN(toDate.getTime())) throw badRequest('to must be a valid date');
      where.createdAt.lte = toDate;
    }
  }

  const [items, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        admin: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (parsedPage - 1) * parsedPageSize,
      take: parsedPageSize,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    items,
    page: parsedPage,
    pageSize: parsedPageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedPageSize)),
  };
}

module.exports = { record, list, ACTIONS };
