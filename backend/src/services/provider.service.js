const prisma = require('../config/prisma');

// Admins see every provider (including unapproved ones); everyone else
// only sees providers that have been approved.
async function listProviders(requesterRole) {
  return prisma.provider.findMany({
    where: requesterRole === 'ADMIN' ? {} : { isApproved: true },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
}

async function approveProvider(id) {
  return prisma.provider.update({
    where: { id: Number(id) },
    data: { isApproved: true },
  });
}

module.exports = { listProviders, approveProvider };
