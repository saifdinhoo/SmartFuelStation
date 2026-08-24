const prisma = require('../config/prisma');

// Admins see every provider; other users only see approved providers.
// Services and categories come from PostgreSQL rather than frontend constants.
async function listProviders(requesterRole) {
  const isAdmin = requesterRole === 'ADMIN';
  return prisma.provider.findMany({
    where: isAdmin ? {} : { isApproved: true },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      services: {
        where: isAdmin ? {} : { isAvailable: true, category: { isActive: true } },
        include: { category: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { reviews: true, queueEntries: true } },
    },
    orderBy: { businessName: 'asc' },
  });
}

async function approveProvider(id, approvedById) {
  return prisma.provider.update({
    where: { id: Number(id) },
    data: { isApproved: true, approvedAt: new Date(), approvedById },
  });
}

// Admin approve/reject in one place. "Reject" can only mean "not approved"
// here: the schema has a single isApproved boolean with no rejectedAt or
// rejection reason, so a rejected provider and one that has simply never
// been reviewed are the same row state. Rejecting also clears approvedAt
// and approvedById so a revoked provider doesn't keep claiming it was
// signed off by someone. Marking it closed prevents a revoked business
// from still showing as open to customers.
async function setProviderApproval(idParam, isApproved, actingAdminId) {
  // null/undefined/'' are rejected explicitly: Number(null) and Number('')
  // are both 0, which would otherwise sail through the integer check and
  // send a lookup for provider id 0.
  const isBlank = idParam === null || idParam === undefined || idParam === '';
  const id = Number(idParam);
  if (isBlank || !Number.isInteger(id)) {
    const err = new Error('provider id must be a valid integer');
    err.statusCode = 400;
    throw err;
  }
  if (typeof isApproved !== 'boolean') {
    const err = new Error('isApproved must be a boolean');
    err.statusCode = 400;
    throw err;
  }

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    throw err;
  }

  return prisma.provider.update({
    where: { id },
    data: isApproved
      ? { isApproved: true, approvedAt: new Date(), approvedById: actingAdminId }
      : { isApproved: false, approvedAt: null, approvedById: null, isOpen: false },
  });
}

module.exports = { listProviders, approveProvider, setProviderApproval };