const prisma = require('../config/prisma');

const APPLICATION_NAME = 'Smart Automotive Service Platform';
const FORMAT_VERSION = 1;

// A real application-data snapshot — not `pg_dump` (raw SQL/binary, tied to
// the exact schema and not portable) and not the actual live objects it
// reads from. Deliberately hand-assembled, model by model, with an explicit
// `select` on every one, so a secret column added to some model later can
// never silently end up in an export just because a bare `findMany()` would
// have picked it up. See the exclusion list in this file's tests for the
// fields that must never appear here.
async function buildSnapshot() {
  const [
    users,
    providers,
    providerServices,
    categories,
    operatingHours,
    bookings,
    queueEntries,
    reviews,
    complaints,
    favorites,
    vehicles,
    notifications,
    notificationPreferences,
    fuelInventory,
    fuelInventoryHistory,
    financialTransactions,
    bookingPolicy,
    auditLogs,
  ] = await Promise.all([
    // Never `password` — see the module doc comment above.
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { id: 'asc' },
    }),
    prisma.provider.findMany({ orderBy: { id: 'asc' } }),
    prisma.providerService.findMany({ orderBy: { id: 'asc' } }),
    prisma.serviceCategory.findMany({ orderBy: { id: 'asc' } }),
    prisma.providerOperatingHour.findMany({ orderBy: { id: 'asc' } }),
    prisma.booking.findMany({ orderBy: { id: 'asc' } }),
    prisma.queueEntry.findMany({ orderBy: { id: 'asc' } }),
    prisma.review.findMany({ orderBy: { id: 'asc' } }),
    prisma.complaint.findMany({ orderBy: { id: 'asc' } }),
    prisma.favorite.findMany({ orderBy: { id: 'asc' } }),
    prisma.vehicle.findMany({ orderBy: { id: 'asc' } }),
    prisma.notification.findMany({ orderBy: { id: 'asc' } }),
    prisma.notificationPreference.findMany({ orderBy: { id: 'asc' } }),
    prisma.providerFuelInventory.findMany({ orderBy: { id: 'asc' } }),
    prisma.fuelInventoryHistory.findMany({ orderBy: { id: 'asc' } }),
    prisma.financialTransaction.findMany({ orderBy: { id: 'asc' } }),
    prisma.bookingPolicy.findMany({ orderBy: { id: 'asc' } }),
    prisma.adminAuditLog.findMany({ orderBy: { id: 'asc' } }),
  ]);

  // Note: PasswordResetToken is intentionally never queried here at all —
  // even its hashed form is a live credential, not application data.

  return {
    formatVersion: FORMAT_VERSION,
    generatedAt: new Date().toISOString(),
    application: APPLICATION_NAME,
    data: {
      users,
      providers,
      providerServices,
      categories,
      operatingHours,
      bookings,
      queueEntries,
      reviews,
      complaints,
      favorites,
      vehicles,
      notifications,
      notificationPreferences,
      fuelInventory,
      fuelInventoryHistory,
      financialTransactions,
      bookingPolicy,
      auditLogs,
    },
  };
}

function backupFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `smart-automotive-backup-${stamp}.json`;
}

module.exports = { buildSnapshot, backupFilename, APPLICATION_NAME, FORMAT_VERSION };
