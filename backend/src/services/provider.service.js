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

module.exports = { listProviders, approveProvider };